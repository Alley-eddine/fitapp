import { describe, it, expect } from 'vitest';
import {
  buildMealRecipeRequest,
  MAX_RECIPE_INGREDIENTS,
  type MealTargets,
} from '../domain/meal-recipe-request.js';

const meal = (overrides: Partial<MealTargets> = {}): MealTargets => ({
  label: 'Repas 1',
  targetCalories: 600,
  proteinG: 45,
  carbsG: 50,
  fatG: 20,
  foods: ['poulet', 'riz basmati', 'brocoli'],
  ...overrides,
});

describe('buildMealRecipeRequest', () => {
  it('maps the meal targets onto the AI preferences', () => {
    const request = buildMealRecipeRequest(meal());
    expect(request).not.toBeNull();
    expect(request?.preferences.maxCalories).toBe(600);
    expect(request?.preferences.minProtein).toBe(45);
    expect(request?.preferences.dietaryRestrictions).toEqual([
      'maximum 50 g de glucides',
      'maximum 20 g de lipides',
      'utiliser uniquement des aliments compatibles avec la liste fournie',
    ]);
  });

  it('uses the imposed foods as ingredients', () => {
    const request = buildMealRecipeRequest(meal());
    expect(request?.ingredients).toEqual(['poulet', 'riz basmati', 'brocoli']);
  });

  it('merges the student ingredients after the imposed foods', () => {
    const request = buildMealRecipeRequest(meal(), ['courgette', 'citron']);
    expect(request?.ingredients).toEqual([
      'poulet',
      'riz basmati',
      'brocoli',
      'courgette',
      'citron',
    ]);
  });

  it('drops blank entries and case-insensitive duplicates', () => {
    const request = buildMealRecipeRequest(meal({ foods: ['Poulet', ' riz '] }), [
      'poulet',
      '  ',
      'RIZ',
      'citron',
    ]);
    expect(request?.ingredients).toEqual(['Poulet', 'riz', 'citron']);
  });

  it('caps the merged list at the shared schema limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => `aliment ${String(i)}`);
    const request = buildMealRecipeRequest(meal({ foods: many }));
    expect(request?.ingredients).toHaveLength(MAX_RECIPE_INGREDIENTS);
  });

  it('returns null when there is nothing to cook with', () => {
    expect(buildMealRecipeRequest(meal({ foods: [] }))).toBeNull();
    expect(buildMealRecipeRequest(meal({ foods: [] }), ['  '])).toBeNull();
  });

  it('still builds a request from student ingredients alone', () => {
    const request = buildMealRecipeRequest(meal({ foods: [] }), ['oeufs', 'avoine']);
    expect(request?.ingredients).toEqual(['oeufs', 'avoine']);
    expect(request?.preferences.dietaryRestrictions).toEqual([
      'maximum 50 g de glucides',
      'maximum 20 g de lipides',
    ]);
  });

  it('omits absent or zero targets instead of sending them', () => {
    const request = buildMealRecipeRequest(
      meal({ targetCalories: null, proteinG: 0, carbsG: null, fatG: null })
    );
    expect(request?.preferences.maxCalories).toBeUndefined();
    expect(request?.preferences.minProtein).toBeUndefined();
    expect(request?.preferences.dietaryRestrictions).toEqual([
      'utiliser uniquement des aliments compatibles avec la liste fournie',
    ]);
  });

  it('keeps preferences empty for a fully free meal', () => {
    const request = buildMealRecipeRequest(
      meal({ targetCalories: null, proteinG: null, carbsG: null, fatG: null, foods: [] }),
      ['tomates']
    );
    expect(request?.preferences).toEqual({});
  });
});
