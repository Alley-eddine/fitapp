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
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { profileApi, userApi } from '../../src/lib/api';
import type { Profile, ProfileUpdate } from '../../src/lib/api';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/auth';
import { useImagePicker } from '../../src/hooks/useImagePicker';

// Helper to check if avatar is a URL or emoji
const isImageUrl = (value: string): boolean => {
  return value.startsWith('http://') || value.startsWith('https://');
};

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

const AVATARS = [
  '💪', '🏃', '🧘', '🏋️', '🚴', '⚡',
  '🔥', '🥗', '🍎', '💧', '🎯', '🏆',
  '👤', '🦁', '🐺', '🦅', '🐉', '🌟',
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
  
  const setAuth = useAuthStore((s) => s.setAuth);
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  // User info state
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('💪');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Image picker
  const { pickFromGallery, takePhoto, isUploading } = useImagePicker({
    onSuccess: (url) => {
      setAvatar(url);
      setShowAvatarPicker(false);
    },
    folder: 'avatars',
  });

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
      const [profileData, userData] = await Promise.all([
        profileApi.get(),
        userApi.get(),
      ]);

      // User info
      setName(userData.name || '');
      setAvatar(userData.avatarUrl || '💪');

      // Profile info
      setCurrentWeight(profileData.currentWeight?.toString() || '');
      setTargetWeight(profileData.targetWeight?.toString() || '');
      setHeight(profileData.height?.toString() || '');
      setAge(calculateAgeFromBirthDate(profileData.birthDate));
      setGender(profileData.gender || 'male');
      setActivityLevel(profileData.activityLevel);
      setGoal(profileData.goal);
      setDailyCalories(profileData.dailyCalorieTarget?.toString() || '');
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
      const profileUpdates: ProfileUpdate = {};

      if (currentWeight) profileUpdates.currentWeight = parseFloat(currentWeight);
      if (targetWeight) profileUpdates.targetWeight = parseFloat(targetWeight);
      if (height) profileUpdates.height = parseInt(height, 10);
      if (age) profileUpdates.birthDate = calculateBirthDateFromAge(parseInt(age, 10));
      if (dailyCalories) profileUpdates.dailyCalorieTarget = parseInt(dailyCalories, 10);
      profileUpdates.gender = gender;
      profileUpdates.activityLevel = activityLevel;
      profileUpdates.goal = goal;

      // Save both user and profile data
      const [updatedUser] = await Promise.all([
        userApi.update({ name: name || undefined, avatarUrl: avatar || undefined }),
        profileApi.update(profileUpdates),
      ]);

      // Update auth store with new user info
      if (currentUser && token) {
        await setAuth(
          {
            ...currentUser,
            name: updatedUser.name || currentUser.name,
            avatar: updatedUser.avatarUrl || currentUser.avatar,
          },
          token
        );
      }

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
        {/* Avatar & Name Section */}
        <View style={styles.avatarSection}>
          <Pressable
            style={[styles.avatarButton, { backgroundColor: colors.surface }]}
            onPress={() => { setShowAvatarPicker(true); }}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : isImageUrl(avatar) ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{avatar}</Text>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </Pressable>
          <View style={styles.nameInputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
            <TextInput
              style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Avatar Picker Modal - Source Selection */}
        <Modal
          visible={showAvatarPicker}
          transparent
          animationType="fade"
          onRequestClose={() => { setShowAvatarPicker(false); }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => { setShowAvatarPicker(false); }}
          >
            <View
              style={[styles.avatarPickerContainer, { backgroundColor: colors.surface }]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.avatarPickerTitle, { color: colors.text }]}>Profile Picture</Text>

              {/* Photo options */}
              <View style={styles.photoOptions}>
                <Pressable
                  style={[styles.photoOption, { backgroundColor: colors.background }]}
                  onPress={() => { void pickFromGallery(); }}
                >
                  <Ionicons name="images" size={28} color={colors.primary} />
                  <Text style={[styles.photoOptionText, { color: colors.text }]}>Gallery</Text>
                </Pressable>
                <Pressable
                  style={[styles.photoOption, { backgroundColor: colors.background }]}
                  onPress={() => { void takePhoto(); }}
                >
                  <Ionicons name="camera" size={28} color={colors.primary} />
                  <Text style={[styles.photoOptionText, { color: colors.text }]}>Camera</Text>
                </Pressable>
                <Pressable
                  style={[styles.photoOption, { backgroundColor: colors.background }]}
                  onPress={() => { setShowEmojiPicker(true); setShowAvatarPicker(false); }}
                >
                  <Text style={styles.emojiOptionIcon}>😀</Text>
                  <Text style={[styles.photoOptionText, { color: colors.text }]}>Emoji</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Emoji Picker Modal */}
        <Modal
          visible={showEmojiPicker}
          transparent
          animationType="fade"
          onRequestClose={() => { setShowEmojiPicker(false); }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => { setShowEmojiPicker(false); }}
          >
            <View
              style={[styles.avatarPickerContainer, { backgroundColor: colors.surface }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <Pressable onPress={() => { setShowEmojiPicker(false); setShowAvatarPicker(true); }}>
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.avatarPickerTitle, { color: colors.text, flex: 1, marginBottom: 0 }]}>
                  Choose Emoji
                </Text>
                <View style={{ width: 24 }} />
              </View>
              <View style={styles.avatarGrid}>
                {AVATARS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={[
                      styles.avatarOption,
                      { backgroundColor: colors.background },
                      avatar === emoji && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setAvatar(emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    <Text style={styles.avatarOptionEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Modal>

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
  // Avatar & Name styles
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  avatarButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInputContainer: {
    flex: 1,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  avatarPickerContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  avatarPickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionEmoji: {
    fontSize: 28,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  photoOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  photoOptionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  emojiOptionIcon: {
    fontSize: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
});
