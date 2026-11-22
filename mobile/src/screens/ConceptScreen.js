import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  BackButton,
  Button,
  EmptyState,
  ErrorText,
  Loading,
  PageHeader,
  Screen,
} from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import * as Api from '../services/ApiService';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @param {import('../types').ConceptScreenProps} props @returns {import('react').JSX.Element} */
export default function ConceptScreen({ route, navigation }) {
  const { concept } = route.params;
  const { session } = useAuth();
  const [materials, setMaterials] = useState(
    /** @type {import('../types').Material[] | null} */ (null),
  );
  const [missing, setMissing] = useState(/** @type {string[]} */ ([]));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!session) return;
    setLoading(true);
    setError(null);
    Promise.all([
      Api.getMaterials(concept.id, session.access_token),
      Api.getProgress(session.access_token),
    ])
      .then(([response, progress]) => {
        if (active) {
          setMaterials(response.items);
          const current = progress.find((entry) => entry.concept_id === concept.id);
          setMissing(current ? current.missing_prerequisites : []);
        }
      })
      .catch((failure) => {
        if (active) setError(Api.errorMessage(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [concept.id, session, revision]);

  /** @returns {Promise<void>} */
  async function start() {
    if (!session) throw new Error('Latihan membutuhkan sesi pengguna.');
    setBusy(true);
    setError(null);
    try {
      const assessment = await Api.createAssessment(concept.id, session.access_token);
      navigation.navigate('Assessment', { assessment });
    } catch (failure) {
      setError(Api.errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Screen>
        <BackButton onPress={() => navigation.goBack()} />
        <Loading message="Membuka materi..." />
      </Screen>
    );
  if (!materials)
    return (
      <Screen>
        <BackButton onPress={() => navigation.goBack()} />
        <EmptyState
          title="Materi belum bisa dibuka"
          message={error || 'Materi belum tersedia.'}
          onRetry={() => setRevision((value) => value + 1)}
        />
      </Screen>
    );
  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          eyebrow={
            (concept.skill === 'reading' ? 'MEMBACA' : 'KOSAKATA') + ' · KELAS ' + concept.grade
          }
          title={concept.title}
          description="Baca materi sebelum mengerjakan latihan."
          action={null}
        />
        {materials.length === 0 ? (
          <EmptyState
            title="Materi masih kosong"
            message="Belum ada bacaan untuk pelajaran ini."
            onRetry={() => setRevision((value) => value + 1)}
          />
        ) : (
          materials.map((material) => (
            <View key={material.id} style={styles.material}>
              <Ionicons name="book-outline" size={29} color={COLORS.primary} />
              <Text style={styles.materialTitle}>{material.title}</Text>
              <Text style={styles.body}>{material.content}</Text>
              {!material.reviewed ? (
                <Text style={styles.demo}>Materi contoh · belum ditinjau pengelola</Text>
              ) : null}
            </View>
          ))
        )}
        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={22} color={COLORS.primary} />
          <Text style={styles.tipText}>Kerjakan latihan untuk mengukur pemahaman materi.</Text>
        </View>
        <View style={styles.actions}>
          {missing.length > 0 ? (
            <Text style={styles.locked}>
              Selesaikan pelajaran sebelumnya untuk membuka latihan ini.
            </Text>
          ) : null}
          <ErrorText message={error} />
          <Button
            title="Mulai latihan"
            onPress={() => {
              void start();
            }}
            busy={busy}
            disabled={missing.length > 0}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  material: {
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  materialTitle: {
    fontFamily: FONTS.heading,
    color: COLORS.text,
    fontSize: 21,
    lineHeight: 28,
    marginTop: 17,
    marginBottom: 16,
  },
  body: { fontFamily: FONTS.body, fontSize: 17, lineHeight: 29, color: COLORS.text },
  demo: { fontFamily: FONTS.body, color: COLORS.muted, fontSize: 13, marginTop: 22 },
  tip: {
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    marginHorizontal: 24,
    marginTop: 7,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
  },
  tipText: { fontFamily: FONTS.body, color: COLORS.primary, flex: 1, fontSize: 13, lineHeight: 20 },
  actions: { paddingHorizontal: 24, marginTop: 22, gap: 15 },
  locked: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 20, color: COLORS.muted },
});
