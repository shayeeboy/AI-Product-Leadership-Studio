import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useLiveStore } from "../store";
import { fetchLive } from "../liveAdapters";
import { computeRollups, computeTopOpps, computeProductRows, type Rollup, type TopOpp, type ProductRow } from "./rollups";

export interface ReportData {
  generatedAt: Date;
  preparedBy: string;
  roll: Rollup;
  topOpps: TopOpp[];
  products: ProductRow[];
}

// Assembles the board-report data from the same live store + snapshot queries the
// Executive Dashboard uses. Shares the React Query cache (same queryKeys) so it
// triggers no extra fetches, and the numbers match the screen exactly.
export function useReportData(): ReportData {
  const registrations = useLiveStore((s) => s.registrations);
  const assessments = useLiveStore((s) => s.assessments);
  const risks = useLiveStore((s) => s.entities.risk);
  const reviews = useLiveStore((s) => s.entities.review);
  const workflow = useLiveStore((s) => s.workflow);
  const identity = useLiveStore((s) => s.identity);

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
    const inputs = { registrations, assessments, risks, reviews, workflow, snapshots };
    return {
      generatedAt: new Date(),
      preparedBy: identity.trim() || "You",
      roll: computeRollups(inputs),
      topOpps: computeTopOpps(assessments),
      products: computeProductRows(registrations, risks, snapshots),
    };
  }, [registrations, assessments, risks, reviews, workflow, snapshots, identity]);
}
