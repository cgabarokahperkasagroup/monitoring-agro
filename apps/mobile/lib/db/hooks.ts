// =====================================================================
// Hooks baca data dari DB lokal PowerSync (reactive, offline-aman).
// Memakai useQuery dari @powersync/react — hasil otomatis ter-update
// saat sinkron menarik data baru atau saat ada tulisan lokal.
// =====================================================================
import { useQuery } from '@powersync/react';
import type { ActivityRow, Block, Division, Employee, Estate, Tph } from './types';

export function useEstates() {
  return useQuery<Estate>(
    'SELECT id, organization_id, name, code FROM estates ORDER BY name',
  );
}

export function useDivisions() {
  return useQuery<Division>(
    'SELECT id, estate_id, organization_id, name, code FROM divisions ORDER BY name',
  );
}

export function useBlocks(divisionId?: string | null) {
  return useQuery<Block>(
    divisionId
      ? 'SELECT id, division_id, estate_id, organization_id, code, name FROM blocks WHERE division_id = ? ORDER BY code'
      : 'SELECT id, division_id, estate_id, organization_id, code, name FROM blocks ORDER BY code',
    divisionId ? [divisionId] : [],
  );
}

export function useTph(divisionId?: string | null) {
  return useQuery<Tph>(
    divisionId
      ? 'SELECT id, block_id, division_id, estate_id, organization_id, code, name FROM tph WHERE division_id = ? ORDER BY code'
      : 'SELECT id, block_id, division_id, estate_id, organization_id, code, name FROM tph ORDER BY code',
    divisionId ? [divisionId] : [],
  );
}

export function useEmployees(divisionId?: string | null) {
  return useQuery<Employee>(
    divisionId
      ? 'SELECT id, division_id, estate_id, organization_id, nik, name, position FROM employees WHERE division_id = ? ORDER BY name'
      : 'SELECT id, division_id, estate_id, organization_id, nik, name, position FROM employees ORDER BY name',
    divisionId ? [divisionId] : [],
  );
}

// Daftar kegiatan terbaru (Panen + Pengiriman) dengan ringkasan dari detail.
export function useRecentActivities(limit = 100) {
  return useQuery<ActivityRow>(
    `SELECT
        a.id, a.activity_type, a.activity_date, a.division_id, a.block_id,
        a.status, a.notes, a.created_at,
        COALESCE(h.total_janjang, d.total_janjang) AS total_janjang,
        d.spb_number AS spb_number,
        b.code AS block_code,
        dv.name AS division_name
     FROM activities a
     LEFT JOIN harvest_records  h  ON h.activity_id  = a.id
     LEFT JOIN delivery_records d  ON d.activity_id  = a.id
     LEFT JOIN blocks           b  ON b.id           = a.block_id
     LEFT JOIN divisions        dv ON dv.id          = a.division_id
     WHERE a.deleted_at IS NULL
     ORDER BY a.activity_date DESC, a.created_at DESC
     LIMIT ?`,
    [limit],
  );
}
