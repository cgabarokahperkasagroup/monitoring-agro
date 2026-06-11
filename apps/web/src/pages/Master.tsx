import { useMemo, useState } from 'react';
import { useBlocks, useDivisions, useEmployees, useEstates } from '@/lib/queries';
import { Badge, QueryState } from '@/components/ui';
import { n2 } from '@/lib/format';

type Tab = 'estates' | 'divisions' | 'blocks' | 'employees';
const TABS: { key: Tab; label: string }[] = [
  { key: 'estates', label: 'Estate' },
  { key: 'divisions', label: 'Divisi' },
  { key: 'blocks', label: 'Blok' },
  { key: 'employees', label: 'Karyawan' },
];

export default function Master() {
  const [tab, setTab] = useState<Tab>('estates');
  const estates = useEstates();
  const divisions = useDivisions();
  const blocks = useBlocks();
  const employees = useEmployees();

  const estateName = useMemo(() => {
    const m = new Map((estates.data ?? []).map((e) => [e.id, e.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [estates.data]);
  const divisionName = useMemo(() => {
    const m = new Map((divisions.data ?? []).map((d) => [d.id, d.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [divisions.data]);

  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'estates' && (
        <QueryState isLoading={estates.isLoading} error={estates.error} isEmpty={(estates.data ?? []).length === 0}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kode</th><th>Nama Estate</th></tr></thead>
              <tbody>
                {(estates.data ?? []).map((e) => (
                  <tr key={e.id}><td>{e.code}</td><td>{e.name}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      )}

      {tab === 'divisions' && (
        <QueryState isLoading={divisions.isLoading} error={divisions.error} isEmpty={(divisions.data ?? []).length === 0}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kode</th><th>Nama Divisi</th><th>Estate</th></tr></thead>
              <tbody>
                {(divisions.data ?? []).map((d) => (
                  <tr key={d.id}><td>{d.code}</td><td>{d.name}</td><td>{estateName(d.estate_id)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      )}

      {tab === 'blocks' && (
        <QueryState isLoading={blocks.isLoading} error={blocks.error} isEmpty={(blocks.data ?? []).length === 0}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kode</th><th>Nama</th><th>Divisi</th><th className="num">Luas (ha)</th></tr></thead>
              <tbody>
                {(blocks.data ?? []).map((b) => (
                  <tr key={b.id}>
                    <td>{b.code}</td><td>{b.name}</td><td>{divisionName(b.division_id)}</td>
                    <td className="num">{n2(b.luas_ha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      )}

      {tab === 'employees' && (
        <QueryState isLoading={employees.isLoading} error={employees.error} isEmpty={(employees.data ?? []).length === 0}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>NIK</th><th>Nama</th><th>Jabatan</th><th>Divisi</th><th>Status</th></tr></thead>
              <tbody>
                {(employees.data ?? []).map((e) => (
                  <tr key={e.id}>
                    <td>{e.nik}</td><td>{e.name}</td><td>{e.position ?? '—'}</td>
                    <td>{divisionName(e.division_id)}</td>
                    <td><Badge tone={e.status === 'active' ? 'ok' : 'neutral'}>{e.status ?? '—'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      )}
    </div>
  );
}
