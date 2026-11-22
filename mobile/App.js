import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/theme/colors';
import { FONT_ASSETS } from './src/theme/fontAssets';

/** @returns {import('react').JSX.Element} */
export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  if (fontError) {
    throw new Error(
      'Gagal memuat font PACE (Fredoka dan Nunito). Periksa aset font pada bundle aplikasi.',
      {
        cause: fontError,
      },
    );
  }
  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          accessibilityLabel="Memuat font aplikasi"
          size="large"
          color={COLORS.primary}
        />
        <StatusBar style="dark" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
