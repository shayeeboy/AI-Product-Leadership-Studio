import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader, SectionTitle } from "@/shared/components/ui";

// AI-assisted discovery workflow (Section 6.3). Uses templated "AI assist"
// output — the point is to demonstrate the workflow and UX, not wire a live
// model. Gracefully templated; a live LLM call would slot in behind this.
const TOOLS = [
  "Customer Problem Discovery", "Jobs-to-be-Done Canvas", "Opportunity Mapping",
  "PRD Generation", "User Story Generation", "Success Metrics", "Experiment Planning", "Feature Prioritization",
];

function synthesize(problem: string, user: string): string {
  if (!problem.trim()) return "";
  return `When ${user || "our users"} try to ${problem.trim().replace(/\.$/, "")}, they are blocked by manual, fragmented steps. An AI-assisted workflow could reduce time-to-outcome and improve consistency. Recommended next step: run an Opportunity Assessment to score business value, AI suitability and data readiness before committing to build.`;
}

export function ProductDiscovery() {
  const [problem, setProblem] = useState("");
  const [user, setUser] = useState("");
  const statement = synthesize(problem, user);

  return (
    <div>
      <PageHeader
        title="Product Discovery Workspace"
        subtitle="AI-assisted tooling for early-stage product work. Templated assists demonstrate the workflow; outputs feed the Opportunity Assessment and Prioritization modules."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Customer Problem Discovery</SectionTitle>
          <label className="mb-1 block text-sm font-medium text-ink-700">Who is the user?</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="e.g. support agents" className="mb-3 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
          <label className="mb-1 block text-sm font-medium text-ink-700">What are they trying to do?</label>
          <textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. resolve tickets without searching five systems" rows={3} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />

          <div className="mt-4">
            <SectionTitle hint="templated AI assist">Synthesized problem statement</SectionTitle>
            {statement ? (
              <div className="rounded-lg border-l-4 border-l-brand-500 bg-brand-50 p-4 text-sm leading-relaxed text-ink-700">{statement}</div>
            ) : (
              <div className="rounded-lg border border-dashed border-ink-300 p-4 text-sm text-ink-400">Fill in the fields above to generate a problem statement.</div>
            )}
          </div>
          {statement && (
            <Link to="/opportunity" className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Score this in Opportunity Assessment →</Link>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>Discovery toolkit</SectionTitle>
          <ul className="space-y-1.5 text-sm">
            {TOOLS.map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-ink-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-400">Each tool ships a template today and degrades gracefully to templates when no LLM key is configured.</p>
        </Card>
      </div>
    </div>
  );
}
