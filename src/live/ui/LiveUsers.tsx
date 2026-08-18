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

  async function changeRole(u: ManagedUser, role: string) {
    setBusy(u.id);
    setError(null);
    const r = await setUserRole(u.id, role);
    setBusy(null);
    if (r.ok) setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, role } : x)) ?? null);
    else setError(r.error);
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
                        <select
                          value={u.role}
                          disabled={busy === u.id || self}
                          onChange={(e) => changeRole(u, e.target.value)}
                          title={self ? "You can't change your own role" : isRole(u.role) ? ROLE_HINT[u.role] : ""}
                          className="rounded border border-ink-200 bg-white px-2 py-1 text-xs disabled:opacity-60"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
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
