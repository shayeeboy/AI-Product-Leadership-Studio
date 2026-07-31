import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Sparkles } from "lucide-react";
import { useLiveStore } from "../store";
import { Card, PageHeader, SectionTitle, SeverityBadge } from "@/shared/components/ui";
import { shortDate } from "@/lib/format";
import type { Severity } from "@/types/domain";

const REVIEW_KINDS = ["bias", "privacy", "security"] as const;
type ReviewKind = (typeof REVIEW_KINDS)[number];
const REVIEW_STATUS = ["pending", "in-progress", "completed"] as const;

interface PolicyData { name: string; version: string }
interface ReviewData { kind: ReviewKind; status: string }
interface CardData { purpose?: string; owner?: string; architecture?: string; limitations?: string }
interface RiskData { risk: string; likelihood: Severity; impact: Severity; owner?: string; mitigation?: string }

export function LiveResponsibleAiCenter() {
  const registrations = useLiveStore((s) => s.registrations);
  const policies = useLiveStore((s) => s.entities.policy);
  const reviews = useLiveStore((s) => s.entities.review);
  const cards = useLiveStore((s) => s.entities.model_card);
  const risks = useLiveStore((s) => s.entities.risk);
  const audit = useLiveStore((s) => s.audit);
  const saveEntity = useLiveStore((s) => s.saveEntity);
  const removeEntity = useLiveStore((s) => s.removeEntity);

  const [policy, setPolicy] = useState({ name: "", version: "v1.0" });
  const [review, setReview] = useState<{ kind: ReviewKind; productId: string; status: string }>({ kind: "bias", productId: registrations[0]?.id ?? "", status: "pending" });

  const productName = (id?: string | null) => registrations.find((r) => r.id === id)?.name ?? "portfolio";

  async function seedModelCards() {
    for (const r of registrations) {
      if (cards.some((c) => c.id === r.id)) continue;
      await saveEntity("model_card", { id: r.id, productId: r.id, data: { purpose: `${r.name} — ${r.architecture ?? "AI product"}`, owner: r.owner, architecture: r.architecture, limitations: "Review before production use." } });
    }
  }

  return (
    <div>
      <PageHeader
        title="Responsible AI Governance & Risk"
        subtitle="The internal Governance Office — policies, review queues, model cards and the audit trail, all Studio-managed and persisted."
      />

      {/* Review queues */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {REVIEW_KINDS.map((kind) => {
          const rows = reviews.filter((r) => (r.data as unknown as ReviewData).kind === kind);
          const pending = rows.filter((r) => (r.data as unknown as ReviewData).status !== "completed").length;
          const done = rows.length - pending;
          return (
            <Card key={kind} className="p-4">
              <div className="text-sm font-semibold capitalize text-ink-700">{kind} review</div>
              <div className="mt-2 flex items-end gap-4">
                <div><div className="text-2xl font-bold text-amber-600">{pending}</div><div className="text-xs text-ink-400">pending</div></div>
                <div><div className="text-2xl font-bold text-emerald-600">{done}</div><div className="text-xs text-ink-400">completed</div></div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add a review */}
      <Card className="mt-4 p-4">
        <div className="flex flex-col items-end gap-2 sm:flex-row">
          <label className="w-full text-xs text-ink-500 sm:w-auto">Kind
            <select value={review.kind} onChange={(e) => setReview((r) => ({ ...r, kind: e.target.value as ReviewKind }))} className={inputCls}>{REVIEW_KINDS.map((k) => <option key={k} value={k} className="capitalize">{k}</option>)}</select>
          </label>
          <label className="w-full text-xs text-ink-500 sm:flex-1">Product
            <select value={review.productId} onChange={(e) => setReview((r) => ({ ...r, productId: e.target.value }))} className={inputCls}><option value="">— portfolio</option>{registrations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </label>
          <label className="w-full text-xs text-ink-500 sm:w-auto">Status
            <select value={review.status} onChange={(e) => setReview((r) => ({ ...r, status: e.target.value }))} className={inputCls}>{REVIEW_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </label>
          <button onClick={() => saveEntity("review", { productId: review.productId || null, data: { kind: review.kind, status: review.status } })} className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:w-auto">Add to queue</button>
        </div>
        {reviews.length > 0 && (
          <ul className="mt-3 divide-y divide-ink-100 text-sm">
            {reviews.map((r) => {
              const d = r.data as unknown as ReviewData;
              return (
                <li key={r.id} className="flex items-center justify-between py-1.5">
                  <span><span className="font-medium capitalize text-ink-800">{d.kind}</span> · {productName(r.productId)}</span>
                  <span className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs ${d.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{d.status}</span><button onClick={() => removeEntity("review", r.id)} className="text-ink-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Policy library */}
        <Card className="p-5">
          <SectionTitle>Policy library</SectionTitle>
          <div className="mb-3 flex gap-2">
            <input value={policy.name} onChange={(e) => setPolicy((p) => ({ ...p, name: e.target.value }))} placeholder="Policy name" className={inputCls} />
            <input value={policy.version} onChange={(e) => setPolicy((p) => ({ ...p, version: e.target.value }))} className="w-24 rounded-lg border border-ink-200 px-2 py-2 text-sm" />
            <button onClick={() => { if (policy.name.trim()) { saveEntity("policy", { data: { name: policy.name.trim(), version: policy.version } }); setPolicy({ name: "", version: "v1.0" }); } }} className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Add</button>
          </div>
          {policies.length === 0 ? <p className="text-sm text-ink-400">No policies yet.</p> : (
            <ul className="divide-y divide-ink-100 text-sm">
              {policies.map((p) => {
                const d = p.data as unknown as PolicyData;
                return <li key={p.id} className="flex items-center justify-between py-2"><span className="font-medium text-ink-800">{d.name}</span><span className="flex items-center gap-2 text-xs text-ink-400">{d.version}<button onClick={() => removeEntity("policy", p.id)} className="text-ink-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></span></li>;
              })}
            </ul>
          )}
        </Card>

        {/* Model cards */}
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>Model cards</SectionTitle>
            <button onClick={seedModelCards} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-50"><Sparkles className="h-3.5 w-3.5" /> Seed from registry</button>
          </div>
          {cards.length === 0 ? <p className="text-sm text-ink-400">No model cards yet — seed them from the registry.</p> : (
            <ul className="divide-y divide-ink-100 text-sm">
              {cards.map((c) => {
                const d = c.data as unknown as CardData;
                return (
                  <li key={c.id} className="py-2">
                    <div className="flex items-center justify-between"><Link to={`/product/${c.productId}`} className="font-medium text-brand-600 hover:underline">{productName(c.productId)}</Link><button onClick={() => removeEntity("model_card", c.id)} className="text-ink-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
                    <p className="text-xs text-ink-500">{d.purpose}</p>
                    <p className="text-xs text-ink-400">{d.owner ? `Owner ${d.owner} · ` : ""}{d.architecture ?? ""} · {d.limitations}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Risk register (read-only summary) */}
        <Card className="p-5">
          <SectionTitle hint="managed in Portfolio Governance">Risk register</SectionTitle>
          {risks.length === 0 ? <p className="text-sm text-ink-400">No risks logged. <Link to="/portfolio-governance" className="text-brand-600 hover:underline">Add in Portfolio Governance →</Link></p> : (
            <ul className="divide-y divide-ink-100 text-sm">
              {risks.slice(0, 8).map((r) => {
                const d = r.data as unknown as RiskData;
                return <li key={r.id} className="flex items-center justify-between py-1.5"><span className="font-medium text-ink-800">{d.risk}</span><span className="flex gap-1"><SeverityBadge severity={d.likelihood} /><SeverityBadge severity={d.impact} /></span></li>;
              })}
            </ul>
          )}
        </Card>

        {/* Audit log */}
        <Card className="p-5">
          <SectionTitle hint="live (R1)">Audit log</SectionTitle>
          {audit.length === 0 ? <p className="text-sm text-ink-400">No governance actions yet.</p> : (
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {audit.map((a) => (
                <li key={a.id} className="border-b border-ink-100 pb-2"><div className="font-medium text-ink-800">{a.action}</div><div className="text-xs text-ink-500">{productName(a.productId)} · {a.actor} · {a.createdAt ? shortDate(a.createdAt) : ""}</div></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

const inputCls = "mt-0.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500";
