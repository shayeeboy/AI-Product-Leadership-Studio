import type { ProductStatus, StageStatus, Severity } from "@/types/domain";

// Single source of truth for the status vocabulary + colors used app-wide, so
// the whole portfolio reads as one system (UX guideline, Section 8).
export const PRODUCT_STATUS_META: Record<
  ProductStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  healthy: { label: "Healthy", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  "at-risk": { label: "At Risk", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  "over-budget": { label: "Over Budget", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
  pending: { label: "Pending Approval", color: "text-violet-700", bg: "bg-violet-50", dot: "bg-violet-500" },
  blocked: { label: "Blocked", color: "text-red-800", bg: "bg-red-100", dot: "bg-red-700" },
  archived: { label: "Archived", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
};

export const STAGE_STATUS_META: Record<
  StageStatus,
  { label: string; color: string; ring: string }
> = {
  "not-started": { label: "Not started", color: "text-slate-400", ring: "ring-slate-300 bg-white" },
  "in-progress": { label: "In progress", color: "text-amber-600", ring: "ring-amber-400 bg-amber-100" },
  approved: { label: "Approved", color: "text-emerald-600", ring: "ring-emerald-500 bg-emerald-500" },
  rejected: { label: "Rejected", color: "text-red-600", ring: "ring-red-500 bg-red-500" },
  blocked: { label: "Blocked", color: "text-red-700", ring: "ring-red-600 bg-red-200" },
};

export const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-emerald-700", bg: "bg-emerald-100" },
  medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100" },
  high: { label: "High", color: "text-red-700", bg: "bg-red-100" },
};

export const severityScore = (s: Severity) => (s === "low" ? 1 : s === "medium" ? 2 : 3);
