// =====================================================================
// Edge Function: agro-create-user
// Buat akun pengguna (Supabase Auth) + set profil (role) & cakupan.
// Dua mode:
//  - default: createUser + password sementara (dibagikan admin).
//  - invite (body.invite=true): generateLink('invite') -> kirim email
//    undangan via RESEND (tautan ke {redirect_to} utk set password).
// Hanya admin grup / super admin (diverifikasi via token pemanggil).
// =====================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
function genPassword(): string {
  return 'Agro' + crypto.randomUUID().replace(/-/g, '').slice(0, 8) + '!9';
}
const ROLES = ['mandor', 'asisten', 'manager_kebun', 'admin_grup', 'super_admin'];
const ROLE_LABEL: Record<string, string> = {
  mandor: 'Mandor', asisten: 'Asisten', manager_kebun: 'Manajer Kebun',
  admin_grup: 'Admin Grup', super_admin: 'Super Admin',
};

// deno-lint-ignore no-explicit-any
async function applyProfileAndScopes(admin: any, userId: string, full_name: string | null, role: string, body: any) {
  const { error } = await admin.from('profiles').upsert({ id: userId, full_name, role, is_active: true });
  if (error) return error.message as string;
  if (Array.isArray(body.scopes) && body.scopes.length) {
    const rows = body.scopes
      .filter((s: any) => s?.scope_type && s?.scope_id)
      .map((s: any) => ({ user_id: userId, scope_type: s.scope_type, scope_id: s.scope_id }));
    if (rows.length) await admin.from('user_scopes').insert(rows);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: ures } = await caller.auth.getUser();
    if (!ures?.user) return json({ error: 'Tidak terautentikasi.' }, 401);

    const admin = createClient(url, service, { db: { schema: 'agro' } });
    const { data: prof } = await admin.from('profiles').select('role').eq('id', ures.user.id).maybeSingle();
    if (!prof || !['admin_grup', 'super_admin'].includes(prof.role)) {
      return json({ error: 'Hanya admin grup / super admin yang dapat membuat akun.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const full_name = String(body.full_name ?? '').trim() || null;
    const role = body.role ?? 'mandor';
    if (!email) return json({ error: 'Email wajib diisi.' }, 400);
    if (!ROLES.includes(role)) return json({ error: 'Role tidak valid.' }, 400);

    // ---------- MODE UNDANGAN EMAIL ----------
    if (body.invite === true) {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) return json({ error: 'RESEND_API_KEY belum di-set (untuk email undangan).' }, 500);

      const { data: link, error: lerr } = await admin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { data: full_name ? { full_name } : {}, redirectTo: body.redirect_to || undefined },
      });
      if (lerr || !link?.user) return json({ error: lerr?.message ?? 'Gagal membuat undangan.' }, 400);
      const userId = link.user.id;

      const profErr = await applyProfileAndScopes(admin, userId, full_name, role, body);
      if (profErr) return json({ error: `Undangan dibuat, tetapi gagal mengatur profil: ${profErr}`, user_id: userId }, 207);

      const actionLink = (link.properties as { action_link?: string })?.action_link ?? '';
      const fromEmail = Deno.env.get('REPORT_FROM_EMAIL') ?? 'Monitoring Agro <onboarding@resend.dev>';
      const html = `
        <h2>Undangan Monitoring Agro</h2>
        <p>Halo${full_name ? ' ' + full_name : ''}, Anda diundang sebagai <strong>${ROLE_LABEL[role] ?? role}</strong>.</p>
        <p>Klik tombol di bawah untuk mengatur kata sandi dan masuk:</p>
        <p><a href="${actionLink}" style="display:inline-block;background:#15803d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Set Password & Masuk</a></p>
        <p style="color:#888;font-size:12px">Jika tombol tidak berfungsi, salin tautan ini:<br>${actionLink}</p>`;

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: [email], subject: 'Undangan Monitoring Agro', html }),
      });
      const r = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return json({ ok: true, invited: true, email, user_id: userId, email_error: r?.message ?? 'Email gagal terkirim (akun tetap dibuat).' }, 207);
      }
      return json({ ok: true, invited: true, email, user_id: userId });
    }

    // ---------- MODE PASSWORD SEMENTARA (default) ----------
    const useProvided = typeof body.password === 'string' && body.password.length >= 8;
    const password = useProvided ? body.password : genPassword();
    const { data: created, error: cerr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: full_name ? { full_name } : {},
    });
    if (cerr || !created?.user) return json({ error: cerr?.message ?? 'Gagal membuat akun.' }, 400);
    const userId = created.user.id;

    const profErr = await applyProfileAndScopes(admin, userId, full_name, role, body);
    if (profErr) return json({ error: `Akun dibuat, tetapi gagal mengatur profil: ${profErr}`, user_id: userId }, 207);

    return json({ ok: true, user_id: userId, email, password: useProvided ? undefined : password });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'error' }, 500);
  }
});
