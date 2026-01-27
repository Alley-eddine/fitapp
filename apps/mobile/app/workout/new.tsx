import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { workoutApi } from '../../src/lib/api';
import type { Exercise } from '../../src/lib/api';

const WORKOUT_TYPES = ['Weights', 'Cardio', 'HIIT', 'Yoga'];

export default function NewWorkoutScreen() {
  const { colors } = useTheme();
  const [type, setType] = useState('Weights');
  const [duration, setDuration] = useState('45');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Bench Press', sets: 3, reps: 10, weight: 60 },
  ]);
  const [saving, setSaving] = useState(false);

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 10 }]);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!duration || exercises.length === 0) {
      Alert.alert('Error', 'Please add duration and at least one exercise');
      return;
    }

    setSaving(true);
    try {
      await workoutApi.create({
        type: type.toLowerCase(),
        duration: parseInt(duration),
        exercises: exercises.filter((e) => e.name),
        notes: notes || undefined,
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => { router.back(); }}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>New Session</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {/* Workout Type */}
          <Text style={[styles.label, { color: colors.text }]}>Workout Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesRow}>
            {WORKOUT_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.typeButton,
                  { backgroundColor: type === t ? colors.primary : colors.surface, borderColor: colors.border },
                ]}
                onPress={() => { setType(t); }}
              >
                <Ionicons
                  name={
                    t === 'Weights'
                      ? 'barbell'
                      : t === 'Cardio'
                      ? 'walk'
                      : t === 'HIIT'
                      ? 'flash'
                      : 'body'
                  }
                  size={18}
                  color={type === t ? '#fff' : colors.text}
                />
                <Text style={[styles.typeText, { color: type === t ? '#fff' : colors.text }]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Duration */}
          <View style={[styles.durationCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>DURATION (MIN)</Text>
            <TextInput
              style={[styles.durationInput, { color: colors.primary }]}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="45"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Exercises */}
          <View style={styles.exercisesHeader}>
            <Text style={[styles.label, { color: colors.text }]}>Exercises</Text>
            <View style={[styles.aiBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI SUGGESTED</Text>
            </View>
          </View>

          {exercises.map((exercise, index) => (
            <View key={index} style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
              <View style={styles.exerciseHeader}>
                <TextInput
                  style={[styles.exerciseName, { color: colors.text }]}
                  value={exercise.name}
                  onChangeText={(v: string) => { updateExercise(index, 'name', v); }}
                  placeholder="Exercise name"
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable onPress={() => { removeExercise(index); }}>
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.exerciseDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="layers" size={14} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.detailInput, { color: colors.text }]}
                    value={String(exercise.sets || '')}
                    onChangeText={(v: string) => { updateExercise(index, 'sets', parseInt(v) || 0); }}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>sets</Text>
                </View>
                <Text style={[styles.detailDot, { color: colors.textSecondary }]}>•</Text>
                <View style={styles.detailItem}>
                  <Ionicons name="repeat" size={14} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.detailInput, { color: colors.text }]}
                    value={String(exercise.reps || '')}
                    onChangeText={(v: string) => { updateExercise(index, 'reps', parseInt(v) || 0); }}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>reps</Text>
                </View>
                <Text style={[styles.detailDot, { color: colors.textSecondary }]}>•</Text>
                <View style={styles.detailItem}>
                  <Ionicons name="barbell" size={14} color={colors.primary} />
                  <TextInput
                    style={[styles.detailInput, { color: colors.primary }]}
                    value={String(exercise.weight || '')}
                    onChangeText={(v: string) => { updateExercise(index, 'weight', parseInt(v) || 0); }}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                  <Text style={[styles.detailLabel, { color: colors.primary }]}>kg</Text>
                </View>
              </View>
            </View>
          ))}

          <Pressable
            style={[styles.addExerciseButton, { borderColor: colors.primary }]}
            onPress={addExercise}
          >
            <Ionicons name="add-circle" size={22} color={colors.primary} />
            <Text style={[styles.addExerciseText, { color: colors.primary }]}>Add Exercise</Text>
          </Pressable>

          {/* Personal Notes */}
          <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Personal Notes</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel today? Any wins or struggles?"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Finish Workout'}</Text>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  content: { flex: 1, padding: spacing.lg },
  label: { fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.md },
  typesRow: { flexDirection: 'row', marginBottom: spacing.lg },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    gap: spacing.xs,
  },
  typeText: { fontSize: fontSize.md, fontWeight: '500' },
  durationCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  durationLabel: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 1 },
  durationInput: { fontSize: 40, fontWeight: '700', marginTop: spacing.xs },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  aiBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  exerciseCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: { fontSize: fontSize.md, fontWeight: '600', flex: 1 },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailInput: { fontSize: fontSize.md, fontWeight: '500', minWidth: 24, textAlign: 'center' },
  detailLabel: { fontSize: fontSize.sm },
  detailDot: { fontSize: fontSize.sm },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  addExerciseText: { fontSize: fontSize.md, fontWeight: '500' },
  notesInput: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    fontSize: fontSize.md,
    minHeight: 100,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  saveButtonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '600' },
});
