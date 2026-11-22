import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Screen, TextButton } from '../components/Ui';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @param {import('../types').ResultScreenProps} props @returns {import('react').JSX.Element} */
export default function ResultScreen({ route, navigation }) {
  const { result, questions } = route.params;
  const mastered = result.status === 'mastered';
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>HASIL LATIHAN</Text>
        <View style={styles.medal}>
          <Ionicons
            name={mastered ? 'ribbon-outline' : 'refresh-outline'}
            size={63}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.title}>
          {mastered ? 'Materi sudah dikuasai' : 'Perlu latihan lagi'}
        </Text>
        <Text style={styles.subtitle}>
          {mastered
            ? 'Kamu siap melanjutkan ke pelajaran berikutnya.'
            : 'Baca kembali materinya, lalu coba latihan baru saat kamu siap.'}
        </Text>
        <View style={styles.scoreBox}>
          <Text style={styles.score}>
            {result.score}
            <Text style={styles.scale}> / 100</Text>
          </Text>
          <Text style={styles.correct}>
            {result.correct} dari {result.total} jawaban benar
          </Text>
        </View>
        <Text style={styles.reviewTitle}>Pembahasan jawaban</Text>
        {result.feedback.map((feedback, index) => (
          <View key={feedback.question_id} style={styles.feedback}>
            <View style={styles.feedbackTop}>
              <Ionicons
                name={feedback.correct ? 'checkmark-circle' : 'close-circle-outline'}
                size={21}
                color={feedback.correct ? COLORS.primary : COLORS.danger}
              />
              <Text style={styles.feedbackLabel}>
                Soal {index + 1} · {feedback.correct ? 'Benar' : 'Belum tepat'}
              </Text>
            </View>
            <Text style={styles.question}>{questions[index].prompt}</Text>
            <Text style={styles.explanation}>{feedback.explanation}</Text>
          </View>
        ))}
        <View style={styles.actions}>
          <Button
            title="Lihat progres"
            onPress={() => {
              navigation.popToTop();
              navigation.navigate('Main', { screen: 'Progres' });
            }}
            busy={false}
            disabled={false}
          />
          <TextButton
            title="Kembali belajar"
            onPress={() => {
              navigation.popToTop();
              navigation.navigate('Main', { screen: 'Belajar' });
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 27, paddingBottom: 30 },
  eyebrow: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
    fontSize: 13,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  medal: {
    width: 112,
    height: 112,
    backgroundColor: COLORS.accentSoft,
    alignSelf: 'center',
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 27,
    marginBottom: 23,
  },
  title: {
    fontFamily: FONTS.heading,
    color: COLORS.text,
    fontSize: 29,
    lineHeight: 36,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  scoreBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 22,
    marginVertical: 25,
    alignItems: 'center',
  },
  score: { fontFamily: FONTS.display, color: COLORS.primary, fontSize: 46 },
  scale: { fontFamily: FONTS.body, color: COLORS.muted, fontSize: 18 },
  correct: { fontFamily: FONTS.body, color: COLORS.primary, marginTop: 4, fontSize: 13 },
  reviewTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 18, marginBottom: 16 },
  feedback: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 17,
    marginBottom: 12,
  },
  feedbackTop: { flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: 12 },
  feedbackLabel: { fontFamily: FONTS.bodyBold, color: COLORS.primary, fontSize: 12 },
  question: { fontFamily: FONTS.bodyBold, color: COLORS.text, fontSize: 14, lineHeight: 21 },
  explanation: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
  },
  actions: { marginTop: 13, gap: 8 },
});
