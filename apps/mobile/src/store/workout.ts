import { create } from 'zustand';
import type { Exercise } from '../lib/api';

export interface ActiveSet {
  setIndex: number;
  reps: number;
  weightKg: number;
  completed: boolean;
}

export interface ActiveExercise {
  name: string;
  targetSets: number;
  targetReps: number;
  sets: ActiveSet[];
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
    const activeExercises: ActiveExercise[] = exercises.map(ex => ({
      name: ex.name,
      targetSets: ex.sets || 3,
      targetReps: ex.reps || 10,
      sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
        setIndex: i,
        reps: ex.reps || 10,
        weightKg: ex.weightKg || 0,
        completed: false,
      })),
    }));

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
    const { isPaused, isResting } = get();
    if (!isPaused && !isResting) {
      set(state => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
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

  skipRest: () => { set({ isResting: false, restSeconds: 0 }); },

  restTick: () => {
    const { restSeconds } = get();
    if (restSeconds > 0) {
      set({ restSeconds: restSeconds - 1 });
    } else {
      set({ isResting: false });
    }
  },
}));
