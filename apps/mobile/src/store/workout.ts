import { create } from 'zustand';
import type { Exercise, ExerciseType } from '../lib/api';

export interface ActiveSet {
  setIndex: number;
  reps: number;
  weightKg: number;
  completed: boolean;
}

export interface ActiveExercise {
  name: string;
  exerciseType: ExerciseType;
  // Muscu
  targetSets: number;
  targetReps: number;
  sets: ActiveSet[];
  // Cardio
  targetDurationSeconds?: number;
  cardioElapsedSeconds?: number;
  cardioCompleted?: boolean;
  // HIIT
  workSeconds?: number;
  restSeconds?: number;
  totalRounds?: number;
  currentRound?: number;
  isWorkPhase?: boolean;
  hiitPhaseSeconds?: number;
  hiitCompleted?: boolean;
}

export interface EditWorkoutData {
  id: string;
  type: string;
  durationMinutes: number;
  exercises: Exercise[];
  notes?: string;
}

interface WorkoutState {
  // Workout actif
  isActive: boolean;
  workoutType: string;
  startTime: number | null;
  elapsedSeconds: number;
  isPaused: boolean;

  // Exercices
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;

  // Repos
  isResting: boolean;
  restSeconds: number;
  restBetweenSets: number;
  restBetweenExercises: number;

  // Edit mode
  editWorkout: EditWorkoutData | null;
  setEditWorkout: (workout: EditWorkoutData | null) => void;

  // Actions
  startWorkout: (type: string, exercises: Exercise[], restBetweenSets: number, restBetweenExercises: number) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  finishWorkout: () => { type: string; durationMinutes: number; exercises: ActiveExercise[] };
  cancelWorkout: () => void;

  // Timer
  tick: () => void;

  // Exercices
  completeSet: (exerciseIndex: number, setIndex: number, reps: number, weightKg: number) => void;
  startRest: (isExerciseRest: boolean) => void;
  skipRest: () => void;
  restTick: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  isActive: false,
  workoutType: '',
  startTime: null,
  elapsedSeconds: 0,
  isPaused: false,

  exercises: [],
  currentExerciseIndex: 0,
  currentSetIndex: 0,

  isResting: false,
  restSeconds: 0,
  restBetweenSets: 90,
  restBetweenExercises: 180,

  editWorkout: null,
  setEditWorkout: (workout) => { set({ editWorkout: workout }); },

  startWorkout: (type, exercises, restBetweenSets, restBetweenExercises) => {
    const activeExercises: ActiveExercise[] = exercises.map(ex => {
      const exerciseType = ex.exerciseType || 'muscu';

      if (exerciseType === 'cardio') {
        return {
          name: ex.name,
          exerciseType,
          targetSets: 1,
          targetReps: 0,
          sets: [],
          targetDurationSeconds: ex.durationSeconds || 1800,
          cardioElapsedSeconds: 0,
          cardioCompleted: false,
        };
      }

      if (exerciseType === 'hiit') {
        return {
          name: ex.name,
          exerciseType,
          targetSets: ex.rounds || 8,
          targetReps: 0,
          sets: [],
          workSeconds: ex.workSeconds || 30,
          restSeconds: ex.restSeconds || 30,
          totalRounds: ex.rounds || 8,
          currentRound: 1,
          isWorkPhase: true,
          hiitPhaseSeconds: ex.workSeconds || 30,
          hiitCompleted: false,
        };
      }

      // Muscu (default)
      return {
        name: ex.name,
        exerciseType,
        targetSets: ex.sets || 3,
        targetReps: ex.reps || 10,
        sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
          setIndex: i,
          reps: ex.reps || 10,
          weightKg: ex.weightKg || 0,
          completed: false,
        })),
      };
    });

    set({
      isActive: true,
      workoutType: type,
      startTime: Date.now(),
      elapsedSeconds: 0,
      isPaused: false,
      exercises: activeExercises,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      isResting: false,
      restSeconds: 0,
      restBetweenSets,
      restBetweenExercises,
    });
  },

  pauseWorkout: () => { set({ isPaused: true }); },

  resumeWorkout: () => { set({ isPaused: false }); },

  finishWorkout: () => {
    const state = get();
    const result = {
      type: state.workoutType,
      durationMinutes: Math.ceil(state.elapsedSeconds / 60),
      exercises: state.exercises,
    };

    set({
      isActive: false,
      workoutType: '',
      startTime: null,
      elapsedSeconds: 0,
      isPaused: false,
      exercises: [],
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      isResting: false,
      restSeconds: 0,
    });

    return result;
  },

  cancelWorkout: () => {
    set({
      isActive: false,
      workoutType: '',
      startTime: null,
      elapsedSeconds: 0,
      isPaused: false,
      exercises: [],
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      isResting: false,
      restSeconds: 0,
    });
  },

  tick: () => {
    const { isPaused, isResting, exercises, currentExerciseIndex, restBetweenExercises } = get();
    if (isPaused || isResting) return;

    set(state => ({ elapsedSeconds: state.elapsedSeconds + 1 }));

    const currentEx = exercises[currentExerciseIndex] as ActiveExercise | undefined;
    if (!currentEx) return;

    // Handle cardio timer
    if (currentEx.exerciseType === 'cardio' && !currentEx.cardioCompleted) {
      const newElapsed = (currentEx.cardioElapsedSeconds ?? 0) + 1;
      const isNowComplete = newElapsed >= (currentEx.targetDurationSeconds ?? 0);

      set(state => {
        const updatedExercises = [...state.exercises];
        const ex = updatedExercises[currentExerciseIndex] as ActiveExercise | undefined;
        if (ex && ex.exerciseType === 'cardio') {
          ex.cardioElapsedSeconds = newElapsed;
          if (isNowComplete) {
            ex.cardioCompleted = true;
          }
        }
        return { exercises: updatedExercises };
      });

      // If just completed, start rest for next exercise
      if (isNowComplete && currentExerciseIndex < exercises.length - 1) {
        set({ isResting: true, restSeconds: restBetweenExercises });
      }
      return;
    }

    // Handle HIIT timer
    if (currentEx.exerciseType === 'hiit' && !currentEx.hiitCompleted) {
      const newPhaseSeconds = (currentEx.hiitPhaseSeconds ?? 1) - 1;

      set(state => {
        const updatedExercises = [...state.exercises];
        const ex = updatedExercises[currentExerciseIndex] as ActiveExercise | undefined;
        if (ex && ex.exerciseType === 'hiit') {
          ex.hiitPhaseSeconds = newPhaseSeconds;

          if (newPhaseSeconds <= 0) {
            if (ex.isWorkPhase) {
              // Switch to rest phase
              ex.isWorkPhase = false;
              ex.hiitPhaseSeconds = ex.restSeconds ?? 30;
            } else {
              // End of rest, go to next round
              const nextRound = (ex.currentRound ?? 1) + 1;
              if (nextRound > (ex.totalRounds ?? 8)) {
                ex.hiitCompleted = true;
              } else {
                ex.currentRound = nextRound;
                ex.isWorkPhase = true;
                ex.hiitPhaseSeconds = ex.workSeconds ?? 30;
              }
            }
          }
        }
        return { exercises: updatedExercises };
      });

      // Check if HIIT just completed after state update
      const updatedState = get();
      const updatedEx = updatedState.exercises[currentExerciseIndex] as ActiveExercise | undefined;
      if (updatedEx?.hiitCompleted && currentExerciseIndex < exercises.length - 1) {
        set({ isResting: true, restSeconds: restBetweenExercises });
      }
    }
  },

  completeSet: (exerciseIndex, setIndex, reps, weightKg) => {
    set(state => {
      const exercises = [...state.exercises];
      if (exercises[exerciseIndex] && exercises[exerciseIndex].sets[setIndex]) {
        exercises[exerciseIndex].sets[setIndex] = {
          ...exercises[exerciseIndex].sets[setIndex],
          reps,
          weightKg,
          completed: true,
        };
      }
      return {
        exercises,
        currentExerciseIndex: exerciseIndex,
        currentSetIndex: setIndex,
      };
    });
  },

  startRest: (isExerciseRest) => {
    const state = get();
    const duration = isExerciseRest ? state.restBetweenExercises : state.restBetweenSets;
    set({ isResting: true, restSeconds: duration });
  },

  skipRest: () => {
    const { exercises, currentExerciseIndex } = get();
    const currentEx = exercises[currentExerciseIndex] as ActiveExercise | undefined;

    if (!currentEx) {
      set({ isResting: false, restSeconds: 0 });
      return;
    }

    // Check if current exercise is completed and we should advance
    const isComplete =
      (currentEx.exerciseType === 'cardio' && currentEx.cardioCompleted === true) ||
      (currentEx.exerciseType === 'hiit' && currentEx.hiitCompleted === true) ||
      (currentEx.exerciseType === 'muscu' && currentEx.sets.every(s => s.completed));

    if (isComplete && currentExerciseIndex < exercises.length - 1) {
      set({
        isResting: false,
        restSeconds: 0,
        currentExerciseIndex: currentExerciseIndex + 1
      });
    } else {
      set({ isResting: false, restSeconds: 0 });
    }
  },

  restTick: () => {
    const { restSeconds, exercises, currentExerciseIndex } = get();
    if (restSeconds > 0) {
      set({ restSeconds: restSeconds - 1 });
      return;
    }

    // Rest ended, check if we should advance to next exercise
    const currentEx = exercises[currentExerciseIndex] as ActiveExercise | undefined;
    if (!currentEx) {
      set({ isResting: false });
      return;
    }

    const isComplete =
      (currentEx.exerciseType === 'cardio' && currentEx.cardioCompleted === true) ||
      (currentEx.exerciseType === 'hiit' && currentEx.hiitCompleted === true) ||
      (currentEx.exerciseType === 'muscu' && currentEx.sets.every(s => s.completed));

    if (isComplete && currentExerciseIndex < exercises.length - 1) {
      set({
        isResting: false,
        currentExerciseIndex: currentExerciseIndex + 1
      });
    } else {
      set({ isResting: false });
    }
  },
}));
