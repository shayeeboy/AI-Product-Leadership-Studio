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
  createdAt?: string;
  isDefault?: boolean; // the three real portfolio apps ship as default registrations
}

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
