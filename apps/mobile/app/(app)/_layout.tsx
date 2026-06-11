// Layout grup terproteksi. Header kustom diatur per layar (desain putih).
import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
