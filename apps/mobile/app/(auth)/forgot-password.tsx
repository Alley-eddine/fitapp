import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeStore } from '../../src/store/theme';
import { colors, spacing, borderRadius, fontSize } from '../../src/constants/theme';

const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL || 'http://localhost:3001';

export default function ForgotPasswordScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [step, setStep] = useState<0 | 1>(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    if (!email) { setError('Email requis'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch(`${AUTH_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Erreur'); return; }
      setMessage('Si un numéro est associé, un code a été envoyé par SMS.');
      setStep(1);
    } catch {
      setError('Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!code || !newPassword) { setError('Code et nouveau mot de passe requis'); return; }
    if (newPassword.length < 8) { setError('Mot de passe : 8 caractères minimum'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch(`${AUTH_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Code invalide'); return; }
      setMessage('Mot de passe réinitialisé ! Redirection...');
      setTimeout(() => { router.replace('/(auth)/login' as never); }, 1500);
    } catch {
      setError('Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Pressable style={styles.backButton} onPress={() => { router.back(); }}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Mot de passe oublié</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {step === 0
            ? 'Entre ton email, on t’envoie un code par SMS.'
            : 'Entre le code reçu par SMS et ton nouveau mot de passe.'}
        </Text>

        {step === 0 ? (
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Code à 6 chiffres"
              placeholderTextColor={theme.textSecondary}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Nouveau mot de passe"
              placeholderTextColor={theme.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text> : null}

        <Pressable
          style={[styles.button, { backgroundColor: '#f97316', opacity: loading ? 0.7 : 1 }]}
          onPress={() => { void (step === 0 ? requestCode() : resetPassword()); }}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Chargement...' : step === 0 ? 'Envoyer le code' : 'Réinitialiser'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  backButton: { position: 'absolute', top: 60, left: spacing.lg, zIndex: 10 },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: fontSize.xl, fontWeight: '700', marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, marginBottom: spacing.xl },
  input: {
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: fontSize.md,
  },
  errorText: { color: '#ef4444', fontSize: fontSize.sm, marginBottom: spacing.md, textAlign: 'center' },
  message: { fontSize: fontSize.sm, marginBottom: spacing.md, textAlign: 'center' },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '600' },
});
