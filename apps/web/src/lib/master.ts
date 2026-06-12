// =====================================================================
// Konfigurasi CRUD data master (berbasis tabel agro). Tiap entitas punya
// kolom tabel, field form, dan pembentuk payload (menurunkan FK org/estate/
// division dari pilihan induk). RLS DB tetap penjaga utama otorisasi.
// =====================================================================
export type Option = { value: string; label: string };

export type MasterCtx = {
  orgs: { id: string; name: string }[];
  estates: { id: string; name: string; organization_id: string }[];
  divisions: { id: string; name: string; estate_id: string; organization_id: string }[];
  blocks: { id: string; code: string; division_id: string }[];
};

export type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  required?: boolean;
  options?: 'organizations' | 'estates' | 'divisions' | 'blocks' | 'employeeStatus';
};

export type MasterEntity = {
  key: string;
  label: string;
  table: string;
  select: string;
  order: string;
  list: { key: string; header: string; map?: (row: any, ctx: MasterCtx) => string; num?: boolean }[];
  fields: FieldDef[];
  payload: (form: Record<string, string>, ctx: MasterCtx) => Record<string, unknown>;
  // peran yang boleh menulis (selain admin yang selalu boleh)
  managerWritable?: boolean; // manager_kebun boleh (blok/tph/karyawan)
};

const nameOf = (list: { id: string; name?: string; code?: string }[], id: string | null) =>
  (id ? list.find((x) => x.id === id) : null) ?? null;
const numOrNull = (v: string) => {
  const t = (v ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v: string) => {
  const n = numOrNull(v);
  return n == null ? null : Math.round(n);
};

export const MASTER_ENTITIES: MasterEntity[] = [
  {
    key: 'estates',
    label: 'Estate',
    table: 'estates',
    select: 'id, name, code, location, organization_id',
    order: 'name',
    list: [
      { key: 'code', header: 'Kode' },
      { key: 'name', header: 'Nama Estate' },
      { key: 'location', header: 'Lokasi' },
    ],
    fields: [
      { key: 'organization_id', label: 'Organisasi', type: 'select', options: 'organizations', required: true },
      { key: 'name', label: 'Nama estate', type: 'text', required: true },
      { key: 'code', label: 'Kode', type: 'text' },
      { key: 'location', label: 'Lokasi', type: 'text' },
    ],
    payload: (f) => ({
      organization_id: f.organization_id,
      name: f.name.trim(),
      code: f.code?.trim() || null,
      location: f.location?.trim() || null,
    }),
  },
  {
    key: 'divisions',
    label: 'Divisi',
    table: 'divisions',
    select: 'id, name, code, estate_id, organization_id',
    order: 'name',
    list: [
      { key: 'code', header: 'Kode' },
      { key: 'name', header: 'Nama Divisi' },
      { key: 'estate_id', header: 'Estate', map: (r, c) => nameOf(c.estates, r.estate_id)?.name ?? '—' },
    ],
    fields: [
      { key: 'estate_id', label: 'Estate', type: 'select', options: 'estates', required: true },
      { key: 'name', label: 'Nama divisi', type: 'text', required: true },
      { key: 'code', label: 'Kode', type: 'text' },
    ],
    payload: (f, c) => {
      const e = nameOf(c.estates, f.estate_id) as MasterCtx['estates'][number] | null;
      return {
        estate_id: f.estate_id,
        organization_id: e?.organization_id ?? null,
        name: f.name.trim(),
        code: f.code?.trim() || null,
      };
    },
  },
  {
    key: 'blocks',
    label: 'Blok',
    table: 'blocks',
    select: 'id, code, name, luas_ha, tahun_tanam, jumlah_pokok, division_id, estate_id, organization_id',
    order: 'code',
    managerWritable: true,
    list: [
      { key: 'code', header: 'Kode' },
      { key: 'name', header: 'Nama' },
      { key: 'division_id', header: 'Divisi', map: (r, c) => nameOf(c.divisions, r.division_id)?.name ?? '—' },
      { key: 'luas_ha', header: 'Luas (ha)', num: true },
      { key: 'tahun_tanam', header: 'Thn tanam', num: true },
    ],
    fields: [
      { key: 'division_id', label: 'Divisi', type: 'select', options: 'divisions', required: true },
      { key: 'code', label: 'Kode blok', type: 'text', required: true },
      { key: 'name', label: 'Nama', type: 'text' },
      { key: 'luas_ha', label: 'Luas (ha)', type: 'number' },
      { key: 'tahun_tanam', label: 'Tahun tanam', type: 'number' },
      { key: 'jumlah_pokok', label: 'Jumlah pokok', type: 'number' },
    ],
    payload: (f, c) => {
      const d = nameOf(c.divisions, f.division_id) as MasterCtx['divisions'][number] | null;
      return {
        division_id: f.division_id,
        estate_id: d?.estate_id ?? null,
        organization_id: d?.organization_id ?? null,
        code: f.code.trim(),
        name: f.name?.trim() || null,
        luas_ha: numOrNull(f.luas_ha),
        tahun_tanam: intOrNull(f.tahun_tanam),
        jumlah_pokok: intOrNull(f.jumlah_pokok),
      };
    },
  },
  {
    key: 'tph',
    label: 'TPH',
    table: 'tph',
    select: 'id, code, name, block_id, division_id, estate_id, organization_id',
    order: 'code',
    managerWritable: true,
    list: [
      { key: 'code', header: 'Kode' },
      { key: 'name', header: 'Nama' },
      { key: 'division_id', header: 'Divisi', map: (r, c) => nameOf(c.divisions, r.division_id)?.name ?? '—' },
      { key: 'block_id', header: 'Blok', map: (r, c) => c.blocks.find((b) => b.id === r.block_id)?.code ?? '—' },
    ],
    fields: [
      { key: 'division_id', label: 'Divisi', type: 'select', options: 'divisions', required: true },
      { key: 'block_id', label: 'Blok (opsional)', type: 'select', options: 'blocks' },
      { key: 'code', label: 'Kode TPH', type: 'text', required: true },
      { key: 'name', label: 'Nama', type: 'text' },
    ],
    payload: (f, c) => {
      const d = nameOf(c.divisions, f.division_id) as MasterCtx['divisions'][number] | null;
      return {
        division_id: f.division_id,
        estate_id: d?.estate_id ?? null,
        organization_id: d?.organization_id ?? null,
        block_id: f.block_id || null,
        code: f.code.trim(),
        name: f.name?.trim() || null,
      };
    },
  },
  {
    key: 'employees',
    label: 'Karyawan',
    table: 'employees',
    select: 'id, nik, name, position, status, join_date, division_id, estate_id, organization_id',
    order: 'name',
    managerWritable: true,
    list: [
      { key: 'nik', header: 'NIK' },
      { key: 'name', header: 'Nama' },
      { key: 'position', header: 'Jabatan' },
      { key: 'division_id', header: 'Divisi', map: (r, c) => nameOf(c.divisions, r.division_id)?.name ?? '—' },
      { key: 'status', header: 'Status' },
    ],
    fields: [
      { key: 'division_id', label: 'Divisi', type: 'select', options: 'divisions', required: true },
      { key: 'nik', label: 'NIK', type: 'text', required: true },
      { key: 'name', label: 'Nama', type: 'text', required: true },
      { key: 'position', label: 'Jabatan', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: 'employeeStatus', required: true },
      { key: 'join_date', label: 'Tgl bergabung', type: 'date' },
    ],
    payload: (f, c) => {
      const d = nameOf(c.divisions, f.division_id) as MasterCtx['divisions'][number] | null;
      return {
        division_id: f.division_id,
        estate_id: d?.estate_id ?? null,
        organization_id: d?.organization_id ?? null,
        nik: f.nik.trim(),
        name: f.name.trim(),
        position: f.position?.trim() || null,
        status: f.status || 'aktif',
        join_date: f.join_date || null,
      };
    },
  },
  {
    key: 'materials',
    label: 'Material',
    table: 'materials',
    select: 'id, name, category, unit, organization_id',
    order: 'name',
    list: [
      { key: 'name', header: 'Nama' },
      { key: 'category', header: 'Kategori' },
      { key: 'unit', header: 'Satuan' },
    ],
    fields: [
      { key: 'organization_id', label: 'Organisasi', type: 'select', options: 'organizations', required: true },
      { key: 'name', label: 'Nama material', type: 'text', required: true },
      { key: 'category', label: 'Kategori', type: 'text' },
      { key: 'unit', label: 'Satuan', type: 'text' },
    ],
    payload: (f) => ({
      organization_id: f.organization_id,
      name: f.name.trim(),
      category: f.category?.trim() || null,
      unit: f.unit?.trim() || null,
    }),
  },
];

export function fieldOptions(field: FieldDef, ctx: MasterCtx): Option[] {
  switch (field.options) {
    case 'organizations':
      return ctx.orgs.map((o) => ({ value: o.id, label: o.name }));
    case 'estates':
      return ctx.estates.map((e) => ({ value: e.id, label: e.name }));
    case 'divisions':
      return ctx.divisions.map((d) => ({ value: d.id, label: d.name }));
    case 'blocks':
      return ctx.blocks.map((b) => ({ value: b.id, label: `Blok ${b.code}` }));
    case 'employeeStatus':
      return [
        { value: 'aktif', label: 'Aktif' },
        { value: 'nonaktif', label: 'Nonaktif' },
      ];
    default:
      return [];
  }
}
