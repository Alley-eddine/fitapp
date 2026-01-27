import { useAuthStore } from '../store/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
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
      headers: { ...this.getHeaders(), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Request failed' }))) as { error?: string };
      throw new Error(errorData.error ?? 'Request failed');
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
  name: string;
  email: string;
  goalWeight?: number;
  currentWeight?: number;
  height?: number;
  activityLevel?: string;
  subscriptionTier: string;
}

export interface Workout {
  id: string;
  type: string;
  duration: number;
  caloriesBurned?: number;
  notes?: string;
  exercises: Exercise[];
  createdAt: string;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
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

export const profileApi = {
  get: () => api.get<Profile>('/api/profile'),
  update: (data: Partial<Profile>) => api.put<Profile>('/api/profile', data),
};

export const workoutApi = {
  list: (days = 7) => api.get<Workout[]>(`/api/workouts?days=${String(days)}`),
  create: (data: Omit<Workout, 'id' | 'createdAt'>) => api.post<Workout>('/api/workouts', data),
  get: (id: string) => api.get<Workout>(`/api/workouts/${id}`),
  delete: (id: string) => api.delete(`/api/workouts/${id}`),
  weeklyStats: () => api.get<{ totalWorkouts: number; totalDuration: number; totalCalories: number }>('/api/workouts/stats/weekly'),
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
