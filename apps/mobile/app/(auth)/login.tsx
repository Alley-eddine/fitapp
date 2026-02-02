import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore } from '../../src/store/theme';
import { colors, spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { router } from 'expo-router';
import type { SubscriptionTier } from '@fitapp/shared';
import { profileApi } from '../../src/lib/api';

const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL || 'http://localhost:3001';

type Mode = 'welcome' | 'login' | 'register';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    subscriptionTier?: SubscriptionTier;
  };
  accessToken: string;
  error?: string;
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const isDark = useThemeStore((s) => s.isDark);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const theme = isDark ? colors.dark : colors.light;

  const handleGoogleLogin = () => {
    const callbackUrl = Platform.OS === 'web'
      ? `${window.location.origin}/auth/callback`
      : 'fitcoach://auth/callback';
    const authUrl = `${AUTH_URL}/auth/google?redirect_uri=${encodeURIComponent(callbackUrl)}`;

    console.log('🔗 Google login URL:', authUrl);
    console.log('📱 Platform:', Platform.OS);
    console.log('🔙 Callback URL:', callbackUrl);

    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      Linking.openURL(authUrl).catch((err) => {
        console.error('❌ Failed to open URL:', err);
        setError(`Impossible d'ouvrir le lien: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      });
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const body = mode === 'register' ? { email, password, name } : { email, password };
      const url = `${AUTH_URL}${endpoint}`;

      console.log('🔐 Auth attempt:', { url, mode });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true',
        },
        body: JSON.stringify(body),
      });

      console.log('📡 Response status:', response.status);
      const data = (await response.json()) as AuthResponse;
      console.log('📦 Response data:', data);

      if (!response.ok) {
        setError(data.error ?? 'Erreur de connexion');
        return;
      }

      await setAuth(
        {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name ?? '',
          subscriptionTier: data.user.subscriptionTier ?? 'free',
        },
        data.accessToken
      );

      // After registration, go to profile setup
      // After login, check if onboarding is completed
      if (mode === 'register') {
        router.replace('/(onboarding)/profile-setup' as never);
      } else {
        try {
          const profile = await profileApi.get();
          if (profile.onboardingCompleted) {
            router.replace('/(tabs)' as never);
          } else {
            router.replace('/(onboarding)/profile-setup' as never);
          }
        } catch {
          router.replace('/(onboarding)/profile-setup' as never);
        }
      }
    } catch (err) {
      console.error('❌ Auth error:', err);
      setError(`Erreur: ${err instanceof Error ? err.message : 'Connexion au serveur impossible'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    void setThemeMode(isDark ? 'light' : 'dark');
  };

  // Welcome screen (initial view)
  if (mode === 'welcome') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Pressable style={styles.themeToggle} onPress={toggleTheme}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color={theme.text} />
        </Pressable>

        <View style={styles.heroContainer}>
          <View style={[styles.logoContainer, { backgroundColor: '#f97316' }]}>
            <Text style={styles.logoEmoji}>💪</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            FitCoach <Text style={{ color: '#f97316' }}>AI</Text>
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Find your fire. Build your{'\n'}strength together.
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={[styles.whyTitle, { color: '#f97316' }]}>— WHY FITCOACH AI? —</Text>
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Ionicons name="videocam" size={24} color={theme.text} />
              <Text style={[styles.featureTitle, { color: theme.text }]}>Live Classes</Text>
              <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Train with peers</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sparkles" size={24} color={theme.text} />
              <Text style={[styles.featureTitle, { color: theme.text }]}>AI Support</Text>
              <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>24/7 Guidance</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomContainer}>
          <Pressable
            style={[styles.joinButton, { backgroundColor: '#f97316' }]}
            onPress={() => { setMode('register'); }}
          >
            <Text style={styles.joinButtonText}>Join Our Community</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>

          <Text style={[styles.orText, { color: theme.textSecondary }]}>OR CONNECT WITH</Text>

          <View style={styles.socialRow}>
            <Pressable
              style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleGoogleLogin}
            >
              <Ionicons name="logo-google" size={24} color={theme.text} />
            </Pressable>
            <Pressable style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="logo-apple" size={24} color={theme.text} />
            </Pressable>
            <Pressable style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="logo-facebook" size={24} color="#1877f2" />
            </Pressable>
          </View>

          <Pressable onPress={() => { setMode('login'); }}>
            <Text style={[styles.loginLink, { color: theme.textSecondary }]}>
              Already a member? <Text style={{ color: '#f97316' }}>Login</Text>
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Login or Register form
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Pressable style={styles.backButton} onPress={() => { setMode('welcome'); }}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>

      <Pressable style={styles.themeToggle} onPress={toggleTheme}>
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color={theme.text} />
      </Pressable>

      <View style={styles.formContainer}>
        <View style={[styles.logoContainer, { backgroundColor: '#f97316', alignSelf: 'center' }]}>
          <Text style={styles.logoEmoji}>💪</Text>
        </View>

        <Text style={[styles.formTitle, { color: theme.text }]}>
          {mode === 'register' ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
          {mode === 'register' ? 'Start your fitness journey today' : 'Login to continue'}
        </Text>

        {mode === 'register' && (
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Full Name"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Password"
          placeholderTextColor={theme.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.submitButton, { backgroundColor: '#f97316', opacity: loading ? 0.7 : 1 }]}
          onPress={handleEmailAuth}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Chargement...' : mode === 'register' ? 'Create Account' : 'Login'}
          </Text>
        </Pressable>

        <Text style={[styles.orText, { color: theme.textSecondary }]}>OR CONTINUE WITH</Text>

        <View style={styles.socialRow}>
          <Pressable
            style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={handleGoogleLogin}
          >
            <Ionicons name="logo-google" size={24} color={theme.text} />
          </Pressable>
          <Pressable style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="logo-apple" size={24} color={theme.text} />
          </Pressable>
          <Pressable style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="logo-facebook" size={24} color="#1877f2" />
          </Pressable>
        </View>

        <Pressable onPress={() => { setMode(mode === 'register' ? 'login' : 'register'); }}>
          <Text style={[styles.switchText, { color: theme.textSecondary }]}>
            {mode === 'register' ? (
              <>Already have an account? <Text style={{ color: '#f97316' }}>Login</Text></>
            ) : (
              <>Don't have an account? <Text style={{ color: '#f97316' }}>Sign Up</Text></>
            )}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  themeToggle: { position: 'absolute', top: 60, right: spacing.lg, zIndex: 10 },
  backButton: { position: 'absolute', top: 60, left: spacing.lg, zIndex: 10 },
  heroContainer: { alignItems: 'center', marginTop: spacing.xl * 2 },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoEmoji: { fontSize: 30 },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 24 },
  featuresContainer: { marginTop: spacing.xl * 2, alignItems: 'center' },
  whyTitle: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 2, marginBottom: spacing.lg },
  featuresRow: { flexDirection: 'row', gap: spacing.xl * 2 },
  featureItem: { alignItems: 'center' },
  featureTitle: { fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.sm },
  featureDesc: { fontSize: fontSize.xs, marginTop: 2 },
  bottomContainer: { flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.xl },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  joinButtonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '600' },
  orText: { textAlign: 'center', fontSize: fontSize.xs, marginVertical: spacing.lg, letterSpacing: 1 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  loginLink: { textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.lg },
  formContainer: { flex: 1, justifyContent: 'center', paddingTop: spacing.xl * 2 },
  formTitle: { fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  formSubtitle: { fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.xl },
  input: {
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: fontSize.md,
  },
  errorText: { color: '#ef4444', fontSize: fontSize.sm, marginBottom: spacing.md, textAlign: 'center' },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '600' },
  switchText: { textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.lg },
});
