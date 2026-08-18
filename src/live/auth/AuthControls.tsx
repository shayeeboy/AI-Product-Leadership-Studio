import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { useAuthStore } from "./authStore";
import { SignInDialog } from "./SignInDialog";

// Top-bar auth control (R6a). Renders nothing when the auth backend isn't
// deployed (keeps the plain device-local "Acting as" experience). Otherwise a
// Sign-in button (anonymous) or the signed-in user + Sign out.
export function AuthControls() {
  const user = useAuthStore((s) => s.user);
  const configured = useAuthStore((s) => s.configured);
  const signOut = useAuthStore((s) => s.signOut);
  const [open, setOpen] = useState(false);

  if (!configured && !user) return null;

  if (user) {
    return (
      <button
        onClick={signOut}
        title={`Signed in as ${user.email} — click to sign out`}
        className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-0.5 text-ink-600 hover:bg-ink-50"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-0.5 text-ink-600 hover:bg-ink-50"
      >
        <LogIn className="h-3.5 w-3.5" /> Sign in
      </button>
      {open && <SignInDialog onClose={() => setOpen(false)} />}
    </>
  );
}
