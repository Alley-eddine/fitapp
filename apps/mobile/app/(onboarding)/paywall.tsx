import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { profileApi } from '../../src/lib/api';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';

interface Tier {
  id: 'free' | 'pro' | 'premium';
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Basic workout tracking',
      '3 workouts per week',
      'Weight & steps logging',
      '2 AI recipes per day',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    recommended: true,
    features: [
      'Unlimited workouts',
      '10 AI recipes per day',
      'Frigo Mode',
      'Advanced statistics',
      'Progress analytics',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$19.99',
    period: '/month',
    features: [
      'Everything in Pro',
      'Unlimited AI recipes',
      'Weekly meal plans',
      'AI workout coach',
      'Priority support',
    ],
  },
];

export default function PaywallScreen() {
  const { colors } = useTheme();
  const [selectedTier, setSelectedTier] = useState<Tier['id']>('free');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      // Mark onboarding as complete
      await profileApi.update({ onboardingCompleted: true });

      // For now, just continue (Stripe not implemented)
      if (selectedTier !== 'free') {
        Alert.alert(
          'Coming Soon',
          'Premium subscriptions are not yet available. Continuing with Free plan.',
          [{ text: 'OK', onPress: () => { router.replace('/(onboarding)/app-tour' as never); } }]
        );
      } else {
        router.replace('/(onboarding)/app-tour' as never);
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTierCard = (tier: Tier) => {
    const isSelected = selectedTier === tier.id;
    return (
      <Pressable
        key={tier.id}
        style={[
          styles.tierCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
          tier.recommended && styles.recommendedCard,
        ]}
        onPress={() => { setSelectedTier(tier.id); }}
      >
        {tier.recommended && (
          <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>
        )}

        <View style={styles.tierHeader}>
          <Text style={[styles.tierName, { color: colors.text }]}>{tier.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={[styles.tierPrice, { color: colors.primary }]}>{tier.price}</Text>
            <Text style={[styles.tierPeriod, { color: colors.textSecondary }]}>{tier.period}</Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {tier.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: colors.text }]}>Choose Your Plan</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Start your fitness journey with the plan that fits your needs
        </Text>

        <View style={styles.tiersContainer}>
          {TIERS.map(renderTierCard)}
        </View>

        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
          Cancel anytime. No hidden fees.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={() => { void handleContinue(); }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>
              {selectedTier === 'free' ? 'Continue Free' : 'Start Free Trial'}
            </Text>
          )}
        </Pressable>

        {selectedTier !== 'free' && (
          <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
            7-day free trial, then {TIERS.find(t => t.id === selectedTier)?.price}{TIERS.find(t => t.id === selectedTier)?.period}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  tiersContainer: {
    gap: spacing.md,
  },
  tierCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    position: 'relative',
  },
  recommendedCard: {
    marginTop: spacing.md,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -60 }],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tierName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tierPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  tierPeriod: {
    fontSize: fontSize.sm,
    marginLeft: 2,
  },
  featuresContainer: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  trialNote: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
