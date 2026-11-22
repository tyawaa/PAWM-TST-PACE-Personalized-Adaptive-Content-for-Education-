import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  BackButton,
  Button,
  EmptyState,
  ErrorText,
  ProgressBar,
  Screen,
  TextButton,
} from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import { submitAssessment, errorMessage } from '../services/ApiService';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @param {import('../types').AssessmentScreenProps} props @returns {import('react').JSX.Element} */
export default function AssessmentScreen({ route, navigation }) {
  const { assessment } = route.params;
  const { session } = useAuth();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(/** @type {Record<string, number>} */ ({}));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const question = assessment.questions[index];
  const total = assessment.questions.length;
  if (!question)
    return (
      <Screen>
        <BackButton onPress={() => navigation.goBack()} />
        <EmptyState
          title="Soal tidak tersedia"
          message="Kembali ke materi dan buat sesi latihan baru."
          onRetry={null}
        />
      </Screen>
    );
  const selected = answers[question.id];
  const complete = Object.keys(answers).length === total;

  /** @returns {Promise<void>} */
  async function submit() {
    if (!session) throw new Error('Pengiriman jawaban membutuhkan sesi pengguna.');
    setBusy(true);
    setError(null);
    try {
      const payload = assessment.questions.map((entry) => ({
        question_id: entry.id,
        selected_index: answers[entry.id],
      }));
      const result = await submitAssessment(assessment.id, payload, session.access_token);
      navigation.replace('Result', { result, questions: assessment.questions });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Text style={styles.eyebrow}>LATIHAN BAHASA INGGRIS</Text>
          <Text style={styles.step}>
            Soal {index + 1} dari {total}
          </Text>
          <ProgressBar value={((index + 1) / total) * 100} />
        </View>
        <View style={styles.questionCard}>
          <View style={styles.badge}>
            <Ionicons name="pencil-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.prompt}>{question.prompt}</Text>
          <Text style={styles.instruction}>Pilih satu jawaban yang paling tepat.</Text>
          {question.options.map((option, optionIndex) => (
            <Pressable
              key={optionIndex}
              accessibilityRole="radio"
              accessibilityLabel={option}
              accessibilityState={{ checked: selected === optionIndex, disabled: busy }}
              disabled={busy}
              onPress={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
              style={[styles.option, selected === optionIndex && styles.selected]}
            >
              <View
                style={[styles.optionLetter, selected === optionIndex && styles.selectedLetter]}
              >
                <Text
                  style={[styles.letter, selected === optionIndex && styles.selectedLetterText]}
                >
                  {String.fromCharCode(65 + optionIndex)}
                </Text>
              </View>
              <Text style={styles.optionText}>{option}</Text>
              {selected === optionIndex ? (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
              ) : null}
            </Pressable>
          ))}
        </View>
        <ErrorText message={error} />
        <View style={styles.actions}>
          {index === total - 1 ? (
            <Button
              title="Kirim jawaban"
              onPress={() => {
                void submit();
              }}
              busy={busy}
              disabled={!complete}
            />
          ) : (
            <Button
              title="Lanjut"
              onPress={() => setIndex((current) => current + 1)}
              busy={false}
              disabled={selected === undefined}
            />
          )}
          {index > 0 && !busy ? (
            <TextButton
              title="Soal sebelumnya"
              onPress={() => setIndex((current) => current - 1)}
            />
          ) : null}
        </View>
        <Text style={styles.note}>
          Tidak perlu terburu-buru. Kamu bisa memeriksa jawaban sebelum mengirim.
        </Text>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 20, paddingBottom: 30 },
  top: { marginBottom: 24 },
  eyebrow: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    letterSpacing: 1.5,
    color: COLORS.primary,
    marginBottom: 13,
  },
  step: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text, marginBottom: 12 },
  questionCard: {
    backgroundColor: COLORS.card,
    padding: 21,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    height: 49,
    width: 49,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 19,
  },
  prompt: { fontFamily: FONTS.bodyBold, fontSize: 23, lineHeight: 31, color: COLORS.text },
  instruction: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 21,
  },
  option: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 11,
  },
  selected: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  optionLetter: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLetter: { backgroundColor: COLORS.primary },
  letter: { fontFamily: FONTS.bodyBold, color: COLORS.muted },
  selectedLetterText: { color: COLORS.card },
  optionText: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 15, lineHeight: 21, flex: 1 },
  actions: { marginTop: 22, gap: 10 },
  note: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 16,
  },
});
