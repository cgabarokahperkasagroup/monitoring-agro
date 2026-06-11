import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useDivisions,
  useEstates,
  useReportRuns,
  useReportSchedules,
  type ReportRun,
  type ReportSchedule,
} from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth';
import { Badge, Card, Field, QueryState } from '@/components/ui';
import { downloadCsvFromRows } from '@/lib/export';
import { fmtDate, fmtDateTime } from '@/lib/format';

const TYPES = [
  { value: 'produksi_divisi', label: 'Produksi per Divisi' },
  { value: 'produksi_harian', label: 'Produksi Harian' },
];
const FREQ = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
];
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;
const freqLabel = (f: string) => FREQ.find((x) => x.value === f)?.label ?? f;

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function computePeriod(freq: string): { from: string; to: string } {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterday = new Date(today.getTime() - 86400000);
  if (freq === 'daily') return { from: ymd(yesterday), to: ymd(yesterday) };
  if (freq === 'monthly') {
    const firstThis = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const firstPrev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastPrev = new Date(firstThis.getTime() - 86400000);
    return { from: ymd(firstPrev), to: ymd(lastPrev) };
  }
  return { from: ymd(new Date(today.getTime() - 7 * 86400000)), to: ymd(yesterday) };
}

export default function LaporanTerjadwal() {
  const { profile, session } = useAuth();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin_grup';
  const qc = useQueryClient();

  const schedules = useReportSchedules();
  const runs = useReportRuns();
  const { data: estates } = useEstates();
  const { data: divisions } = useDivisions();

  const estateName = useMemo(() => {
    const m = new Map((estates ?? []).map((e) => [e.id, e.name]));
    return (id: string | null) => (id ? m.get(id) ?? '—' : 'Semua estate');
  }, [estates]);
  const divisionName = useMemo(() => {
    const m = new Map((divisions ?? []).map((d) => [d.id, d.name]));
    return (id: string | null) => (id ? m.get(id) ?? '—' : 'Semua divisi');
  }, [divisions]);

  const [name, setName] = useState('');
  const [type, setType] = useState('produksi_divisi');
  const [freq, setFreq] = useState('weekly');
  const [estateId, setEstateId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [recipients, setRecipients] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const parseRecipients = (s: string) => {
    const list = s.split(',').map((x) => x.trim()).filter(Boolean);
    return list.length ? list : null;
  };

  const divisionOptions = useMemo(
    () => (divisions ?? []).filter((d) => !estateId || d.estate_id === estateId),
    [divisions, estateId],
  );

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['report-schedules'] });
    void qc.invalidateQueries({ queryKey: ['report-runs'] });
  };

  const addSchedule = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Isi nama jadwal.');
      const { error } = await supabase.from('report_schedules').insert({
        name: name.trim(),
        report_type: type,
        frequency: freq,
        estate_id: estateId || null,
        division_id: divisionId || null,
        enabled: true,
        email_recipients: parseRecipients(recipients),
        created_by: session?.user.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setErr(null);
      setName('');
      setRecipients('');
      invalidate();
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal menyimpan jadwal.'),
  });

  const toggleSchedule = useMutation({
    mutationFn: async (s: ReportSchedule) => {
      const { error } = await supabase.from('report_schedules').update({ enabled: !s.enabled }).eq('id', s.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal mengubah jadwal.'),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('report_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal menghapus jadwal.'),
  });

  const runSchedule = useMutation({
    mutationFn: async (s: ReportSchedule) => {
      const { from, to } = computePeriod(s.frequency);
      const { error } = await supabase.rpc('generate_report', {
        p_type: s.report_type,
        p_estate: s.estate_id,
        p_division: s.division_id,
        p_from: from,
        p_to: to,
        p_schedule: s.id,
      });
      if (error) throw error;
      await supabase.from('report_schedules').update({ last_run_at: new Date().toISOString() }).eq('id', s.id);
    },
    onSuccess: () => {
      setInfo('Laporan dibuat. Lihat Riwayat Laporan di bawah.');
      invalidate();
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal menjalankan laporan.'),
  });

  const runAll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('run_scheduled_reports');
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      setInfo(`${count ?? 0} jadwal aktif dijalankan.`);
      invalidate();
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal menjalankan jadwal.'),
  });

  const sendEmail = useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await supabase.functions.invoke('agro-email-report', { body: { run_id: runId } });
      if (error) {
        let msg = error.message;
        try {
          const ctx = (error as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context;
          const b = ctx?.json ? await ctx.json() : null;
          if (b?.error) msg = b.error;
        } catch {
          /* abaikan */
        }
        throw new Error(msg);
      }
      if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
      return data;
    },
    onSuccess: () => {
      setErr(null);
      setInfo('Email laporan terkirim.');
      invalidate();
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal mengirim email.'),
  });

  if (!isAdmin) {
    return (
      <Card>
        <strong>Laporan Terjadwal</strong>
        <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
          Hanya admin grup / super admin yang dapat mengelola laporan terjadwal.
        </p>
      </Card>
    );
  }

  const scheduleRows = schedules.data ?? [];
  const runRows = runs.data ?? [];

  return (
    <div>
      {err ? <div className="error-box" style={{ marginBottom: 14 }}>{err}</div> : null}
      {info ? (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--primary-soft)' }}>
          <span className="muted">{info}</span>
        </div>
      ) : null}

      <Card style={{ marginBottom: 18 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <strong>Jadwal Laporan</strong>
          <button className="btn btn-sm" disabled={runAll.isPending} onClick={() => runAll.mutate()}>
            ▶ Jalankan semua jadwal sekarang
          </button>
        </div>

        <div className="filters" style={{ alignItems: 'flex-end', marginBottom: 8 }}>
          <Field label="Nama jadwal">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mingguan Estate A" />
          </Field>
          <Field label="Jenis">
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </Field>
          <Field label="Frekuensi">
            <select className="select" value={freq} onChange={(e) => setFreq(e.target.value)}>
              {FREQ.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
            </select>
          </Field>
          <Field label="Estate">
            <select className="select" value={estateId} onChange={(e) => { setEstateId(e.target.value); setDivisionId(''); }}>
              <option value="">Semua estate</option>
              {(estates ?? []).map((es) => (<option key={es.id} value={es.id}>{es.name}</option>))}
            </select>
          </Field>
          <Field label="Divisi">
            <select className="select" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
              <option value="">Semua divisi</option>
              {divisionOptions.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </Field>
          <Field label="Email penerima (pisah koma)">
            <input
              className="input"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="manajer@barokah.test, admin@barokah.test"
            />
          </Field>
          <button className="btn btn-primary" disabled={addSchedule.isPending || !name.trim()} onClick={() => addSchedule.mutate()}>
            + Tambah jadwal
          </button>
        </div>

        <QueryState isLoading={schedules.isLoading} error={schedules.error} isEmpty={scheduleRows.length === 0} emptyText="Belum ada jadwal.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th><th>Jenis</th><th>Frekuensi</th><th>Cakupan</th>
                  <th>Email</th><th>Status</th><th>Terakhir jalan</th><th></th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{typeLabel(s.report_type)}</td>
                    <td>{freqLabel(s.frequency)}</td>
                    <td className="muted">{estateName(s.estate_id)} · {divisionName(s.division_id)}</td>
                    <td className="muted" title={(s.email_recipients ?? []).join(', ')}>
                      {s.email_recipients?.length ? `${s.email_recipients.length} penerima` : '—'}
                    </td>
                    <td><Badge tone={s.enabled ? 'ok' : 'neutral'}>{s.enabled ? 'Aktif' : 'Nonaktif'}</Badge></td>
                    <td title={fmtDateTime(s.last_run_at)}>{s.last_run_at ? fmtDateTime(s.last_run_at) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" disabled={runSchedule.isPending} onClick={() => runSchedule.mutate(s)}>Jalankan</button>
                        <button className="btn btn-sm" onClick={() => toggleSchedule.mutate(s)}>{s.enabled ? 'Nonaktifkan' : 'Aktifkan'}</button>
                        <button className="btn btn-sm" onClick={() => deleteSchedule.mutate(s.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
        <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          Otomatis: pg_cron menjalankan jadwal aktif tiap hari (01:05 UTC) → laporan dibuat dan, bila jadwal
          punya penerima, langsung dikirim email. Set secret <code>RESEND_API_KEY</code>
          (opsional <code>REPORT_FROM_EMAIL</code>) di Supabase agar email otomatis & tombol ✉ Email berfungsi.
        </p>
      </Card>

      <Card>
        <strong>Riwayat Laporan</strong>
        <QueryState isLoading={runs.isLoading} error={runs.error} isEmpty={runRows.length === 0} emptyText="Belum ada laporan dihasilkan.">
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Dibuat</th><th>Jenis</th><th>Periode</th><th className="num">Baris</th>
                  <th>Sumber</th><th>Email</th><th></th>
                </tr>
              </thead>
              <tbody>
                {runRows.map((r: ReportRun) => (
                  <tr key={r.id}>
                    <td>{fmtDateTime(r.generated_at)}</td>
                    <td>{typeLabel(r.report_type)}</td>
                    <td>{fmtDate(r.period_from)} – {fmtDate(r.period_to)}</td>
                    <td className="num">{r.row_count}</td>
                    <td className="muted">{r.schedule_id ? 'Jadwal' : 'Manual'}</td>
                    <td>
                      {r.emailed_at ? (
                        <Badge tone="ok">Terkirim</Badge>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          disabled={r.row_count === 0}
                          onClick={() => downloadCsvFromRows(`laporan_${r.report_type}_${r.period_from}_sd_${r.period_to}`, r.summary)}
                        >
                          ⬇ CSV
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={sendEmail.isPending}
                          onClick={() => sendEmail.mutate(r.id)}
                        >
                          ✉ Email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Card>
    </div>
  );
}
