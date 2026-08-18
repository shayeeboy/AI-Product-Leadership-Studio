import type { AuthUser } from "./jwt";

// Auth API client (R6a). Talks to the same Worker as persistence. Every call
// returns a discriminated result so callers can distinguish "not configured"
// (501 — auth backend not deployed) from real errors, and degrade gracefully.
const API = import.meta.env.VITE_PERSISTENCE_API?.replace(/\/$/, "");
export const authBackend = !!API;

export type AuthCall<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(path: string, init?: RequestInit): Promise<AuthCall<T>> {
  if (!API) return { ok: false, status: 0, error: "no backend" };
  try {
    const res = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, status: res.status, error: String(body.error || `HTTP ${res.status}`) };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: "network error" };
  }
}

export const requestLink = (email: string) => call<{ ok: true }>("/api/auth/request", { method: "POST", body: JSON.stringify({ email }) });

export const verifyToken = (token: string) => call<{ token: string; user: AuthUser }>("/api/auth/verify", { method: "POST", body: JSON.stringify({ token }) });

export const fetchMe = (jwt: string | null) =>
  call<{ user: AuthUser }>("/api/auth/me", { method: "GET", headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} });

// Shared session-token reader (also used by the persistence client so writes
// carry the Bearer token for server-side role enforcement).
export const AUTH_TOKEN_KEY = "studio.authToken";
export function readAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}
const bearer = (): Record<string, string> => {
  const t = readAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// R6b — admin-only user management.
export interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  last_login_at?: string | null;
  created_at?: string;
}
export const listUsers = () => call<{ users: ManagedUser[] }>("/api/users", { method: "GET", headers: bearer() });
export const setUserRole = (id: string, role: string) =>
  call<{ ok: true; user: ManagedUser }>("/api/users/role", { method: "POST", headers: bearer(), body: JSON.stringify({ id, role }) });
