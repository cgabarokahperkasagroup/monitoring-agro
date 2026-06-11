import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useDivisions,
  useEstates,
  useFertilizerComparison,
  useFertilizerPlans,
  useMaterials,
  type FertilizerCompareRow,
} from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth';
import { PlanVsActualChart } from '@/components/PlanVsActualChart';
import { ExportButtons } from '@/components/ExportButtons';
import { Card, Field, QueryState } from '@/components/ui';
import { n } from '@/lib/format';
import type { ExportColumn } from '@/lib/export';

const CMP_COLUMNS: ExportColumn<FertilizerCompareRow>[] = [
  { header: 'Divisi', value: (r) => r.division_name },
  { header: 'Rencana (kg)', value: (r) => Math.round(r.plan_kg) },
  { header: 'Realisasi (kg)', value: (r) => Math.round(r.actual_kg) },
  { header: 'Capaian %', value: (r) => (r.plan_kg > 0 ? Math.round((r.actual_kg / r.plan_kg) * 100) : '') },
];

export default function Pemupukan() {
  const { profile } = useAuth();
  const canEdit =
    profile?.role === 'super_admin' || profile?.role === 'admin_grup' || profile?.role === 'manager_kebun';
  const qc = useQueryClient();

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [estateId, setEstateId] = useState('');

  const { data: estates } = useEstates();
  const { data: divisions } = useDivisions();
  const { data: materials } = useMaterials();
  const divisionOptions = useMemo(
    () => (divisions ?? []).filter((d) => !estateId || d.estate_id === estateId),
    [divisions, estateId],
  );

  const cmp = useFertilizerComparison({ month, estateId });
  const plans = useFertilizerPlans({ month, estateId });
  const cmpRows = cmp.data ?? [];

  // form rencana
  const [divisionId, setDivisionId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [kg, setKg] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const savePlan = useMutation({
    mutationFn: async () => {
      const div = (divisions ?? []).find((d) => d.id === divisionId);
      if (!div) throw new Error('Pilih divisi.');
      if (!materialId) throw new Error('Pilih material/pupuk.');
      const planned = Number((kg || '').replace(',', '.'));
      if (!Number.isFinite(planned)) throw new Error('Isi target kg yang valid.');
      const { error } = await supabase.from('fertilizing_plans').upsert(
        {
          organization_id: div.organization_id,
          estate_id: div.estate_id,
          division_id: div.id,
          material_id: materialId,
          period: `${month}-01`,
          planned_kg: planned,
        },
        { onConflict: 'division_id,material_id,period' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setErr(null);
      setKg('');
      void qc.invalidateQueries({ queryKey: ['fert-plans'] });
      void qc.invalidateQueries({ queryKey: ['fert-compare'] });
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal menyimpan rencana.'),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fertilizing_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fert-plans'] });
      void qc.invalidateQueries({ queryKey: ['fert-compare'] });
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal menghapus rencana.'),
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="filters">
          <Field label="Bulan">
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <Field label="Estate">
            <select className="select" value={estateId} onChange={(e) => setEstateId(e.target.value)}>
              <option value="">Semua estate</option>
              {(estates ?? []).map((es) => (
                <option key={es.id} value={es.id}>{es.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div className="row-between" style={{ marginBottom: 14 }}>
          <strong>Realisasi vs Rencana Pemupukan (per divisi)</strong>
          <ExportButtons
            title="Realisasi vs Rencana Pemupukan — Monitoring Agro"
            subtitle={`Bulan ${month}`}
            filename={`pemupukan_${month}`}
            columns={CMP_COLUMNS}
            rows={cmpRows}
          />
        </div>
        <QueryState
          isLoading={cmp.isLoading}
          error={cmp.error}
          isEmpty={cmpRows.length === 0}
          emptyText="Belum ada rencana maupun realisasi pemupukan pada bulan ini."
        >
          <PlanVsActualChart
            items={cmpRows.map((r) => ({
              label: r.division_name ?? '—',
              plan: r.plan_kg,
              actual: r.actual_kg,
            }))}
          />
        </QueryState>
      </Card>

      {canEdit ? (
        <Card>
          <strong>Rencana Pemupukan — {month}</strong>
          {err ? <div className="error-box" style={{ margin: '12px 0' }}>{err}</div> : null}
          <div className="filters" style={{ alignItems: 'flex-end', marginTop: 12 }}>
            <Field label="Divisi">
              <select className="select" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
                <option value="">Pilih divisi…</option>
                {divisionOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Material / pupuk">
              <select className="select" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                <option value="">Pilih material…</option>
                {(materials ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Target (kg)">
              <input className="input" type="number" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="0" />
            </Field>
            <button
              className="btn btn-primary"
              disabled={savePlan.isPending || !divisionId || !materialId}
              onClick={() => savePlan.mutate()}
            >
              Simpan rencana
            </button>
          </div>

          <QueryState
            isLoading={plans.isLoading}
            error={plans.error}
            isEmpty={(plans.data ?? []).length === 0}
            emptyText="Belum ada rencana untuk bulan ini."
          >
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Divisi</th>
                    <th>Material</th>
                    <th className="num">Target (kg)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(plans.data ?? []).map((p) => (
                    <tr key={p.id}>
                      <td>{p.division_name ?? '—'}</td>
                      <td>{p.material_name ?? '—'}</td>
                      <td className="num">{n(p.planned_kg)}</td>
                      <td>
                        <button
                          className="btn btn-sm"
                          disabled={deletePlan.isPending}
                          onClick={() => deletePlan.mutate(p.id)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
          <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            Menyimpan ulang divisi+material yang sama akan menimpa target bulan ini.
            Realisasi diambil dari kegiatan pemupukan (Fase 2) — angka muncul setelah ada pencatatan.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
