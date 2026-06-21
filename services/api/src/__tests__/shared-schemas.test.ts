import { describe, it, expect } from 'vitest';
import {
  logWeightSchema,
  logStepsSchema,
  exerciseInputSchema,
} from '@fitapp/shared';

// ---------------------------------------------------------------------------
// logWeightSchema
// ---------------------------------------------------------------------------
describe('logWeightSchema', () => {
  describe('valid inputs', () => {
    it('accepts a typical body weight', () => {
      const result = logWeightSchema.safeParse({ weight: 78.5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weight).toBe(78.5);
      }
    });

    it('accepts minimum positive weight (> 0)', () => {
      const result = logWeightSchema.safeParse({ weight: 0.1 });
      expect(result.success).toBe(true);
    });

    it('accepts maximum allowed weight (500)', () => {
      const result = logWeightSchema.safeParse({ weight: 500 });
      expect(result.success).toBe(true);
    });

    it('accepts an optional loggedAt ISO datetime string', () => {
      const result = logWeightSchema.safeParse({
        weight: 75,
        loggedAt: '2026-06-22T08:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepts the object without loggedAt (optional field)', () => {
      const result = logWeightSchema.safeParse({ weight: 90 });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects weight equal to 0 (must be positive)', () => {
      const result = logWeightSchema.safeParse({ weight: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative weight', () => {
      const result = logWeightSchema.safeParse({ weight: -10 });
      expect(result.success).toBe(false);
    });

    it('rejects weight strictly greater than 500', () => {
      const result = logWeightSchema.safeParse({ weight: 500.1 });
      expect(result.success).toBe(false);
    });

    it('rejects weight of 999', () => {
      const result = logWeightSchema.safeParse({ weight: 999 });
      expect(result.success).toBe(false);
    });

    it('rejects missing weight field', () => {
      const result = logWeightSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric weight', () => {
      const result = logWeightSchema.safeParse({ weight: 'heavy' });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// logStepsSchema
// ---------------------------------------------------------------------------
describe('logStepsSchema', () => {
  describe('valid inputs', () => {
    it('accepts a typical step count', () => {
      const result = logStepsSchema.safeParse({ steps: 8500 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.steps).toBe(8500);
      }
    });

    it('accepts zero steps', () => {
      // steps is nonnegative so 0 is valid
      const result = logStepsSchema.safeParse({ steps: 0 });
      expect(result.success).toBe(true);
    });

    it('accepts the maximum allowed step count (200000)', () => {
      const result = logStepsSchema.safeParse({ steps: 200000 });
      expect(result.success).toBe(true);
    });

    it('accepts an optional goal field', () => {
      const result = logStepsSchema.safeParse({ steps: 10000, goal: 12000 });
      expect(result.success).toBe(true);
    });

    it('accepts an optional loggedAt ISO datetime string', () => {
      const result = logStepsSchema.safeParse({
        steps: 5000,
        loggedAt: '2026-06-22T12:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects negative step count', () => {
      const result = logStepsSchema.safeParse({ steps: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects step count above 200000', () => {
      const result = logStepsSchema.safeParse({ steps: 200001 });
      expect(result.success).toBe(false);
    });

    it('rejects missing steps field', () => {
      const result = logStepsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-integer step count', () => {
      // schema uses z.number().int() so decimals are invalid
      const result = logStepsSchema.safeParse({ steps: 1000.5 });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric steps value', () => {
      const result = logStepsSchema.safeParse({ steps: 'ten-thousand' });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// exerciseInputSchema (coercion of numeric strings)
// ---------------------------------------------------------------------------
describe('exerciseInputSchema', () => {
  describe('valid inputs with coercion', () => {
    it('accepts a fully specified muscu exercise with numeric strings coerced to numbers', () => {
      const result = exerciseInputSchema.safeParse({
        name: 'Bench Press',
        exerciseType: 'muscu',
        sets: '4',
        reps: '10',
        weightKg: '60.00',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sets).toBe(4);
        expect(result.data.reps).toBe(10);
        expect(result.data.weightKg).toBe(60);
      }
    });

    it('coerces string "60.00" to number 60 for weightKg', () => {
      const result = exerciseInputSchema.safeParse({
        name: 'Squat',
        weightKg: '60.00',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weightKg).toBe(60);
      }
    });

    it('coerces string duration values for cardio exercises', () => {
      const result = exerciseInputSchema.safeParse({
        name: 'Tapis de course',
        exerciseType: 'cardio',
        durationSeconds: '1800',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.durationSeconds).toBe(1800);
      }
    });

    it('coerces string HIIT fields (workSeconds, restSeconds, rounds)', () => {
      const result = exerciseInputSchema.safeParse({
        name: 'Burpees',
        exerciseType: 'hiit',
        workSeconds: '40',
        restSeconds: '20',
        rounds: '8',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workSeconds).toBe(40);
        expect(result.data.restSeconds).toBe(20);
        expect(result.data.rounds).toBe(8);
      }
    });

    it('defaults exerciseType to muscu when not provided', () => {
      const result = exerciseInputSchema.safeParse({ name: 'Pull-up' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.exerciseType).toBe('muscu');
      }
    });

    it('accepts all three valid exerciseType values', () => {
      for (const type of ['muscu', 'cardio', 'hiit'] as const) {
        const result = exerciseInputSchema.safeParse({ name: 'Test', exerciseType: type });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects an exercise with an empty name', () => {
      const result = exerciseInputSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects an exercise with an invalid exerciseType', () => {
      const result = exerciseInputSchema.safeParse({ name: 'Run', exerciseType: 'yoga' });
      expect(result.success).toBe(false);
    });

    it('rejects negative sets (nonnegative constraint)', () => {
      const result = exerciseInputSchema.safeParse({ name: 'Curl', sets: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects weightKg that exceeds max (1000)', () => {
      const result = exerciseInputSchema.safeParse({ name: 'Squat', weightKg: 1001 });
      expect(result.success).toBe(false);
    });

    it('rejects missing name field', () => {
      const result = exerciseInputSchema.safeParse({ sets: 3 });
      expect(result.success).toBe(false);
    });

    it('rejects non-coercible string for weightKg', () => {
      // z.coerce.number() will fail on "heavy"
      const result = exerciseInputSchema.safeParse({ name: 'Deadlift', weightKg: 'heavy' });
      expect(result.success).toBe(false);
    });
  });
});
