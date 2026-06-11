// =====================================================================
// Kerangka layar form: header (tombol kembali + judul), area scroll,
// dan bilah "Simpan" menempel di bawah. Dipakai Panen & Pengiriman.
// =====================================================================
import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './ui';
import { colors, font, space } from './theme';

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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>

        <View style={styles.saveBar}>
          <Button title={saveLabel} onPress={onSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  back: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: colors.text, marginTop: -4 },
  title: { fontSize: font.lg, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.xs, color: colors.textMuted },
  scroll: { padding: space.lg, paddingBottom: space.xxl },
  saveBar: {
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.card,
    backgroundColor: colors.bg,
  },
});
