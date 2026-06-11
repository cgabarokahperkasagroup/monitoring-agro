// Tipe ringan untuk baris hasil query lokal (subset kolom AppSchema).
export type Estate = { id: string; organization_id: string; name: string; code: string };

export type Division = {
  id: string;
  estate_id: string;
  organization_id: string;
  name: string;
  code: string;
};

export type Block = {
  id: string;
  division_id: string;
  estate_id: string;
  organization_id: string;
  code: string;
  name: string;
};

export type Tph = {
  id: string;
  block_id: string | null;
  division_id: string;
  estate_id: string;
  organization_id: string;
  code: string;
  name: string;
};

export type Employee = {
  id: string;
  division_id: string;
  estate_id: string;
  organization_id: string;
  nik: string;
  name: string;
  position: string | null;
};

export type ActivityRow = {
  id: string;
  activity_type: string;
  activity_date: string;
  division_id: string;
  block_id: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  // gabungan dari detail (lewat LEFT JOIN di query daftar)
  total_janjang: number | null;
  spb_number: string | null;
  block_code: string | null;
  division_name: string | null;
};
