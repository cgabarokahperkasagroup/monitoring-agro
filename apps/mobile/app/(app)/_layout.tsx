// Layout grup terproteksi. Header kustom diatur per layar (desain putih).
import { Stack } from 'expo-router';
import React from 'react';
import { useAttachmentSync } from '@/lib/photos/useAttachmentSync';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  // Flush antrian upload foto saat online (dan sekali saat masuk app).
  useAttachmentSync();

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
