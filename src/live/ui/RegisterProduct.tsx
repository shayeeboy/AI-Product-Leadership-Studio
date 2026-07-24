import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useLiveStore } from "../store";
import { fetchLive } from "../liveAdapters";
import { Card, PageHeader, SectionTitle } from "@/shared/components/ui";
import { ADAPTER_LABELS, type AdapterType, type Registration } from "../types";
import type { ProductStatus } from "@/types/domain";

const ADAPTERS = Object.keys(ADAPTER_LABELS) as AdapterType[];

export function RegisterProduct() {
  const navigate = useNavigate();
  const addRegistration = useLiveStore((s) => s.addRegistration);
  const [form, setForm] = useState({
    name: "", businessUnit: "", owner: "", sponsor: "", architecture: "", adapterType: "health" as AdapterType, endpointUrl: "",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  async function testEndpoint() {
    if (!form.endpointUrl) return;
    setTesting(true);
    setTestResult(null);
    const r = await fetchLive({ id: slug, name: form.name, adapterType: form.adapterType, endpointUrl: form.endpointUrl, status: "pending" });
    setTestResult(r.ok ? { ok: true, msg: `Reachable · ${r.latencyMs}ms` } : { ok: false, msg: r.error ?? "unreachable" });
    setTesting(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const reg: Registration = {
      id: slug,
      name: form.name.trim(),
      businessUnit: form.businessUnit || undefined,
      owner: form.owner || undefined,
      sponsor: form.sponsor || undefined,
      architecture: form.architecture || undefined,
      adapterType: form.adapterType,
      endpointUrl: form.endpointUrl || undefined,
      status: "pending" as ProductStatus,
    };
    try {
      await addRegistration(reg);
      navigate(`/product/${reg.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Portfolio
      </Link>
      <PageHeader
        title="Register an AI product"
        subtitle="Add any AI product to the portfolio by pointing the Studio at its live snapshot endpoint. It enters governance at the 'Registered' stage and is pulled live from then on."
      />

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Product details</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name *"><input required value={form.name} onChange={set("name")} className={inputCls} placeholder="e.g. Contract Review Copilot" /></Field>
            <Field label="Business unit"><input value={form.businessUnit} onChange={set("businessUnit")} className={inputCls} placeholder="e.g. Legal" /></Field>
            <Field label="Owner"><input value={form.owner} onChange={set("owner")} className={inputCls} /></Field>
            <Field label="Sponsor"><input value={form.sponsor} onChange={set("sponsor")} className={inputCls} /></Field>
            <Field label="Architecture"><input value={form.architecture} onChange={set("architecture")} className={inputCls} placeholder="e.g. RAG, Agentic" /></Field>
            <Field label="Adapter type">
              <select value={form.adapterType} onChange={set("adapterType")} className={inputCls}>
                {ADAPTERS.map((a) => <option key={a} value={a}>{ADAPTER_LABELS[a]}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Snapshot endpoint URL">
              <div className="flex gap-2">
                <input value={form.endpointUrl} onChange={set("endpointUrl")} className={inputCls} placeholder="https://your-app/snapshot" />
                <button type="button" onClick={testEndpoint} disabled={!form.endpointUrl || testing} className="shrink-0 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-600 hover:bg-ink-50 disabled:opacity-50">
                  {testing ? "Testing…" : "Test"}
                </button>
              </div>
            </Field>
            {testResult && (
              <p className={`mt-1.5 flex items-center gap-1.5 text-sm ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
                {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{testResult.msg}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>How binding works</SectionTitle>
          <p className="text-sm leading-relaxed text-ink-600">
            The <b>adapter type</b> tells the Studio how to read your endpoint's JSON. Emit the matching snapshot shape
            (see the enriched portfolio apps) and the Studio renders it live — capability radar, knowledge-health metrics,
            economic indicators, or a generic status probe. Leave the URL empty to register a product before its endpoint exists.
          </p>
          <button type="submit" disabled={submitting || !form.name.trim()} className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {submitting ? "Registering…" : "Register product"}
          </button>
          <p className="mt-2 text-center text-xs text-ink-400">{slug ? `id: ${slug}` : "id generated from the name"}</p>
        </Card>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
