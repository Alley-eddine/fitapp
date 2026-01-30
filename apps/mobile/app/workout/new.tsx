import { useState, useEffect } from 'react';
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
import type { Exercise, ExerciseType } from '../../src/lib/api';
import { useWorkoutStore } from '../../src/store/workout';

// Types d'exercices avec labels
const EXERCISE_TYPES: { id: ExerciseType; label: string; icon: string }[] = [
  { id: 'muscu', label: 'Muscu', icon: 'barbell' },
  { id: 'cardio', label: 'Cardio', icon: 'bicycle' },
  { id: 'hiit', label: 'HIIT', icon: 'flash' },
];

// Temps par série par défaut (en secondes)
const DEFAULT_TIME_PER_SET = 40;

export default function NewWorkoutScreen() {
  const { colors } = useTheme();
  const editWorkout = useWorkoutStore((s) => s.editWorkout);
  const setEditWorkout = useWorkoutStore((s) => s.setEditWorkout);

  const [sessionName, setSessionName] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Bench Press', exerciseType: 'muscu', sets: 3, reps: 10, weightKg: 60 },
  ]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Pré-remplir le formulaire si on est en mode édition
  useEffect(() => {
    if (editWorkout) {
      setEditId(editWorkout.id);
      setSessionName(editWorkout.type);
      setDuration(String(editWorkout.durationMinutes));
      setNotes(editWorkout.notes || '');
      if (editWorkout.exercises.length > 0) {
        // Normalize exercise data (DB returns strings/nulls, we need numbers/undefined)
        const normalizedExercises = editWorkout.exercises.map(ex => ({
          name: ex.name,
          exerciseType: ex.exerciseType ?? 'muscu',
          sets: typeof ex.sets === 'string' ? parseInt(ex.sets) : ex.sets,
          reps: typeof ex.reps === 'string' ? parseInt(ex.reps) : ex.reps,
          weightKg: typeof ex.weightKg === 'string' ? parseFloat(ex.weightKg) : ex.weightKg,
          durationSeconds: ex.durationSeconds ?? undefined,
          workSeconds: ex.workSeconds ?? undefined,
          restSeconds: ex.restSeconds ?? undefined,
          rounds: ex.rounds ?? undefined,
        }));
        setExercises(normalizedExercises);
      }
      // Clear the edit workout from store
      setEditWorkout(null);
    }
  }, [editWorkout, setEditWorkout]);

  // Paramètres de repos personnalisables (en secondes)
  const [restBetweenSets, setRestBetweenSets] = useState('90'); // 1.5 min
  const [restBetweenExercises, setRestBetweenExercises] = useState('180'); // 3 min

  // Calcule la durée estimée basée sur les exercices
  const calculateEstimatedDuration = () => {
    if (exercises.length === 0) return 0;

    const restSets = parseInt(restBetweenSets) || 90;
    const restExercises = parseInt(restBetweenExercises) || 180;
    let totalSeconds = 0;

    exercises.forEach((exercise, index) => {
      const type = exercise.exerciseType || 'muscu';

      if (type === 'muscu') {
        const sets = exercise.sets || 1;
        // Temps pour les séries
        totalSeconds += sets * DEFAULT_TIME_PER_SET;
        // Repos entre les séries (n-1 repos pour n séries)
        totalSeconds += (sets - 1) * restSets;
      } else if (type === 'cardio') {
        // Durée cardio
        totalSeconds += exercise.durationSeconds || 0;
      } else {
        // HIIT: (travail + repos) × rounds
        const workSec = exercise.workSeconds || 30;
        const restSec = exercise.restSeconds || 30;
        const rounds = exercise.rounds || 1;
        totalSeconds += (workSec + restSec) * rounds;
      }

      // Repos entre exercices (sauf après le dernier)
      if (index < exercises.length - 1) {
        totalSeconds += restExercises;
      }
    });

    return Math.ceil(totalSeconds / 60); // Convertir en minutes
  };

  const applyEstimatedDuration = () => {
    const estimated = calculateEstimatedDuration();
    if (estimated > 0) {
      setDuration(String(estimated));
    }
  };

  const addExercise = (type: ExerciseType = 'muscu') => {
    const newExercise: Exercise = { name: '', exerciseType: type };
    if (type === 'muscu') {
      newExercise.sets = 3;
      newExercise.reps = 10;
    } else if (type === 'cardio') {
      newExercise.durationSeconds = 1800; // 30 min
    } else {
      newExercise.workSeconds = 30;
      newExercise.restSeconds = 30;
      newExercise.rounds = 8;
    }
    setExercises([...exercises, newExercise]);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleStartWorkout = () => {
    if (!sessionName.trim()) {
      showAlert('Error', 'Please enter a session name');
      return;
    }
    if (exercises.length === 0 || !exercises.some(e => e.name)) {
      showAlert('Error', 'Please add at least one exercise');
      return;
    }

    startWorkout(
      sessionName.trim(),
      exercises.filter(e => e.name),
      parseInt(restBetweenSets) || 90,
      parseInt(restBetweenExercises) || 180
    );
    router.push('/workout/active' as never);
  };

  const handleSave = async () => {
    console.log('handleSave called', { sessionName, exercises });

    if (!sessionName.trim()) {
      showAlert('Error', 'Please enter a session name');
      return;
    }
    if (exercises.length === 0 || !exercises.some(e => e.name)) {
      showAlert('Error', 'Please add at least one exercise');
      return;
    }

    setSaving(true);
    try {
      // Clean exercise data: remove id, ensure numbers, remove null/undefined optional fields
      const cleanedExercises = exercises
        .filter((e) => e.name)
        .map(ex => {
          const cleaned: {
            name: string;
            exerciseType?: ExerciseType;
            sets?: number;
            reps?: number;
            weightKg?: number;
            durationSeconds?: number;
            workSeconds?: number;
            restSeconds?: number;
            rounds?: number;
          } = {
            name: ex.name,
            exerciseType: ex.exerciseType || 'muscu',
          };
          // Muscu fields
          if (ex.sets != null && ex.sets > 0) cleaned.sets = ex.sets;
          if (ex.reps != null && ex.reps > 0) cleaned.reps = ex.reps;
          if (ex.weightKg != null && ex.weightKg > 0) cleaned.weightKg = ex.weightKg;
          // Cardio field
          if (ex.durationSeconds != null && ex.durationSeconds > 0) cleaned.durationSeconds = ex.durationSeconds;
          // HIIT fields
          if (ex.workSeconds != null && ex.workSeconds > 0) cleaned.workSeconds = ex.workSeconds;
          if (ex.restSeconds != null && ex.restSeconds > 0) cleaned.restSeconds = ex.restSeconds;
          if (ex.rounds != null && ex.rounds > 0) cleaned.rounds = ex.rounds;
          return cleaned;
        });

      const workoutData = {
        type: sessionName.trim(),
        durationMinutes: parseInt(duration) || calculateEstimatedDuration(),
        exercises: cleanedExercises,
        notes: notes || undefined,
      };

      console.log('Saving workout:', JSON.stringify(workoutData, null, 2));

      if (editId) {
        await workoutApi.update(editId, workoutData);
      } else {
        await workoutApi.create(workoutData);
      }
      router.back();
    } catch (error) {
      console.error('Save failed:', error);
      showAlert('Error', 'Failed to save workout');
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
          <Text style={[styles.title, { color: colors.text }]}>{editId ? 'Edit Session' : 'New Session'}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {/* Session Name */}
          <Text style={[styles.label, { color: colors.text }]}>Nom de la séance</Text>
          <TextInput
            style={[styles.sessionNameInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={sessionName}
            onChangeText={setSessionName}
            placeholder="Ex: Push Day, Leg Day, Cardio..."
            placeholderTextColor={colors.textSecondary}
          />

          {/* Rest Times */}
          <Text style={[styles.label, { color: colors.text }]}>Rest Times</Text>
          <View style={[styles.restTimesCard, { backgroundColor: colors.surface }]}>
            <View style={styles.restTimeRow}>
              <View style={styles.restTimeItem}>
                <Text style={[styles.restTimeLabel, { color: colors.textSecondary }]}>Between sets</Text>
                <View style={styles.restTimeInputRow}>
                  <TextInput
                    style={[styles.restTimeInput, { color: colors.text, borderColor: colors.border }]}
                    value={restBetweenSets}
                    onChangeText={setRestBetweenSets}
                    keyboardType="number-pad"
                    placeholder="90"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.restTimeUnit, { color: colors.textSecondary }]}>sec</Text>
                </View>
              </View>
              <View style={styles.restTimeItem}>
                <Text style={[styles.restTimeLabel, { color: colors.textSecondary }]}>Between exercises</Text>
                <View style={styles.restTimeInputRow}>
                  <TextInput
                    style={[styles.restTimeInput, { color: colors.text, borderColor: colors.border }]}
                    value={restBetweenExercises}
                    onChangeText={setRestBetweenExercises}
                    keyboardType="number-pad"
                    placeholder="180"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.restTimeUnit, { color: colors.textSecondary }]}>sec</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Duration */}
          <View style={[styles.durationCard, { backgroundColor: colors.surface }]}>
            <View style={styles.durationHeader}>
              <View>
                <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>DURATION (MIN)</Text>
                <TextInput
                  style={[styles.durationInput, { color: colors.primary }]}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  placeholder="--"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <Pressable
                style={[styles.calculateButton, { backgroundColor: colors.primary }]}
                onPress={applyEstimatedDuration}
              >
                <Ionicons name="calculator" size={18} color="#fff" />
                <Text style={styles.calculateButtonText}>Calculate</Text>
              </Pressable>
            </View>
            {duration === '' && (
              <Text style={[styles.durationHint, { color: colors.textSecondary }]}>
                Estimated: ~{calculateEstimatedDuration()} min
              </Text>
            )}
          </View>

          {/* Exercises */}
          <Text style={[styles.label, { color: colors.text }]}>Exercices</Text>

          {exercises.map((exercise, index) => (
            <View key={index} style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
              {/* Type selector */}
              <View style={styles.typeSelector}>
                {EXERCISE_TYPES.map((type) => (
                  <Pressable
                    key={type.id}
                    style={[
                      styles.typeButton,
                      { borderColor: colors.border },
                      exercise.exerciseType === type.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => { updateExercise(index, 'exerciseType', type.id); }}
                  >
                    <Ionicons
                      name={type.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={exercise.exerciseType === type.id ? '#fff' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: exercise.exerciseType === type.id ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => { removeExercise(index); }} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>

              {/* Exercise name */}
              <TextInput
                style={[styles.exerciseName, { color: colors.text, borderBottomColor: colors.border }]}
                value={exercise.name}
                onChangeText={(v: string) => { updateExercise(index, 'name', v); }}
                placeholder={
                  exercise.exerciseType === 'cardio' ? 'Vélo, Course, Rameur...' :
                  exercise.exerciseType === 'hiit' ? 'Sprint, Burpees...' :
                  'Bench Press, Squat...'
                }
                placeholderTextColor={colors.textSecondary}
              />

              {/* Conditional fields based on type */}
              {/* MUSCU: sets, reps, weight - responsive grid */}
              {exercise.exerciseType === 'muscu' && (
                <View style={styles.muscuDetails}>
                  <View style={[styles.muscuItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.muscuLabel, { color: colors.textSecondary }]}>Sets</Text>
                    <TextInput
                      style={[styles.muscuInput, { color: colors.text }]}
                      value={String(exercise.sets || '')}
                      onChangeText={(v: string) => { updateExercise(index, 'sets', parseInt(v) || 0); }}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={[styles.muscuItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.muscuLabel, { color: colors.textSecondary }]}>Reps</Text>
                    <TextInput
                      style={[styles.muscuInput, { color: colors.text }]}
                      value={String(exercise.reps || '')}
                      onChangeText={(v: string) => { updateExercise(index, 'reps', parseInt(v) || 0); }}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={[styles.muscuItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.muscuLabel, { color: colors.primary }]}>Weight (kg)</Text>
                    <TextInput
                      style={[styles.muscuInput, { color: colors.primary }]}
                      value={String(exercise.weightKg || '')}
                      onChangeText={(v: string) => { updateExercise(index, 'weightKg', parseInt(v) || 0); }}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              )}

              <View style={styles.exerciseDetails}>

                {/* CARDIO: duration */}
                {exercise.exerciseType === 'cardio' && (
                  <View style={styles.detailItem}>
                    <Ionicons name="time" size={14} color={colors.primary} />
                    <TextInput
                      style={[styles.detailInput, { color: colors.primary, minWidth: 40 }]}
                      value={String(Math.floor((exercise.durationSeconds || 0) / 60) || '')}
                      onChangeText={(v: string) => { updateExercise(index, 'durationSeconds', (parseInt(v) || 0) * 60); }}
                      keyboardType="number-pad"
                      placeholder="0"
                    />
                    <Text style={[styles.detailLabel, { color: colors.primary }]}>min</Text>
                  </View>
                )}

                {/* HIIT: work, rest, rounds */}
                {exercise.exerciseType === 'hiit' && (
                  <>
                    <View style={styles.detailItem}>
                      <Ionicons name="flame" size={14} color={colors.primary} />
                      <TextInput
                        style={[styles.detailInput, { color: colors.primary }]}
                        value={String(exercise.workSeconds || '')}
                        onChangeText={(v: string) => { updateExercise(index, 'workSeconds', parseInt(v) || 0); }}
                        keyboardType="number-pad"
                        placeholder="30"
                      />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>sec</Text>
                    </View>
                    <Text style={[styles.detailDot, { color: colors.textSecondary }]}>/</Text>
                    <View style={styles.detailItem}>
                      <Ionicons name="pause" size={14} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.detailInput, { color: colors.text }]}
                        value={String(exercise.restSeconds || '')}
                        onChangeText={(v: string) => { updateExercise(index, 'restSeconds', parseInt(v) || 0); }}
                        keyboardType="number-pad"
                        placeholder="30"
                      />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>sec</Text>
                    </View>
                    <Text style={[styles.detailDot, { color: colors.textSecondary }]}>×</Text>
                    <View style={styles.detailItem}>
                      <Ionicons name="refresh" size={14} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.detailInput, { color: colors.text }]}
                        value={String(exercise.rounds || '')}
                        onChangeText={(v: string) => { updateExercise(index, 'rounds', parseInt(v) || 0); }}
                        keyboardType="number-pad"
                        placeholder="8"
                      />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>rounds</Text>
                    </View>
                  </>
                )}
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

        {/* Action Buttons */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : editId ? 'Update Workout' : 'Save Workout'}</Text>
          </Pressable>
          <Pressable
            style={[styles.startLiveButton, { borderColor: colors.border }]}
            onPress={handleStartWorkout}
          >
            <Ionicons name="play-circle" size={20} color={colors.textSecondary} />
            <Text style={[styles.startLiveText, { color: colors.textSecondary }]}>
              Start Live Session
            </Text>
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
  sessionNameInput: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  restTimesCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  restTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  restTimeItem: {
    flex: 1,
  },
  restTimeLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  restTimeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  restTimeInput: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 60,
    textAlign: 'center',
  },
  restTimeUnit: {
    fontSize: fontSize.sm,
  },
  durationCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  durationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationLabel: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 1 },
  durationInput: { fontSize: 40, fontWeight: '700', marginTop: spacing.xs },
  durationHint: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  exerciseCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  typeButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: spacing.xs,
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
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
    gap: spacing.sm,
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
  startLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  startLiveText: { fontSize: fontSize.md, fontWeight: '500' },
  muscuDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  muscuItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  muscuLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  muscuInput: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 2,
    minWidth: 30,
    // @ts-expect-error - web-only style
    outlineStyle: 'none',
  },
});
