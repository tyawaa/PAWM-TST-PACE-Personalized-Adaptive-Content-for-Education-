import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Button,
  ConceptCard,
  EmptyState,
  Loading,
  PageHeader,
  ProgressBar,
  Screen,
} from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useLearningData } from '../hooks/useLearningData';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @returns {import('react').JSX.Element} */
export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useAppNavigation();
  const { data, loading, error, refresh } = useLearningData();
  if (!session) throw new Error('Beranda membutuhkan sesi pengguna.');
  if (!data && loading)
    return (
      <Screen>
        <Loading message="Memuat beranda..." />
      </Screen>
    );
  if (!data)
    return (
      <Screen>
        <EmptyState
          title="Belum bisa memuat beranda"
          message={error || 'Data belajar belum tersedia.'}
          onRetry={refresh}
        />
      </Screen>
    );
  const mastered = data.progress.filter((entry) => entry.status === 'mastered').length;
  const percentage = data.concepts.length ? Math.round((mastered / data.concepts.length) * 100) : 0;
  const next = data.recommendations.items[0];
  const concept = next ? data.concepts.find((entry) => entry.id === next.concept_id) : undefined;
  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={styles.content}
      >
        <PageHeader
          eyebrow="PACE · BERANDA"
          title={'Hai, ' + session.user.name.split(' ')[0] + '!'}
          description="Materi, latihan, dan progres belajarmu."
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka profil"
              onPress={() => navigation.navigate('Main', { screen: 'Profil' })}
              style={styles.avatar}
            >
              <Text style={styles.initial}>{session.user.name.charAt(0).toUpperCase()}</Text>
            </Pressable>
          }
        />
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroTag}>
              <Ionicons name="bookmark-outline" size={16} color={COLORS.primary} />
              <Text style={styles.heroTagText}>REKOMENDASI BELAJAR</Text>
            </View>
            <Ionicons name="book-outline" size={43} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Lanjutkan belajarmu</Text>
          <Text style={styles.heroText}>
            {next
              ? next.reason
              : data.recommendations.all_mastered
                ? 'Semua konsep sudah kamu kuasai. Kamu bisa berlatih kembali kapan saja.'
                : 'Pilih pelajaran pertamamu dan mulai dari yang sederhana.'}
          </Text>
          <Button
            title={next?.action === 'practice' ? 'Lanjut berlatih' : 'Mulai belajar'}
            onPress={() =>
              concept
                ? navigation.navigate('Concept', { concept })
                : navigation.navigate('Main', { screen: 'Belajar' })
            }
            busy={false}
            disabled={data.concepts.length === 0}
          />
        </View>
        <View style={styles.progressCard}>
          <View style={[styles.sectionRow, styles.progressRow]}>
            <Text style={styles.sectionTitle}>Progres belajar</Text>
            <Text style={styles.percent}>{percentage}%</Text>
          </View>
          <ProgressBar value={percentage} />
          <Text style={styles.progressCaption}>
            {mastered} dari {data.concepts.length} konsep sudah dikuasai
          </Text>
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Pilihan pelajaran</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Main', { screen: 'Belajar' })}
          >
            <Text style={styles.seeAll}>Lihat semua →</Text>
          </Pressable>
        </View>
        {data.concepts.length === 0 ? (
          <EmptyState
            title="Pelajaran belum tersedia"
            message="Materi akan tampil setelah katalog tersedia di server."
            onRetry={refresh}
          />
        ) : (
          <View style={styles.lessons}>
            {data.concepts.map((entry) => (
              <ConceptCard
                key={entry.id}
                concept={entry}
                progress={data.progress.find((item) => item.concept_id === entry.id)}
                onPress={() => navigation.navigate('Concept', { concept: entry })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 22 },
  lessons: { paddingHorizontal: 24 },
  progressRow: { marginHorizontal: 0 },
  avatar: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: FONTS.display, color: COLORS.primary, fontSize: 17 },
  hero: {
    backgroundColor: COLORS.accentSoft,
    borderTopWidth: 4,
    borderTopColor: COLORS.secondary,
    borderRadius: 12,
    padding: 23,
    marginHorizontal: 24,
    marginBottom: 20,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroTagText: { fontFamily: FONTS.bodyBold, color: COLORS.text, fontSize: 12 },
  heroTitle: {
    fontFamily: FONTS.heading,
    color: COLORS.text,
    fontSize: 24,
    lineHeight: 32,
    marginTop: 9,
  },
  heroText: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 11,
    marginBottom: 19,
  },
  progressCard: {
    marginHorizontal: 24,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 18,
    marginBottom: 25,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 13,
    marginHorizontal: 24,
  },
  sectionTitle: { fontFamily: FONTS.bodyBold, color: COLORS.text, fontSize: 15, flexShrink: 1 },
  percent: { fontFamily: FONTS.display, color: COLORS.primary, fontSize: 17 },
  progressCaption: { fontFamily: FONTS.body, color: COLORS.muted, fontSize: 13, marginTop: 9 },
  seeAll: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primary },
});
