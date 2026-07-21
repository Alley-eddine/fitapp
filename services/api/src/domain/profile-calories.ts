/**
 * Pure daily-calorie-target logic (Mifflin-St Jeor) — no infrastructure
 * imports, so it stays unit testable without a database or environment.
 */

export const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_ADJUSTMENTS: Record<string, number> = {
  lose_weight: -500,
  gain_muscle: 300,
  maintain: 0,
  improve_endurance: 200,
};

/** Minimal profile shape needed to compute the target (DB rows satisfy it). */
export interface ProfileCalorieInput {
  current_weight: number | null;
  height: number | null;
  birth_date: Date | null;
  gender: string | null;
  activity_level: string;
  goal: string;
}

/**
 * Daily calorie target via Mifflin-St Jeor BMR x activity factor + goal
 * adjustment. Returns null when the required inputs are missing.
 */
export const computeDailyCalories = (row: ProfileCalorieInput): number | null => {
  if (row.current_weight == null || row.height == null || !row.birth_date || !row.gender) {
    return null;
  }
  const birth = new Date(row.birth_date);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  if (age <= 0 || age > 120) return null;

  const weight = Number(row.current_weight);
  const height = Number(row.height);
  const bmr = 10 * weight + 6.25 * height - 5 * age + (row.gender === 'male' ? 5 : -161);
  const tdee = bmr * (ACTIVITY_FACTORS[row.activity_level] ?? 1.55);
  const target = tdee + (GOAL_ADJUSTMENTS[row.goal] ?? 0);
  return Math.round(target);
};
