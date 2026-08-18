import { useEffect, useState } from "react";
import { X, Mail } from "lucide-react";
import { useAuthStore } from "./authStore";

// Magic-link sign-in modal (R6a): enter an email → the Worker emails a one-time
// link. No password is ever entered here.
export function SignInDialog({ onClose }: { onClose: () => void }) {
  const phase = useAuthStore((s) => s.phase);
  const error = useAuthStore((s) => s.error);
  const sendLink = useAuthStore((s) => s.sendLink);
  const resetPhase = useAuthStore((s) => s.resetPhase);
  const [email, setEmail] = useState("");

  useEffect(() => () => resetPhase(), [resetPhase]); // clear phase when closed

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Sign in</h2>
          <button onClick={onClose} className="rounded p-1 text-ink-400 hover:bg-ink-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {phase === "sent" ? (
          <div className="py-4 text-sm text-ink-700">
            <Mail className="mb-2 h-6 w-6 text-brand-500" />
            Check your inbox — we sent a one-time sign-in link to <strong>{email}</strong>. It expires in 15 minutes.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) sendLink(email.trim());
            }}
          >
            <p className="mb-3 text-sm text-ink-500">Enter your email and we'll send a magic link — no password.</p>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={phase === "sending"}
              className="mt-3 w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {phase === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
          Signing in upgrades your device-local “Acting as” name to a verified identity. You can keep exploring without it.
        </p>
      </div>
    </div>
  );
}
