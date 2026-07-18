import { describe, it, expect } from 'vitest';
import { estimateCalories, MET_BY_TYPE } from '../domain/workout-calories.js';

// MET lookup table exposed for reference in assertions
const { muscu: MET_MUSCU, cardio: MET_CARDIO, hiit: MET_HIIT } = MET_BY_TYPE as {
  muscu: number;
  cardio: number;
  hiit: number;
};

describe('estimateCalories', () => {
  describe('no exercises provided — default MET 6', () => {
    it('returns calories using default MET=6 when exercises array is undefined', () => {
      // 6 MET × 70 kg × (60 min / 60) = 420
      expect(estimateCalories(60, 70, undefined)).toBe(420);
    });

    it('returns calories using default MET=6 when exercises array is empty', () => {
      // 6 × 80 × (30 / 60) = 240
      expect(estimateCalories(30, 80, [])).toBe(240);
    });
  });

  describe('single exercise type', () => {
    it('uses MET for cardio exercises', () => {
      // MET_CARDIO=8 × 80 kg × (30 / 60) = 320
      const expected = Math.round(MET_CARDIO * 80 * (30 / 60));
      expect(estimateCalories(30, 80, [{ exerciseType: 'cardio' }])).toBe(expected);
    });

    it('uses MET for muscu exercises', () => {
      // MET_MUSCU=5 × 75 kg × (60 / 60) = 375
      const expected = Math.round(MET_MUSCU * 75 * (60 / 60));
      expect(estimateCalories(60, 75, [{ exerciseType: 'muscu' }])).toBe(expected);
    });

    it('uses MET for hiit exercises', () => {
      // MET_HIIT=10 × 65 kg × (45 / 60) = 487.5 → 488
      const expected = Math.round(MET_HIIT * 65 * (45 / 60));
      expect(estimateCalories(45, 65, [{ exerciseType: 'hiit' }])).toBe(expected);
    });

    it('falls back to MET=6 for unknown exercise types', () => {
      // unknown type "swimming" → MET_BY_TYPE["swimming"] is undefined → ?? 6
      // 6 × 60 kg × (30 / 60) = 180
      expect(estimateCalories(30, 60, [{ exerciseType: 'swimming' }])).toBe(180);
    });

    it('falls back to MET=6 when exerciseType is undefined on the exercise object', () => {
      // exerciseType is undefined → MET_BY_TYPE[undefined ?? 'muscu'] = MET_MUSCU=5
      // 5 × 70 × (60 / 60) = 350
      expect(estimateCalories(60, 70, [{}])).toBe(350);
    });
  });

  describe('multiple exercise types — average MET', () => {
    it('averages MET across muscu and hiit exercises', () => {
      // avg MET = (5 + 10) / 2 = 7.5
      // 7.5 × 75 kg × (60 / 60) = 562.5 → 563
      const expected = Math.round(((MET_MUSCU + MET_HIIT) / 2) * 75 * (60 / 60));
      expect(estimateCalories(60, 75, [
        { exerciseType: 'muscu' },
        { exerciseType: 'hiit' },
      ])).toBe(expected);
    });

    it('averages MET across cardio and hiit exercises', () => {
      // avg MET = (8 + 10) / 2 = 9
      // 9 × 90 kg × (45 / 60) = 607.5 → 608
      const expected = Math.round(((MET_CARDIO + MET_HIIT) / 2) * 90 * (45 / 60));
      expect(estimateCalories(45, 90, [
        { exerciseType: 'cardio' },
        { exerciseType: 'hiit' },
      ])).toBe(expected);
    });

    it('averages MET across three different types', () => {
      // avg MET = (5 + 8 + 10) / 3 ≈ 7.667
      // 7.667 × 80 × (60 / 60) ≈ 613.33 → 613
      const expected = Math.round(((MET_MUSCU + MET_CARDIO + MET_HIIT) / 3) * 80 * (60 / 60));
      expect(estimateCalories(60, 80, [
        { exerciseType: 'muscu' },
        { exerciseType: 'cardio' },
        { exerciseType: 'hiit' },
      ])).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('returns 0 when duration is 0', () => {
      // Any MET × any weight × 0 = 0
      expect(estimateCalories(0, 70, undefined)).toBe(0);
      expect(estimateCalories(0, 90, [{ exerciseType: 'hiit' }])).toBe(0);
    });

    it('rounds the result (not truncates)', () => {
      // muscu+hiit → avg MET=(5+10)/2=7.5, 75kg, 60 min → 7.5×75×1 = 562.5 → round → 563
      expect(estimateCalories(60, 75, [
        { exerciseType: 'muscu' },
        { exerciseType: 'hiit' },
      ])).toBe(563);
    });

    it('handles very high weight and duration without overflow', () => {
      // MET=6 (no exercises) × 300 kg × (300 / 60) = 6 × 300 × 5 = 9000
      expect(estimateCalories(300, 300, undefined)).toBe(9000);
    });

    it('returns an integer (result of Math.round)', () => {
      const result = estimateCalories(45, 90, [
        { exerciseType: 'cardio' },
        { exerciseType: 'hiit' },
      ]);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('MET_BY_TYPE table consistency', () => {
    it('defines expected MET values for all supported exercise types', () => {
      expect(MET_BY_TYPE['muscu']).toBe(5);
      expect(MET_BY_TYPE['cardio']).toBe(8);
      expect(MET_BY_TYPE['hiit']).toBe(10);
    });
  });
});
