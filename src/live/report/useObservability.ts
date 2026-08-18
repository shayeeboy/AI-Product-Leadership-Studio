import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useLiveStore } from "../store";
import { fetchLive } from "../liveAdapters";
import { deriveObservability, summarizeObservability, type ProductObservability, type ObservabilitySummary } from "./observability";

// Feeds the observability derivation from the same live snapshot queries the rest
// of the app uses (shared React Query cache — no extra fetches). Returns per-product
// observability + a portfolio summary + whether any query is still in flight.
export function useObservability(): { items: ProductObservability[]; summary: ObservabilitySummary; checking: boolean } {
  const registrations = useLiveStore((s) => s.registrations);

  const snapshots = useQueries({
    queries: registrations.map((reg) => ({
      queryKey: ["live", reg.id, reg.endpointUrl],
      queryFn: () => fetchLive(reg),
      enabled: !!reg.endpointUrl,
      staleTime: 60_000,
      retry: 1,
    })),
  });

  return useMemo(() => {
    const items = registrations.map((reg, i) => deriveObservability(reg, snapshots[i]));
    return { items, summary: summarizeObservability(items), checking: snapshots.some((s) => s.isLoading) };
  }, [registrations, snapshots]);
}
