import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { useTheme } from '../src/hooks/useTheme';
import { profileApi } from '../src/lib/api';

export default function Index() {
  const { isLoading, isAuthenticated, loadToken } = useAuthStore();
  const { colors } = useTheme();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isLoading && isAuthenticated) {
        try {
          const profile = await profileApi.get();
          setOnboardingCompleted(profile.onboardingCompleted);
        } catch {
          setOnboardingCompleted(false);
        } finally {
          setCheckingOnboarding(false);
        }
      } else if (!isLoading) {
        setCheckingOnboarding(false);
      }
    };

    void checkOnboarding();
  }, [isLoading, isAuthenticated]);

  if (isLoading || checkingOnboarding) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not authenticated -> show welcome carousel
  if (!isAuthenticated) {
    return <Redirect href={'/(onboarding)/welcome' as never} />;
  }

  // Authenticated but onboarding not completed -> profile setup
  if (!onboardingCompleted) {
    return <Redirect href={'/(onboarding)/profile-setup' as never} />;
  }

  // Fully onboarded -> main app
  return <Redirect href={'/(tabs)' as never} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
