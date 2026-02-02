import { z } from 'zod';

export const ingredientInputSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.string().max(50),
  unit: z.string().max(50),
});

export const generateRecipeSchema = z.object({
  ingredients: z.array(z.string().min(1).max(100)).min(1).max(20),
  preferences: z.object({
    maxCalories: z.number().int().positive().max(5000).optional(),
    minProtein: z.number().int().nonnegative().max(500).optional(),
    dietaryRestrictions: z.array(z.string().max(100)).max(10).optional(),
    cuisineType: z.string().max(100).optional(),
  }).optional(),
});

export const saveRecipeSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().max(500).optional(),
  ingredients: z.array(ingredientInputSchema).min(1).max(50),
  instructions: z.array(z.string().max(1000)).min(1).max(50),
  prepTimeMinutes: z.number().int().positive().max(1440).optional(),
  cookTimeMinutes: z.number().int().positive().max(1440).optional(),
  servings: z.number().int().positive().max(100).optional(),
  calories: z.number().int().positive().max(10000).optional(),
  protein: z.number().int().nonnegative().max(1000).optional(),
  carbs: z.number().int().nonnegative().max(1000).optional(),
  fat: z.number().int().nonnegative().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isFromFrigoMode: z.boolean().optional(),
});

export const userProfileSchema = z.object({
  goal: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'improve_health']).optional(),
  currentWeight: z.number().positive().max(500).optional(),
  targetWeight: z.number().positive().max(500).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  allergies: z.array(z.string().max(100)).max(20).optional(),
  dietaryRestrictions: z.array(z.string().max(100)).max(20).optional(),
});

export const frigoModeMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  ingredients: z.array(z.string().max(100)).max(30).optional(),
  userProfile: userProfileSchema.optional(),
});

export type GenerateRecipeInput = z.infer<typeof generateRecipeSchema>;
export type SaveRecipeInput = z.infer<typeof saveRecipeSchema>;
export type FrigoModeMessageInput = z.infer<typeof frigoModeMessageSchema>;
