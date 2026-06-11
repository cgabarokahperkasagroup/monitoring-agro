// =====================================================================
// Login mandor/asisten (Supabase Auth, email + password).
// Setelah sukses, AuthProvider memulai PowerSync & AuthGate mengarahkan
// ke daftar kegiatan.
// =====================================================================
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button, Field, TextField } from '@/lib/ui';
import { colors, font, space } from '@/lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
    // Sukses: AuthGate yang mengarahkan ke /(app).
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logoDot} />
            <Text style={styles.title}>Monitoring Agro</Text>
            <Text style={styles.subtitle}>Pencatatan kegiatan kebun — offline-first</Text>
          </View>

          <Field label="Email">
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="mandor1@barokah.test"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>

          <Field label="Password">
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />
          </Field>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Masuk" onPress={onSubmit} loading={loading} style={{ marginTop: space.sm }} />

          <Text style={styles.note}>
            Akun dibuat oleh admin. Hubungi admin grup bila lupa kata sandi.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
  brand: { alignItems: 'center', marginBottom: space.xxl },
  logoDot: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    marginBottom: space.lg,
  },
  title: { fontSize: font.xxl, fontWeight: '800', color: colors.primaryDark },
  subtitle: { fontSize: font.sm, color: colors.textMuted, marginTop: space.xs },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: space.md,
    borderRadius: 10,
    marginBottom: space.md,
    fontSize: font.sm,
  },
  note: { fontSize: font.xs, color: colors.textFaint, textAlign: 'center', marginTop: space.xl },
});
