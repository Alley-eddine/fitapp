import { z } from 'zod';

export const workoutTypeSchema = z.enum(['weights', 'cardio', 'hiit', 'running', 'yoga', 'other']);

export const exerciseTypeSchema = z.enum(['muscu', 'cardio', 'hiit']);

export const exerciseInputSchema = z.object({
  name: z.string().min(1).max(255),
  exerciseType: exerciseTypeSchema.optional().default('muscu'),
  // Muscu fields (coerce: the app/DB may send numeric strings like "60.00")
  sets: z.coerce.number().int().nonnegative().max(100).optional(),
  reps: z.coerce.number().int().nonnegative().max(1000).optional(),
  weightKg: z.coerce.number().nonnegative().max(1000).optional(),
  // Cardio field
  durationSeconds: z.coerce.number().int().nonnegative().max(86400).optional(),
  // HIIT fields
  workSeconds: z.coerce.number().int().positive().max(600).optional(),
  restSeconds: z.coerce.number().int().positive().max(600).optional(),
  rounds: z.coerce.number().int().positive().max(100).optional(),
});

export const createWorkoutSchema = z.object({
  type: z.string().min(1).max(100),
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
