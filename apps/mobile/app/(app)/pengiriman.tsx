// =====================================================================
// Input Pengiriman TBS ke PKS (offline). Field: tanggal, divisi, TPH asal,
// SPB, kendaraan, sopir, tujuan PKS, janjang & tonase muat, jam berangkat.
// =====================================================================
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDivisions, useTph } from '@/lib/db/hooks';
import { num, saveDelivery } from '@/lib/db/write';
import { FormScreen } from '@/lib/FormScaffold';
import { today } from '@/lib/id';
import { Card, Field, PickerField, TextField } from '@/lib/ui';
import { colors, font, space } from '@/lib/theme';

export default function PengirimanScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: divisions = [] } = useDivisions();
  const [divisionId, setDivisionId] = useState<string | null>(null);

  useEffect(() => {
    if (!divisionId && divisions.length === 1) setDivisionId(divisions[0].id);
  }, [divisions, divisionId]);

  const { data: tphList = [] } = useTph(divisionId);

  const [tphId, setTphId] = useState<string | null>(null);
  const [date, setDate] = useState(today());

  const [spb, setSpb] = useState('');
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [pks, setPks] = useState('');
  const [totalJanjang, setTotalJanjang] = useState('');
  const [tonase, setTonase] = useState('');
  const [departTime, setDepartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const tph = useMemo(() => tphList.find((t) => t.id === tphId), [tphList, tphId]);

  async function onSave() {
    if (!user) return;
    if (!divisionId) return Alert.alert('Lengkapi data', 'Pilih divisi dulu.');
    if (!tph) return Alert.alert('Lengkapi data', 'Pilih TPH asal dulu.');
    if (!date.trim()) return Alert.alert('Lengkapi data', 'Tanggal wajib diisi.');
    if (!spb.trim()) return Alert.alert('Lengkapi data', 'Nomor SPB/surat jalan wajib diisi.');

    setSaving(true);
    try {
      await saveDelivery({
        userId: user.id,
        tph,
        date: date.trim(),
        notes,
        delivery: {
          spb_number: spb.trim() || null,
          vehicle_plate: plate.trim() || null,
          driver_name: driver.trim() || null,
          destination_pks: pks.trim() || null,
          total_janjang: num(totalJanjang),
          est_tonase_muat: num(tonase),
          depart_time: departTime.trim() || null,
        },
      });
      Alert.alert('Tersimpan', 'Pengiriman tersimpan di perangkat & akan disinkron saat online.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Gagal menyimpan', e?.message ?? 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen title="Pengiriman TBS" subtitle="Tersimpan lokal, sinkron otomatis" saving={saving} onSave={onSave}>
      <Field label="Tanggal" required>
        <TextField value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      </Field>

      <Field label="Divisi" required>
        <PickerField
          title="Pilih Divisi"
          value={divisionId}
          onSelect={(v) => {
            setDivisionId(v);
            setTphId(null);
          }}
          options={divisions.map((d) => ({ value: d.id, label: d.name, sub: d.code }))}
        />
      </Field>

      <Field label="TPH asal" required>
        <PickerField
          title="Pilih TPH"
          value={tphId}
          onSelect={setTphId}
          options={tphList.map((t) => ({ value: t.id, label: `TPH ${t.code}`, sub: t.name }))}
          placeholder={divisionId ? 'Pilih TPH…' : 'Pilih divisi dulu'}
        />
      </Field>

      <Card style={{ marginBottom: space.lg }}>
        <Text style={styles.cardHead}>Surat Jalan</Text>
        <Field label="Nomor SPB / surat jalan" required>
          <TextField value={spb} onChangeText={setSpb} placeholder="SPB-000123" autoCapitalize="characters" />
        </Field>
        <View style={styles.row2}>
          <View style={styles.col}>
            <Field label="Nopol kendaraan">
              <TextField value={plate} onChangeText={setPlate} placeholder="KT 1234 AB" autoCapitalize="characters" />
            </Field>
          </View>
          <View style={styles.col}>
            <Field label="Jam berangkat">
              <TextField value={departTime} onChangeText={setDepartTime} placeholder="14:30" />
            </Field>
          </View>
        </View>
        <Field label="Nama sopir">
          <TextField value={driver} onChangeText={setDriver} placeholder="Nama sopir" autoCapitalize="words" />
        </Field>
        <Field label="Tujuan PKS">
          <TextField value={pks} onChangeText={setPks} placeholder="PKS tujuan" autoCapitalize="words" />
        </Field>
      </Card>

      <Card style={{ marginBottom: space.lg }}>
        <Text style={styles.cardHead}>Muatan</Text>
        <View style={styles.row2}>
          <View style={styles.col}>
            <Field label="Total janjang">
              <TextField value={totalJanjang} onChangeText={setTotalJanjang} keyboardType="number-pad" placeholder="0" />
            </Field>
          </View>
          <View style={styles.col}>
            <Field label="Est. tonase muat (kg)">
              <TextField value={tonase} onChangeText={setTonase} keyboardType="decimal-pad" placeholder="0" />
            </Field>
          </View>
        </View>
        <Text style={styles.hint}>
          Tonase final dari timbangan pabrik diisi/direkonsiliasi belakangan.
        </Text>
      </Card>

      <Field label="Catatan (opsional)">
        <TextField value={notes} onChangeText={setNotes} placeholder="Keterangan tambahan…" multiline />
      </Field>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  cardHead: { fontSize: font.md, fontWeight: '800', color: colors.text, marginBottom: space.md },
  row2: { flexDirection: 'row', gap: space.md },
  col: { flex: 1 },
  hint: { fontSize: font.xs, color: colors.textMuted },
});
