import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { fieldOptions, type MasterCtx, type MasterEntity } from '@/lib/master';
import { Field, Modal } from './ui';

export function MasterFormModal({
  entity,
  ctx,
  row,
  onClose,
  onSaved,
}: {
  entity: MasterEntity | null;
  ctx: MasterCtx;
  row: Record<string, any> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!entity) return;
    const init: Record<string, string> = {};
    for (const f of entity.fields) {
      const v = row ? row[f.key] : '';
      init[f.key] = v == null ? '' : String(v);
    }
    setForm(init);
    setErr(null);
  }, [entity, row]);

  const save = useMutation({
    mutationFn: async () => {
      if (!entity) return;
      for (const f of entity.fields) {
        if (f.required && !(form[f.key] ?? '').toString().trim()) {
          throw new Error(`${f.label} wajib diisi.`);
        }
      }
      const payload = entity.payload(form, ctx);
      if (row?.id) {
        const { error } = await supabase.from(entity.table).update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(entity.table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal menyimpan.'),
  });

  return (
    <Modal
      open={!!entity}
      onClose={onClose}
      title={entity ? `${row ? 'Edit' : 'Tambah'} ${entity.label}` : ''}
    >
      {entity ? (
        <>
          {err ? <div className="error-box" style={{ marginBottom: 14 }}>{err}</div> : null}
          {entity.fields.map((f) => (
            <Field key={f.key} label={f.required ? `${f.label} *` : f.label}>
              {f.type === 'select' ? (
                <select
                  className="select"
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                >
                  <option value="">{f.required ? 'Pilih…' : '—'}</option>
                  {fieldOptions(f, ctx).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              )}
            </Field>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {row ? 'Simpan perubahan' : 'Tambah'}
            </button>
            <button className="btn" onClick={onClose}>Batal</button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
