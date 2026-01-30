import { useState, useEffect } from 'react';
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

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very Active' },
];

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'gain_muscle', label: 'Gain Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_endurance', label: 'Improve Endurance' },
];

type Gender = 'male' | 'female';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const calculateCalories = (
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goal: Goal
): number => {
  // Mifflin-St Jeor Equation for BMR
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // TDEE = BMR × Activity Multiplier
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];

  // Adjust based on goal
  switch (goal) {
    case 'lose_weight':
      return Math.round(tdee - 500); // 500 kcal deficit
    case 'gain_muscle':
      return Math.round(tdee + 300); // 300 kcal surplus
    case 'improve_endurance':
      return Math.round(tdee + 200); // Slight surplus for energy
    default:
      return Math.round(tdee); // Maintain
  }
};

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [dailyCalories, setDailyCalories] = useState('');
  const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null);

  useEffect(() => {
    void loadProfile();
  }, []);

  const calculateAgeFromBirthDate = (birthDate: string | null): string => {
    if (!birthDate) return '';
    const birth = new Date(birthDate);
    const today = new Date();
    let ageYears = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      ageYears--;
    }
    return ageYears.toString();
  };

  const loadProfile = async () => {
    try {
      const data = await profileApi.get();
      setCurrentWeight(data.currentWeight?.toString() || '');
      setTargetWeight(data.targetWeight?.toString() || '');
      setHeight(data.height?.toString() || '');
      setAge(calculateAgeFromBirthDate(data.birthDate));
      setGender(data.gender || 'male');
      setActivityLevel(data.activityLevel);
      setGoal(data.goal);
      setDailyCalories(data.dailyCalorieTarget?.toString() || '');
    } catch {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateBirthDateFromAge = (ageYears: number): string => {
    const today = new Date();
    const birthYear = today.getFullYear() - ageYears;
    const birthDate = new Date(birthYear, today.getMonth(), today.getDate());
    return birthDate.toISOString();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: ProfileUpdate = {};

      if (currentWeight) updates.currentWeight = parseFloat(currentWeight);
      if (targetWeight) updates.targetWeight = parseFloat(targetWeight);
      if (height) updates.height = parseInt(height, 10);
      if (age) updates.birthDate = calculateBirthDateFromAge(parseInt(age, 10));
      if (dailyCalories) updates.dailyCalorieTarget = parseInt(dailyCalories, 10);
      updates.gender = gender;
      updates.activityLevel = activityLevel;
      updates.goal = goal;

      await profileApi.update(updates);
      Alert.alert('Success', 'Profile updated!', [
        { text: 'OK', onPress: () => { router.back(); } },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { router.back(); }} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weight Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>WEIGHT (kg)</Text>
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current</Text>
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={targetWeight}
              onChangeText={setTargetWeight}
              keyboardType="decimal-pad"
              placeholder="70"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Height & Age Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HEIGHT & AGE</Text>
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
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

        {/* Gender */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GENDER</Text>
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <Pressable
            style={[
              styles.genderButton,
              { borderColor: colors.border },
              gender === 'male' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
            ]}
            onPress={() => { setGender('male'); }}
          >
            <Ionicons name="male" size={24} color={gender === 'male' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.genderText, { color: gender === 'male' ? colors.primary : colors.text }]}>Male</Text>
          </Pressable>
          <Pressable
            style={[
              styles.genderButton,
              { borderColor: colors.border },
              gender === 'female' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
            ]}
            onPress={() => { setGender('female'); }}
          >
            <Ionicons name="female" size={24} color={gender === 'female' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.genderText, { color: gender === 'female' ? colors.primary : colors.text }]}>Female</Text>
          </Pressable>
        </View>

        {/* Activity Level */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACTIVITY LEVEL</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {ACTIVITY_LEVELS.map((level) => (
            <Pressable
              key={level.value}
              style={[
                styles.optionItem,
                activityLevel === level.value && { backgroundColor: colors.primary + '20' },
              ]}
              onPress={() => { setActivityLevel(level.value); }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{level.label}</Text>
              {activityLevel === level.value && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Fitness Goal */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FITNESS GOAL</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {GOALS.map((g) => (
            <Pressable
              key={g.value}
              style={[
                styles.optionItem,
                goal === g.value && { backgroundColor: colors.primary + '20' },
              ]}
              onPress={() => { setGoal(g.value); }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{g.label}</Text>
              {goal === g.value && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Daily Calories */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DAILY CALORIE TARGET</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.calorieRow}>
            <TextInput
              style={[styles.calorieInput, { color: colors.text, borderColor: colors.border }]}
              value={dailyCalories}
              onChangeText={setDailyCalories}
              keyboardType="number-pad"
              placeholder="2000"
              placeholderTextColor={colors.textSecondary}
            />
            <Pressable
              style={[styles.calculateButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                const w = parseFloat(currentWeight);
                const h = parseInt(height, 10);
                const a = parseInt(age, 10);
                if (w && h && a) {
                  const cal = calculateCalories(w, h, a, gender, activityLevel, goal);
                  setCalculatedCalories(cal);
                  setDailyCalories(cal.toString());
                } else {
                  Alert.alert('Missing Info', 'Please fill weight, height and age to calculate');
                }
              }}
            >
              <Ionicons name="calculator" size={20} color="#fff" />
              <Text style={styles.calculateButtonText}>Calculate</Text>
            </Pressable>
          </View>
          {calculatedCalories && (
            <Text style={[styles.calorieHint, { color: colors.textSecondary }]}>
              Based on your profile: {calculatedCalories} kcal/day
            </Text>
          )}
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={() => { void handleSave(); }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: { padding: spacing.xs },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: fontSize.sm, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  optionText: { fontSize: fontSize.md },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  genderText: { fontSize: fontSize.md, fontWeight: '500' },
  calorieRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  calorieInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  calculateButtonText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  calorieHint: { fontSize: fontSize.sm, marginTop: spacing.sm },
  saveButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl * 2,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
});
