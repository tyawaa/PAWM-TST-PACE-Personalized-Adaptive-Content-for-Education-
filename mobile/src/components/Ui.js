import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @param {import('../types').ChildrenProps} props @returns {import('react').JSX.Element} */
export function Screen({ children }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.frame}>{children}</View>
    </SafeAreaView>
  );
}

/** @param {{ eyebrow: string, title: string, description: string | null, action: import('react').ReactNode }} props @returns {import('react').JSX.Element} */
export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {action}
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

/** @param {{ title: string, onPress: () => void, busy: boolean, disabled: boolean }} props @returns {import('react').JSX.Element} */
export function Button({ title, onPress, busy, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={COLORS.card} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}

/** @param {{ title: string, onPress: () => void }} props @returns {import('react').JSX.Element} */
export function TextButton({ title, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textButton}>
      <Text style={styles.textButtonText}>{title}</Text>
    </Pressable>
  );
}

/** @param {{ onPress: () => void }} props @returns {import('react').JSX.Element} */
export function BackButton({ onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      onPress={onPress}
      style={styles.back}
    >
      <Ionicons name="arrow-back" size={22} color={COLORS.text} />
    </Pressable>
  );
}

/** @param {{ message: string | null }} props @returns {import('react').JSX.Element | null} */
export function ErrorText({ message }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}

/** @param {{ label: string, value: string, onChangeText: (value: string) => void, error: string | null, secure: boolean, capitalize: 'none' | 'words' }} props @returns {import('react').JSX.Element} */
export function Field({ label, value, onChangeText, error, secure, capitalize }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize={capitalize}
        autoCorrect={false}
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={COLORS.muted}
      />
      <ErrorText message={error} />
    </View>
  );
}

/** @param {{ message: string }} props @returns {import('react').JSX.Element} */
export function Loading({ message }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.description}>{message}</Text>
    </View>
  );
}

/** @param {{ title: string, message: string, onRetry: (() => void) | null }} props @returns {import('react').JSX.Element} */
export function EmptyState({ title, message, onRetry }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="book-outline" size={35} color={COLORS.primary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {onRetry ? (
        <Button title="Coba lagi" onPress={onRetry} busy={false} disabled={false} />
      ) : null}
    </View>
  );
}

/** @param {{ value: number }} props @returns {import('react').JSX.Element} */
export function ProgressBar({ value }) {
  const width = /** @type {import('react-native').DimensionValue} */ (
    Math.max(0, Math.min(100, value)) + '%'
  );
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={styles.track}
    >
      <View style={[styles.fill, { width }]} />
    </View>
  );
}

/** @param {{ concept: import('../types').Concept, progress: import('../types').Progress | undefined, onPress: () => void }} props @returns {import('react').JSX.Element} */
export function ConceptCard({ concept, progress, onPress }) {
  const mastered = progress?.status === 'mastered';
  const locked = Boolean(progress && progress.missing_prerequisites.length > 0);
  const reading = concept.skill === 'reading';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Pelajari ' + concept.title}
      onPress={onPress}
      style={({ pressed }) => [styles.conceptCard, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.conceptIcon,
          { backgroundColor: reading ? COLORS.primarySoft : COLORS.accentSoft },
        ]}
      >
        <Ionicons
          name={reading ? 'reader-outline' : 'chatbubbles-outline'}
          size={25}
          color={COLORS.text}
        />
      </View>
      <View style={styles.conceptBody}>
        <Text style={styles.conceptMeta}>
          {reading ? 'MEMBACA' : 'KOSAKATA'} · KELAS {concept.grade}
        </Text>
        <Text style={styles.conceptTitle}>{concept.title}</Text>
        <Text style={styles.conceptStatus}>
          {locked
            ? 'Selesaikan pelajaran sebelumnya'
            : mastered
              ? 'Sudah dikuasai'
              : progress?.status === 'needs_practice'
                ? 'Ayo berlatih lagi'
                : 'Siap dipelajari'}
        </Text>
      </View>
      <Ionicons
        name={locked ? 'lock-closed-outline' : mastered ? 'checkmark-circle' : 'arrow-forward'}
        size={22}
        color={mastered ? COLORS.primary : COLORS.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.primary },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: COLORS.background,
  },
  header: { paddingHorizontal: 24, paddingTop: 15, paddingBottom: 22 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 30,
    marginBottom: 9,
  },
  eyebrow: { fontFamily: FONTS.bodyBold, color: COLORS.primary, fontSize: 12, letterSpacing: 0.5 },
  title: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 24, lineHeight: 32 },
  description: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  button: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { fontFamily: FONTS.bodyBold, color: COLORS.card, fontSize: 15 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  textButtonText: { fontFamily: FONTS.bodyBold, color: COLORS.primary, fontSize: 14 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 22,
    marginTop: 10,
  },
  error: {
    fontFamily: FONTS.body,
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  field: { marginBottom: 17 },
  label: { fontFamily: FONTS.bodyBold, color: COLORS.text, fontSize: 13, marginBottom: 8 },
  input: {
    fontFamily: FONTS.body,
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: { borderColor: COLORS.danger },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 9 },
  empty: { padding: 26, margin: 24, backgroundColor: COLORS.card, borderRadius: 12, gap: 15 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 19, color: COLORS.text },
  emptyMessage: { fontFamily: FONTS.body, color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  track: { height: 8, borderRadius: 6, backgroundColor: COLORS.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: COLORS.primary },
  conceptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 17,
    marginBottom: 12,
  },
  conceptIcon: {
    width: 52,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conceptBody: { flex: 1 },
  conceptMeta: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.muted,
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  conceptTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 16, marginBottom: 5 },
  conceptStatus: { fontFamily: FONTS.body, color: COLORS.muted, fontSize: 13, lineHeight: 18 },
});
