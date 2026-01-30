import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { profileApi } from '../../src/lib/api';
import type { Profile, ProfileUpdate } from '../../src/lib/api';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';

type ActivityLevel = Profile['activityLevel'];
type Goal = Profile['goal'];
type Gender = 'male' | 'female';

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Light', description: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', description: '3-5 days/week' },
  { value: 'active', label: 'Active', description: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', description: 'Intense daily exercise' },
];

const GOALS: { value: Goal; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'lose_weight', label: 'Lose Weight', icon: 'trending-down' },
  { value: 'gain_muscle', label: 'Build Muscle', icon: 'fitness' },
  { value: 'maintain', label: 'Stay Fit', icon: 'heart' },
  { value: 'improve_endurance', label: 'Endurance', icon: 'flash' },
];

export default function ProfileSetupScreen() {
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  // Form state
  const [currentWeight, setCurrentWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');

  const calculateBirthDateFromAge = (ageYears: number): string => {
    const today = new Date();
    const birthYear = today.getFullYear() - ageYears;
    const birthDate = new Date(birthYear, today.getMonth(), today.getDate());
    return birthDate.toISOString();
  };

  const handleContinue = async () => {
    if (step === 0) {
      // Validate basic info
      if (!currentWeight || !height || !age) {
        Alert.alert('Missing Info', 'Please fill in all fields');
        return;
      }
      setStep(1);
      return;
    }

    // Save profile and continue to paywall
    setSaving(true);
    try {
      const updates: ProfileUpdate = {
        currentWeight: parseFloat(currentWeight),
        height: parseInt(height, 10),
        birthDate: calculateBirthDateFromAge(parseInt(age, 10)),
        gender,
        activityLevel,
        goal,
      };

      await profileApi.update(updates);
      router.replace('/(onboarding)/paywall');
    } catch {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const renderStep0 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Let&apos;s get to know you</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        We&apos;ll use this to personalize your experience
      </Text>

      {/* Gender */}
      <View style={styles.genderContainer}>
        <Pressable
          style={[
            styles.genderButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            gender === 'male' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
          ]}
          onPress={() => { setGender('male'); }}
        >
          <Ionicons name="male" size={32} color={gender === 'male' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.genderText, { color: gender === 'male' ? colors.primary : colors.text }]}>Male</Text>
        </Pressable>
        <Pressable
          style={[
            styles.genderButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            gender === 'female' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
          ]}
          onPress={() => { setGender('female'); }}
        >
          <Ionicons name="female" size={32} color={gender === 'female' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.genderText, { color: gender === 'female' ? colors.primary : colors.text }]}>Female</Text>
        </Pressable>
      </View>

      {/* Weight, Height, Age */}
      <View style={[styles.inputsContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={currentWeight}
              onChangeText={setCurrentWeight}
              keyboardType="decimal-pad"
              placeholder="75"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="175"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Age</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="25"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>
    </>
  );

  const renderStep1 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What&apos;s your goal?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Choose your primary fitness objective
      </Text>

      {/* Goals */}
      <View style={styles.goalsContainer}>
        {GOALS.map((g) => (
          <Pressable
            key={g.value}
            style={[
              styles.goalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              goal === g.value && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
            ]}
            onPress={() => { setGoal(g.value); }}
          >
            <Ionicons
              name={g.icon}
              size={28}
              color={goal === g.value ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.goalText, { color: goal === g.value ? colors.primary : colors.text }]}>
              {g.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Activity Level */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACTIVITY LEVEL</Text>
      <View style={[styles.activityContainer, { backgroundColor: colors.surface }]}>
        {ACTIVITY_LEVELS.map((level) => (
          <Pressable
            key={level.value}
            style={[
              styles.activityItem,
              activityLevel === level.value && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => { setActivityLevel(level.value); }}
          >
            <View style={styles.activityInfo}>
              <Text style={[styles.activityLabel, { color: colors.text }]}>{level.label}</Text>
              <Text style={[styles.activityDesc, { color: colors.textSecondary }]}>{level.description}</Text>
            </View>
            {activityLevel === level.value && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </Pressable>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: step === 0 ? '50%' : '100%' },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          Step {step + 1} of 2
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? renderStep0() : renderStep1()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step > 0 && (
          <Pressable
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={() => { setStep(0); }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        )}
        <Pressable
          style={[styles.continueButton, { backgroundColor: colors.primary }, step === 0 && { flex: 1 }]}
          onPress={() => { void handleContinue(); }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>
                {step === 0 ? 'Continue' : 'Complete Setup'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fontSize.md,
    marginBottom: spacing.xl,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  genderButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  genderText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  inputsContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  goalCard: {
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  goalText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  activityContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  activityDesc: {
    fontSize: fontSize.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
