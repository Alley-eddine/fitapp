import { getToken, type AuthUser } from "./auth";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
const PAYMENT_URL = process.env.NEXT_PUBLIC_PAYMENT_URL ?? "http://localhost:3005";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  /** Explicit bearer token, used instead of the stored one (e.g. during OAuth callback). */
  token?: string;
}

async function request<T>(base: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false } = opts;
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = opts.token ?? getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Erreur ${String(res.status)}`);
  }
  return res.json() as Promise<T>;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/** Raw shape returned by GET /auth/me (differs from the login payload). */
export interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: AuthUser["role"];
  subscription: AuthUser["subscriptionTier"];
  themePreference: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>(AUTH_URL, "/auth/login", { method: "POST", body: { email, password } }),
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    request<AuthResponse>(AUTH_URL, "/auth/register", { method: "POST", body: data }),
  me: (token?: string) => request<MeResponse>(AUTH_URL, "/auth/me", { auth: true, token }),
  /** URL to start the OAuth flow on the auth service (server-driven redirect). */
  oauthUrl: (provider: "google") => `${AUTH_URL}/auth/${provider}`,
};

export interface CoachStudent {
  id: string;
  email: string;
  name: string | null;
  status: string;
  since: string;
}

export const coachApi = {
  students: () => request<{ students: CoachStudent[] }>(API_URL, "/api/coach/students", { auth: true }),
};

export interface WorkoutExercise {
  name: string;
  exerciseType?: "muscu" | "cardio" | "hiit";
  sets?: number;
  reps?: number;
  weightKg?: number;
}

export interface Workout {
  id: string;
  type: string;
  durationMinutes: number;
  caloriesBurned: number | null;
  loggedAt: string;
  exercises: WorkoutExercise[];
}

export interface CreateWorkoutInput {
  type: string;
  durationMinutes?: number;
  exercises: WorkoutExercise[];
}

export interface WeeklyStats {
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
}

export const workoutApi = {
  list: () => request<{ items: Workout[]; total: number }>(API_URL, "/api/workouts?limit=20", { auth: true }),
  create: (data: CreateWorkoutInput) =>
    request<Workout>(API_URL, "/api/workouts", { method: "POST", body: data, auth: true }),
  weeklyStats: () => request<WeeklyStats>(API_URL, "/api/workouts/stats/weekly", { auth: true }),
};

export interface WeightEntry {
  id: string;
  userId: string;
  weight: number;
  loggedAt: string;
}

export const weightApi = {
  history: (days = 90) =>
    request<WeightEntry[]>(API_URL, `/api/weight?days=${String(days)}`, { auth: true }),
  log: (weight: number) =>
    request<WeightEntry>(API_URL, "/api/weight", { method: "POST", body: { weight }, auth: true }),
};

export type Gender = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type FitnessGoal = "lose_weight" | "gain_muscle" | "maintain" | "improve_endurance";

export interface Profile {
  id: string;
  userId: string;
  currentWeight: number | null;
  targetWeight: number | null;
  height: number | null;
  birthDate: string | null;
  gender: Gender | null;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
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
  gender?: Gender;
  activityLevel?: ActivityLevel;
  goal?: FitnessGoal;
}

export const profileApi = {
  get: () => request<Profile>(API_URL, "/api/profile", { auth: true }),
  update: (data: ProfileUpdate) =>
    request<Profile>(API_URL, "/api/profile", { method: "PUT", body: data, auth: true }),
};

export interface StepEntry {
  id: string;
  userId: string;
  steps: number;
  goal: number;
  loggedAt: string;
}

export interface StepsToday {
  steps: number;
  goal: number;
  percentage: number;
}

export const stepsApi = {
  history: (days = 14) =>
    request<StepEntry[]>(API_URL, `/api/steps?days=${String(days)}`, { auth: true }),
  today: () => request<StepsToday>(API_URL, "/api/steps/today", { auth: true }),
  log: (steps: number, goal?: number) =>
    request<StepEntry>(API_URL, "/api/steps", {
      method: "POST",
      body: goal ? { steps, goal } : { steps },
      auth: true,
    }),
};

export interface ExerciseGroup {
  key: string;
  label: string;
}

export interface CatalogExercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string | null;
  category: string | null;
  level: string | null;
}

export const exercisesApi = {
  groups: () => request<{ groups: ExerciseGroup[] }>(API_URL, "/api/exercises/groups", { auth: true }),
  list: (params: { group?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.group) q.set("group", params.group);
    if (params.search) q.set("search", params.search);
    q.set("limit", String(params.limit ?? 60));
    return request<{ items: CatalogExercise[]; total: number }>(
      API_URL,
      `/api/exercises?${q.toString()}`,
      { auth: true }
    );
  },
};

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

export interface GenerateRecipeInput {
  ingredients: string[];
  preferences?: {
    maxCalories?: number;
    minProtein?: number;
    cuisineType?: string;
  };
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FrigoResponse {
  message: string;
  recipe?: GeneratedRecipe;
  suggestedIngredients?: string[];
}

export const nutritionApi = {
  generateRecipe: (input: GenerateRecipeInput) =>
    request<{ recipe: GeneratedRecipe }>(API_URL, "/api/nutrition/generate-recipe", {
      method: "POST",
      body: input,
      auth: true,
    }),
  frigoChat: (message: string, conversationHistory: ChatMessage[]) =>
    request<FrigoResponse>(API_URL, "/api/nutrition/frigo-mode", {
      method: "POST",
      body: { message, conversationHistory },
      auth: true,
    }),
  rateLimit: () =>
    request<{ recipe: RateLimitInfo; frigo: RateLimitInfo }>(API_URL, "/api/nutrition/rate-limit", {
      auth: true,
    }),
};

export interface Plan {
  tier: "pro" | "premium";
  name: string;
  price: string;
  amount: number;
  currency: string;
  interval: string;
}

export const paymentApi = {
  plans: () => request<{ plans: Plan[] }>(PAYMENT_URL, "/api/payment/plans"),
  checkout: (tier: "pro" | "premium") =>
    request<{ url: string; sessionId: string }>(PAYMENT_URL, "/api/payment/checkout", {
      method: "POST",
      body: { tier },
      auth: true,
    }),
  portal: () => request<{ url: string }>(PAYMENT_URL, "/api/payment/portal", { method: "POST", auth: true }),
  sync: () =>
    request<Record<string, unknown>>(PAYMENT_URL, "/api/payment/sync", { method: "POST", auth: true }),
};
