import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Base path must match the GitHub Pages project path: https://<user>.github.io/AI-Product-Leadership-Studio/
// A HashRouter is used in the app so deep links/refreshes never 404 on Pages' static hosting.
export default defineConfig({
  base: "/AI-Product-Leadership-Studio/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep the Recharts + d3 charting stack in one vendor chunk so it is
        // fetched once and cached across every charting route, rather than
        // duplicated into each route's lazy chunk (R3 code-splitting).
        manualChunks: {
          recharts: ["recharts"],
        },
      },
    },
  },
});
