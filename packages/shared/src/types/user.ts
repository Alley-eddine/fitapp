import type { SubscriptionTier } from './subscription.js';

export type OAuthProvider = 'google' | 'facebook' | 'apple';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: OAuthProvider;
  subscription: SubscriptionTier;
  subscriptionEndsAt: Date | null;
  themePreference: 'light' | 'dark';
  createdAt: Date;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_endurance';

export interface UserProfile {
  id: string;
  userId: string;
  currentWeight: number | null;
  targetWeight: number | null;
  height: number | null;
  birthDate: Date | null;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  dailyCalorieTarget: number | null;
  allergies: string[];
  dietPreferences: string[];
}
