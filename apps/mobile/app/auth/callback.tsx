import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { useTheme } from '../../src/hooks/useTheme';
import type { SubscriptionTier } from '@fitapp/shared';

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  tier?: SubscriptionTier;
}

export default function AuthCallback() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    accessToken?: string;
    refreshToken?: string;
    isNewUser?: string;
    error?: string;
  }>();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const handleCallback = async () => {
      if (params.error) {
        router.replace('/(auth)/login');
        return;
      }

      if (params.accessToken) {
        try {
          const payload = params.accessToken.split('.')[1];
          const decoded = JSON.parse(atob(payload)) as JwtPayload;

          await setAuth(
            {
              id: decoded.sub,
              email: decoded.email ?? '',
              name: decoded.name ?? 'User',
              subscriptionTier: decoded.tier ?? 'free',
            },
            params.accessToken
          );

          // Redirect to index which will check onboarding status
          router.replace('/');
        } catch {
          router.replace('/(auth)/login');
        }
      } else {
        router.replace('/(auth)/login');
      }
    };

    void handleCallback();
  }, [params, setAuth]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Connexion en cours...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});
