import { describe, it, expect } from 'vitest';
import {
  computeDailyCalories,
  ACTIVITY_FACTORS,
  GOAL_ADJUSTMENTS,
  type ProfileRow,
} from '../routes/profile.routes.js';

/**
 * Age determinism strategy:
 * computeDailyCalories calls `new Date()` internally to compute age, so we cannot
 * freeze it without mocking. Instead we build `birth_date` values by subtracting a
 * fixed number of years from the CURRENT year and placing the birthday well in the
 * past within the year (Jan 1) so the birthday has already passed at any test run
 * date. This guarantees the computed age always equals the intended value.
 *
 * We therefore prioritise:
 *  a) null-return cases (no mocking needed)
 *  b) relative ordering assertions (lose_weight < maintain < gain_muscle)
 *  c) exact value assertions using birth_date = Jan 1 of (currentYear - age)
 */

/** Build a ProfileRow with sensible defaults; override only what the test needs. */
function makeRow(overrides: Partial<ProfileRow>): ProfileRow {
  return {
    id: 'test-id',
    user_id: 'user-1',
    current_weight: 80,
    target_weight: null,
    height: 175,
    birth_date: new Date(`${new Date().getFullYear() - 30}-01-01`), // 30 years old
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintain',
    daily_calorie_target: null,
    allergies: null,
    diet_preferences: null,
    onboarding_completed: false,
    ...overrides,
  };
}

describe('computeDailyCalories', () => {
  describe('returns null when required fields are missing', () => {
    it('returns null when current_weight is null', () => {
      expect(computeDailyCalories(makeRow({ current_weight: null }))).toBeNull();
    });

    it('returns null when height is null', () => {
      expect(computeDailyCalories(makeRow({ height: null }))).toBeNull();
    });

    it('returns null when birth_date is null', () => {
      expect(computeDailyCalories(makeRow({ birth_date: null }))).toBeNull();
    });

    it('returns null when gender is null', () => {
      expect(computeDailyCalories(makeRow({ gender: null }))).toBeNull();
    });

    it('returns null when all required biometric fields are missing', () => {
      expect(computeDailyCalories(makeRow({
        current_weight: null,
        height: null,
        birth_date: null,
        gender: null,
      }))).toBeNull();
    });
  });

  describe('returns null for invalid ages', () => {
    it('returns null when computed age is 0 (birth_date is today)', () => {
      // Someone born today has age 0 which is <= 0
      const today = new Date();
      expect(computeDailyCalories(makeRow({ birth_date: today }))).toBeNull();
    });

    it('returns null when computed age exceeds 120', () => {
      const ancientBirth = new Date(`${new Date().getFullYear() - 121}-06-01`);
      expect(computeDailyCalories(makeRow({ birth_date: ancientBirth }))).toBeNull();
    });
  });

  describe('Mifflin-St Jeor — male', () => {
    it('computes correct BMR for a 30-year-old male, 80kg, 175cm, moderate activity, maintain', () => {
      // BMR = 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
      // TDEE = 1748.75 * 1.55 = 2710.5625 → 2711
      // adjust = 0 → 2711
      const birthDate = new Date(`${new Date().getFullYear() - 30}-01-01`);
      const result = computeDailyCalories(makeRow({ birth_date: birthDate }));
      expect(result).toBe(2711);
    });

    it('computes correct calories for a 25-year-old male, 80kg, 175cm, active, gain_muscle', () => {
      // BMR = 10*80 + 6.25*175 - 5*25 + 5 = 800 + 1093.75 - 125 + 5 = 1773.75
      // TDEE = 1773.75 * 1.725 = 3059.71875 → 3060
      // adjust = +300 → 3360
      const birthDate = new Date(`${new Date().getFullYear() - 25}-01-01`);
      const result = computeDailyCalories(makeRow({
        birth_date: birthDate,
        activity_level: 'active',
        goal: 'gain_muscle',
      }));
      expect(result).toBe(3360);
    });
  });

  describe('Mifflin-St Jeor — female', () => {
    it('computes correct BMR for a 25-year-old female, 60kg, 165cm, light activity, lose_weight', () => {
      // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
      // TDEE = 1345.25 * 1.375 = 1849.71875 → 1850
      // adjust = -500 → 1350
      const birthDate = new Date(`${new Date().getFullYear() - 25}-01-01`);
      const result = computeDailyCalories(makeRow({
        current_weight: 60,
        height: 165,
        birth_date: birthDate,
        gender: 'female',
        activity_level: 'light',
        goal: 'lose_weight',
      }));
      expect(result).toBe(1350);
    });
  });

  describe('activity factor application', () => {
    it('higher activity level yields higher calorie target (same everything else)', () => {
      const birthDate = new Date(`${new Date().getFullYear() - 30}-01-01`);
      const sedentary = computeDailyCalories(makeRow({ birth_date: birthDate, activity_level: 'sedentary' }));
      const active = computeDailyCalories(makeRow({ birth_date: birthDate, activity_level: 'active' }));
      const veryActive = computeDailyCalories(makeRow({ birth_date: birthDate, activity_level: 'very_active' }));

      // Strict ordering
      expect(sedentary).not.toBeNull();
      expect(active).not.toBeNull();
      expect(veryActive).not.toBeNull();
      expect(sedentary as number).toBeLessThan(active as number);
      expect(active as number).toBeLessThan(veryActive as number);
    });

    it('falls back to moderate factor (1.55) when activity_level is unknown', () => {
      const birthDate = new Date(`${new Date().getFullYear() - 30}-01-01`);
      const withModerate = computeDailyCalories(makeRow({ birth_date: birthDate, activity_level: 'moderate' }));
      const withUnknown = computeDailyCalories(makeRow({ birth_date: birthDate, activity_level: 'unknown_level' }));
      // Both should use 1.55 factor
      expect(withModerate).toBe(withUnknown);
    });
  });

  describe('goal adjustment application', () => {
    it('lose_weight < maintain < gain_muscle for the same biometrics', () => {
      const birthDate = new Date(`${new Date().getFullYear() - 30}-01-01`);
      const base = { birth_date: birthDate };

      const loseWeight = computeDailyCalories(makeRow({ ...base, goal: 'lose_weight' }));
      const maintain = computeDailyCalories(makeRow({ ...base, goal: 'maintain' }));
      const gainMuscle = computeDailyCalories(makeRow({ ...base, goal: 'gain_muscle' }));

      expect(loseWeight).not.toBeNull();
      expect(maintain).not.toBeNull();
      expect(gainMuscle).not.toBeNull();
      expect(loseWeight as number).toBeLessThan(maintain as number);
      expect(maintain as number).toBeLessThan(gainMuscle as number);
    });

    it('applies the exact adjustment deltas defined in GOAL_ADJUSTMENTS', () => {
      const birthDate = new Date(`${new Date().getFullYear() - 30}-01-01`);

      const maintain = computeDailyCalories(makeRow({ birth_date: birthDate, goal: 'maintain' }));
      const loseWeight = computeDailyCalories(makeRow({ birth_date: birthDate, goal: 'lose_weight' }));
      const gainMuscle = computeDailyCalories(makeRow({ birth_date: birthDate, goal: 'gain_muscle' }));

      expect(maintain).not.toBeNull();
      // The difference should equal the goal adjustment delta
      expect((maintain as number) - (loseWeight as number)).toBe(-GOAL_ADJUSTMENTS['lose_weight']!);
      expect((gainMuscle as number) - (maintain as number)).toBe(GOAL_ADJUSTMENTS['gain_muscle']!);
    });

    it('applies no adjustment for an unknown goal (defaults to 0)', () => {
      const birthDate = new Date(`${new Date().getFullYear() - 30}-01-01`);
      const withMaintain = computeDailyCalories(makeRow({ birth_date: birthDate, goal: 'maintain' }));
      const withUnknown = computeDailyCalories(makeRow({ birth_date: birthDate, goal: 'unknown_goal' }));
      // Both should equal (GOAL_ADJUSTMENTS['maintain']=0, unknown => ?? 0)
      expect(withMaintain).toBe(withUnknown);
    });
  });

  describe('return type', () => {
    it('returns an integer (result of Math.round)', () => {
      const birthDate = new Date(`${new Date().getFullYear() - 30}-01-01`);
      const result = computeDailyCalories(makeRow({ birth_date: birthDate }));
      expect(result).not.toBeNull();
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('ACTIVITY_FACTORS and GOAL_ADJUSTMENTS table consistency', () => {
    it('defines activity factors for all supported levels', () => {
      expect(ACTIVITY_FACTORS['sedentary']).toBe(1.2);
      expect(ACTIVITY_FACTORS['light']).toBe(1.375);
      expect(ACTIVITY_FACTORS['moderate']).toBe(1.55);
      expect(ACTIVITY_FACTORS['active']).toBe(1.725);
      expect(ACTIVITY_FACTORS['very_active']).toBe(1.9);
    });

    it('defines goal adjustments for all supported goals', () => {
      expect(GOAL_ADJUSTMENTS['lose_weight']).toBe(-500);
      expect(GOAL_ADJUSTMENTS['gain_muscle']).toBe(300);
      expect(GOAL_ADJUSTMENTS['maintain']).toBe(0);
      expect(GOAL_ADJUSTMENTS['improve_endurance']).toBe(200);
    });
  });
});
