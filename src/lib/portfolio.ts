import { PRODUCTS } from "@/seed/products";
import type { Product } from "@/types/domain";

export const activeProducts = (products: Product[] = PRODUCTS) =>
  products.filter((p) => p.status !== "archived");

export const productsAtRisk = (products: Product[] = PRODUCTS) =>
  products.filter((p) => p.status === "at-risk" || p.status === "over-budget" || p.status === "blocked");

export const monthlySpend = (products: Product[] = PRODUCTS) =>
  products.reduce((sum, p) => sum + p.monthlySpend, 0);

export const blendedRoi = (products: Product[] = PRODUCTS) => {
  const active = activeProducts(products).filter((p) => p.roi > 0);
  if (!active.length) return 0;
  return Math.round(active.reduce((s, p) => s + p.roi, 0) / active.length);
};

// Traffic-light portfolio health rollup: share of active products that are healthy.
export function portfolioHealth(products: Product[] = PRODUCTS): {
  score: number;
  label: "Healthy" | "Watch" | "At Risk";
  color: string;
} {
  const active = activeProducts(products);
  const healthy = active.filter((p) => p.status === "healthy").length;
  const score = active.length ? Math.round((healthy / active.length) * 100) : 0;
  if (score >= 70) return { score, label: "Healthy", color: "#16a34a" };
  if (score >= 45) return { score, label: "Watch", color: "#d97706" };
  return { score, label: "At Risk", color: "#dc2626" };
}
