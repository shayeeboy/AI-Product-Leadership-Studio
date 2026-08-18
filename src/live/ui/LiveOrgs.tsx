import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuthStore } from "../auth/authStore";
import { listOrgs, createOrg, updateOrg, type Org } from "../auth/authClient";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/shared/components/ui";
import { shortDate } from "@/lib/format";

// R6c-c — platform super-admin org management. Create template-seeded orgs,
// rename, and suspend/enable them. The Worker enforces super-admin-only + org
// isolation; this is the console.
export function LiveOrgs() {
  const me = useAuthStore((s) => s.user);
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    let live = true;
    listOrgs().then((r) => {
      if (!live) return;
      if (r.ok) setOrgs(r.data.orgs);
      else setError(r.status === 403 ? "Super-admin only." : r.error);
    });
    return () => {
      live = false;
    };
  }, []);

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    const r = await createOrg(name);
    setCreating(false);
    if (r.ok) {
      setOrgs((prev) => [...(prev ?? []), r.data.org]);
      setNewName("");
      setShowCreate(false);
    } else setError(r.error);
  }

  async function patch(org: Org, body: { name?: string; suspended?: boolean }) {
    setBusy(org.id);
    setError(null);
    const r = await updateOrg(org.id, body);
    setBusy(null);
    if (r.ok) {
      setOrgs((prev) => prev?.map((x) => (x.id === org.id ? { ...x, ...r.data.org } : x)) ?? null);
      setEditId(null);
    } else setError(r.error);
  }

  if (!me?.superAdmin) {
    return (
      <div>
        <PageHeader title="Organizations" subtitle="Platform-level tenant management." />
        <EmptyState title="Super-admin only" hint="This console is available to platform super-admins." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Each org is an isolated tenant with its own portfolio, governance and users. New orgs open template-seeded with the demo apps."
      />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <SectionTitle hint="live">Tenants</SectionTitle>
          <button onClick={() => { setShowCreate((v) => !v); setError(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50">
            <Building2 className="h-4 w-4" /> New organization
          </button>
        </div>

        {showCreate && (
          <form onSubmit={(e) => { e.preventDefault(); create(); }} className="flex flex-wrap items-end gap-3 border-b border-ink-200 bg-ink-50 px-5 py-4">
            <label className="flex flex-col gap-1 text-xs text-ink-500">
              Organization name
              <input autoFocus required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Acme Corp" className="w-64 rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
            </label>
            <button type="submit" disabled={creating} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">{creating ? "Creating…" : "Create + seed"}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-2 py-1.5 text-sm text-ink-500 hover:bg-ink-100">Cancel</button>
          </form>
        )}

        {orgs == null ? (
          <div className="p-8 text-center text-ink-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-2.5">Organization</th>
                  <th className="px-3 py-2.5 text-right">Users</th>
                  <th className="px-3 py-2.5 text-right">Products</th>
                  <th className="px-3 py-2.5 text-right">Created</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {orgs.map((o) => (
                  <tr key={o.id} className={`hover:bg-ink-50 ${o.suspended ? "opacity-60" : ""}`}>
                    <td className="px-5 py-2.5">
                      {editId === o.id ? (
                        <span className="flex items-center gap-2">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-48 rounded border border-ink-200 px-2 py-1 text-sm" />
                          <button onClick={() => patch(o, { name: editName.trim() })} disabled={busy === o.id} className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60">Save</button>
                          <button onClick={() => setEditId(null)} className="rounded px-1.5 py-1 text-xs text-ink-500 hover:bg-ink-100">Cancel</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-ink-800">{o.name}</span>
                          {o.suspended && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">Suspended</span>}
                          {o.id === "default" && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">Demo</span>}
                          <span className="text-xs text-ink-400">{o.slug}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-600">{o.user_count ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right text-ink-600">{o.registration_count ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right text-ink-500">{o.created_at ? shortDate(o.created_at) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditId(o.id); setEditName(o.name); }} className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-50">Rename</button>
                        {o.id !== "default" && (
                          <button
                            onClick={() => patch(o, { suspended: !o.suspended })}
                            disabled={busy === o.id}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${o.suspended ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                          >
                            {busy === o.id ? "…" : o.suspended ? "Enable" : "Suspend"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-400">Suspending an org blocks its members from signing in and rejects their live sessions. The demo org can't be suspended. To add people to an org, an org admin invites them (Users &amp; Roles).</p>
    </div>
  );
}
