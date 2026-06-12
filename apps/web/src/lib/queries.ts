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

export type Estate = { id: string; name: string; code: string; organization_id: string };
export type Division = { id: string; name: string; code: string; estate_id: string; organization_id: string };
export type Block = { id: string; code: string; name: string; division_id: string; luas_ha: number | null };
export type Employee = {
  id: string; nik: string; name: string; position: string | null;
  status: string | null; division_id: string;
};

export type ActivityFilters = {
  type?: 'all' | 'panen' | 'pengiriman';
  estateId?: string;
  divisionId?: string;
  status?: string;
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
      const { data, error } = await supabase.from('estates').select('id, name, code, organization_id').order('name');
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
        .select('id, name, code, estate_id, organization_id')
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
      if (filters.status) q = q.eq('status', filters.status);
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

// ---- Produktivitas per DIVISI (produksi panen) ----
export type DivisionProductivity = {
  division_id: string;
  division_name: string | null;
  janjang: number;
  tonase: number;
  catatan: number; // jumlah catatan panen
};

export function useDivisionProductivity(filters: { from?: string; to?: string; estateId?: string }) {
  return useQuery({
    queryKey: ['prod-division', filters],
    queryFn: async (): Promise<DivisionProductivity[]> => {
      let q = supabase
        .from('activities')
        .select('division_id, divisions(name), harvest_records(total_janjang, est_tonase)')
        .eq('activity_type', 'panen')
        .is('deleted_at', null)
        .limit(3000);
      if (filters.from) q = q.gte('activity_date', filters.from);
      if (filters.to) q = q.lte('activity_date', filters.to);
      if (filters.estateId) q = q.eq('estate_id', filters.estateId);

      const { data, error } = await q;
      if (error) throw error;

      const map = new Map<string, DivisionProductivity>();
      for (const a of (data ?? []) as any[]) {
        if (!a.division_id) continue;
        let r = map.get(a.division_id);
        if (!r) {
          r = { division_id: a.division_id, division_name: one<any>(a.divisions)?.name ?? null, janjang: 0, tonase: 0, catatan: 0 };
          map.set(a.division_id, r);
        }
        const h = one<any>(a.harvest_records);
        r.janjang += h?.total_janjang ?? 0;
        r.tonase += h?.est_tonase ?? 0;
        r.catatan += 1;
      }
      return [...map.values()].sort((a, b) => b.janjang - a.janjang);
    },
  });
}

// ---- Produktivitas per KARYAWAN (output janjang dari attendance_lines) ----
export type EmployeeProductivity = {
  employee_id: string;
  name: string | null;
  nik: string | null;
  janjang: number;
  hari: number; // jumlah hari/catatan kehadiran dengan output
};

export function useEmployeeProductivity(filters: {
  from?: string;
  to?: string;
  estateId?: string;
  divisionId?: string;
}) {
  return useQuery({
    queryKey: ['prod-employee', filters],
    queryFn: async (): Promise<EmployeeProductivity[]> => {
      let q = supabase
        .from('attendance_lines')
        .select(
          'output_qty, employee_id, employees(name, nik), activities!inner(activity_date, activity_type, estate_id, division_id, deleted_at)',
        )
        .eq('activities.activity_type', 'panen')
        .is('activities.deleted_at', null)
        .limit(8000);
      if (filters.from) q = q.gte('activities.activity_date', filters.from);
      if (filters.to) q = q.lte('activities.activity_date', filters.to);
      if (filters.estateId) q = q.eq('activities.estate_id', filters.estateId);
      if (filters.divisionId) q = q.eq('activities.division_id', filters.divisionId);

      const { data, error } = await q;
      if (error) throw error;

      const map = new Map<string, EmployeeProductivity>();
      for (const a of (data ?? []) as any[]) {
        if (!a.employee_id) continue;
        let r = map.get(a.employee_id);
        if (!r) {
          const emp = one<any>(a.employees);
          r = { employee_id: a.employee_id, name: emp?.name ?? null, nik: emp?.nik ?? null, janjang: 0, hari: 0 };
          map.set(a.employee_id, r);
        }
        r.janjang += a.output_qty ?? 0;
        r.hari += 1;
      }
      return [...map.values()].sort((a, b) => b.janjang - a.janjang);
    },
  });
}

// ---- Pemupukan: realisasi vs rencana ----
export type Material = { id: string; name: string; unit: string | null; category: string | null };

export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: async (): Promise<Material[]> => {
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, unit, category')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });
}

function monthRange(month: string): { period: string; from: string; to: string } {
  // month = 'YYYY-MM'
  const period = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); // hari terakhir bulan
  return { period, from: period, to: `${month}-${String(last).padStart(2, '0')}` };
}

export type FertilizerCompareRow = {
  division_id: string;
  division_name: string | null;
  plan_kg: number;
  actual_kg: number;
};

export function useFertilizerComparison(filters: { month: string; estateId?: string }) {
  return useQuery({
    queryKey: ['fert-compare', filters],
    queryFn: async (): Promise<FertilizerCompareRow[]> => {
      const { period, from, to } = monthRange(filters.month);

      let pq = supabase
        .from('fertilizing_plans')
        .select('division_id, divisions(name), planned_kg')
        .eq('period', period);
      if (filters.estateId) pq = pq.eq('estate_id', filters.estateId);

      let aq = supabase
        .from('activities')
        .select('division_id, divisions(name), fertilizing_records(total_kg)')
        .eq('activity_type', 'pemupukan')
        .is('deleted_at', null)
        .gte('activity_date', from)
        .lte('activity_date', to)
        .limit(3000);
      if (filters.estateId) aq = aq.eq('estate_id', filters.estateId);

      const [{ data: pData, error: pErr }, { data: aData, error: aErr }] = await Promise.all([pq, aq]);
      if (pErr) throw pErr;
      if (aErr) throw aErr;

      const map = new Map<string, FertilizerCompareRow>();
      const get = (id: string, name: string | null) => {
        let r = map.get(id);
        if (!r) {
          r = { division_id: id, division_name: name, plan_kg: 0, actual_kg: 0 };
          map.set(id, r);
        }
        if (!r.division_name && name) r.division_name = name;
        return r;
      };
      for (const p of (pData ?? []) as any[]) {
        if (!p.division_id) continue;
        get(p.division_id, one<any>(p.divisions)?.name ?? null).plan_kg += p.planned_kg ?? 0;
      }
      for (const a of (aData ?? []) as any[]) {
        if (!a.division_id) continue;
        const fr = one<any>(a.fertilizing_records);
        get(a.division_id, one<any>(a.divisions)?.name ?? null).actual_kg += fr?.total_kg ?? 0;
      }
      return [...map.values()].sort((x, y) => y.plan_kg - x.plan_kg || y.actual_kg - x.actual_kg);
    },
  });
}

// ---- Daftar rencana (untuk editor) ----
export type FertilizerPlan = {
  id: string;
  division_id: string;
  division_name: string | null;
  material_id: string;
  material_name: string | null;
  material_unit: string | null;
  period: string;
  planned_kg: number;
};

export function useFertilizerPlans(filters: { month: string; estateId?: string }) {
  return useQuery({
    queryKey: ['fert-plans', filters],
    queryFn: async (): Promise<FertilizerPlan[]> => {
      const { period } = monthRange(filters.month);
      let q = supabase
        .from('fertilizing_plans')
        .select('id, division_id, material_id, period, planned_kg, divisions(name), materials(name, unit)')
        .eq('period', period);
      if (filters.estateId) q = q.eq('estate_id', filters.estateId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any): FertilizerPlan => ({
        id: r.id,
        division_id: r.division_id,
        division_name: one<any>(r.divisions)?.name ?? null,
        material_id: r.material_id,
        material_name: one<any>(r.materials)?.name ?? null,
        material_unit: one<any>(r.materials)?.unit ?? null,
        period: r.period,
        planned_kg: r.planned_kg,
      }));
    },
  });
}

// ---- Audit log (admin) ----
export type AuditLog = {
  id: string;
  created_at: string;
  action: string;
  entity_table: string;
  entity_id: string | null;
  actor_name: string | null;
  before: unknown;
  after: unknown;
};

export function useAuditLogs(filters: { action?: string; limit?: number }) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async (): Promise<AuditLog[]> => {
      // actor_id -> profiles (FK tunggal, embed tidak ambigu).
      let q = supabase
        .from('audit_logs')
        .select('id, created_at, action, entity_table, entity_id, before, after, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 300);
      if (filters.action) q = q.eq('action', filters.action);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any): AuditLog => ({
        id: r.id,
        created_at: r.created_at,
        action: r.action,
        entity_table: r.entity_table,
        entity_id: r.entity_id,
        actor_name: one<any>(r.profiles)?.full_name ?? null,
        before: r.before,
        after: r.after,
      }));
    },
  });
}

// ---- Status sinkron perangkat (diturunkan dari activities) ----
// activities punya 2 FK ke profiles (created_by & verified_by) => embed ambigu,
// jadi nama di-resolve di halaman lewat daftar profiles.
export type DeviceSync = {
  created_by: string;
  source_device: string | null;
  total: number;
  last_seen: string | null; // max created_at (≈ waktu catat terkirim)
  last_activity: string | null; // max activity_date
};

export function useDeviceSyncStatus() {
  return useQuery({
    queryKey: ['device-sync'],
    queryFn: async (): Promise<DeviceSync[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('created_by, source_device, created_at, activity_date')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      const map = new Map<string, DeviceSync>();
      for (const a of (data ?? []) as any[]) {
        if (!a.created_by) continue;
        const key = `${a.created_by}|${a.source_device ?? ''}`;
        let r = map.get(key);
        if (!r) {
          r = { created_by: a.created_by, source_device: a.source_device ?? null, total: 0, last_seen: null, last_activity: null };
          map.set(key, r);
        }
        r.total += 1;
        if (!r.last_seen || a.created_at > r.last_seen) r.last_seen = a.created_at;
        if (a.activity_date && (!r.last_activity || a.activity_date > r.last_activity)) r.last_activity = a.activity_date;
      }
      return [...map.values()].sort((a, b) => (b.last_seen ?? '').localeCompare(a.last_seen ?? ''));
    },
  });
}

// ---- Sebaran GPS kegiatan (untuk peta) ----
export type GeoActivity = {
  id: string;
  activity_type: string;
  activity_date: string;
  lat: number;
  lng: number;
  division_name: string | null;
  block_code: string | null;
  janjang: number | null;
};

export function useActivitiesGeo(filters: ActivityFilters) {
  return useQuery({
    queryKey: ['activities-geo', filters],
    queryFn: async (): Promise<GeoActivity[]> => {
      let q = supabase
        .from('activities')
        .select(
          'id, activity_type, activity_date, gps_lat, gps_lng, divisions(name), blocks(code), harvest_records(total_janjang), delivery_records(total_janjang)',
        )
        .not('gps_lat', 'is', null)
        .not('gps_lng', 'is', null)
        .is('deleted_at', null)
        .order('activity_date', { ascending: false })
        .limit(2000);
      if (filters.type && filters.type !== 'all') q = q.eq('activity_type', filters.type);
      if (filters.estateId) q = q.eq('estate_id', filters.estateId);
      if (filters.divisionId) q = q.eq('division_id', filters.divisionId);
      if (filters.from) q = q.gte('activity_date', filters.from);
      if (filters.to) q = q.lte('activity_date', filters.to);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? [])
        .map((r: any): GeoActivity | null => {
          const lat = Number(r.gps_lat);
          const lng = Number(r.gps_lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const isPanen = r.activity_type === 'panen';
          const h = one<any>(r.harvest_records);
          const d = one<any>(r.delivery_records);
          return {
            id: r.id,
            activity_type: r.activity_type,
            activity_date: r.activity_date,
            lat,
            lng,
            division_name: one<any>(r.divisions)?.name ?? null,
            block_code: one<any>(r.blocks)?.code ?? null,
            janjang: isPanen ? (h?.total_janjang ?? null) : (d?.total_janjang ?? null),
          };
        })
        .filter((x): x is GeoActivity => x !== null);
    },
  });
}

// ---- Laporan terjadwal ----
export type ReportSchedule = {
  id: string;
  name: string;
  report_type: string;
  estate_id: string | null;
  division_id: string | null;
  frequency: string;
  enabled: boolean;
  last_run_at: string | null;
  email_recipients: string[] | null;
};

export function useReportSchedules() {
  return useQuery({
    queryKey: ['report-schedules'],
    queryFn: async (): Promise<ReportSchedule[]> => {
      const { data, error } = await supabase
        .from('report_schedules')
        .select('id, name, report_type, estate_id, division_id, frequency, enabled, last_run_at, email_recipients')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReportSchedule[];
    },
  });
}

export type ReportRun = {
  id: string;
  schedule_id: string | null;
  report_type: string;
  period_from: string;
  period_to: string;
  row_count: number;
  generated_at: string;
  summary: Record<string, unknown>[];
  emailed_at: string | null;
};

export function useReportRuns(limit = 50) {
  return useQuery({
    queryKey: ['report-runs', limit],
    queryFn: async (): Promise<ReportRun[]> => {
      const { data, error } = await supabase
        .from('report_runs')
        .select('id, schedule_id, report_type, period_from, period_to, row_count, generated_at, summary, emailed_at')
        .order('generated_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r: any): ReportRun => ({
        ...r,
        summary: Array.isArray(r.summary) ? r.summary : [],
      }));
    },
  });
}

// ---- Generic baris data master (untuk CRUD) ----
export function useMasterRows(table: string, select: string, order: string) {
  return useQuery({
    queryKey: ['master', table],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from(table).select(select).order(order);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
