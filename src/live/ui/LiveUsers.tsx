import { useEffect, useState } from "react";
import { useAuthStore } from "../auth/authStore";
import { listUsers, setUserRole, type ManagedUser } from "../auth/authClient";
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

      <Card className="overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3">
          <SectionTitle hint="live">Signed-in users</SectionTitle>
        </div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id} className="hover:bg-ink-50">
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-ink-800">{u.name || u.email}</div>
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
