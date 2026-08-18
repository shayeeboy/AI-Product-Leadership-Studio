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
  disabled?: boolean;
  last_login_at?: string | null;
  created_at?: string;
}
export const listUsers = () => call<{ users: ManagedUser[] }>("/api/users", { method: "GET", headers: bearer() });
export const setUserRole = (id: string, role: string) =>
  call<{ ok: true; user: ManagedUser }>("/api/users/role", { method: "POST", headers: bearer(), body: JSON.stringify({ id, role }) });
export const inviteUser = (email: string, role: string) =>
  call<{ ok: true; user: ManagedUser }>("/api/users/invite", { method: "POST", headers: bearer(), body: JSON.stringify({ email, role }) });
export const setUserDisabled = (id: string, disabled: boolean) =>
  call<{ ok: true; user: ManagedUser }>("/api/users/disabled", { method: "POST", headers: bearer(), body: JSON.stringify({ id, disabled }) });

// R6c-c — super-admin org management.
export interface Org {
  id: string;
  name: string;
  slug: string | null;
  suspended: boolean;
  created_at?: string;
  user_count?: number;
  registration_count?: number;
}
export const listOrgs = () => call<{ orgs: Org[] }>("/api/orgs", { method: "GET", headers: bearer() });
export const createOrg = (name: string) => call<{ ok: true; org: Org }>("/api/orgs", { method: "POST", headers: bearer(), body: JSON.stringify({ name }) });
export const updateOrg = (id: string, patch: { name?: string; suspended?: boolean }) =>
  call<{ ok: true; org: Org }>("/api/orgs/update", { method: "POST", headers: bearer(), body: JSON.stringify({ id, ...patch }) });
