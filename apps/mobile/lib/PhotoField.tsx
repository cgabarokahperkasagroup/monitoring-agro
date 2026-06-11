// =====================================================================
// Pemilih foto bukti (opsional) — kamera atau galeri. Terkontrol via props.
// Foto disimpan sebagai URI lokal; kompres & persist saat kegiatan disimpan.
// =====================================================================
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { newId } from './id';
import type { LocalPhoto } from './photos/storage';
import { colors, font, radius, space } from './theme';

export function PhotoField({
  photos,
  onChange,
  max = 4,
}: {
  photos: LocalPhoto[];
  onChange: (next: LocalPhoto[]) => void;
  max?: number;
}) {
  function add(uri: string) {
    if (photos.length >= max) {
      Alert.alert('Batas foto', `Maksimal ${max} foto per kegiatan.`);
      return;
    }
    onChange([...photos, { id: newId(), uri }]);
  }
  function remove(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin kamera', 'Aktifkan izin kamera untuk mengambil foto bukti.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]) add(res.assets[0].uri);
  }

  async function fromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin galeri', 'Aktifkan izin galeri untuk memilih foto.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]) add(res.assets[0].uri);
  }

  return (
    <View>
      <View style={styles.thumbs}>
        {photos.map((p) => (
          <View key={p.id} style={styles.thumbWrap}>
            <Image source={{ uri: p.uri }} style={styles.thumb} />
            <Pressable onPress={() => remove(p.id)} style={styles.removeBadge} hitSlop={6}>
              <Text style={styles.removeX}>✕</Text>
            </Pressable>
          </View>
        ))}
        {photos.length < max ? (
          <View style={styles.addRow}>
            <Pressable onPress={fromCamera} style={styles.addBtn}>
              <Text style={styles.addIcon}>📷</Text>
              <Text style={styles.addLabel}>Kamera</Text>
            </Pressable>
            <Pressable onPress={fromGallery} style={styles.addBtn}>
              <Text style={styles.addIcon}>🖼</Text>
              <Text style={styles.addLabel}>Galeri</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <Text style={styles.hint}>
        {photos.length}/{max} foto · opsional, dikompres & di-upload saat online.
      </Text>
    </View>
  );
}

const THUMB = 76;
const styles = StyleSheet.create({
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.card },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeX: { color: colors.white, fontSize: 12, fontWeight: '800', lineHeight: 14 },
  addRow: { flexDirection: 'row', gap: space.sm },
  addBtn: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addIcon: { fontSize: 22 },
  addLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600' },
  hint: { fontSize: font.xs, color: colors.textFaint, marginTop: space.sm },
});
