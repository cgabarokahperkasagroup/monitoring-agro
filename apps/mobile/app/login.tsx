// =====================================================================
// Login mandor/asisten (Supabase Auth, email + password).
// Setelah sukses, AuthProvider memulai PowerSync & AuthGate mengarahkan
// ke daftar kegiatan.
// =====================================================================
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button, Field, TextField } from '@/lib/ui';

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
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-10 items-center">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl border border-card-border bg-white">
              <Image
                source={require('../assets/logo-bpg.png')}
                className="h-14 w-14"
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-extrabold text-primary-dark">Monitoring Agro</Text>
            <Text className="mt-1 text-sm text-muted">Pencatatan kegiatan kebun — offline-first</Text>
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

          {error ? (
            <Text className="mb-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</Text>
          ) : null}

          <Button title="Masuk" onPress={onSubmit} loading={loading} className="mt-2" />

          <Text className="mt-8 text-center text-xs text-faint">
            Akun dibuat oleh admin. Hubungi admin grup bila lupa kata sandi.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
