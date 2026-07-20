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

/** Turns an API error payload (string or Zod flatten() object) into a readable message. */
function formatApiError(error: unknown, status: number): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const { formErrors, fieldErrors } = error as {
      formErrors?: unknown;
      fieldErrors?: Record<string, unknown>;
    };
    const messages: string[] = [];
    if (Array.isArray(formErrors)) {
      messages.push(...formErrors.filter((m): m is string => typeof m === "string"));
    }
    if (fieldErrors && typeof fieldErrors === "object") {
      for (const value of Object.values(fieldErrors)) {
        if (Array.isArray(value)) {
          messages.push(...value.filter((m): m is string => typeof m === "string"));
        }
      }
    }
    if (messages[0]) return messages[0];
  }
  return `Erreur ${String(status)}`;
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
    const data = (await res.json().catch(() => ({}))) as { error?: unknown };
    throw new Error(formatApiError(data.error, res.status));
  }
  // DELETE endpoints answer 204 with an empty body — nothing to parse.
  if (res.status === 204) return undefined as T;
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

export interface CoachInvitation {
  id: string;
  code: string;
  email: string | null;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export const coachApi = {
  students: () => request<{ students: CoachStudent[] }>(API_URL, "/api/coach/students", { auth: true }),
  invitations: () =>
    request<{ items: CoachInvitation[] }>(API_URL, "/api/coach/invitations", { auth: true }),
  createInvitation: (email?: string) =>
    request<CoachInvitation>(API_URL, "/api/coach/invitations", {
      method: "POST",
      body: email ? { email } : {},
      auth: true,
    }),
  revokeInvitation: (id: string) =>
    request<CoachInvitation>(API_URL, `/api/coach/invitations/${id}`, {
      method: "DELETE",
      auth: true,
    }),
};

export interface ProgramExercise {
  id?: string;
  name: string;
  exerciseType?: string;
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  restSeconds?: number | null;
}

export interface ProgramDay {
  id?: string;
  dayOfWeek: number;
  title: string;
  exercises: ProgramExercise[];
}

export interface ProgramSummary {
  id: string;
  name: string;
  phase: number;
  description: string | null;
  dayCount: number;
  assignedCount: number;
  createdAt: string;
}

export interface ProgramDetail {
  id: string;
  name: string;
  phase: number;
  description: string | null;
  createdAt: string;
  days: ProgramDay[];
}

export interface ProgramInput {
  name: string;
  phase?: number;
  description?: string;
  days: { dayOfWeek: number; title: string; exercises: ProgramExercise[] }[];
}

export const programApi = {
  list: () => request<{ items: ProgramSummary[] }>(API_URL, "/api/coach/programs", { auth: true }),
  get: (id: string) => request<ProgramDetail>(API_URL, `/api/coach/programs/${id}`, { auth: true }),
  create: (data: ProgramInput) =>
    request<ProgramDetail>(API_URL, "/api/coach/programs", { method: "POST", body: data, auth: true }),
  update: (id: string, data: ProgramInput) =>
    request<ProgramDetail>(API_URL, `/api/coach/programs/${id}`, {
      method: "PUT",
      body: data,
      auth: true,
    }),
  remove: (id: string) =>
    request<Record<string, unknown>>(API_URL, `/api/coach/programs/${id}`, {
      method: "DELETE",
      auth: true,
    }),
  assign: (id: string, studentId: string) =>
    request<{ assignmentId: string; programId: string; studentId: string }>(
      API_URL,
      `/api/coach/programs/${id}/assign`,
      { method: "POST", body: { studentId }, auth: true }
    ),
};

export interface NutritionMeal {
  id?: string;
  label: string;
  targetCalories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  foods: string[];
  notes?: string | null;
}

export interface NutritionSupplement {
  id?: string;
  name: string;
  dosage?: string | null;
  timing?: string | null;
}

export interface NutritionPlanSummary {
  id: string;
  name: string;
  phase: number;
  dailyCalories: number | null;
  mealCount: number;
  assignedCount: number;
  createdAt: string;
}

export interface NutritionPlanDetail {
  id: string;
  name: string;
  phase: number;
  dailyCalories: number | null;
  notes: string | null;
  createdAt: string;
  meals: NutritionMeal[];
  supplements: NutritionSupplement[];
}

export interface NutritionPlanInput {
  name: string;
  phase?: number;
  dailyCalories?: number;
  notes?: string;
  meals: NutritionMeal[];
  supplements: NutritionSupplement[];
}

export const nutritionPlanApi = {
  list: () =>
    request<{ items: NutritionPlanSummary[] }>(API_URL, "/api/coach/nutrition-plans", { auth: true }),
  get: (id: string) =>
    request<NutritionPlanDetail>(API_URL, `/api/coach/nutrition-plans/${id}`, { auth: true }),
  create: (data: NutritionPlanInput) =>
    request<NutritionPlanDetail>(API_URL, "/api/coach/nutrition-plans", {
      method: "POST",
      body: data,
      auth: true,
    }),
  update: (id: string, data: NutritionPlanInput) =>
    request<NutritionPlanDetail>(API_URL, `/api/coach/nutrition-plans/${id}`, {
      method: "PUT",
      body: data,
      auth: true,
    }),
  remove: (id: string) =>
    request<Record<string, unknown>>(API_URL, `/api/coach/nutrition-plans/${id}`, {
      method: "DELETE",
      auth: true,
    }),
  assign: (id: string, studentId: string) =>
    request<{ assignmentId: string; planId: string; studentId: string }>(
      API_URL,
      `/api/coach/nutrition-plans/${id}/assign`,
      { method: "POST", body: { studentId }, auth: true }
    ),
};

export interface StudentCoach {
  id: string;
  name: string | null;
  email: string;
  since: string;
}

export interface StudentProgramDay {
  id: string;
  dayOfWeek: number;
  title: string;
  exercises: ProgramExercise[];
}

export interface StudentProgram {
  id: string;
  name: string;
  phase: number;
  description: string | null;
  startDate: string;
  coach: { id: string; name: string | null };
  days: StudentProgramDay[];
}

export interface StudentProgramResponse {
  program: StudentProgram | null;
  todayDayOfWeek?: number;
  today: StudentProgramDay | null;
  next: StudentProgramDay | null;
}

export interface StudentNutritionPlan {
  id: string;
  name: string;
  phase: number;
  dailyCalories: number | null;
  notes: string | null;
  startDate: string;
  coach: { id: string; name: string | null };
  meals: NutritionMeal[];
  supplements: NutritionSupplement[];
}

export const studentApi = {
  coach: () => request<{ coach: StudentCoach | null }>(API_URL, "/api/student/coach", { auth: true }),
  program: () => request<StudentProgramResponse>(API_URL, "/api/student/program", { auth: true }),
  nutrition: () =>
    request<{ plan: StudentNutritionPlan | null }>(API_URL, "/api/student/nutrition", { auth: true }),
  mealRecipe: (mealId: string, ingredients?: string[]) =>
    request<{ recipe: GeneratedRecipe; meal: NutritionMeal }>(
      API_URL,
      `/api/student/nutrition/meals/${mealId}/recipe`,
      { method: "POST", body: ingredients?.length ? { ingredients } : {}, auth: true }
    ),
};

export interface InvitationInfo {
  code: string;
  coachName: string | null;
  status: string;
  expiresAt: string;
  usable: boolean;
}

export const invitationApi = {
  lookup: (code: string) => request<InvitationInfo>(API_URL, `/api/invitations/${code}`),
  accept: (code: string) =>
    request<{ joined: boolean; coach: { id: string; name: string | null } }>(
      API_URL,
      `/api/invitations/${code}/accept`,
      { method: "POST", auth: true }
    ),
};

export interface WorkoutExercise {
  name: string;
  exerciseType?: "muscu" | "cardio" | "hiit";
  sets?: number;
  reps?: number;
  weightKg?: number | string | null;
  restSeconds?: number | null;
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
  update: (id: string, data: CreateWorkoutInput) =>
    request<Workout>(API_URL, `/api/workouts/${id}`, { method: "PUT", body: data, auth: true }),
  remove: (id: string) =>
    request<Record<string, unknown>>(API_URL, `/api/workouts/${id}`, { method: "DELETE", auth: true }),
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
  onboardingCompleted?: boolean;
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

export interface NotificationLog {
  id: string;
  channel: string;
  recipient: string;
  template: string | null;
  subject: string | null;
  status: string;
  createdAt: string;
}

export const notificationsApi = {
  history: () => request<{ items: NotificationLog[] }>(API_URL, "/api/notifications", { auth: true }),
  sendTest: () =>
    request<{ email: boolean; sms: boolean; hasPhone: boolean }>(API_URL, "/api/notifications/test", {
      method: "POST",
      auth: true,
    }),
};

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
