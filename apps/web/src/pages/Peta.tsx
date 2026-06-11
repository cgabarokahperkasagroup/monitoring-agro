import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  useActivitiesGeo,
  useDivisions,
  useEstates,
  type ActivityFilters,
  type GeoActivity,
} from '@/lib/queries';
import { Card, Field, QueryState } from '@/components/ui';
import { daysAgoIso, fmtDate, n, todayIso } from '@/lib/format';

const PANEN = '#15803d';
const KIRIM = '#0e7490';

// Pusat default: kira-kira tengah Indonesia.
const DEFAULT_CENTER: [number, number] = [-1.5, 117];

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
  }, [points, map]);
  return null;
}

export default function Peta() {
  const [type, setType] = useState<ActivityFilters['type']>('all');
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

  const { data, isLoading, error } = useActivitiesGeo({ type, estateId, divisionId, from, to });
  const points = data ?? [];
  const latlngs = useMemo<[number, number][]>(() => points.map((p) => [p.lat, p.lng]), [points]);

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="filters">
          <Field label="Jenis">
            <select className="select" value={type} onChange={(e) => setType(e.target.value as ActivityFilters['type'])}>
              <option value="all">Semua</option>
              <option value="panen">Panen</option>
              <option value="pengiriman">Pengiriman</option>
            </select>
          </Field>
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
          <Field label="Divisi">
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

      <Card>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <span className="muted">{points.length} kegiatan ber-GPS</span>
          <div className="pva-legend" style={{ margin: 0 }}>
            <span><i className="pva-key" style={{ background: PANEN }} /> Panen</span>
            <span><i className="pva-key" style={{ background: KIRIM }} /> Pengiriman</span>
          </div>
        </div>

        <QueryState
          isLoading={isLoading}
          error={error}
          isEmpty={points.length === 0}
          emptyText="Belum ada kegiatan dengan koordinat GPS pada filter ini. GPS direkam otomatis dari aplikasi mobile saat menyimpan."
        >
          <div className="map-wrap">
            <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {points.map((p: GeoActivity) => {
                const color = p.activity_type === 'panen' ? PANEN : KIRIM;
                return (
                  <CircleMarker
                    key={p.id}
                    center={[p.lat, p.lng]}
                    radius={7}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1 }}
                  >
                    <Popup>
                      <strong>{p.activity_type === 'panen' ? 'Panen' : 'Pengiriman'}</strong>
                      <br />
                      {fmtDate(p.activity_date)}
                      {p.division_name ? ` · ${p.division_name}` : ''}
                      {p.block_code ? ` · Blok ${p.block_code}` : ''}
                      <br />
                      {n(p.janjang)} janjang
                    </Popup>
                  </CircleMarker>
                );
              })}
              <FitBounds points={latlngs} />
            </MapContainer>
          </div>
        </QueryState>
      </Card>
    </div>
  );
}
