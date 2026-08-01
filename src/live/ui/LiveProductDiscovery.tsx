import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { assist, type AssistResult } from "../assist";
import { Card, PageHeader, SectionTitle } from "@/shared/components/ui";

const TOOLS = [
  "Customer Problem Discovery", "Jobs-to-be-Done Canvas", "Opportunity Mapping",
  "PRD Generation", "User Story Generation", "Success Metrics", "Experiment Planning", "Feature Prioritization",
];

// Deterministic template — the keyless fallback and the LLM's structural guide.
function template(user: string, problem: string): string {
  if (!problem.trim()) return "";
  const u = user.trim() || "our users";
  const p = problem.trim().replace(/\.$/, "");
  return `When ${u} try to ${p}, they are blocked by manual, fragmented steps. An AI-assisted workflow could cut time-to-outcome and improve consistency. Next step: run an Opportunity Assessment to score business value, AI suitability and data readiness before committing to build.`;
}

export function LiveProductDiscovery() {
  const [user, setUser] = useState("");
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState<AssistResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    const fallback = template(user, problem);
    if (!fallback) return;
    setBusy(true);
    try {
      const prompt = `User: ${user || "unspecified"}\nProblem/JTBD: ${problem}\nWrite a crisp one-paragraph problem statement, then 3 opportunity hypotheses.`;
      setResult(await assist(prompt, fallback));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Product Discovery Workspace"
        subtitle="AI-assisted early-stage product work. Works keyless with templated assists; upgrades to a live LLM when the Studio's assist endpoint is configured (see docs/PERSISTENCE.md)."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Customer Problem Discovery</SectionTitle>
          <label className="mb-1 block text-sm font-medium text-ink-700">Who is the user?</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="e.g. support agents" className="mb-3 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
          <label className="mb-1 block text-sm font-medium text-ink-700">What are they trying to do?</label>
          <textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. resolve tickets without searching five systems" rows={3} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
          <button onClick={generate} disabled={!problem.trim() || busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {busy ? "Generating…" : "Generate problem statement"}
          </button>

          <div className="mt-4">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Synthesized problem statement</h3>
              {result && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${result.mode === "llm" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {result.mode === "llm" ? "AI assist (live)" : "templated"}
                </span>
              )}
            </div>
            {result ? (
              <div className="whitespace-pre-wrap rounded-lg border-l-4 border-l-brand-500 bg-brand-50 p-4 text-sm leading-relaxed text-ink-700">{result.text}</div>
            ) : (
              <div className="rounded-lg border border-dashed border-ink-300 p-4 text-sm text-ink-400">Fill in the fields and hit Generate.</div>
            )}
          </div>
          {result && (
            <Link to="/opportunity" className="mt-3 inline-block rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800">Score this in Opportunity Assessment →</Link>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>Discovery toolkit</SectionTitle>
          <ul className="space-y-1.5 text-sm">
            {TOOLS.map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-ink-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />{t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-400">Each tool ships a template today; all upgrade to the live LLM when the assist endpoint is configured, and degrade back to templates automatically if it's unavailable.</p>
        </Card>
      </div>
    </div>
  );
}
