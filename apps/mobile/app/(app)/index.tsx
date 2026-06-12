// =====================================================================
// Daftar Kegiatan — beranda mandor.
//  - Banner status sinkron
//  - Aksi cepat: input Panen / Pengiriman
//  - Daftar kegiatan terbaru (dari DB lokal, offline-aman)
// =====================================================================
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useRecentActivities } from '@/lib/db/hooks';
import { submitActivity } from '@/lib/db/write';
import type { ActivityRow } from '@/lib/db/types';
import { SyncBanner } from '@/lib/SyncBanner';
import { Badge, Card, EmptyState } from '@/lib/ui';
import { colors, font, radius, space } from '@/lib/theme';

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
    <Card style={{ marginBottom: space.md }}>
      <View style={styles.cardTop}>
        <Badge text={isPanen ? '🌴 Panen' : '🚚 Pengiriman'} tone={isPanen ? 'ok' : 'info'} />
        <Badge text={statusLabel(item.status)} tone={statusTone(item.status)} />
      </View>
      <Text style={styles.cardTitle}>
        {isPanen
          ? `${item.total_janjang ?? 0} janjang`
          : item.spb_number
            ? `SPB ${item.spb_number}`
            : `${item.total_janjang ?? 0} janjang`}
      </Text>
      <Text style={styles.cardMeta}>
        {fmtDate(item.activity_date)}
        {item.division_name ? ` · ${item.division_name}` : ''}
        {item.block_code ? ` · Blok ${item.block_code}` : ''}
      </Text>
      {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
      {canSubmit ? (
        <Pressable style={styles.submitBtn} onPress={() => onSubmit(item)}>
          <Text style={styles.submitText}>Kirim untuk verifikasi</Text>
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={activities ?? []}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ActivityCard item={item} userId={user?.id} onSubmit={onSubmit} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hello}>Selamat datang,</Text>
                <Text style={styles.user} numberOfLines={1}>
                  {user?.email ?? 'Mandor'}
                </Text>
              </View>
              <Pressable onPress={signOut} style={styles.logout} hitSlop={8}>
                <Text style={styles.logoutText}>Keluar</Text>
              </Pressable>
            </View>

            <View style={{ marginBottom: space.lg }}>
              <SyncBanner />
            </View>

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.action, styles.actionPanen, pressed && styles.pressed]}
                onPress={() => router.push('/(app)/panen')}
              >
                <Text style={styles.actionIcon}>🌴</Text>
                <Text style={styles.actionText}>Input Panen</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.action, styles.actionKirim, pressed && styles.pressed]}
                onPress={() => router.push('/(app)/pengiriman')}
              >
                <Text style={styles.actionIcon}>🚚</Text>
                <Text style={styles.actionText}>Pengiriman</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Kegiatan Terbaru</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: space.lg, paddingBottom: space.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  hello: { fontSize: font.sm, color: colors.textMuted },
  user: { fontSize: font.lg, fontWeight: '800', color: colors.text },
  logout: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { color: colors.text, fontWeight: '600', fontSize: font.sm },
  actions: { flexDirection: 'row', gap: space.md, marginBottom: space.xl },
  action: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  actionPanen: { backgroundColor: colors.primary },
  actionKirim: { backgroundColor: colors.accent },
  pressed: { opacity: 0.9 },
  actionIcon: { fontSize: 28 },
  actionText: { color: colors.white, fontWeight: '800', fontSize: font.md },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: space.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  cardTitle: { fontSize: font.lg, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: font.sm, color: colors.textMuted, marginTop: space.xs },
  cardNotes: { fontSize: font.sm, color: colors.textFaint, marginTop: space.sm },
  submitBtn: {
    marginTop: space.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  submitText: { color: colors.white, fontWeight: '800', fontSize: font.sm },
});
