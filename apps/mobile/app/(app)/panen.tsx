// =====================================================================
// Input Panen (offline). Field: tanggal, divisi, blok, TPH (opsional),
// angka panen (janjang dsb.), kehadiran & output per karyawan (opsional).
// Tulis ke DB lokal -> PowerSync upload saat online.
// =====================================================================
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useBlocks, useDivisions, useEmployees, useTph } from '@/lib/db/hooks';
import { num, saveHarvest } from '@/lib/db/write';
import { FormScreen } from '@/lib/FormScaffold';
import { today } from '@/lib/id';
import { PhotoField } from '@/lib/PhotoField';
import type { LocalPhoto } from '@/lib/photos/storage';
import { processPendingUploads } from '@/lib/photos/uploader';
import { useDeviceCoords } from '@/lib/location';
import { Card, Field, PickerField, TextField } from '@/lib/ui';

type AttRow = { key: string; employee_id: string | null; qty: string };

export default function PanenScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: divisions = [] } = useDivisions();
  const [divisionId, setDivisionId] = useState<string | null>(null);

  // Auto-pilih bila mandor hanya punya satu divisi (kasus umum).
  useEffect(() => {
    if (!divisionId && divisions.length === 1) setDivisionId(divisions[0].id);
  }, [divisions, divisionId]);

  const { data: blocks = [] } = useBlocks(divisionId);
  const { data: tphList = [] } = useTph(divisionId);
  const { data: employees = [] } = useEmployees(divisionId);

  const [blockId, setBlockId] = useState<string | null>(null);
  const [tphId, setTphId] = useState<string | null>(null);
  const [date, setDate] = useState(today());

  const [totalJanjang, setTotalJanjang] = useState('');
  const [estTonase, setEstTonase] = useState('');
  const [brondolan, setBrondolan] = useState('');
  const [buahMentah, setBuahMentah] = useState('');
  const [buahBusuk, setBuahBusuk] = useState('');
  const [basis, setBasis] = useState('');
  const [premi, setPremi] = useState('');
  const [notes, setNotes] = useState('');

  const [att, setAtt] = useState<AttRow[]>([]);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const { coords: gps, status: gpsStatus } = useDeviceCoords();
  const [saving, setSaving] = useState(false);

  const block = useMemo(() => blocks.find((b) => b.id === blockId), [blocks, blockId]);

  function addAtt() {
    setAtt((rows) => [...rows, { key: `${rows.length}-${Date.now()}`, employee_id: null, qty: '' }]);
  }
  function removeAtt(key: string) {
    setAtt((rows) => rows.filter((r) => r.key !== key));
  }
  function setAttField(key: string, patch: Partial<AttRow>) {
    setAtt((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    if (!user) return;
    if (!divisionId) return Alert.alert('Lengkapi data', 'Pilih divisi dulu.');
    if (!block) return Alert.alert('Lengkapi data', 'Pilih blok dulu.');
    if (!date.trim()) return Alert.alert('Lengkapi data', 'Tanggal wajib diisi.');
    if (num(totalJanjang) === null) {
      return Alert.alert('Lengkapi data', 'Total janjang wajib diisi.');
    }

    const attendance = att
      .filter((r) => r.employee_id)
      .map((r) => ({ employee_id: r.employee_id as string, output_qty: num(r.qty) }));

    setSaving(true);
    try {
      await saveHarvest({
        userId: user.id,
        block,
        tphId,
        date: date.trim(),
        notes,
        harvest: {
          total_janjang: num(totalJanjang),
          est_tonase: num(estTonase),
          brondolan_kg: num(brondolan),
          buah_mentah: num(buahMentah),
          buah_busuk: num(buahBusuk),
          basis: num(basis),
          premi: num(premi),
        },
        attendance,
        photos,
        gps,
      });
      // Coba upload foto sekarang bila online (kalau offline, antri otomatis).
      void processPendingUploads();
      Alert.alert('Tersimpan', 'Panen tersimpan di perangkat & akan disinkron saat online.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Gagal menyimpan', e?.message ?? 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen title="Input Panen" subtitle="Tersimpan lokal, sinkron otomatis" saving={saving} onSave={onSave}>
      <Field label="Tanggal" required>
        <TextField value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      </Field>

      <Field label="Divisi" required>
        <PickerField
          title="Pilih Divisi"
          value={divisionId}
          onSelect={(v) => {
            setDivisionId(v);
            setBlockId(null);
            setTphId(null);
            setAtt([]);
          }}
          options={divisions.map((d) => ({ value: d.id, label: d.name, sub: d.code }))}
        />
      </Field>

      <Field label="Blok" required>
        <PickerField
          title="Pilih Blok"
          value={blockId}
          onSelect={setBlockId}
          options={blocks.map((b) => ({ value: b.id, label: `Blok ${b.code}`, sub: b.name }))}
          placeholder={divisionId ? 'Pilih blok…' : 'Pilih divisi dulu'}
        />
      </Field>

      <Field label="TPH (opsional)">
        <PickerField
          title="Pilih TPH"
          value={tphId}
          onSelect={setTphId}
          options={tphList.map((t) => ({ value: t.id, label: `TPH ${t.code}`, sub: t.name }))}
          placeholder="Tanpa TPH"
        />
      </Field>

      <Card className="mb-4">
        <Text className="mb-3 text-base font-extrabold text-ink">Hasil Panen</Text>
        <Field label="Total janjang (TBS)" required>
          <TextField value={totalJanjang} onChangeText={setTotalJanjang} keyboardType="number-pad" placeholder="0" />
        </Field>
        <Field label="Estimasi tonase (kg)">
          <TextField value={estTonase} onChangeText={setEstTonase} keyboardType="decimal-pad" placeholder="0" />
        </Field>
        <Field label="Brondolan (kg)">
          <TextField value={brondolan} onChangeText={setBrondolan} keyboardType="decimal-pad" placeholder="0" />
        </Field>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Buah mentah">
              <TextField value={buahMentah} onChangeText={setBuahMentah} keyboardType="number-pad" placeholder="0" />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="Buah busuk">
              <TextField value={buahBusuk} onChangeText={setBuahBusuk} keyboardType="number-pad" placeholder="0" />
            </Field>
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Basis">
              <TextField value={basis} onChangeText={setBasis} keyboardType="decimal-pad" placeholder="0" />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="Premi">
              <TextField value={premi} onChangeText={setPremi} keyboardType="decimal-pad" placeholder="0" />
            </Field>
          </View>
        </View>
      </Card>

      <Card className="mb-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-ink">Kehadiran & Output (opsional)</Text>
          <Pressable onPress={addAtt} hitSlop={8} className="active:opacity-60">
            <Text className="text-sm font-bold text-primary">+ Tambah</Text>
          </Pressable>
        </View>
        {att.length === 0 ? (
          <Text className="text-sm text-faint">Tambah karyawan untuk mencatat janjang per orang.</Text>
        ) : (
          att.map((r) => (
            <View key={r.key} className="mb-2 flex-row items-start gap-2">
              <View className="flex-1">
                <PickerField
                  title="Pilih Karyawan"
                  value={r.employee_id}
                  onSelect={(v) => setAttField(r.key, { employee_id: v })}
                  options={employees.map((e) => ({ value: e.id, label: e.name, sub: e.nik }))}
                  placeholder="Pilih karyawan…"
                />
              </View>
              <View className="w-[90px]">
                <TextField
                  value={r.qty}
                  onChangeText={(v) => setAttField(r.key, { qty: v })}
                  keyboardType="number-pad"
                  placeholder="jjg"
                />
              </View>
              <Pressable
                onPress={() => removeAtt(r.key)}
                hitSlop={8}
                className="h-[52px] w-9 items-center justify-center active:opacity-60"
              >
                <Text className="text-lg text-danger">✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Field label="Foto bukti (opsional)">
        <PhotoField photos={photos} onChange={setPhotos} />
      </Field>

      <Field label="Lokasi GPS (otomatis)">
        <Text className="text-sm text-muted">
          {gpsStatus === 'ok' && gps
            ? `📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
            : gpsStatus === 'loading'
              ? 'Mengambil lokasi…'
              : gpsStatus === 'denied'
                ? 'Izin lokasi ditolak — kegiatan tetap tersimpan tanpa GPS.'
                : 'Lokasi tidak tersedia — tersimpan tanpa GPS.'}
        </Text>
      </Field>

      <Field label="Catatan (opsional)">
        <TextField value={notes} onChangeText={setNotes} placeholder="Keterangan tambahan…" multiline />
      </Field>
    </FormScreen>
  );
}
