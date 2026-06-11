// =====================================================================
// Root layout: provider Auth + PowerSync, lalu gerbang redirect
// (belum login -> /login, sudah login -> /(app)).
// =====================================================================
import { PowerSyncContext } from '@powersync/react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider';
import { db } from '@/lib/powersync/system';
import { colors } from '@/lib/theme';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const onLogin = segments[0] === 'login';
    const inApp = segments[0] === '(app)';
    if (!session && !onLogin) {
      router.replace('/login');
    } else if (session && !inApp) {
      router.replace('/(app)');
    }
  }, [session, initializing, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PowerSyncContext.Provider value={db}>
        <AuthProvider>
          <StatusBar style="dark" />
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
          </AuthGate>
        </AuthProvider>
      </PowerSyncContext.Provider>
    </SafeAreaProvider>
  );
}
