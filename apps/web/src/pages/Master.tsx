import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useBlocks,
  useDivisions,
  useEstates,
  useMasterRows,
  useOrganizations,
} from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth';
import { MASTER_ENTITIES, type MasterCtx, type MasterEntity } from '@/lib/master';
import { MasterFormModal } from '@/components/MasterFormModal';
import { QueryState } from '@/components/ui';
import { n2 } from '@/lib/format';

export default function Master() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin_grup';
  const isManager = profile?.role === 'manager_kebun';

  const [tab, setTab] = useState<MasterEntity>(MASTER_ENTITIES[0]);
  const [editing, setEditing] = useState<{ entity: MasterEntity; row: Record<string, any> | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Konteks untuk select & resolusi nama.
  const { data: orgs = [] } = useOrganizations();
  const { data: estates = [] } = useEstates();
  const { data: divisions = [] } = useDivisions();
  const { data: blocks = [] } = useBlocks();
  const ctx: MasterCtx = useMemo(
    () => ({ orgs, estates, divisions, blocks }),
    [orgs, estates, divisions, blocks],
  );

  const rowsQ = useMasterRows(tab.table, tab.select, tab.order);
  const rows = rowsQ.data ?? [];

  const canWrite = isAdmin || (isManager && !!tab.managerWritable);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['master', tab.table] });
    void qc.invalidateQueries({ queryKey: [tab.key] });
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tab.table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setErr(null);
      refresh();
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal menghapus.'),
  });

  function onDelete(id: string) {
    if (window.confirm('Hapus data ini? Data turunannya (jika ada) bisa ikut terhapus.')) del.mutate(id);
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div className="tabs" style={{ margin: 0 }}>
          {MASTER_ENTITIES.map((e) => (
            <button key={e.key} className={`tab ${tab.key === e.key ? 'active' : ''}`} onClick={() => setTab(e)}>
              {e.label}
            </button>
          ))}
        </div>
        {canWrite ? (
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ entity: tab, row: null })}>
            + Tambah {tab.label}
          </button>
        ) : null}
      </div>

      {!isAdmin && !isManager ? (
        <p className="muted" style={{ marginTop: 0 }}>Hanya admin / manajer kebun yang dapat mengubah data master.</p>
      ) : null}
      {err ? <div className="error-box" style={{ marginBottom: 14 }}>{err}</div> : null}

      <QueryState
        isLoading={rowsQ.isLoading}
        error={rowsQ.error}
        isEmpty={rows.length === 0}
        emptyText={`Belum ada data ${tab.label.toLowerCase()}.`}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {tab.list.map((c) => (
                  <th key={c.key} className={c.num ? 'num' : undefined}>{c.header}</th>
                ))}
                {canWrite ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {tab.list.map((c) => (
                    <td key={c.key} className={c.num ? 'num' : undefined}>
                      {c.map
                        ? c.map(r, ctx)
                        : c.num
                          ? n2(r[c.key])
                          : (r[c.key] ?? '—')}
                    </td>
                  ))}
                  {canWrite ? (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => setEditing({ entity: tab, row: r })}>Edit</button>
                        <button className="btn btn-sm" disabled={del.isPending} onClick={() => onDelete(r.id)}>Hapus</button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>

      <MasterFormModal
        entity={editing?.entity ?? null}
        row={editing?.row ?? null}
        ctx={ctx}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />
    </div>
  );
}
