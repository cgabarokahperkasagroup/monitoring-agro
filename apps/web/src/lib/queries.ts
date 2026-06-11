// =====================================================================
// Hooks data dashboard (React Query + Supabase, schema agro).
// Web membaca online; RLS membatasi sesuai role & cakupan user.
// =====================================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';

// PostgREST mengembalikan relasi embedded sebagai objek (1:1) atau array (1:N).
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export type Estate = { id: string; name: string; code: string };
export type Division = { id: string; name: string; code: string; estate_id: string };
export type Block = { id: string; code: string; name: string; division_id: string; luas_ha: number | null };
export type Employee = {
  id: string; nik: string; name: string; position: string | null;
  status: string | null; division_id: string;
};

export type ActivityFilters = {
  type?: 'all' | 'panen' | 'pengiriman';
  estateId?: string;
  divisionId?: string;
  from?: string;
  to?: string;
};

export type ActivityRow = {
  id: string;
  activity_type: string;
  activity_date: string;
  status: string | null;
  notes: string | null;
  estate_name: string | null;
  division_name: string | null;
  block_code: string | null;
  total_janjang: number | null;
  est_tonase: number | null;
  spb_number: string | null;
  destination_pks: string | null;
  photo_count: number;
};

export function useEstates() {
  return useQuery({
    queryKey: ['estates'],
    queryFn: async (): Promise<Estate[]> => {
      const { data, error } = await supabase.from('estates').select('id, name, code').order('name');
      if (error) throw error;
      return (data ?? []) as Estate[];
    },
  });
}

export function useDivisions() {
  return useQuery({
    queryKey: ['divisions'],
    queryFn: async (): Promise<Division[]> => {
      const { data, error } = await supabase
        .from('divisions')
        .select('id, name, code, estate_id')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Division[];
    },
  });
}

export function useBlocks() {
  return useQuery({
    queryKey: ['blocks'],
    queryFn: async (): Promise<Block[]> => {
      const { data, error } = await supabase
        .from('blocks')
        .select('id, code, name, division_id, luas_ha')
        .order('code');
      if (error) throw error;
      return (data ?? []) as Block[];
    },
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, nik, name, position, status, division_id')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
  });
}

const ACTIVITY_SELECT = `
  id, activity_type, activity_date, status, notes,
  estate_id, division_id,
  estates(name), divisions(name), blocks(code),
  harvest_records(total_janjang, est_tonase),
  delivery_records(spb_number, total_janjang, est_tonase_muat, destination_pks),
  attachments(id)
`;

function mapActivity(r: any): ActivityRow {
  const h = one<any>(r.harvest_records);
  const d = one<any>(r.delivery_records);
  const isPanen = r.activity_type === 'panen';
  return {
    id: r.id,
    activity_type: r.activity_type,
    activity_date: r.activity_date,
    status: r.status,
    notes: r.notes,
    estate_name: one<any>(r.estates)?.name ?? null,
    division_name: one<any>(r.divisions)?.name ?? null,
    block_code: one<any>(r.blocks)?.code ?? null,
    total_janjang: isPanen ? (h?.total_janjang ?? null) : (d?.total_janjang ?? null),
    est_tonase: isPanen ? (h?.est_tonase ?? null) : (d?.est_tonase_muat ?? null),
    spb_number: d?.spb_number ?? null,
    destination_pks: d?.destination_pks ?? null,
    photo_count: Array.isArray(r.attachments) ? r.attachments.length : 0,
  };
}

// Foto sebuah kegiatan: ambil metadata attachments lalu buat signed URL
// (bucket 'attachments' privat). enabled hanya saat detail dibuka.
export type AttachmentPhoto = {
  id: string;
  url: string | null;
  kind: string | null;
  created_at: string | null;
};

export function useActivityPhotos(activityId: string | null) {
  return useQuery({
    queryKey: ['activity-photos', activityId],
    enabled: !!activityId,
    queryFn: async (): Promise<AttachmentPhoto[]> => {
      const { data: rows, error } = await supabase
        .from('attachments')
        .select('id, storage_path, kind, created_at')
        .eq('activity_id', activityId as string)
        .order('created_at');
      if (error) throw error;
      const list = (rows ?? []) as {
        id: string;
        storage_path: string;
        kind: string | null;
        created_at: string | null;
      }[];
      if (list.length === 0) return [];

      const { data: signed, error: sErr } = await supabase.storage
        .from('attachments')
        .createSignedUrls(list.map((r) => r.storage_path), 3600);
      if (sErr) throw sErr;

      const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      return list.map((r) => ({
        id: r.id,
        url: urlByPath.get(r.storage_path) ?? null,
        kind: r.kind,
        created_at: r.created_at,
      }));
    },
  });
}

export function useActivities(filters: ActivityFilters) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: async (): Promise<ActivityRow[]> => {
      let q = supabase
        .from('activities')
        .select(ACTIVITY_SELECT)
        .is('deleted_at', null)
        .order('activity_date', { ascending: false })
        .limit(500);

      if (filters.type && filters.type !== 'all') q = q.eq('activity_type', filters.type);
      if (filters.estateId) q = q.eq('estate_id', filters.estateId);
      if (filters.divisionId) q = q.eq('division_id', filters.divisionId);
      if (filters.from) q = q.gte('activity_date', filters.from);
      if (filters.to) q = q.lte('activity_date', filters.to);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapActivity);
    },
  });
}

// ---- Rekonsiliasi pengiriman ----
export type DeliveryRow = {
  id: string; // activity id
  activity_date: string;
  division_name: string | null;
  spb_number: string | null;
  vehicle_plate: string | null;
  destination_pks: string | null;
  total_janjang: number | null;
  est_tonase_muat: number | null;
  delivery_id: string | null;
  net_tonase_pks: number | null;
  variance_pct: number | null;
  recon_status: string | null;
};

const DELIVERY_SELECT = `
  id, activity_date,
  divisions(name),
  delivery_records(
    id, spb_number, vehicle_plate, destination_pks, total_janjang, est_tonase_muat,
    delivery_reconciliation(net_tonase_pks, variance_pct, status)
  )
`;

export function useDeliveries(filters: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['deliveries', filters],
    queryFn: async (): Promise<DeliveryRow[]> => {
      let q = supabase
        .from('activities')
        .select(DELIVERY_SELECT)
        .eq('activity_type', 'pengiriman')
        .is('deleted_at', null)
        .order('activity_date', { ascending: false })
        .limit(500);
      if (filters.from) q = q.gte('activity_date', filters.from);
      if (filters.to) q = q.lte('activity_date', filters.to);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any): DeliveryRow => {
        const d = one<any>(r.delivery_records);
        const rec = one<any>(d?.delivery_reconciliation);
        return {
          id: r.id,
          activity_date: r.activity_date,
          division_name: one<any>(r.divisions)?.name ?? null,
          spb_number: d?.spb_number ?? null,
          vehicle_plate: d?.vehicle_plate ?? null,
          destination_pks: d?.destination_pks ?? null,
          total_janjang: d?.total_janjang ?? null,
          est_tonase_muat: d?.est_tonase_muat ?? null,
          delivery_id: d?.id ?? null,
          net_tonase_pks: rec?.net_tonase_pks ?? null,
          variance_pct: rec?.variance_pct ?? null,
          recon_status: rec?.status ?? null,
        };
      });
    },
  });
}

// ---- Pengguna & cakupan ----
export type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  is_active: boolean | null;
  scopes: UserScope[];
};

export type UserScope = { id: string; scope_type: 'org' | 'estate' | 'division'; scope_id: string };

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active, user_scopes(id, scope_type, scope_id)')
        .order('full_name');
      if (error) throw error;
      return (data ?? []).map((r: any): ProfileRow => ({
        id: r.id,
        full_name: r.full_name,
        role: r.role,
        is_active: r.is_active,
        scopes: Array.isArray(r.user_scopes) ? r.user_scopes : [],
      }));
    },
  });
}

export type Organization = { id: string; name: string };

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async (): Promise<Organization[]> => {
      const { data, error } = await supabase.from('organizations').select('id, name').order('name');
      if (error) throw error;
      return (data ?? []) as Organization[];
    },
  });
}

// ---- Rekonsiliasi tiga arah: panen -> angkut -> terima (agregat per divisi) ----
export type ReconRow = {
  division_id: string;
  division_name: string | null;
  panen_janjang: number;
  panen_tonase: number; // estimasi tonase panen
  kirim_janjang: number;
  kirim_tonase: number; // estimasi tonase muat
  terima_tonase: number; // tonase final timbangan PKS (net)
  delivery_count: number;
  reconciled_count: number;
};

export function useReconciliationSummary(filters: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['recon-summary', filters],
    queryFn: async (): Promise<ReconRow[]> => {
      let pq = supabase
        .from('activities')
        .select('division_id, divisions(name), harvest_records(total_janjang, est_tonase)')
        .eq('activity_type', 'panen')
        .is('deleted_at', null)
        .limit(2000);
      if (filters.from) pq = pq.gte('activity_date', filters.from);
      if (filters.to) pq = pq.lte('activity_date', filters.to);

      let dq = supabase
        .from('activities')
        .select(
          'division_id, divisions(name), delivery_records(total_janjang, est_tonase_muat, delivery_reconciliation(net_tonase_pks))',
        )
        .eq('activity_type', 'pengiriman')
        .is('deleted_at', null)
        .limit(2000);
      if (filters.from) dq = dq.gte('activity_date', filters.from);
      if (filters.to) dq = dq.lte('activity_date', filters.to);

      const [{ data: pData, error: pErr }, { data: dData, error: dErr }] = await Promise.all([pq, dq]);
      if (pErr) throw pErr;
      if (dErr) throw dErr;

      const map = new Map<string, ReconRow>();
      const get = (id: string, name: string | null): ReconRow => {
        let r = map.get(id);
        if (!r) {
          r = {
            division_id: id,
            division_name: name,
            panen_janjang: 0,
            panen_tonase: 0,
            kirim_janjang: 0,
            kirim_tonase: 0,
            terima_tonase: 0,
            delivery_count: 0,
            reconciled_count: 0,
          };
          map.set(id, r);
        }
        if (!r.division_name && name) r.division_name = name;
        return r;
      };

      for (const a of (pData ?? []) as any[]) {
        if (!a.division_id) continue;
        const r = get(a.division_id, one<any>(a.divisions)?.name ?? null);
        const h = one<any>(a.harvest_records);
        r.panen_janjang += h?.total_janjang ?? 0;
        r.panen_tonase += h?.est_tonase ?? 0;
      }

      for (const a of (dData ?? []) as any[]) {
        if (!a.division_id) continue;
        const r = get(a.division_id, one<any>(a.divisions)?.name ?? null);
        const d = one<any>(a.delivery_records);
        if (!d) continue;
        r.kirim_janjang += d.total_janjang ?? 0;
        r.kirim_tonase += d.est_tonase_muat ?? 0;
        r.delivery_count += 1;
        const rec = one<any>(d.delivery_reconciliation);
        if (rec && rec.net_tonase_pks != null) {
          r.terima_tonase += rec.net_tonase_pks;
          r.reconciled_count += 1;
        }
      }

      return [...map.values()].sort((a, b) => b.panen_janjang - a.panen_janjang);
    },
  });
}
