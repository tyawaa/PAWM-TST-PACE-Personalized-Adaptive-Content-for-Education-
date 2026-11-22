import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ConceptCard, EmptyState, Loading, PageHeader, Screen } from '../components/Ui';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useLearningData } from '../hooks/useLearningData';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @returns {import('react').JSX.Element} */
export default function LearnScreen() {
  const navigation = useAppNavigation();
  const { data, loading, error, refresh } = useLearningData();
  const [query, setQuery] = useState('');
  if (!data && loading)
    return (
      <Screen>
        <Loading message="Memuat pelajaran..." />
      </Screen>
    );
  if (!data)
    return (
      <Screen>
        <EmptyState
          title="Pelajaran belum bisa dimuat"
          message={error || 'Data belum tersedia.'}
          onRetry={refresh}
        />
      </Screen>
    );
  const filtered = data.concepts.filter((entry) =>
    entry.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <Screen>
      <PageHeader
        eyebrow="KATALOG PELAJARAN"
        title="Mau belajar apa?"
        description="Baca materinya, lalu coba latihan singkatnya."
        action={null}
      />
      <View style={styles.search}>
        <Ionicons name="search-outline" size={19} color={COLORS.muted} />
        <TextInput
          accessibilityLabel="Cari pelajaran"
          placeholder="Cari pelajaran..."
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          placeholderTextColor={COLORS.muted}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={refresh}
        ListEmptyComponent={
          <EmptyState
            title={query ? 'Pelajaran tidak ditemukan' : 'Belum ada pelajaran'}
            message={query ? 'Coba kata pencarian lainnya.' : 'Katalog materi masih kosong.'}
            onRetry={query ? null : refresh}
          />
        }
        renderItem={({ item }) => (
          <ConceptCard
            concept={item}
            progress={data.progress.find((entry) => entry.concept_id === item.id)}
            onPress={() => navigation.navigate('Concept', { concept: item })}
          />
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  search: {
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  input: { fontFamily: FONTS.body, flex: 1, height: 48, color: COLORS.text, fontSize: 14 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
});
