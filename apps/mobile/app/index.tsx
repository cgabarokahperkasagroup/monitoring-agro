// Splash singkat saat memulihkan sesi. AuthGate yang mengarahkan ke
// /login atau /(app); layar ini hanya tampil sekejap.
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-2xl font-extrabold text-primary-dark">Monitoring Agro</Text>
      <ActivityIndicator color={colors.primary} className="mt-4" />
    </View>
  );
}
