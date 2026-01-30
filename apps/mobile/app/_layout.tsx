import { useEffect, Fragment } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/auth';
import { useThemeStore } from '../src/store/theme';
import { WorkoutMiniPlayer } from '../src/components/WorkoutMiniPlayer';

export default function RootLayout() {
  const loadToken = useAuthStore((s) => s.loadToken);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    void loadToken();
    void loadTheme();
  }, [loadToken, loadTheme]);

  return (
    <SafeAreaProvider>
      <Fragment>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="workout/active" options={{ presentation: 'modal' }} />
        </Stack>
        <WorkoutMiniPlayer />
      </Fragment>
    </SafeAreaProvider>
  );
}
