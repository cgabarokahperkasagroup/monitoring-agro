// =====================================================================
// Kerangka layar form: header (tombol kembali + judul), area scroll,
// dan bilah "Simpan" menempel di bawah. Dipakai Panen & Pengiriman.
// =====================================================================
import { useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './ui';

export function FormScreen({
  title,
  subtitle,
  saving,
  saveLabel = 'Simpan',
  onSave,
  children,
}: {
  title: string;
  subtitle?: string;
  saving?: boolean;
  saveLabel?: string;
  onSave: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center border-b border-card px-3 py-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="h-11 w-10 items-center justify-center active:opacity-60"
        >
          <Text className="-mt-1 text-3xl text-ink">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-ink">{title}</Text>
          {subtitle ? <Text className="text-xs text-muted">{subtitle}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>

        <View className="border-t border-card bg-bg p-4">
          <Button title={saveLabel} onPress={onSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
