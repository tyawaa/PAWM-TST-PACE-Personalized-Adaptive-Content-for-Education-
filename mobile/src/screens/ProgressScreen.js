import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EmptyState, Loading, PageHeader, ProgressBar, Screen } from '../components/Ui';
import { useLearningData } from '../hooks/useLearningData';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @returns {import('react').JSX.Element} */
export default function ProgressScreen() {
  const { data, loading, error, refresh } = useLearningData();
  if (!data && loading)
    return (
      <Screen>
        <Loading message="Memuat progres..." />
      </Screen>
    );
  if (!data)
    return (
      <Screen>
        <EmptyState
          title="Progres belum bisa dimuat"
          message={error || 'Data belum tersedia.'}
          onRetry={refresh}
        />
      </Screen>
    );
  const mastered = data.progress.filter((entry) => entry.status === 'mastered').length;
  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        contentContainerStyle={styles.content}
      >
        <PageHeader
          eyebrow="PROGRES BELAJAR"
          title="Progres belajar"
          description="Nilai terbaru dan penguasaan setiap konsep."
          action={null}
        />
        <View style={styles.summary}>
          <Ionicons name="ribbon-outline" size={34} color={COLORS.primary} />
          <Text style={styles.number}>
            {mastered}
            <Text style={styles.total}> / {data.progress.length}</Text>
          </Text>
          <Text style={styles.caption}>konsep sudah dikuasai</Text>
          <ProgressBar value={data.progress.length ? (mastered / data.progress.length) * 100 : 0} />
        </View>
        {data.progress.length === 0 ? (
          <EmptyState
            title="Progres masih kosong"
            message="Progres akan tampil setelah pelajaran tersedia."
            onRetry={refresh}
          />
        ) : (
          data.progress.map((entry) => (
            <View key={entry.concept_id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.title}>{entry.title}</Text>
                <Ionicons
                  name={entry.status === 'mastered' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={entry.status === 'mastered' ? COLORS.primary : COLORS.muted}
                />
              </View>
              <Text style={styles.status}>
                {entry.status === 'mastered'
                  ? 'Sudah dikuasai'
                  : entry.status === 'needs_practice'
                    ? 'Perlu latihan lagi'
                    : 'Belum dinilai'}
              </Text>
              {entry.score === null ? (
                <Text style={styles.emptyScore}>Selesaikan latihan untuk melihat nilaimu.</Text>
              ) : (
                <>
                  <Text style={styles.score}>
                    Nilai terbaru <Text style={styles.scoreValue}>{entry.score}</Text>
                  </Text>
                  <ProgressBar value={entry.score} />
                </>
              )}
              {entry.missing_prerequisites.length > 0 ? (
                <Text style={styles.emptyScore}>
                  Selesaikan pelajaran sebelumnya untuk membuka latihan ini.
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 25 },
  summary: {
    marginHorizontal: 24,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  number: { fontFamily: FONTS.display, color: COLORS.text, fontSize: 46, marginTop: 7 },
  total: { fontFamily: FONTS.body, color: COLORS.muted, fontSize: 24 },
  caption: { fontFamily: FONTS.body, color: COLORS.muted, marginTop: 2, marginBottom: 18 },
  card: {
    marginHorizontal: 24,
    marginBottom: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 19,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  title: { fontFamily: FONTS.heading, fontSize: 16, color: COLORS.text, flex: 1 },
  status: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.primary, marginTop: 7 },
  score: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    marginTop: 18,
    marginBottom: 9,
    fontSize: 12,
  },
  scoreValue: { fontFamily: FONTS.display, color: COLORS.text, fontSize: 19 },
  emptyScore: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 13,
    lineHeight: 19,
  },
});
