import { test, expect } from "@playwright/test";

// R7: the board-report export. The Export button lives on the LIVE executive
// views, so this navigates to the live build (the app root, not the /seeded/
// base the smoke suite uses) and asserts a real PDF download is triggered.
// Live snapshots are CORS-blocked from localhost, so the dashboard renders its
// honest empty states — the export still runs and downloads regardless.
test("board report exports a PDF from the live executive dashboard", async ({ page, baseURL }) => {
  const liveBase = (baseURL || "").replace(/seeded\/?$/, ""); // drop the seeded subpath
  await page.goto(`${liveBase}#/executive`, { waitUntil: "domcontentloaded" });

  // The live app gates content behind store init (loads persisted state first),
  // which is slower in headless, so allow generous time for the button.
  const btn = page.getByRole("button", { name: /export pdf/i });
  await expect(btn).toBeVisible({ timeout: 30_000 });

  const [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  expect(download.suggestedFilename()).toMatch(/^AI-Portfolio-Board-Report-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test("board report exports a PPTX deck from the live executive dashboard", async ({ page, baseURL }) => {
  const liveBase = (baseURL || "").replace(/seeded\/?$/, "");
  await page.goto(`${liveBase}#/executive`, { waitUntil: "domcontentloaded" });

  const btn = page.getByRole("button", { name: /export deck/i });
  await expect(btn).toBeVisible({ timeout: 30_000 });

  const [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  expect(download.suggestedFilename()).toMatch(/^AI-Portfolio-Board-Deck-\d{4}-\d{2}-\d{2}\.pptx$/);
});
