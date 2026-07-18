import { clsx } from "clsx";
import type { ReactNode } from "react";
import type { ProductStatus, Severity } from "@/types/domain";
import { PRODUCT_STATUS_META, SEVERITY_META } from "@/lib/status";

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return (
    <As className={clsx("rounded-xl border border-ink-200 bg-white shadow-sm", className)}>
      {children}
    </As>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{children}</h2>
      {hint && <span className="text-xs text-ink-400">{hint}</span>}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  delta,
  intent = "neutral",
  footnote,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  intent?: "up" | "down" | "neutral";
  footnote?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-ink-900">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={clsx(
              "font-medium",
              intent === "up" && "text-emerald-600",
              intent === "down" && "text-red-600",
              intent === "neutral" && "text-ink-500",
            )}
          >
            {delta}
          </span>
        )}
        {footnote && <span className="text-ink-400">{footnote}</span>}
      </div>
    </Card>
  );
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  const m = PRODUCT_STATUS_META[status];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", m.bg, m.color)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return <span className={clsx("rounded px-1.5 py-0.5 text-xs font-medium", m.bg, m.color)}>{m.label}</span>;
}

export function RecommendationBadge({ label }: { label: string }) {
  const map: Record<string, string> = {
    "Fund now": "bg-emerald-100 text-emerald-800",
    "Needs discovery": "bg-amber-100 text-amber-800",
    Defer: "bg-slate-100 text-slate-700",
    Reject: "bg-red-100 text-red-800",
  };
  return <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", map[label] ?? "bg-slate-100 text-slate-700")}>{label}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50 p-10 text-center">
      <p className="font-medium text-ink-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-400">{hint}</p>}
    </div>
  );
}
