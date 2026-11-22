import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import LearnScreen from '../screens/LearnScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ConceptScreen from '../screens/ConceptScreen';
import AssessmentScreen from '../screens/AssessmentScreen';
import ResultScreen from '../screens/ResultScreen';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/typography';

/** @typedef {import('../types').RootStackParamList} RootStackParamList */
/** @typedef {import('../types').TabParamList} TabParamList */
/** @type {typeof createNativeStackNavigator<RootStackParamList>} */
const createRootStack = createNativeStackNavigator;
/** @type {typeof createBottomTabNavigator<TabParamList>} */
const createTabStack = createBottomTabNavigator;
const Stack = createRootStack();
const Tab = createTabStack();
/** @type {Record<keyof TabParamList, import('react').ComponentProps<typeof Ionicons>['name']>} */
const icons = {
  Beranda: 'home-outline',
  Belajar: 'book-outline',
  Progres: 'stats-chart-outline',
  Profil: 'person-outline',
};

/** @param {import('@react-navigation/bottom-tabs').BottomTabBarButtonProps} props @returns {import('react').JSX.Element} */
function TabButton({ style, ...props }) {
  return <PlatformPressable {...props} style={[style, styles.tabButton]} />;
}

/** @returns {import('react').JSX.Element} */
function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(8, insets.bottom);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarActiveBackgroundColor: COLORS.accentSoft,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarButton: TabButton,
        tabBarItemStyle: { marginHorizontal: 4 },
        tabBarLabelStyle: {
          fontFamily: FONTS.bodySemiBold,
          fontSize: 13,
          lineHeight: 18,
          marginTop: 4,
          includeFontPadding: false,
        },
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: 72 + bottomPadding,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Beranda" component={HomeScreen} />
      <Tab.Screen name="Belajar" component={LearnScreen} />
      <Tab.Screen name="Progres" component={ProgressScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/** @returns {import('react').JSX.Element} */
export default function AppNavigator() {
  const { session } = useAuth();
  return (
    <NavigationContainer>
      <Stack.Navigator
        key={session ? session.user.id : 'guest'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          statusBarStyle: 'light',
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Concept" component={ConceptScreen} />
            <Stack.Screen
              name="Assessment"
              component={AssessmentScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="Result"
              component={ResultScreen}
              options={{ gestureEnabled: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
