type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
interface RequestOptions {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
}
declare class ApiClient {
    private baseUrl;
    constructor(baseUrl: string);
    private getHeaders;
    request<T>(endpoint: string, options?: RequestOptions): Promise<T>;
    get<T>(endpoint: string): Promise<T>;
    post<T>(endpoint: string, body: unknown): Promise<T>;
    put<T>(endpoint: string, body: unknown): Promise<T>;
    delete<T>(endpoint: string): Promise<T>;
}
export declare const api: ApiClient;
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
export declare const profileApi: {
    get: () => Promise<Profile>;
    update: (data: ProfileUpdate) => Promise<Profile>;
};
export declare const workoutApi: {
    list: (days?: number) => Promise<Workout[]>;
    create: (data: Omit<Workout, "id" | "createdAt">) => Promise<Workout>;
    get: (id: string) => Promise<Workout>;
    delete: (id: string) => Promise<unknown>;
    weeklyStats: () => Promise<{
        totalWorkouts: number;
        totalDuration: number;
        totalCalories: number;
    }>;
};
export declare const weightApi: {
    list: (days?: number) => Promise<WeightLog[]>;
    log: (weight: number) => Promise<WeightLog>;
    latest: () => Promise<WeightLog>;
};
export declare const stepsApi: {
    list: (days?: number) => Promise<StepsLog[]>;
    log: (steps: number, goal?: number) => Promise<StepsLog>;
    today: () => Promise<StepsLog & {
        percentage: number;
    }>;
};
export {};
//# sourceMappingURL=api.d.ts.map