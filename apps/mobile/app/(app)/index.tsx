// =====================================================================
// Daftar Kegiatan — beranda mandor.
//  - Banner status sinkron
//  - Aksi cepat: input Panen / Pengiriman
//  - Daftar kegiatan terbaru (dari DB lokal, offline-aman)
// =====================================================================
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useRecentActivities } from '@/lib/db/hooks';
import { submitActivity } from '@/lib/db/write';
import type { ActivityRow } from '@/lib/db/types';
import { SyncBanner } from '@/lib/SyncBanner';
import { Badge, Card, EmptyState } from '@/lib/ui';

function fmtDate(d: string): string {
  // YYYY-MM-DD -> DD/MM/YYYY
  const [y, m, day] = (d || '').split('-');
  return y ? `${day}/${m}/${y}` : d;
}

function statusTone(s: string | null): 'neutral' | 'ok' | 'warn' | 'info' {
  switch (s) {
    case 'approved':
      return 'ok';
    case 'submitted':
      return 'info';
    case 'rejected':
      return 'warn';
    default:
      return 'neutral';
  }
}

function statusLabel(s: string | null): string {
  switch (s) {
    case 'approved':
      return 'Disetujui';
    case 'submitted':
      return 'Menunggu verifikasi';
    case 'rejected':
      return 'Ditolak';
    case 'draft':
      return 'Draft';
    default:
      return s || '—';
  }
}

function ActivityCard({
  item,
  userId,
  onSubmit,
}: {
  item: ActivityRow;
  userId?: string;
  onSubmit: (item: ActivityRow) => void;
}) {
  const isPanen = item.activity_type === 'panen';
  // Pemilik boleh mengirim untuk verifikasi saat masih draft / ditolak.
  const canSubmit =
    !!userId && item.created_by === userId && (item.status === 'draft' || item.status === 'rejected');
  return (
    <Card className="mb-3">
      <View className="mb-2 flex-row justify-between">
        <Badge text={isPanen ? '🌴 Panen' : '🚚 Pengiriman'} tone={isPanen ? 'ok' : 'info'} />
        <Badge text={statusLabel(item.status)} tone={statusTone(item.status)} />
      </View>
      <Text className="text-lg font-extrabold text-ink">
        {isPanen
          ? `${item.total_janjang ?? 0} janjang`
          : item.spb_number
            ? `SPB ${item.spb_number}`
            : `${item.total_janjang ?? 0} janjang`}
      </Text>
      <Text className="mt-1 text-sm text-muted">
        {fmtDate(item.activity_date)}
        {item.division_name ? ` · ${item.division_name}` : ''}
        {item.block_code ? ` · Blok ${item.block_code}` : ''}
      </Text>
      {item.notes ? <Text className="mt-2 text-sm text-faint">{item.notes}</Text> : null}
      {canSubmit ? (
        <Pressable
          onPress={() => onSubmit(item)}
          className="mt-3 items-center rounded-xl bg-primary py-2 active:opacity-80"
        >
          <Text className="text-sm font-extrabold text-white">Kirim untuk verifikasi</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export default function DaftarKegiatan() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: activities, isLoading } = useRecentActivities();

  function onSubmit(item: ActivityRow) {
    Alert.alert(
      'Kirim untuk verifikasi?',
      'Setelah dikirim, kegiatan menunggu persetujuan asisten/manajer dan tidak bisa diubah lagi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kirim',
          onPress: async () => {
            try {
              await submitActivity(item.id);
            } catch (e: any) {
              Alert.alert('Gagal', e?.message ?? 'Tidak bisa mengirim.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'left', 'right']}>
      <FlatList
        data={activities ?? []}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ActivityCard item={item} userId={user?.id} onSubmit={onSubmit} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <View className="mb-4 flex-row items-center">
              <View className="flex-1">
                <Text className="text-sm text-muted">Selamat datang,</Text>
                <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
                  {user?.email ?? 'Mandor'}
                </Text>
              </View>
              <Pressable
                onPress={signOut}
                hitSlop={8}
                className="rounded-xl border border-border px-3 py-2 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-ink">Keluar</Text>
              </Pressable>
            </View>

            <View className="mb-4">
              <SyncBanner />
            </View>

            <View className="mb-6 flex-row gap-3">
              <Pressable
                onPress={() => router.push('/(app)/panen')}
                className="min-h-[96px] flex-1 items-center justify-center gap-1 rounded-2xl bg-primary active:opacity-90"
              >
                <Text className="text-3xl">🌴</Text>
                <Text className="text-base font-extrabold text-white">Input Panen</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(app)/pengiriman')}
                className="min-h-[96px] flex-1 items-center justify-center gap-1 rounded-2xl bg-accent active:opacity-90"
              >
                <Text className="text-3xl">🚚</Text>
                <Text className="text-base font-extrabold text-white">Pengiriman</Text>
              </Pressable>
            </View>

            <Text className="mb-3 text-base font-bold text-ink">Kegiatan Terbaru</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <EmptyState title="Memuat…" subtitle="Mengambil data dari penyimpanan lokal." />
          ) : (
            <EmptyState
              title="Belum ada kegiatan"
              subtitle="Mulai dengan menekan Input Panen atau Pengiriman di atas."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
