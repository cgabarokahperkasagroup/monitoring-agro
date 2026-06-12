// =====================================================================
// Pemilih foto bukti (opsional) — kamera atau galeri. Terkontrol via props.
// Foto disimpan sebagai URI lokal; kompres & persist saat kegiatan disimpan.
// =====================================================================
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { newId } from './id';
import type { LocalPhoto } from './photos/storage';

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
      <View className="flex-row flex-wrap items-center gap-2">
        {photos.map((p) => (
          <View key={p.id} className="h-[76px] w-[76px]">
            <Image source={{ uri: p.uri }} className="h-[76px] w-[76px] rounded-lg bg-card" />
            <Pressable
              onPress={() => remove(p.id)}
              hitSlop={6}
              className="absolute -right-1.5 -top-1.5 h-[22px] w-[22px] items-center justify-center rounded-full bg-danger"
            >
              <Text className="text-xs font-extrabold leading-[14px] text-white">✕</Text>
            </Pressable>
          </View>
        ))}
        {photos.length < max ? (
          <View className="flex-row gap-2">
            <Pressable
              onPress={fromCamera}
              className="h-[76px] w-[76px] items-center justify-center gap-0.5 rounded-lg border border-dashed border-border active:opacity-70"
            >
              <Text className="text-xl">📷</Text>
              <Text className="text-xs font-semibold text-muted">Kamera</Text>
            </Pressable>
            <Pressable
              onPress={fromGallery}
              className="h-[76px] w-[76px] items-center justify-center gap-0.5 rounded-lg border border-dashed border-border active:opacity-70"
            >
              <Text className="text-xl">🖼</Text>
              <Text className="text-xs font-semibold text-muted">Galeri</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <Text className="mt-2 text-xs text-faint">
        {photos.length}/{max} foto · opsional, dikompres & di-upload saat online.
      </Text>
    </View>
  );
}
