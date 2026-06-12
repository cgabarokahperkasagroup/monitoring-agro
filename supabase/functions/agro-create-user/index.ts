// =====================================================================
// Edge Function: agro-create-user
// Buat akun pengguna (Supabase Auth) + set profil (role) & cakupan.
// Hanya boleh dipanggil admin grup / super admin (diverifikasi via token
// pemanggil). Memakai service role untuk admin API + tulis profiles/scopes.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verifikasi pemanggil = admin (pakai token pemanggil + cek profil via service).
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

    const useProvided = typeof body.password === 'string' && body.password.length >= 8;
    const password = useProvided ? body.password : genPassword();

    // Buat akun (email langsung dikonfirmasi).
    const { data: created, error: cerr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: full_name ? { full_name } : {},
    });
    if (cerr || !created?.user) return json({ error: cerr?.message ?? 'Gagal membuat akun.' }, 400);
    const userId = created.user.id;

    // Trigger auto-create membuat profil (mandor); sesuaikan role & nama.
    const { error: perr } = await admin
      .from('profiles')
      .upsert({ id: userId, full_name, role, is_active: true });
    if (perr) return json({ error: `Akun dibuat, tetapi gagal mengatur profil: ${perr.message}`, user_id: userId }, 207);

    // Cakupan opsional.
    if (Array.isArray(body.scopes) && body.scopes.length) {
      const rows = body.scopes
        .filter((s: any) => s?.scope_type && s?.scope_id)
        .map((s: any) => ({ user_id: userId, scope_type: s.scope_type, scope_id: s.scope_id }));
      if (rows.length) await admin.from('user_scopes').insert(rows);
    }

    return json({ ok: true, user_id: userId, email, password: useProvided ? undefined : password });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'error' }, 500);
  }
});
