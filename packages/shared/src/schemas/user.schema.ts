import { z } from 'zod';

export const oAuthProviderSchema = z.enum(['google', 'facebook', 'apple']);
export const subscriptionTierSchema = z.enum(['free', 'pro', 'premium']);
export const activityLevelSchema = z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']);
export const fitnessGoalSchema = z.enum(['lose_weight', 'gain_muscle', 'maintain', 'improve_endurance']);
export const genderSchema = z.enum(['male', 'female']);

export const createProfileSchema = z.object({
  currentWeight: z.number().positive().max(500).optional(),
  targetWeight: z.number().positive().max(500).optional(),
  height: z.number().int().positive().max(300).optional(),
  birthDate: z.string().optional(),
  gender: genderSchema.optional(),
  activityLevel: activityLevelSchema.optional(),
  goal: fitnessGoalSchema.optional(),
  dailyCalorieTarget: z.number().int().positive().max(10000).optional(),
  allergies: z.array(z.string().max(100)).max(20).optional(),
  dietPreferences: z.array(z.string().max(100)).max(20).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().max(500).optional(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
