// Client-side JWT helpers (R6a). The Worker is the authority — it signs and
// verifies session tokens; the client only DECODES the payload for display and
// expiry checks (never trusts it for authorization). Pure + unit-tested.

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role?: string; // R6b — viewer | contributor | approver | admin
  org?: string; // R6c — the org the user belongs to
  superAdmin?: boolean; // R6c — platform super-admin
}

export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string | null;
  role?: string;
  org?: string; // R6c
  sa?: boolean; // R6c — super-admin (short claim)
  iat?: number;
  exp?: number;
}

export function decodeJwt(token: string): JwtPayload | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isExpired(payload: JwtPayload | null, now: number = Date.now()): boolean {
  return !payload || (payload.exp != null && now / 1000 >= payload.exp);
}

// The user to display, from a token — null if the token is missing/invalid/expired.
export function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const p = decodeJwt(token);
  if (!p || isExpired(p) || !p.sub || !p.email) return null;
  return { id: p.sub, email: p.email, name: p.name ?? null, role: p.role, org: p.org, superAdmin: p.sa };
}
