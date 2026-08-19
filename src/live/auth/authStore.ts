import { create } from "zustand";
import type { AuthUser } from "./jwt";
import { userFromToken } from "./jwt";
import { authBackend, requestLink, verifyToken, fetchMe } from "./authClient";
import { useLiveStore } from "../store";

// Session auth store (R6a). Holds the signed-in user + a short-TTL Bearer JWT
// (in localStorage). Optional/progressive: when the auth backend isn't deployed
// (endpoints 501) it stays quiet and the app runs on its device-local identity.
const TOKEN_KEY = "studio.authToken";
const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — non-fatal */
  }
};

// R6c "view as org" — a super-admin can browse another org's data read-only.
// Persisted so it survives a reload; the persistence client sends it as X-Org.
export interface ViewOrg {
  id: string;
  name: string;
}
const VIEW_KEY = "studio.viewOrg";
const readViewOrg = (): ViewOrg | null => {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    return raw ? (JSON.parse(raw) as ViewOrg) : null;
  } catch {
    return null;
  }
};

// The governance "actor" is the live store's `identity`; drive it from the
// signed-in user, and revert to the device default on sign-out.
function applyIdentity(user: AuthUser | null) {
  useLiveStore.getState().setIdentity(user ? user.name || user.email : "You");
}

type Phase = "idle" | "sending" | "sent" | "error";

interface AuthState {
  user: AuthUser | null;
  configured: boolean; // auth backend deployed (endpoints not 501)
  phase: Phase;
  error: string | null;
  viewAsOrg: ViewOrg | null; // R6c super-admin read-only view of another org
  bootstrap: () => Promise<void>;
  sendLink: (email: string) => Promise<void>;
  resetPhase: () => void;
  signOut: () => void;
  setViewAsOrg: (org: ViewOrg | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: userFromToken(readToken()), // optimistic display from a stored token
  configured: authBackend,
  phase: "idle",
  error: null,
  viewAsOrg: readViewOrg(),

  bootstrap: async () => {
    if (!authBackend) {
      set({ configured: false });
      return;
    }

    // 1) Magic-link return: ?token in the URL → verify → session.
    const url = new URL(window.location.href);
    const linkToken = url.searchParams.get("token");
    if (linkToken) {
      const r = await verifyToken(linkToken);
      url.searchParams.delete("token"); // never leave the token in the address bar
      window.history.replaceState({}, "", url.toString());
      if (r.ok) {
        writeToken(r.data.token);
        applyIdentity(r.data.user);
        set({ user: r.data.user, configured: true, phase: "idle", error: null });
        return;
      }
      set({ configured: r.status !== 501, phase: "error", error: r.error });
    }

    // 2) Stored token → validate with the Worker.
    const stored = readToken();
    if (stored) {
      const r = await fetchMe(stored);
      if (r.ok) {
        applyIdentity(r.data.user);
        set({ user: r.data.user, configured: true });
        return;
      }
      if (r.status === 401) {
        writeToken(null);
        set({ user: null, configured: true });
        return;
      }
      if (r.status === 501) set({ configured: false });
      return; // network error → keep the optimistic user
    }

    // 3) No token — probe whether auth is enabled at all (501 = not configured).
    const probe = await fetchMe(null);
    set({ configured: !(!probe.ok && probe.status === 501) });
  },

  sendLink: async (email) => {
    set({ phase: "sending", error: null });
    const r = await requestLink(email);
    if (r.ok) {
      set({ phase: "sent" });
      return;
    }
    set({ phase: "error", error: r.status === 501 ? "Sign-in isn't enabled on this deployment yet." : r.error });
  },

  resetPhase: () => set({ phase: "idle", error: null }),

  signOut: () => {
    writeToken(null);
    applyIdentity(null);
    try {
      localStorage.removeItem(VIEW_KEY);
    } catch {
      /* non-fatal */
    }
    set({ user: null, phase: "idle", error: null, viewAsOrg: null });
    useLiveStore.getState().init(); // reload state back to own scope
  },

  // R6c — enter/exit read-only view of another org; re-fetch state for the new scope.
  setViewAsOrg: (org) => {
    try {
      if (org) localStorage.setItem(VIEW_KEY, JSON.stringify(org));
      else localStorage.removeItem(VIEW_KEY);
    } catch {
      /* non-fatal */
    }
    set({ viewAsOrg: org });
    useLiveStore.getState().init();
  },
}));
