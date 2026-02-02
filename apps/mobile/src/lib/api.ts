import { useAuthStore } from '../store/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

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
