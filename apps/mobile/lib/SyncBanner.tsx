// =====================================================================
// Indikator status sinkron (PRD §5.5): jelas terlihat oleh mandor.
// Tersimpan lokal -> Menunggu sinkron -> Terkirim, plus "terakhir sinkron".
// =====================================================================
import { useStatus } from '@powersync/react';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from './theme';

function timeAgo(iso?: Date | null): string {
  if (!iso) return 'belum pernah';
  const d = iso instanceof Date ? iso : new Date(iso);
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec} dtk lalu`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

export function SyncBanner() {
  const status = useStatus();
  const connected = status?.connected ?? false;
  const uploading = status?.dataFlowStatus?.uploading ?? false;
  const downloading = status?.dataFlowStatus?.downloading ?? false;

  let tone: { bg: string; fg: string; dot: string };
  let label: string;

  if (!connected) {
    tone = { bg: colors.warnSoft, fg: colors.warn, dot: colors.warn };
    label = 'Offline — data tersimpan lokal';
  } else if (uploading || downloading) {
    tone = { bg: '#E0F2FE', fg: colors.accent, dot: colors.accent };
    label = uploading ? 'Mengirim perubahan…' : 'Menarik data…';
  } else {
    tone = { bg: colors.primarySoft, fg: colors.primaryDark, dot: colors.primary };
    label = 'Tersinkron';
  }

  return (
    <View style={[styles.wrap, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.label, { color: tone.fg }]}>{label}</Text>
      <Text style={[styles.sub, { color: tone.fg }]}>
        sinkron {timeAgo(status?.lastSyncedAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: space.sm },
  label: { fontSize: font.sm, fontWeight: '700' },
  sub: { fontSize: font.xs, marginLeft: 'auto', opacity: 0.9 },
});
