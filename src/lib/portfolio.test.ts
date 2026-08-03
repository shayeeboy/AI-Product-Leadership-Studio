import { describe, it, expect } from "vitest";
import type { Product, ProductStatus } from "@/types/domain";
import {
  activeProducts,
  productsAtRisk,
  monthlySpend,
  blendedRoi,
  portfolioHealth,
} from "./portfolio";

// Minimal Product factory — only the fields the rollups read matter; the rest
// get harmless defaults so tests stay readable.
let seq = 0;
const make = (over: Partial<Product> & { status: ProductStatus }): Product => ({
  id: `p${seq++}`,
  name: "Test Product",
  lifecycle: "scaling",
  architecture: "SaaS",
  businessUnit: "BU",
  owner: "O",
  engLead: "E",
  sponsor: "S",
  monthlySpend: 0,
  annualBudget: 0,
  roi: 0,
  adoption: 0,
  summary: "",
  ...over,
} as Product);

describe("activeProducts", () => {
  it("excludes archived products", () => {
    const products = [make({ status: "healthy" }), make({ status: "archived" }), make({ status: "blocked" })];
    expect(activeProducts(products)).toHaveLength(2);
    expect(activeProducts(products).every((p) => p.status !== "archived")).toBe(true);
  });
});

describe("productsAtRisk", () => {
  it("flags at-risk, over-budget and blocked, but not healthy/pending", () => {
    const products = [
      make({ status: "healthy" }),
      make({ status: "at-risk" }),
      make({ status: "over-budget" }),
      make({ status: "blocked" }),
      make({ status: "pending" }),
    ];
    expect(productsAtRisk(products)).toHaveLength(3);
  });
});

describe("monthlySpend", () => {
  it("sums monthlySpend across all products", () => {
    const products = [make({ status: "healthy", monthlySpend: 1000 }), make({ status: "at-risk", monthlySpend: 2500 })];
    expect(monthlySpend(products)).toBe(3500);
  });

  it("is 0 for an empty portfolio", () => {
    expect(monthlySpend([])).toBe(0);
  });
});

describe("blendedRoi", () => {
  it("averages ROI across active products with positive ROI, rounded", () => {
    const products = [
      make({ status: "healthy", roi: 100 }),
      make({ status: "at-risk", roi: 200 }),
      make({ status: "healthy", roi: 0 }), // roi<=0 excluded
      make({ status: "archived", roi: 999 }), // archived excluded
    ];
    expect(blendedRoi(products)).toBe(150);
  });

  it("returns 0 when no active product has positive ROI", () => {
    expect(blendedRoi([make({ status: "healthy", roi: 0 })])).toBe(0);
  });
});

describe("portfolioHealth", () => {
  it("labels Healthy when >=70% of active products are healthy", () => {
    const products = [
      make({ status: "healthy" }),
      make({ status: "healthy" }),
      make({ status: "healthy" }),
      make({ status: "at-risk" }),
    ]; // 3/4 = 75%
    const h = portfolioHealth(products);
    expect(h.score).toBe(75);
    expect(h.label).toBe("Healthy");
  });

  it("labels Watch in the 45-69% band", () => {
    const products = [make({ status: "healthy" }), make({ status: "at-risk" })]; // 50%
    expect(portfolioHealth(products).label).toBe("Watch");
  });

  it("labels At Risk below 45%", () => {
    const products = [make({ status: "healthy" }), make({ status: "blocked" }), make({ status: "at-risk" })]; // 33%
    expect(portfolioHealth(products).label).toBe("At Risk");
  });

  it("returns a score of 0 for an empty portfolio", () => {
    expect(portfolioHealth([]).score).toBe(0);
  });
});
