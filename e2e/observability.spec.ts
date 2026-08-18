import { test, expect } from "@playwright/test";

// R8: the Live Observability view. It's a LIVE-only route, so (like the export
// test) this drives the live build. Snapshots are CORS-blocked from localhost,
// so products render as "Down" with honest "Not reported" metrics — the view and
// its per-product cards still render from the registry.
test("live observability view renders per-product cards", async ({ page, baseURL }) => {
  const liveBase = (baseURL || "").replace(/seeded\/?$/, "");
  await page.goto(`${liveBase}#/observability`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "Live Observability" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Per-product observability")).toBeVisible();
  // The three default registrations render as cards regardless of reachability.
  await expect(page.getByText("Enterprise RAG Assistant")).toBeVisible();
});
