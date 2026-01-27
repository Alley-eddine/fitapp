export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface TierLimits {
  workoutsPerWeek: number | null; // null = unlimited
  recipesPerDay: number | null;
  historyDays: number | null;
  features: {
    darkMode: boolean;
    frigoMode: boolean;
    frigoModeChat: boolean;
    aiWorkoutGuidance: boolean;
    aiExerciseSuggestions: boolean;
    weeklyMealPlan: boolean;
    advancedGraphs: boolean;
    exportData: boolean;
  };
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    workoutsPerWeek: 3,
    recipesPerDay: 1,
    historyDays: 7,
    features: {
      darkMode: false,
      frigoMode: false,
      frigoModeChat: false,
      aiWorkoutGuidance: false,
      aiExerciseSuggestions: false,
      weeklyMealPlan: false,
      advancedGraphs: false,
      exportData: false,
    },
  },
  pro: {
    workoutsPerWeek: 10,
    recipesPerDay: 5,
    historyDays: 30,
    features: {
      darkMode: true,
      frigoMode: true,
      frigoModeChat: false,
      aiWorkoutGuidance: false,
      aiExerciseSuggestions: false,
      weeklyMealPlan: false,
      advancedGraphs: false,
      exportData: false,
    },
  },
  premium: {
    workoutsPerWeek: null,
    recipesPerDay: null,
    historyDays: null,
    features: {
      darkMode: true,
      frigoMode: true,
      frigoModeChat: true,
      aiWorkoutGuidance: true,
      aiExerciseSuggestions: true,
      weeklyMealPlan: true,
      advancedGraphs: true,
      exportData: true,
    },
  },
};
