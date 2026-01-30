import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Vibration,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { useWorkoutStore } from '../../src/store/workout';
import { workoutApi } from '../../src/lib/api';

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${String(hrs)}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${String(mins)}:${secs.toString().padStart(2, '0')}`;
};

export default function ActiveWorkoutScreen() {
  const { colors } = useTheme();
  const {
    isActive,
    workoutType,
    elapsedSeconds,
    isPaused,
    isResting,
    restSeconds,
    exercises,
    currentExerciseIndex,
    pauseWorkout,
    resumeWorkout,
    finishWorkout,
    cancelWorkout,
    completeSet,
    startRest,
    skipRest,
  } = useWorkoutStore();

  const [saving, setSaving] = useState(false);
  const prevRestSeconds = useRef(restSeconds);

  // Rediriger si pas de workout actif
  useEffect(() => {
    if (!isActive) {
      router.replace('/(tabs)/plans' as never);
    }
  }, [isActive]);

  // Vibration quand le repos se termine
  useEffect(() => {
    if (prevRestSeconds.current > 0 && restSeconds === 0) {
      Vibration.vibrate([0, 200, 100, 200]);
    }
    prevRestSeconds.current = restSeconds;
  }, [restSeconds]);

  const handleCompleteSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const set = exercise.sets[setIndex];

    completeSet(exerciseIndex, setIndex, set.reps, set.weightKg);

    // Determiner si c'est la derniere serie de l'exercice
    const isLastSetOfExercise = setIndex === exercise.sets.length - 1;
    const isLastExercise = exerciseIndex === exercises.length - 1;

    if (!isLastSetOfExercise || !isLastExercise) {
      // Demarrer le repos
      startRest(isLastSetOfExercise);
    }
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Clean exercise data based on exercise type
      const cleanedExercises = exercises.map(ex => {
        const cleaned: {
          name: string;
          sets?: number;
          reps?: number;
          weightKg?: number;
          durationSeconds?: number;
          rounds?: number;
        } = { name: ex.name };

        if (ex.exerciseType === 'cardio') {
          // Cardio: save elapsed duration
          if (ex.cardioElapsedSeconds && ex.cardioElapsedSeconds > 0) {
            cleaned.durationSeconds = ex.cardioElapsedSeconds;
          }
        } else if (ex.exerciseType === 'hiit') {
          // HIIT: save completed rounds
          if (ex.currentRound && ex.currentRound > 0) {
            cleaned.rounds = ex.hiitCompleted ? ex.totalRounds : ex.currentRound - 1;
          }
        } else {
          // Muscu: save sets, reps, weight
          const completedSets = ex.sets.filter(s => s.completed).length;
          if (completedSets > 0) cleaned.sets = completedSets;
          if (ex.targetReps > 0) cleaned.reps = ex.targetReps;
          const firstSet = ex.sets[0] as { weightKg: number } | undefined;
          if (firstSet && firstSet.weightKg > 0) {
            cleaned.weightKg = firstSet.weightKg;
          }
        }

        return cleaned;
      });

      const workoutData = {
        type: workoutType,
        durationMinutes: Math.max(1, Math.ceil(elapsedSeconds / 60)),
        exercises: cleanedExercises,
      };

      console.log('Saving workout:', JSON.stringify(workoutData, null, 2));
      await workoutApi.create(workoutData);
      setSaving(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to save workout:', error);
      setSaving(false);
    }
  };

  const closeSuccessAndNavigate = () => {
    setShowSuccessModal(false);
    finishWorkout(); // Reset state only after modal is closed
    router.replace('/(tabs)/plans' as never);
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    cancelWorkout();
    router.back();
  };

  // Ne pas render si pas de workout actif
  if (!isActive) {
    return null;
  }

  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
    0
  );
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            console.log('Back button pressed');
            router.back();
          }}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.workoutType, { color: colors.text }]}>{workoutType}</Text>
          <Text style={[styles.progress, { color: colors.textSecondary }]}>
            {completedSets}/{totalSets} sets completed
          </Text>
        </View>
        <Pressable
          onPress={() => {
            console.log('Cancel button pressed');
            handleCancel();
          }}
          style={styles.cancelButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={24} color={colors.error} />
        </Pressable>
      </View>

      {/* Timer principal */}
      <View style={[styles.timerCard, { backgroundColor: isResting ? colors.warning : colors.primary }]}>
        {isResting ? (
          <>
            <Text style={styles.timerLabel}>REST TIME</Text>
            <Text style={styles.timerValue}>{formatTime(restSeconds)}</Text>
            <Pressable style={styles.skipButton} onPress={skipRest}>
              <Ionicons name="play-skip-forward" size={20} color="#fff" />
              <Text style={styles.skipButtonText}>Skip Rest</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.timerLabel}>WORKOUT TIME</Text>
            <Text style={styles.timerValue}>{formatTime(elapsedSeconds)}</Text>
            <Pressable
              style={styles.pauseButton}
              onPress={isPaused ? resumeWorkout : pauseWorkout}
            >
              <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color="#fff" />
              <Text style={styles.pauseButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Exercices */}
      <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
        {exercises.map((exercise, exIndex) => (
          <View
            key={exIndex}
            style={[
              styles.exerciseCard,
              { backgroundColor: colors.surface },
              exIndex === currentExerciseIndex && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            {/* Cardio Exercise */}
            {exercise.exerciseType === 'cardio' && (
              <>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderLeft}>
                    <Ionicons name="heart" size={20} color={colors.error} />
                    <Text style={[styles.exerciseName, { color: colors.text }]}>
                      {exercise.name}
                    </Text>
                  </View>
                  <Text style={[styles.exerciseTarget, { color: colors.textSecondary }]}>
                    {Math.floor((exercise.targetDurationSeconds || 0) / 60)} min
                  </Text>
                </View>

                <View style={styles.cardioContainer}>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: exercise.cardioCompleted ? colors.success : colors.error,
                          width: `${String(Math.min(100, ((exercise.cardioElapsedSeconds ?? 0) / (exercise.targetDurationSeconds ?? 1)) * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.cardioStats}>
                    <Text style={[styles.cardioTime, { color: colors.text }]}>
                      {formatTime(exercise.cardioElapsedSeconds || 0)}
                    </Text>
                    <Text style={[styles.cardioTotal, { color: colors.textSecondary }]}>
                      / {formatTime(exercise.targetDurationSeconds || 0)}
                    </Text>
                  </View>
                  {exercise.cardioCompleted && (
                    <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* HIIT Exercise */}
            {exercise.exerciseType === 'hiit' && (
              <>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderLeft}>
                    <Ionicons name="flash" size={20} color={colors.warning} />
                    <Text style={[styles.exerciseName, { color: colors.text }]}>
                      {exercise.name}
                    </Text>
                  </View>
                  <Text style={[styles.exerciseTarget, { color: colors.textSecondary }]}>
                    {exercise.totalRounds} rounds
                  </Text>
                </View>

                <View style={styles.hiitContainer}>
                  {!exercise.hiitCompleted ? (
                    <>
                      <View
                        style={[
                          styles.hiitPhaseCard,
                          {
                            backgroundColor: exercise.isWorkPhase
                              ? colors.error + '20'
                              : colors.success + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.hiitPhaseLabel,
                            { color: exercise.isWorkPhase ? colors.error : colors.success },
                          ]}
                        >
                          {exercise.isWorkPhase ? 'WORK' : 'REST'}
                        </Text>
                        <Text
                          style={[
                            styles.hiitPhaseTime,
                            { color: exercise.isWorkPhase ? colors.error : colors.success },
                          ]}
                        >
                          {exercise.hiitPhaseSeconds}s
                        </Text>
                      </View>

                      <View style={styles.hiitRoundsContainer}>
                        {Array.from({ length: exercise.totalRounds || 8 }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.hiitRoundDot,
                              {
                                backgroundColor:
                                  i < (exercise.currentRound || 1) - 1
                                    ? colors.success
                                    : i === (exercise.currentRound || 1) - 1
                                    ? colors.warning
                                    : colors.border,
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={[styles.hiitRoundText, { color: colors.textSecondary }]}>
                        Round {exercise.currentRound}/{exercise.totalRounds}
                      </Text>
                    </>
                  ) : (
                    <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.completedText}>All rounds completed!</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Muscu Exercise (default) */}
            {exercise.exerciseType === 'muscu' && (
              <>
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exercise.name}
                  </Text>
                  <Text style={[styles.exerciseTarget, { color: colors.textSecondary }]}>
                    {exercise.targetSets} x {exercise.targetReps}
                  </Text>
                </View>

                <View style={styles.setsContainer}>
                  {exercise.sets.map((set, setIndex) => (
                    <Pressable
                      key={setIndex}
                      style={[
                        styles.setButton,
                        { borderColor: colors.border },
                        set.completed && { backgroundColor: colors.success, borderColor: colors.success },
                      ]}
                      onPress={() => { if (!set.completed) handleCompleteSet(exIndex, setIndex); }}
                      disabled={set.completed}
                    >
                      {set.completed ? (
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      ) : (
                        <>
                          <Text style={[styles.setNumber, { color: colors.text }]}>
                            {setIndex + 1}
                          </Text>
                          <Text style={[styles.setInfo, { color: colors.textSecondary }]}>
                            {set.weightKg}kg
                          </Text>
                        </>
                      )}
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer - Fixed at bottom */}
      <View style={[styles.footerFixed, { backgroundColor: colors.background }]}>
        <Pressable
          style={[styles.finishButton, { backgroundColor: colors.success }]}
          onPress={() => {
            console.log('Finish button pressed');
            void handleFinish();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.finishButtonText}>
            {saving ? 'Saving...' : 'Finish Workout'}
          </Text>
        </Pressable>
      </View>

      {/* Modal de confirmation pour annuler */}
      <Modal
        visible={showCancelConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowCancelConfirm(false); }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => { setShowCancelConfirm(false); }}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Cancel Workout?
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Your progress will be lost. Are you sure?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => { setShowCancelConfirm(false); }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Keep Going
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={confirmCancel}
              >
                <Text style={styles.modalButtonTextWhite}>Cancel Workout</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de succès */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={closeSuccessAndNavigate}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={closeSuccessAndNavigate}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Félicitations !
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Vous avez terminé votre séance
            </Text>
            <Pressable
              style={[styles.successButton, { backgroundColor: colors.success }]}
              onPress={closeSuccessAndNavigate}
            >
              <Text style={styles.modalButtonTextWhite}>OK</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  workoutType: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  progress: {
    fontSize: fontSize.sm,
  },
  cancelButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
  timerValue: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginVertical: spacing.sm,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  exercisesList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  exerciseCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  exerciseTarget: {
    fontSize: fontSize.sm,
  },
  setsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  setButton: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumber: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  setInfo: {
    fontSize: fontSize.xs,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footerFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
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
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalButtonTextWhite: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  // Cardio styles
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardioContainer: {
    gap: spacing.md,
  },
  progressBarBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  cardioStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  cardioTime: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cardioTotal: {
    fontSize: fontSize.md,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
  },
  completedText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // HIIT styles
  hiitContainer: {
    gap: spacing.md,
    alignItems: 'center',
  },
  hiitPhaseCard: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    width: '100%',
  },
  hiitPhaseLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  hiitPhaseTime: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hiitRoundsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hiitRoundDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hiitRoundText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
