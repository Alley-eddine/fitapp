/**
 * Pure logic that turns a coach-imposed meal into a constrained AI recipe
 * request — no infrastructure imports, so it stays unit testable.
 *
 * The coach's frame is authoritative: calorie/macro targets become hard
 * `preferences` for the AI service, and the meal's food list seeds the
 * ingredients. The student may only add ingredients they have on hand.
 */

/** Mirrors the caps enforced by `generateRecipeSchema` in @fitapp/shared. */
export const MAX_RECIPE_INGREDIENTS = 20;

export interface MealTargets {
  label: string;
  targetCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  foods: string[];
}

export interface MealRecipePreferences {
  maxCalories?: number;
  minProtein?: number;
  dietaryRestrictions?: string[];
}

export interface MealRecipeRequest {
  ingredients: string[];
  preferences: MealRecipePreferences;
}

const isPositiveInt = (value: number | null): value is number =>
  value != null && Number.isFinite(value) && value > 0;

/** Trims, drops empties and case-insensitive duplicates, caps the list. */
const mergeIngredients = (foods: string[], extra: string[]): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...foods, ...extra]) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    merged.push(name);
    if (merged.length >= MAX_RECIPE_INGREDIENTS) break;
  }
  return merged;
};

/**
 * Builds the constrained recipe request for a meal, or null when there is no
 * ingredient to cook with (neither imposed foods nor student-provided ones).
 */
export const buildMealRecipeRequest = (
  meal: MealTargets,
  studentIngredients: string[] = []
): MealRecipeRequest | null => {
  const ingredients = mergeIngredients(meal.foods, studentIngredients);
  if (ingredients.length === 0) return null;

  const preferences: MealRecipePreferences = {};
  if (isPositiveInt(meal.targetCalories)) preferences.maxCalories = meal.targetCalories;
  if (isPositiveInt(meal.proteinG)) preferences.minProtein = meal.proteinG;

  const restrictions: string[] = [];
  if (isPositiveInt(meal.carbsG)) restrictions.push(`maximum ${String(meal.carbsG)} g de glucides`);
  if (isPositiveInt(meal.fatG)) restrictions.push(`maximum ${String(meal.fatG)} g de lipides`);
  if (meal.foods.length > 0) {
    restrictions.push('utiliser uniquement des aliments compatibles avec la liste fournie');
  }
  if (restrictions.length > 0) preferences.dietaryRestrictions = restrictions;

  return { ingredients, preferences };
};
