// ---------------------------------------------------------------------------
// Product adapters. Each adapter is a thin client that returns data in the
// shared domain schema. Today they read from bundled seed data; swapping in a
// live integration (a Node/Neon API, or each project's own endpoint) later only
// means changing what these functions call — every module downstream is
// unaffected because it depends on the contract, not the source.
// ---------------------------------------------------------------------------
import { PRODUCTS, productById } from "@/seed/products";
import {
  READINESS_SNAPSHOTS,
  RAG_HEALTH_SNAPSHOTS,
  FINANCIAL_SNAPSHOTS,
} from "@/seed/snapshots";
import type {
  Product,
  ReadinessSnapshot,
  RagHealthSnapshot,
  FinancialIntelligenceSnapshot,
} from "@/types/domain";

// Simulated network latency so React Query loading states are exercised.
const settle = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const aiNativeDiagnosticAdapter = {
  listProducts: (): Promise<Product[]> =>
    settle(PRODUCTS.filter((p) => p.sourceEngine === "ai-native-diagnostic")),
  getSnapshot: (productId: string): Promise<ReadinessSnapshot | undefined> =>
    settle(READINESS_SNAPSHOTS.find((s) => s.productId === productId)),
  getHistory: (_productId: string, _range = "6m") => settle([]),
};

export const enterpriseRagAdapter = {
  listProducts: (): Promise<Product[]> =>
    settle(PRODUCTS.filter((p) => p.sourceEngine === "enterprise-rag")),
  getSnapshot: (productId: string): Promise<RagHealthSnapshot | undefined> =>
    settle(RAG_HEALTH_SNAPSHOTS.find((s) => s.productId === productId)),
  getHistory: (_productId: string, _range = "6m") => settle([]),
};

export const financialIntelligenceAdapter = {
  listProducts: (): Promise<Product[]> =>
    settle(PRODUCTS.filter((p) => p.sourceEngine === "financial-intelligence")),
  getSnapshot: (productId: string): Promise<FinancialIntelligenceSnapshot | undefined> =>
    settle(FINANCIAL_SNAPSHOTS.find((s) => s.productId === productId)),
  getHistory: (_productId: string, _range = "6m") => settle([]),
};

// Portfolio-wide reads used by the executive layer.
export const portfolioAdapter = {
  listProducts: (): Promise<Product[]> => settle(PRODUCTS),
  getProduct: (id: string): Promise<Product | undefined> => settle(productById(id)),
};

// All RAG-health snapshots (evaluation dashboard reads across products).
export const allRagHealth = (): Promise<RagHealthSnapshot[]> => settle(RAG_HEALTH_SNAPSHOTS);
