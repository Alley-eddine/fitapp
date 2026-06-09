import { getToken, type AuthUser } from "./auth";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function request<T>(base: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false } = opts;
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
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

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>(AUTH_URL, "/auth/login", { method: "POST", body: { email, password } }),
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    request<AuthResponse>(AUTH_URL, "/auth/register", { method: "POST", body: data }),
  me: () => request<AuthUser>(AUTH_URL, "/auth/me", { auth: true }),
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
