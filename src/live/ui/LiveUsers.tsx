import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { useAuthStore } from "../auth/authStore";
import { listUsers, setUserRole, inviteUser, setUserDisabled, type ManagedUser } from "../auth/authClient";
import { ROLES, ROLE_LABEL, ROLE_HINT, canManageUsers, isRole } from "../auth/roles";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/shared/components/ui";
import { shortDate } from "@/lib/format";

// R6b — admin-only user management. Lists everyone who has signed in and lets an
// admin change roles (which gate what each user can do). The Worker enforces the
// same rules server-side; this is the affordance.
export function LiveUsers() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({}); // chosen-but-unsaved roles
  const [savedId, setSavedId] = useState<string | null>(null); // transient "Saved ✓"
  // Invite flow
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("contributor");
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listUsers().then((r) => {
      if (!live) return;
      if (r.ok) setUsers(r.data.users);
      else setError(r.status === 403 ? "Admin role required." : r.error);
    });
    return () => {
      live = false;
    };
  }, []);

  const pick = (u: ManagedUser, role: string) => setPending((p) => ({ ...p, [u.id]: role }));
  const cancel = (id: string) =>
    setPending((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });

  async function sendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    setError(null);
    setNotice(null);
    const r = await inviteUser(email, inviteRole);
    setInviting(false);
    if (r.ok) {
      // Merge (or update) the pre-created user into the list.
      setUsers((prev) => {
        const rest = (prev ?? []).filter((x) => x.id !== r.data.user.id && x.email !== r.data.user.email);
        return [r.data.user, ...rest];
      });
      setNotice(`Invite emailed to ${email} (as ${ROLE_LABEL[inviteRole as keyof typeof ROLE_LABEL] ?? inviteRole}). They'll appear here now and can sign in via the link.`);
      setInviteEmail("");
      setShowInvite(false);
    } else {
      setError(r.status === 501 ? "Email isn't configured on this deployment." : r.error);
    }
  }

  async function toggleDisabled(u: ManagedUser) {
    setBusy(u.id);
    setError(null);
    const r = await setUserDisabled(u.id, !u.disabled);
    setBusy(null);
    if (r.ok) setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, disabled: r.data.user.disabled } : x)) ?? null);
    else setError(r.error);
  }

  async function save(u: ManagedUser) {
    const role = pending[u.id];
    if (!role || role === u.role) return;
    setBusy(u.id);
    setError(null);
    const r = await setUserRole(u.id, role);
    setBusy(null);
    if (r.ok) {
      setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, role } : x)) ?? null);
      cancel(u.id);
      setSavedId(u.id);
      setTimeout(() => setSavedId((s) => (s === u.id ? null : s)), 2500);
    } else {
      setError(r.error);
    }
  }

  if (!canManageUsers(me?.role)) {
    return (
      <div>
        <PageHeader title="Users & Roles" subtitle="Manage who can do what across the Studio." />
        <EmptyState title="Admin only" hint="This view is available to administrators." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Roles gate what each signed-in user can do. Governance approvals require Approver or Admin; only Admins can manage users."
      />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</div>}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <SectionTitle hint="live">Users</SectionTitle>
          <button
            onClick={() => { setShowInvite((v) => !v); setError(null); setNotice(null); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <UserPlus className="h-4 w-4" /> Invite user
          </button>
        </div>

        {showInvite && (
          <form
            onSubmit={(e) => { e.preventDefault(); sendInvite(); }}
            className="flex flex-wrap items-end gap-3 border-b border-ink-200 bg-ink-50 px-5 py-4"
          >
            <label className="flex flex-col gap-1 text-xs text-ink-500">
              Email
              <input
                type="email"
                required
                autoFocus
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-64 rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-500">
              Role
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
            <button type="submit" disabled={inviting} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {inviting ? "Sending…" : "Send invite"}
            </button>
            <button type="button" onClick={() => setShowInvite(false)} className="rounded-lg px-2 py-1.5 text-sm text-ink-500 hover:bg-ink-100">Cancel</button>
          </form>
        )}
        {users == null ? (
          <div className="p-8 text-center text-ink-400">Loading…</div>
        ) : users.length === 0 ? (
          <EmptyState title="No users yet" hint="Users appear here after they sign in." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-2.5">User</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="px-3 py-2.5 text-right">Last sign-in</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id} className={`hover:bg-ink-50 ${u.disabled ? "opacity-60" : ""}`}>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink-800">{u.name || u.email}</span>
                          {u.disabled && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">Disabled</span>}
                        </div>
                        <div className="text-xs text-ink-400">{u.email}{self ? " · you" : ""}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <select
                            value={pending[u.id] ?? u.role}
                            disabled={busy === u.id || self}
                            onChange={(e) => pick(u, e.target.value)}
                            title={self ? "You can't change your own role" : isRole(u.role) ? ROLE_HINT[u.role] : ""}
                            className="rounded border border-ink-200 bg-white px-2 py-1 text-xs disabled:opacity-60"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                          {pending[u.id] && pending[u.id] !== u.role ? (
                            <>
                              <button
                                onClick={() => save(u)}
                                disabled={busy === u.id}
                                className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                              >
                                {busy === u.id ? "Saving…" : "Save"}
                              </button>
                              <button onClick={() => cancel(u.id)} disabled={busy === u.id} className="rounded px-1.5 py-1 text-xs text-ink-500 hover:bg-ink-100">
                                Cancel
                              </button>
                            </>
                          ) : (
                            savedId === u.id && <span className="text-xs font-medium text-emerald-600">Saved ✓</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-500">{u.last_login_at ? shortDate(u.last_login_at) : "—"}</td>
                      <td className="px-3 py-2.5 text-right">
                        {self ? (
                          <span className="text-xs text-ink-300">—</span>
                        ) : (
                          <button
                            onClick={() => toggleDisabled(u)}
                            disabled={busy === u.id}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
                              u.disabled
                                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                : "border-red-200 text-red-600 hover:bg-red-50"
                            }`}
                          >
                            {busy === u.id ? "…" : u.disabled ? "Enable" : "Disable"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs text-ink-400">{ROLES.map((r) => `${ROLE_LABEL[r]} — ${ROLE_HINT[r]}`).join(" · ")}</p>
    </div>
  );
}
