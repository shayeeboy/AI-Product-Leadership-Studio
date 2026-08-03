import { defineConfig, devices } from "@playwright/test";

// E2E smoke suite (R4). Runs against the SEEDED build — it ships real demo data
// and makes no external calls, so the smoke tests are deterministic (the live
// build fetches remote snapshots, which is unsuitable for a hermetic CI gate).
//
// webServer builds both copies then serves them with `vite preview`; the seeded
// copy is nested at /seeded/ under the Pages base path. Locally, an already
// running preview on 4173 is reused.
const BASE = "/AI-Product-Leadership-Studio/seeded/";
const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build:all && npm run preview -- --port 4173 --strictPort",
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
