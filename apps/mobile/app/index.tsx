// Splash singkat saat memulihkan sesi. AuthGate yang mengarahkan ke
// /login atau /(app); layar ini hanya tampil sekejap.
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '@/lib/theme';

export default function Index() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Monitoring Agro</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: space.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontSize: font.xl, fontWeight: '800', color: colors.primaryDark },
});
