export type WorkoutType = 'weights' | 'cardio' | 'hiit' | 'running' | 'yoga' | 'other';

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  orderIndex: number;
}

export interface Workout {
  id: string;
  userId: string;
  type: WorkoutType;
  durationMinutes: number;
  caloriesBurned: number | null;
  notes: string | null;
  aiGuided: boolean;
  exercises: WorkoutExercise[];
  loggedAt: Date;
}

export interface WeightLog {
  id: string;
  userId: string;
  weight: number;
  loggedAt: Date;
}

export interface StepsLog {
  id: string;
  userId: string;
  steps: number;
  goal: number;
  loggedAt: Date;
}
