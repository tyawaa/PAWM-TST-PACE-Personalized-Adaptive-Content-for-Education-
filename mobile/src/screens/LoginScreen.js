import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, ErrorText, Field, Screen, TextButton } from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { errorMessage } from '../services/ApiService';
import { validateLogin, hasErrors } from '../utils/validators';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @returns {import('react').JSX.Element} */
export default function LoginScreen() {
  const navigation = useAppNavigation();
  const { signIn, notice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState(
    /** @type {import('../types').FormErrors} */ ({ name: null, username: null, password: null }),
  );
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);

  /** @returns {Promise<void>} */
  async function submit() {
    const values = { username: username.trim(), password };
    const next = validateLogin(values);
    setErrors(next);
    setError(null);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      await signIn(values);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.mark}>
              <Ionicons name="book" size={23} color={COLORS.card} />
            </View>
            <Text style={styles.wordmark}>PACE</Text>
            <Text style={styles.tag}>Belajar bahasa Inggris</Text>
          </View>
          <View style={styles.art}>
            <View style={styles.book}>
              <Ionicons name="book-outline" size={36} color={COLORS.primary} />
            </View>
            <View style={styles.intro}>
              <Text style={styles.introTitle}>Belajar dan berlatih</Text>
              <Text style={styles.introText}>Materi, latihan, dan progres dalam satu tempat.</Text>
            </View>
          </View>
          <Text style={styles.title}>Masuk ke akunmu</Text>
          <Text style={styles.subtitle}>Lanjutkan materi dan latihan terakhir kamu.</Text>
          <View style={styles.form}>
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
              secure={false}
              capitalize="none"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secure={true}
              capitalize="none"
            />
            <ErrorText message={error || notice} />
            <View style={styles.buttonGap}>
              <Button
                title="Masuk"
                onPress={() => {
                  void submit();
                }}
                busy={busy}
                disabled={false}
              />
            </View>
            <TextButton
              title="Belum punya akun? Daftar"
              onPress={() => navigation.navigate('Register')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 32, paddingBottom: 32 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  mark: {
    height: 37,
    width: 37,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontFamily: FONTS.display, fontSize: 28, color: COLORS.primary },
  tag: { fontFamily: FONTS.body, width: '100%', marginTop: 4, color: COLORS.muted, fontSize: 14 },
  art: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    marginTop: 32,
    marginBottom: 32,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },
  book: {
    width: 56,
    height: 64,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: { flex: 1, gap: 4 },
  introTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 17 },
  introText: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 14, lineHeight: 21 },
  title: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 24, lineHeight: 32 },
  subtitle: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  form: { width: '100%' },
  buttonGap: { marginTop: 15, marginBottom: 8 },
});
