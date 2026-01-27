export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  tags: string[];
  isFromFrigoMode: boolean;
  createdAt: Date;
}

export interface DayMeals {
  breakfast: string | null; // recipe id
  lunch: string | null;
  dinner: string | null;
  snacks: string[];
}

export interface MealPlan {
  id: string;
  userId: string;
  weekStart: Date;
  meals: {
    monday: DayMeals;
    tuesday: DayMeals;
    wednesday: DayMeals;
    thursday: DayMeals;
    friday: DayMeals;
    saturday: DayMeals;
    sunday: DayMeals;
  };
  createdAt: Date;
}
