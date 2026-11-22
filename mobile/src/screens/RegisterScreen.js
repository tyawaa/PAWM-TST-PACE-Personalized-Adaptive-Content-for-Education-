import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackButton, Button, ErrorText, Field, PageHeader, Screen } from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { errorMessage } from '../services/ApiService';
import { hasErrors, validateRegistration } from '../utils/validators';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @returns {import('react').JSX.Element} */
export default function RegisterScreen() {
  const navigation = useAppNavigation();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState(
    /** @type {import('../types').FormErrors} */ ({ name: null, username: null, password: null }),
  );
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);

  /** @returns {Promise<void>} */
  async function submit() {
    const values = { name: name.trim(), username: username.trim(), password };
    const next = validateRegistration(values);
    setErrors(next);
    setError(null);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      await register(values);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <PageHeader
            eyebrow="AKUN PACE"
            title="Buat akun"
            description="Buat akun untuk menyimpan hasil latihan dan melihat kemajuanmu."
            action={null}
          />
          <View style={styles.form}>
            <Field
              label="Nama"
              value={name}
              onChangeText={setName}
              error={errors.name}
              secure={false}
              capitalize="words"
            />
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
              secure={false}
              capitalize="none"
            />
            <Text style={styles.hint}>Pakai huruf kecil, angka, atau underscore.</Text>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secure={true}
              capitalize="none"
            />
            <ErrorText message={error} />
            <View style={styles.gap}>
              <Button
                title="Buat akun"
                onPress={() => {
                  void submit();
                }}
                busy={busy}
                disabled={false}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { paddingHorizontal: 24, paddingBottom: 35 },
  gap: { marginTop: 16 },
  hint: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 20,
  },
});
