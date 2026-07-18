import { z } from 'zod';
import { exerciseInputSchema } from './workout.schema.js';

/** A coach invites someone; the email is optional (a shareable link is enough). */
export const createInvitationSchema = z.object({
  email: z.string().email().max(255).optional(),
});

export const invitationStatusSchema = z.enum(['pending', 'accepted', 'revoked']);

/** One training day of the week: 1 = Monday … 7 = Sunday. */
export const programDaySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  title: z.string().min(1).max(150),
  exercises: z.array(exerciseInputSchema).max(50).default([]),
});

export const createProgramSchema = z.object({
  name: z.string().min(1).max(150),
  phase: z.number().int().positive().max(50).optional(),
  description: z.string().max(2000).optional(),
  days: z
    .array(programDaySchema)
    .max(7)
    .refine(
      (days) => new Set(days.map((d) => d.dayOfWeek)).size === days.length,
      'Un jour de la semaine ne peut apparaître qu\'une fois'
    ),
});

export const assignProgramSchema = z.object({
  studentId: z.string().uuid(),
  startDate: z.string().optional(),
});

/** One meal imposed by the coach: calorie/macro targets plus allowed foods. */
export const nutritionMealSchema = z.object({
  label: z.string().min(1).max(100),
  targetCalories: z.number().int().positive().max(5000).optional(),
  proteinG: z.number().int().nonnegative().max(500).optional(),
  carbsG: z.number().int().nonnegative().max(1000).optional(),
  fatG: z.number().int().nonnegative().max(500).optional(),
  foods: z.array(z.string().min(1).max(100)).max(30).default([]),
  notes: z.string().max(1000).optional(),
});

export const nutritionSupplementSchema = z.object({
  name: z.string().min(1).max(150),
  dosage: z.string().max(100).optional(),
  timing: z.string().max(100).optional(),
});

export const createNutritionPlanSchema = z.object({
  name: z.string().min(1).max(150),
  phase: z.number().int().positive().max(50).optional(),
  dailyCalories: z.number().int().positive().max(10000).optional(),
  notes: z.string().max(2000).optional(),
  meals: z.array(nutritionMealSchema).max(10).default([]),
  supplements: z.array(nutritionSupplementSchema).max(20).default([]),
});

export const assignNutritionPlanSchema = z.object({
  studentId: z.string().uuid(),
  startDate: z.string().optional(),
});

/** Ingredients the student has on hand, merged with the meal's allowed foods. */
export const studentMealRecipeSchema = z.object({
  ingredients: z.array(z.string().min(1).max(100)).max(20).optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type ProgramDayInput = z.infer<typeof programDaySchema>;
export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type AssignProgramInput = z.infer<typeof assignProgramSchema>;
export type NutritionMealInput = z.infer<typeof nutritionMealSchema>;
export type NutritionSupplementInput = z.infer<typeof nutritionSupplementSchema>;
export type CreateNutritionPlanInput = z.infer<typeof createNutritionPlanSchema>;
export type AssignNutritionPlanInput = z.infer<typeof assignNutritionPlanSchema>;
export type StudentMealRecipeInput = z.infer<typeof studentMealRecipeSchema>;
