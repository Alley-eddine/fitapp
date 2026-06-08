import { useAuthStore } from '../store/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';
const PAYMENT_URL = process.env.EXPO_PUBLIC_PAYMENT_URL || 'http://localhost:3005';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    // Only set Content-Type when there's a body (Fastify rejects empty body with JSON content-type)
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }
    const token = useAuthStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: { ...this.getHeaders(!!body), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Request failed' }))) as { error?: string };
      throw new Error(errorData.error ?? 'Request failed');
    }

    // Handle 204 No Content responses (e.g., DELETE)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_URL);
export const paymentClient = new ApiClient(PAYMENT_URL);

export interface Profile {
  id: string;
  userId: string;
  currentWeight: number | null;
  targetWeight: number | null;
  height: number | null;
  birthDate: string | null;
  gender: 'male' | 'female' | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_endurance';
  dailyCalorieTarget: number | null;
  allergies: string[];
  dietPreferences: string[];
  onboardingCompleted: boolean;
}

export interface ProfileUpdate {
  currentWeight?: number;
  targetWeight?: number;
  height?: number;
  birthDate?: string;
  gender?: 'male' | 'female';
  activityLevel?: Profile['activityLevel'];
  goal?: Profile['goal'];
  dailyCalorieTarget?: number;
  allergies?: string[];
  dietPreferences?: string[];
  onboardingCompleted?: boolean;
}

export interface Workout {
  id: string;
  userId: string;
  type: string;
  durationMinutes: number;
  caloriesBurned: number | null;
  notes: string | null;
  aiGuided: boolean;
  loggedAt: string;
  exercises?: Exercise[];
}

export type ExerciseType = 'muscu' | 'cardio' | 'hiit';

export interface Exercise {
  id?: string;
  name: string;
  exerciseType?: ExerciseType;
  // Muscu fields
  sets?: number;
  reps?: number;
  weightKg?: number;
  // Cardio field
  durationSeconds?: number;
  // HIIT fields
  workSeconds?: number;
  restSeconds?: number;
  rounds?: number;
}

export interface ExerciseInput {
  name: string;
  exerciseType?: ExerciseType;
  sets?: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  workSeconds?: number;
  restSeconds?: number;
  rounds?: number;
}

export interface CreateWorkoutInput {
  type: string;
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
  aiGuided?: boolean;
  exercises?: ExerciseInput[];
}

export interface WeightLog {
  id: string;
  weight: number;
  loggedAt: string;
}

export interface StepsLog {
  id: string;
  steps: number;
  goal: number;
  loggedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  subscriptionTier: 'free' | 'pro' | 'premium';
}

export interface UserUpdate {
  name?: string;
  avatarUrl?: string;
}

export const userApi = {
  get: () => api.get<User>('/api/user'),
  update: (data: UserUpdate) => api.put<User>('/api/user', data),
};

export const profileApi = {
  get: () => api.get<Profile>('/api/profile'),
  update: (data: ProfileUpdate) => api.put<Profile>('/api/profile', data),
};

export const workoutApi = {
  list: (limit = 10, offset = 0) => api.get<{ items: Workout[]; total: number }>(`/api/workouts?limit=${String(limit)}&offset=${String(offset)}`),
  create: (data: CreateWorkoutInput) => api.post<Workout>('/api/workouts', data),
  update: (id: string, data: CreateWorkoutInput) => api.put<Workout>(`/api/workouts/${id}`, data),
  get: (id: string) => api.get<Workout>(`/api/workouts/${id}`),
  delete: (id: string) => api.delete(`/api/workouts/${id}`),
  weeklyStats: () => api.get<{ workoutsThisWeek: number; totalMinutes: number }>('/api/workouts/stats/weekly'),
};

export const weightApi = {
  list: (days = 30) => api.get<WeightLog[]>(`/api/weight?days=${String(days)}`),
  log: (weight: number) => api.post<WeightLog>('/api/weight', { weight }),
  latest: () => api.get<WeightLog>('/api/weight/latest'),
};

export const stepsApi = {
  list: (days = 7) => api.get<StepsLog[]>(`/api/steps?days=${String(days)}`),
  log: (steps: number, goal?: number) => api.post<StepsLog>('/api/steps', { steps, goal }),
  today: () => api.get<StepsLog & { percentage: number }>('/api/steps/today'),
};

// Recipe types
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
  createdAt: string;
}

export interface SaveRecipeInput {
  title: string;
  description?: string;
  imageUrl?: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  tags?: string[];
  isFromFrigoMode?: boolean;
}

export interface GenerateRecipeInput {
  ingredients: string[];
  preferences?: {
    maxCalories?: number;
    minProtein?: number;
    dietaryRestrictions?: string[];
    cuisineType?: string;
  };
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

export interface RateLimitStatus {
  recipe: { allowed: boolean; remaining: number; resetAt: string };
  frigoMode: { allowed: boolean; remaining: number; resetAt: string };
}

export const recipeApi = {
  list: (limit = 20, offset = 0, tag?: string) => {
    let url = `/api/recipes?limit=${String(limit)}&offset=${String(offset)}`;
    if (tag) url += `&tag=${encodeURIComponent(tag)}`;
    return api.get<{ items: Recipe[]; total: number }>(url);
  },
  get: (id: string) => api.get<Recipe>(`/api/recipes/${id}`),
  save: (data: SaveRecipeInput) => api.post<Recipe>('/api/recipes', data),
  delete: (id: string) => api.delete(`/api/recipes/${id}`),
};

// Payment / subscriptions
export interface Plan {
  tier: 'pro' | 'premium';
  name: string;
  price: string;
  amount: number;
  currency: string;
  interval: string;
}

export const paymentApi = {
  getPlans: () => paymentClient.get<{ plans: Plan[] }>('/api/payment/plans'),
  createCheckout: (tier: 'pro' | 'premium') =>
    paymentClient.post<{ url: string; sessionId: string }>('/api/payment/checkout', { tier }),
  openPortal: () => paymentClient.post<{ url: string }>('/api/payment/portal', {}),
  sync: () =>
    paymentClient.post<{ subscription: 'free' | 'pro' | 'premium'; synced: boolean }>(
      '/api/payment/sync',
      {}
    ),
};

export const nutritionApi = {
  generateRecipe: (data: GenerateRecipeInput) =>
    api.post<{ recipe: GeneratedRecipe }>('/api/nutrition/generate-recipe', data),
  frigoModeChat: (data: FrigoModeInput) =>
    api.post<FrigoModeResponse>('/api/nutrition/frigo-mode', data),
  getRateLimit: () => api.get<RateLimitStatus>('/api/nutrition/rate-limit'),
};
