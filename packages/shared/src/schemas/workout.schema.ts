import { z } from 'zod';

export const workoutTypeSchema = z.enum(['weights', 'cardio', 'hiit', 'running', 'yoga', 'other']);

export const exerciseInputSchema = z.object({
  name: z.string().min(1).max(255),
  sets: z.number().int().positive().max(100).optional(),
  reps: z.number().int().positive().max(1000).optional(),
  weightKg: z.number().positive().max(1000).optional(),
  durationSeconds: z.number().int().positive().max(86400).optional(),
});

export const createWorkoutSchema = z.object({
  type: workoutTypeSchema,
  durationMinutes: z.number().int().positive().max(1440),
  caloriesBurned: z.number().int().positive().max(10000).optional(),
  notes: z.string().max(2000).optional(),
  aiGuided: z.boolean().optional(),
  exercises: z.array(exerciseInputSchema).max(50).optional(),
});

export const logWeightSchema = z.object({
  weight: z.number().positive().max(500),
  loggedAt: z.string().datetime().optional(),
});

export const logStepsSchema = z.object({
  steps: z.number().int().nonnegative().max(200000),
  goal: z.number().int().positive().max(200000).optional(),
  loggedAt: z.string().datetime().optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type LogWeightInput = z.infer<typeof logWeightSchema>;
export type LogStepsInput = z.infer<typeof logStepsSchema>;
