import { useMemo, useRef, useState } from 'react';
import {
  useDivisionProductivity,
  useDivisions,
  useEmployeeProductivity,
  useEstates,
  type DivisionProductivity,
  type EmployeeProductivity,
} from '@/lib/queries';
import { RankedBarChart } from '@/components/RankedBarChart';
import { ExportButtons } from '@/components/ExportButtons';
import { ReportButton } from '@/components/ReportButton';
import { Card, Field, QueryState } from '@/components/ui';
import { daysAgoIso, fmtDate, n, todayIso } from '@/lib/format';
import { downloadReportPdf, type ExportColumn } from '@/lib/export';

const TOP_N = 15;

const DIV_COLUMNS: ExportColumn<DivisionProductivity>[] = [
  { header: 'Divisi', value: (r) => r.division_name },
  { header: 'Janjang', value: (r) => r.janjang },
  { header: 'Est. tonase (kg)', value: (r) => Math.round(r.tonase) },
  { header: 'Catatan panen', value: (r) => r.catatan },
];

const EMP_COLUMNS: ExportColumn<EmployeeProductivity>[] = [
  { header: 'Nama', value: (r) => r.name },
  { header: 'NIK', value: (r) => r.nik },
  { header: 'Janjang', value: (r) => r.janjang },
  { header: 'Hari catat', value: (r) => r.hari },
];

export default function Produktivitas() {
  const [estateId, setEstateId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());

  const { data: estates } = useEstates();
  const { data: divisions } = useDivisions();
  const divisionOptions = useMemo(
    () => (divisions ?? []).filter((d) => !estateId || d.estate_id === estateId),
    [divisions, estateId],
  );

  const divProd = useDivisionProductivity({ from, to, estateId });
  const empProd = useEmployeeProductivity({ from, to, estateId, divisionId });

  const divRows = divProd.data ?? [];
  const empRows = empProd.data ?? [];
  const periode = `Periode ${fmtDate(from)} – ${fmtDate(to)}`;

  const divChartRef = useRef<HTMLDivElement>(null);
  const empChartRef = useRef<HTMLDivElement>(null);

  async function onReport() {
    const totalDivJanjang = divRows.reduce((a, r) => a + r.janjang, 0);
    const totalEmpJanjang = empRows.reduce((a, r) => a + r.janjang, 0);
    await downloadReportPdf({
      title: 'Laporan Produktivitas — Monitoring Agro',
      subtitle: periode,
      filename: `laporan-produktivitas_${from}_sd_${to}`,
      kpis: [
        { label: 'Jumlah divisi (ada panen)', value: n(divRows.length) },
        { label: 'Total janjang panen', value: n(totalDivJanjang) },
        { label: 'Jumlah karyawan (ada output)', value: n(empRows.length) },
        { label: 'Total janjang per karyawan', value: n(totalEmpJanjang) },
      ],
      chartEls: [divChartRef.current, empChartRef.current],
      tables: [
        { heading: 'Produksi per Divisi', columns: DIV_COLUMNS, rows: divRows },
        { heading: 'Produktivitas per Karyawan', columns: EMP_COLUMNS, rows: empRows },
      ],
    });
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="filters">
          <Field label="Estate">
            <select
              className="select"
              value={estateId}
              onChange={(e) => {
                setEstateId(e.target.value);
                setDivisionId('');
              }}
            >
              <option value="">Semua estate</option>
              {(estates ?? []).map((es) => (
                <option key={es.id} value={es.id}>{es.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Divisi (untuk Top Karyawan)">
            <select className="select" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
              <option value="">Semua divisi</option>
              {divisionOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Dari">
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Sampai">
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <ReportButton run={onReport} label="⬇ Laporan PDF (grafik)" disabled={divProd.isLoading || empProd.isLoading} />
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div className="row-between" style={{ marginBottom: 14 }}>
          <strong>Produksi per Divisi (janjang panen)</strong>
          <ExportButtons
            title="Produktivitas per Divisi — Monitoring Agro"
            subtitle={periode}
            filename={`produktivitas-divisi_${from}_sd_${to}`}
            columns={DIV_COLUMNS}
            rows={divRows}
          />
        </div>
        <QueryState
          isLoading={divProd.isLoading}
          error={divProd.error}
          isEmpty={divRows.length === 0}
          emptyText="Belum ada data panen pada periode ini."
        >
          <div ref={divChartRef}>
            <RankedBarChart
              color="#15803d"
              unit="jjg"
              items={divRows.map((r) => ({
                label: r.division_name ?? '—',
                sub: `${n(Math.round(r.tonase))} kg · ${r.catatan} catatan`,
                value: r.janjang,
              }))}
            />
          </div>
        </QueryState>
      </Card>

      <Card>
        <div className="row-between" style={{ marginBottom: 14 }}>
          <strong>Top Karyawan (janjang)</strong>
          <ExportButtons
            title="Produktivitas per Karyawan — Monitoring Agro"
            subtitle={periode}
            filename={`produktivitas-karyawan_${from}_sd_${to}`}
            columns={EMP_COLUMNS}
            rows={empRows}
          />
        </div>
        <QueryState
          isLoading={empProd.isLoading}
          error={empProd.error}
          isEmpty={empRows.length === 0}
          emptyText="Belum ada output per karyawan. Pastikan kehadiran/output dicatat di aplikasi mobile."
        >
          <div ref={empChartRef}>
            <RankedBarChart
              color="#0e7490"
              unit="jjg"
              items={empRows.slice(0, TOP_N).map((r) => ({
                label: r.name ?? '—',
                sub: r.nik ?? undefined,
                value: r.janjang,
              }))}
            />
          </div>
          {empRows.length > TOP_N ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
              Menampilkan {TOP_N} teratas dari {empRows.length} karyawan. Unduh untuk daftar lengkap.
            </p>
          ) : null}
        </QueryState>
      </Card>
    </div>
  );
}
