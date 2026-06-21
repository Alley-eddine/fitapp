import { getToken, type AuthUser } from "./auth";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

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

export const workoutApi = {
  list: () => request<{ items: Workout[]; total: number }>(API_URL, "/api/workouts?limit=20", { auth: true }),
  create: (data: CreateWorkoutInput) =>
    request<Workout>(API_URL, "/api/workouts", { method: "POST", body: data, auth: true }),
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
