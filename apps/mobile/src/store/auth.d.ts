interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    subscriptionTier: 'free' | 'pro' | 'premium';
}
interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => Promise<void>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
}
export declare const useAuthStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AuthState>>;
export {};
//# sourceMappingURL=auth.d.ts.map