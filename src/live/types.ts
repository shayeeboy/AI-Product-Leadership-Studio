import type { ProductStatus } from "@/types/domain";

// An adapter type tells the Studio how to read a registered product's live
// snapshot endpoint. New products register by declaring one of these + a URL.
export type AdapterType = "readiness" | "rag-health" | "financial" | "health";

export const ADAPTER_LABELS: Record<AdapterType, string> = {
  readiness: "Readiness (AI-Native Diagnostic)",
  "rag-health": "Knowledge Health (RAG)",
  financial: "Financial Intelligence",
  health: "Generic health probe",
};

export type Lifecycle = "discovery" | "build" | "pilot" | "production" | "archived";

export interface Registration {
  id: string;
  name: string;
  businessUnit?: string;
  owner?: string;
  sponsor?: string;
  architecture?: string;
  adapterType: AdapterType;
  endpointUrl?: string;
  status: ProductStatus;
  // R10 — Studio-managed metadata (funding, lifecycle, ROI target).
  lifecycle?: Lifecycle;
  annualBudget?: number;
  monthlySpend?: number;
  roiTarget?: number;
  createdAt?: string;
  isDefault?: boolean; // the three real portfolio apps ship as default registrations
}

// R10 — Phase 3 Studio-managed governance/decision entities. One generic store;
// each kind's shape lives in `data` (typed per module as R11/R12 consume them).
export const ENTITY_TYPES = [
  "risk",
  "policy",
  "review",
  "model_card",
  "cost_input",
  "roi_scenario",
  "maturity_score",
  "prioritization_input",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export interface EntityRow<T = Record<string, unknown>> {
  id: string;
  productId?: string | null;
  data: T;
  createdAt?: string;
  updatedAt?: string;
}

export type EntityMap = Record<EntityType, EntityRow[]>;

export const emptyEntities = (): EntityMap =>
  Object.fromEntries(ENTITY_TYPES.map((t) => [t, [] as EntityRow[]])) as EntityMap;

// Result of a live fetch — carries provenance so the UI can show live vs. down
// and when it was last checked (no seeded values are ever substituted).
export interface LiveResult<T = unknown> {
  ok: boolean;
  reachable: boolean;
  data?: T;
  error?: string;
  fetchedAt: string; // ISO
  latencyMs?: number;
  endpointUrl?: string;
}
