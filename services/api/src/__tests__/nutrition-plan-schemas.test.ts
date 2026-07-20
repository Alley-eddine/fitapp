import { describe, it, expect } from 'vitest';
import {
  createNutritionPlanSchema,
  assignNutritionPlanSchema,
  studentMealRecipeSchema,
} from '@fitapp/shared';

const plan = {
  name: 'NUTRITION PHASE 1',
  phase: 1,
  dailyCalories: 2200,
  meals: [
    {
      label: 'Repas 1',
      targetCalories: 600,
      proteinG: 45,
      carbsG: 50,
      fatG: 20,
      foods: ['poulet', 'riz', 'brocoli'],
    },
    { label: 'Collation', targetCalories: 300 },
  ],
  supplements: [{ name: 'Créatine', dosage: '5 g', timing: 'post-training' }],
};

describe('createNutritionPlanSchema', () => {
  it('accepts a full plan with meals and supplements', () => {
    const parsed = createNutritionPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
  });

  it('defaults meals, supplements and foods to empty arrays', () => {
    const parsed = createNutritionPlanSchema.parse({ name: 'Minimal' });
    expect(parsed.meals).toEqual([]);
    expect(parsed.supplements).toEqual([]);
    const withMeal = createNutritionPlanSchema.parse({
      name: 'Un repas',
      meals: [{ label: 'Repas 1' }],
    });
    expect(withMeal.meals[0]?.foods).toEqual([]);
  });

  it('requires a name and a meal label', () => {
    expect(createNutritionPlanSchema.safeParse({ name: '' }).success).toBe(false);
    expect(
      createNutritionPlanSchema.safeParse({ name: 'X', meals: [{ label: '' }] }).success
    ).toBe(false);
  });

  it('rejects out-of-range targets', () => {
    expect(
      createNutritionPlanSchema.safeParse({
        name: 'X',
        meals: [{ label: 'Repas', targetCalories: 0 }],
      }).success
    ).toBe(false);
    expect(
      createNutritionPlanSchema.safeParse({
        name: 'X',
        meals: [{ label: 'Repas', proteinG: -1 }],
      }).success
    ).toBe(false);
  });

  it('rejects more than 10 meals', () => {
    const meals = Array.from({ length: 11 }, (_, i) => ({ label: `Repas ${String(i)}` }));
    expect(createNutritionPlanSchema.safeParse({ name: 'Trop', meals }).success).toBe(false);
  });
});

describe('assignNutritionPlanSchema', () => {
  it('accepts a student id with an optional start date', () => {
    expect(
      assignNutritionPlanSchema.safeParse({
        studentId: '3f6d1c9e-0b2a-4c8d-9e1f-5a7b3c2d1e0f',
        startDate: '2026-07-20',
      }).success
    ).toBe(true);
  });

  it('rejects a non-uuid student id', () => {
    expect(assignNutritionPlanSchema.safeParse({ studentId: 'abc' }).success).toBe(false);
  });
});

describe('studentMealRecipeSchema', () => {
  it('accepts an empty body and optional ingredients', () => {
    expect(studentMealRecipeSchema.safeParse({}).success).toBe(true);
    expect(studentMealRecipeSchema.safeParse({ ingredients: ['citron'] }).success).toBe(true);
  });

  it('rejects blank or overlong ingredients', () => {
    expect(studentMealRecipeSchema.safeParse({ ingredients: [''] }).success).toBe(false);
    expect(
      studentMealRecipeSchema.safeParse({ ingredients: ['a'.repeat(101)] }).success
    ).toBe(false);
  });
});
