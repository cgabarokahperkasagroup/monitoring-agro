// =====================================================================
// Edge Function: agro-email-report
// Kirim 1 laporan (report_runs) via Resend ke penerima jadwal.
//
// Dua mode otentikasi (verify_jwt = false; auth ditangani di dalam fungsi):
//  1) Dashboard: dipanggil dengan JWT pemanggil di Authorization -> dibaca
//     dengan token itu sehingga RLS membatasi ke admin.
//  2) Cron (pg_net): header `x-cron-secret` cocok dgn agro.app_config.cron_secret
//     -> mode service-role (baca run langsung). Secret bersifat rahasia (RLS
//     deny-all), jadi hanya cron internal yang bisa memicu mode ini.
//
// Secret yang dibutuhkan: RESEND_API_KEY (+ opsional REPORT_FROM_EMAIL).
// =====================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function esc(v: unknown): string {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function csvCell(v: unknown): string {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('REPORT_FROM_EMAIL') ?? 'Monitoring Agro <onboarding@resend.dev>';
    if (!resendKey) return json({ error: 'RESEND_API_KEY belum di-set di Supabase secrets.' }, 500);

    const body = await req.json().catch(() => ({}));
    const run_id = body.run_id;
    const to = body.to;
    if (!run_id) return json({ error: 'run_id wajib.' }, 400);

    const adminClient = createClient(url, service, { db: { schema: 'agro' } });

    // Pilih klien baca: mode cron (service) bila x-cron-secret valid, jika tidak
    // pakai token pemanggil (RLS => hanya admin yang dapat membaca).
    const cronSecret = req.headers.get('x-cron-secret');
    let reader = adminClient;
    if (cronSecret) {
      const { data: cfg } = await adminClient.from('app_config').select('value').eq('key', 'cron_secret').maybeSingle();
      if (!cfg || cfg.value !== cronSecret) return json({ error: 'cron secret tidak valid.' }, 403);
    } else {
      const authHeader = req.headers.get('Authorization') ?? '';
      reader = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, db: { schema: 'agro' } });
    }

    const { data: run, error } = await reader
      .from('report_runs')
      .select('id, report_type, period_from, period_to, row_count, summary, report_schedules(name, email_recipients)')
      .eq('id', run_id)
      .maybeSingle();
    if (error) return json({ error: error.message }, 400);
    if (!run) return json({ error: 'Laporan tidak ditemukan / tidak diizinkan.' }, 403);

    const sched = (run as any).report_schedules;
    const recipients: string[] = (Array.isArray(to) && to.length ? to : sched?.email_recipients) ?? [];
    if (!recipients.length) return json({ error: 'Tidak ada penerima email pada jadwal ini.' }, 400);

    const rows: Record<string, unknown>[] = Array.isArray((run as any).summary) ? (run as any).summary : [];
    const keys = rows.length ? Object.keys(rows[0]) : [];
    const html = `
      <h2>Laporan ${esc((run as any).report_type)}</h2>
      <p>Periode ${esc((run as any).period_from)} – ${esc((run as any).period_to)} · ${esc((run as any).row_count)} baris</p>
      ${rows.length
        ? `<table border="1" cellpadding="6" style="border-collapse:collapse">
            <thead><tr>${keys.map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead>
            <tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody>
           </table>`
        : '<p>(tidak ada data pada periode ini)</p>'}
      <p style="color:#888;font-size:12px">Monitoring Agro — laporan otomatis.</p>`;
    const csv = `sep=,\r\n${keys.join(',')}\r\n${rows.map((r) => keys.map((k) => csvCell(r[k])).join(',')).join('\r\n')}`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: `Laporan ${(run as any).report_type} (${(run as any).period_from} – ${(run as any).period_to})`,
        html,
        attachments: [
          { filename: `laporan_${(run as any).report_type}_${(run as any).period_from}.csv`, content: toBase64(csv) },
        ],
      }),
    });
    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ error: result?.message ?? 'Gagal mengirim via Resend.', detail: result }, 502);

    await adminClient.from('report_runs').update({ emailed_at: new Date().toISOString() }).eq('id', run_id);
    return json({ ok: true, sent_to: recipients, id: result?.id });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'error' }, 500);
  }
});
