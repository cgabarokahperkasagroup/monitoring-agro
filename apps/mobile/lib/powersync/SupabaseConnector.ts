// =====================================================================
// Monitoring Agro — PowerSync <-> Supabase connector
// 2 tugas:
//  1) fetchCredentials(): beri token Supabase + endpoint PowerSync.
//  2) uploadData(): kirim perubahan lokal (offline) ke Supabase (schema agro,
//     kena RLS). Dipanggil PowerSync saat online.
// =====================================================================
import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { supabase } from '../supabaseClient';

const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL as string;

// Error Postgres yang TIDAK boleh di-retry (data ditolak permanen)
// -> 22xxx tipe data, 23xxx constraint, 42xxx syntax/permission.
function isFatalPostgresError(code?: string) {
  return !!code && ['22', '23', '42'].includes(code.substring(0, 2));
}

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      // Belum login / sesi habis -> jangan sinkron.
      return null;
    }

    return {
      endpoint: POWERSYNC_URL,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOp: any = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = supabase.from(op.table); // schema 'agro' (dari client)
        let result: any;

        switch (op.op) {
          case UpdateType.PUT: {
            // insert/replace: gabungkan id + data
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          }
          case UpdateType.PATCH:
            // opData bertipe opsional di SDK; PATCH selalu membawa data.
            result = await table.update(op.opData ?? {}).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id);
            break;
        }

        if (result?.error) throw result.error;
      }

      await transaction.complete();
    } catch (ex: any) {
      if (isFatalPostgresError(ex?.code)) {
        // Data ditolak permanen (mis. langgar RLS/constraint):
        // buang dari antrian agar tidak macet, catat untuk ditinjau.
        console.error('Upload ditolak (fatal), dibuang dari antrian:', lastOp, ex);
        await transaction.complete();
      } else {
        // Error sementara (jaringan/5xx): biarkan PowerSync retry nanti.
        throw ex;
      }
    }
  }
}
