// =====================================================================
// Indikator status sinkron (PRD §5.5): jelas terlihat oleh mandor.
// Tersimpan lokal -> Menunggu sinkron -> Terkirim, plus "terakhir sinkron".
// =====================================================================
import { useStatus } from '@powersync/react';
import React from 'react';
import { Text, View } from 'react-native';

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

type Tone = { box: string; dot: string; text: string };
const TONE: Record<'offline' | 'busy' | 'ok', Tone> = {
  offline: { box: 'bg-warn-soft', dot: 'bg-warn', text: 'text-warn' },
  busy: { box: 'bg-accent-soft', dot: 'bg-accent', text: 'text-accent' },
  ok: { box: 'bg-primary-soft', dot: 'bg-primary', text: 'text-primary-dark' },
};

export function SyncBanner() {
  const status = useStatus();
  const connected = status?.connected ?? false;
  const uploading = status?.dataFlowStatus?.uploading ?? false;
  const downloading = status?.dataFlowStatus?.downloading ?? false;

  let tone: Tone;
  let label: string;

  if (!connected) {
    tone = TONE.offline;
    label = 'Offline — data tersimpan lokal';
  } else if (uploading || downloading) {
    tone = TONE.busy;
    label = uploading ? 'Mengirim perubahan…' : 'Menarik data…';
  } else {
    tone = TONE.ok;
    label = 'Tersinkron';
  }

  return (
    <View className={`flex-row items-center rounded-full px-4 py-2 ${tone.box}`}>
      <View className={`mr-2 h-2 w-2 rounded-full ${tone.dot}`} />
      <Text className={`text-sm font-bold ${tone.text}`}>{label}</Text>
      <Text className={`ml-auto text-xs opacity-90 ${tone.text}`}>sinkron {timeAgo(status?.lastSyncedAt)}</Text>
    </View>
  );
}
