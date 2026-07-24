import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { LiveApp } from "./live/ui/LiveApp";
import "./index.css";

// HashRouter keeps deep links and refreshes working on GitHub Pages' static
// hosting (no server-side rewrites needed).
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

// Build-time data mode: the live copy (registry-driven, live source data) is the
// default; the retained phase-1 seeded demo is built with VITE_DATA_MODE=seeded
// and published to the /seeded/ subpath.
const seeded = import.meta.env.VITE_DATA_MODE === "seeded";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        {seeded ? <App /> : <LiveApp />}
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
