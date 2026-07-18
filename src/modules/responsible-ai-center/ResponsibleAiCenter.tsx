import { Link } from "react-router-dom";
import { RISKS, AUDIT_EVENTS } from "@/seed/governance";
import { PRODUCTS, productById } from "@/seed/products";
import { useGovernanceStore } from "@/shared/governance/store";
import { WorkflowTimeline } from "@/shared/governance/WorkflowTimeline";
import { Card, PageHeader, SectionTitle, SeverityBadge } from "@/shared/components/ui";
import { shortDate } from "@/lib/format";

// The Governance Office view. Covers all ten items from Section 6.6.
const POLICIES = [
  { name: "Enterprise AI Use Policy", version: "v3.2", updated: "2026-06-01" },
  { name: "Responsible AI Principles", version: "v2.0", updated: "2026-05-12" },
  { name: "Model Risk Management Standard", version: "v1.4", updated: "2026-04-20" },
  { name: "Human Oversight Guideline", version: "v1.1", updated: "2026-06-18" },
];
const REGULATIONS = [
  { product: "HR Policy Assistant", framework: "Internal AI Policy · Regional AI Act (high-risk)", status: "In review" },
  { product: "Contract Review Copilot", framework: "Legal privilege · Data residency", status: "Compliant" },
  { product: "Enterprise RAG Assistant", framework: "Internal AI Policy · Copyright attribution", status: "Compliant" },
  { product: "Sales Outreach Agent", framework: "Anti-spam · Consent", status: "Gap" },
];
const REVIEW_QUEUES = [
  { name: "Bias review", pending: 2, done: 9 },
  { name: "Privacy review", pending: 3, done: 7 },
  { name: "Security assessment", pending: 1, done: 11 },
];

export function ResponsibleAiCenter() {
  const workflows = useGovernanceStore((s) => s.workflows);
  const focus = workflows.find((w) => w.productId === "hr-policy-bot");

  return (
    <div>
      <PageHeader
        title="Responsible AI Governance & Risk"
        subtitle="The internal Governance Office: policy library, risk register, review queues, compliance mapping, oversight, audit and model cards."
      />

      {/* Review queues */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {REVIEW_QUEUES.map((q) => (
          <Card key={q.name} className="p-4">
            <div className="text-sm font-semibold text-ink-700">{q.name}</div>
            <div className="mt-2 flex items-end gap-4">
              <div><div className="text-2xl font-bold text-amber-600">{q.pending}</div><div className="text-xs text-ink-400">pending</div></div>
              <div><div className="text-2xl font-bold text-emerald-600">{q.done}</div><div className="text-xs text-ink-400">completed</div></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Focus workflow */}
      {focus && (
        <Card className="mt-4 p-5">
          <SectionTitle hint="focus item">Approval workflow — HR Policy Assistant</SectionTitle>
          <WorkflowTimeline workflow={focus} />
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Risk register */}
        <Card className="p-5">
          <SectionTitle hint="per-product">Risk register</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-ink-500"><tr><th className="py-1.5">Risk</th><th>L</th><th>I</th><th>Status</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {RISKS.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5"><div className="font-medium text-ink-800">{r.risk}</div><div className="text-xs text-ink-400">{productById(r.productId)?.name}</div></td>
                    <td><SeverityBadge severity={r.likelihood} /></td>
                    <td><SeverityBadge severity={r.impact} /></td>
                    <td className="capitalize text-ink-600">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Policy library */}
        <Card className="p-5">
          <SectionTitle hint="versioned">Policy library</SectionTitle>
          <ul className="divide-y divide-ink-100 text-sm">
            {POLICIES.map((p) => (
              <li key={p.name} className="flex items-center justify-between py-2">
                <span className="font-medium text-ink-800">{p.name}</span>
                <span className="text-xs text-ink-400">{p.version} · {shortDate(p.updated)}</span>
              </li>
            ))}
          </ul>
          <SectionTitle hint="mapped frameworks"><span className="mt-4 block">Regulatory compliance</span></SectionTitle>
          <ul className="divide-y divide-ink-100 text-sm">
            {REGULATIONS.map((r) => (
              <li key={r.product} className="flex items-center justify-between py-2">
                <span><span className="font-medium text-ink-800">{r.product}</span><span className="block text-xs text-ink-400">{r.framework}</span></span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "Compliant" ? "bg-emerald-100 text-emerald-700" : r.status === "Gap" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Model cards */}
        <Card className="p-5">
          <SectionTitle hint="one per product">Model cards</SectionTitle>
          <ul className="divide-y divide-ink-100 text-sm">
            {PRODUCTS.filter((p) => p.status !== "archived").slice(0, 6).map((p) => (
              <li key={p.id} className="py-2">
                <Link to={`/product/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.name}</Link>
                <p className="text-xs text-ink-500">Purpose: {p.summary}</p>
                <p className="text-xs text-ink-400">Owner {p.owner} · {p.architecture} · limitations & eval on detail page</p>
              </li>
            ))}
          </ul>
        </Card>

        {/* Audit log */}
        <Card className="p-5">
          <SectionTitle hint="immutable">Audit log</SectionTitle>
          <ul className="space-y-2 text-sm">
            {AUDIT_EVENTS.map((a) => (
              <li key={a.id} className="border-b border-ink-100 pb-2">
                <div className="font-medium text-ink-800">{a.action}</div>
                <div className="text-xs text-ink-500">{productById(a.productId)?.name} · {a.actor} · {shortDate(a.timestamp)}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
