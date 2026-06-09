import type { UserRole } from "@fitapp/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  subscriptionTier: "free" | "pro" | "premium";
}

interface AuthState {
  token: string;
  user: AuthUser;
}

const KEY = "fitcoach_auth";

export function setAuth(state: AuthState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getAuth()?.token ?? null;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
