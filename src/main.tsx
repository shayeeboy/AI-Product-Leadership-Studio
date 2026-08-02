import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";

// HashRouter keeps deep links and refreshes working on GitHub Pages' static
// hosting (no server-side rewrites needed).
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

// Build-time data mode: the live copy (registry-driven, live source data) is the
// default; the retained phase-1 seeded demo is built with VITE_DATA_MODE=seeded
// and published to the /seeded/ subpath. Both roots are lazily imported (R3) so
// each build only ships the tree it renders — the other never enters the graph.
const seeded = import.meta.env.VITE_DATA_MODE === "seeded";
const Root = seeded
  ? lazy(() => import("./App").then((m) => ({ default: m.App })))
  : lazy(() => import("./live/ui/LiveApp").then((m) => ({ default: m.LiveApp })));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Suspense fallback={null}>
          <Root />
        </Suspense>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
