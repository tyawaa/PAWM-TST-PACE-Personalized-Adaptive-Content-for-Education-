import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, PageHeader, Screen } from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @returns {import('react').JSX.Element} */
export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  if (!session) throw new Error('Profil membutuhkan sesi pengguna.');
  return (
    <Screen>
      <ScrollView>
        <PageHeader
          eyebrow="AKUN PACE"
          title="Profil"
          description="Informasi akun dan sesi login."
          action={null}
        />
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{session.user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{session.user.name}</Text>
          <Text style={styles.username}>@{session.user.username}</Text>
        </View>
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={26} color={COLORS.primary} />
          <Text style={styles.noteTitle}>Tentang progres belajar</Text>
          <Text style={styles.noteText}>
            Nilai latihan membantu memilih pelajaran berikutnya. Kamu bisa membaca materi dan
            mencoba lagi.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button title="Keluar" onPress={signOut} busy={false} disabled={false} />
          <Text style={styles.caption}>Progresmu tetap tersimpan di akun ini.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  identity: { alignItems: 'center', padding: 22 },
  avatar: {
    height: 91,
    width: 91,
    borderRadius: 33,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: FONTS.display, fontSize: 38, color: COLORS.primary },
  name: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 23, marginTop: 18 },
  username: { fontFamily: FONTS.body, color: COLORS.muted, marginTop: 6, fontSize: 14 },
  note: { margin: 24, borderRadius: 12, padding: 23, backgroundColor: COLORS.accentSoft, gap: 12 },
  noteTitle: { fontFamily: FONTS.bodyBold, color: COLORS.text, fontSize: 18 },
  noteText: { fontFamily: FONTS.body, color: COLORS.muted, fontSize: 13, lineHeight: 21 },
  actions: { paddingHorizontal: 24, paddingBottom: 25 },
  caption: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 14,
  },
});
