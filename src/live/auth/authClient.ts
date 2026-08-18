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
