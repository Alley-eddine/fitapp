export interface RecipeGenerationInput {
  ingredients: string[];
  preferences?: {
    maxCalories?: number;
    minProtein?: number;
    dietaryRestrictions?: string[];
    cuisineType?: string;
  };
  userContext?: {
    goal?: string;
    activityLevel?: string;
    allergies?: string[];
  };
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
  tips?: string[];
}

export interface UserProfile {
  goal?: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
  currentWeight?: number;
  targetWeight?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  allergies?: string[];
  dietaryRestrictions?: string[];
}

export interface FrigoModeInput {
  message: string;
  ingredients?: string[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userProfile?: UserProfile;
}

export interface FrigoModeResponse {
  message: string;
  recipe?: GeneratedRecipe;
  suggestedIngredients?: string[];
}

export interface IAIProvider {
  generateRecipe(input: RecipeGenerationInput): Promise<GeneratedRecipe>;
  frigoModeChat(input: FrigoModeInput): Promise<FrigoModeResponse>;
}
