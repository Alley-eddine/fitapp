import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { workoutApi } from '../../src/lib/api';
import type { Workout } from '../../src/lib/api';
import { useWorkoutStore } from '../../src/store/workout';

export default function PlansScreen() {
  const { colors } = useTheme();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  useFocusEffect(
    useCallback(() => {
      void loadWorkouts();
    }, [])
  );

  const loadWorkouts = async () => {
    try {
      const response = await workoutApi.list(30);
      setWorkouts(response.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getWorkoutIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'weights':
        return 'barbell';
      case 'cardio':
        return 'bicycle';
      case 'hiit':
        return 'flash';
      case 'running':
        return 'walk';
      case 'yoga':
        return 'body';
      default:
        return 'fitness';
    }
  };

  const handleStartFromWorkout = (workout: Workout) => {
    // Convertir le workout en exercices pour le store
    const exercises = workout.exercises || [
      { name: workout.type, sets: 3, reps: 10, weightKg: 0 }
    ];

    startWorkout(
      workout.type,
      exercises,
      90,  // rest between sets
      180  // rest between exercises
    );
    router.push('/workout/active' as never);
  };

  const handleDeleteWorkout = async (workout: Workout) => {
    const doDelete = async () => {
      try {
        console.log('Deleting workout:', workout.id);
        await workoutApi.delete(workout.id);
        console.log('Delete successful');
        setWorkouts(prev => prev.filter(w => w.id !== workout.id));
        setModalVisible(false);
      } catch (error) {
        console.error('Delete failed:', error);
        if (Platform.OS === 'web') {
          window.alert('Failed to delete workout');
        } else {
          Alert.alert('Error', 'Failed to delete workout');
        }
      }
    };

    if (Platform.OS === 'web') {
      // window.confirm works on web, Alert.alert doesn't
      if (window.confirm('Are you sure you want to delete this workout?')) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete Workout',
        'Are you sure you want to delete this workout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { void doDelete(); } },
        ]
      );
    }
  };

  const openWorkoutOptions = (workout: Workout) => {
    setSelectedWorkout(workout);
    setModalVisible(true);
  };

  const renderWorkout = ({ item }: { item: Workout }) => (
    <Pressable
      style={[styles.workoutCard, { backgroundColor: colors.surface }]}
      onPress={() => { openWorkoutOptions(item); }}
    >
      <View style={[styles.workoutIcon, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={getWorkoutIcon(item.type)} size={24} color={colors.primary} />
      </View>
      <View style={styles.workoutInfo}>
        <Text style={[styles.workoutType, { color: colors.text }]}>{item.type}</Text>
        <Text style={[styles.workoutMeta, { color: colors.textSecondary }]}>
          {item.durationMinutes} min • {item.caloriesBurned || 0} kcal
        </Text>
        {item.exercises && item.exercises.length > 0 && (
          <Text style={[styles.workoutExercises, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.exercises.map(e => e.name).join(', ')}
          </Text>
        )}
      </View>
      <View style={styles.workoutActions}>
        <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
          {new Date(item.loggedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
        <Pressable
          style={[styles.playButton, { backgroundColor: colors.primary }]}
          onPress={() => { handleStartFromWorkout(item); }}
        >
          <Ionicons name="play" size={16} color="#fff" />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Mes Séances</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={[styles.aiButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={() => {
              // TODO: Open AI chat to generate workout
              console.log('Open AI workout generator');
              if (Platform.OS === 'web') {
                window.alert('Assistant IA bientôt disponible !');
              } else {
                Alert.alert('Bientôt', 'Assistant IA bientôt disponible !');
              }
            }}
          >
            <Ionicons name="sparkles" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => { router.push('/workout/new' as never); }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      {workouts.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Ionicons name="barbell-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No workouts yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Start logging your workouts to track progress
          </Text>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => { router.push('/workout/new' as never); }}
          >
            <Text style={styles.emptyButtonText}>Log First Workout</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item: Workout) => item.id}
          renderItem={renderWorkout}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal Options */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setModalVisible(false); }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => { setModalVisible(false); }}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            {selectedWorkout && (
              <>
                {/* Close button */}
                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => { setModalVisible(false); }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>

                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedWorkout.type}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    {selectedWorkout.durationMinutes} min • {new Date(selectedWorkout.loggedAt).toLocaleDateString()}
                  </Text>
                </View>

                {selectedWorkout.exercises && selectedWorkout.exercises.length > 0 && (
                  <View style={[styles.exercisesList, { borderColor: colors.border }]}>
                    {selectedWorkout.exercises.map((ex, i) => (
                      <Text key={i} style={[styles.exerciseItem, { color: colors.text }]}>
                        • {ex.name} {ex.sets && ex.reps ? `(${String(ex.sets)}x${String(ex.reps)})` : ''}
                        {ex.weightKg ? ` - ${String(ex.weightKg)}kg` : ''}
                      </Text>
                    ))}
                  </View>
                )}

                <Pressable
                  style={[styles.modalOption, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setModalVisible(false);
                    handleStartFromWorkout(selectedWorkout);
                  }}
                >
                  <Ionicons name="play-circle" size={22} color="#fff" />
                  <Text style={styles.modalOptionTextWhite}>Start This Workout</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalOptionOutline, { borderColor: colors.primary }]}
                  onPress={() => {
                    setModalVisible(false);
                    useWorkoutStore.getState().setEditWorkout({
                      id: selectedWorkout.id,
                      type: selectedWorkout.type,
                      durationMinutes: selectedWorkout.durationMinutes,
                      exercises: selectedWorkout.exercises || [],
                      notes: selectedWorkout.notes || undefined,
                    });
                    router.push('/workout/new' as never);
                  }}
                >
                  <Ionicons name="pencil" size={20} color={colors.primary} />
                  <Text style={[styles.modalOptionTextOutline, { color: colors.primary }]}>Edit Workout</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalDeleteButton]}
                  onPress={() => {
                    console.log('Delete button pressed for workout:', selectedWorkout.id);
                    void handleDeleteWorkout(selectedWorkout);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={[styles.modalDeleteText, { color: colors.error }]}>Delete</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: spacing.lg, paddingTop: spacing.md },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: { flex: 1, marginLeft: spacing.md },
  workoutType: { fontSize: fontSize.md, fontWeight: '600', textTransform: 'capitalize' },
  workoutMeta: { fontSize: fontSize.sm, marginTop: 2 },
  workoutExercises: { fontSize: fontSize.xs, marginTop: 4 },
  workoutActions: { alignItems: 'flex-end', gap: spacing.sm },
  workoutDate: { fontSize: fontSize.sm },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.sm },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
  },
  emptyButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  exercisesList: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  exerciseItem: {
    fontSize: fontSize.sm,
    paddingVertical: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  modalOptionTextWhite: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalCloseButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalOptionOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    gap: spacing.sm,
    borderWidth: 2,
  },
  modalOptionTextOutline: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  modalDeleteText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
