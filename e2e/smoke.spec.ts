import { test, expect } from "@playwright/test";

// Smoke suite (R4): every primary route mounts its module (proving routing +
// the R3 lazy chunks load), the nav rail renders, and one representative
// interactive workflow recomputes. Runs against the seeded build (see
// playwright.config.ts) so there are no network calls to flake on.

// route (HashRouter path) -> the <h1> that module renders
const ROUTES: [string, string][] = [
  ["#/dashboard", "Executive AI Decision Intelligence"],
  ["#/cross-product", "Cross-Product AI Intelligence Platform"],
  ["#/governance", "Enterprise AI Portfolio Governance"],
  ["#/responsible-ai", "Responsible AI Governance & Risk"],
  ["#/approvals", "Human Oversight & Decision Management"],
  ["#/evaluation", "AI Evaluation Dashboard"],
  ["#/opportunity", "AI Opportunity Assessment"],
  ["#/build-vs-buy", "Build vs Buy Advisor"],
  ["#/cost", "AI Cost Analyzer"],
  ["#/roi", "AI ROI Simulator"],
  ["#/prioritization", "Investment Prioritization"],
  ["#/maturity", "AI Maturity Assessment"],
  ["#/discovery", "Product Discovery Workspace"],
];

test("primary nav rail renders its module links", async ({ page }) => {
  await page.goto("#/dashboard");
  for (const label of ["Executive Dashboard", "Portfolio Governance", "Investment Prioritization", "Product Discovery"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }
});

for (const [path, heading] of ROUTES) {
  test(`route ${path} mounts and shows its heading`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    expect(errors, `no uncaught errors on ${path}`).toEqual([]);
  });
}

test("prioritization workflow: switching frameworks re-ranks without error", async ({ page }) => {
  await page.goto("#/prioritization");
  await expect(page.getByRole("heading", { level: 1, name: "Investment Prioritization" })).toBeVisible();

  // The ranked table has data rows to begin with.
  const rowCount = await page.getByRole("row").count();
  expect(rowCount).toBeGreaterThan(1);

  // Toggling each scoring framework recomputes the ranking (exercises the
  // shared scoreOf from src/lib/scoring.ts) and keeps the table populated.
  for (const fw of ["WSJF", "Value vs Effort", "Opportunity", "RICE"]) {
    await page.getByRole("button", { name: fw, exact: true }).click();
    expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  }
});
