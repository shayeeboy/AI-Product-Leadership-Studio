import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Unit/component test runner (R4). Kept separate from vite.config.ts so the
// production build config stays focused on bundling. Playwright e2e lives under
// e2e/ and is excluded here — it has its own runner (playwright.config.ts).
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    css: false,
  },
});
