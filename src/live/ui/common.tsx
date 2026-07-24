import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { fetchLive } from "../liveAdapters";
import type { LiveResult, Registration } from "../types";

// One React Query hook per product's live snapshot. Cold starts (Render/Cloud
// Run) can take a few seconds, so we keep data fresh for a minute and retry once.
export function useLiveSnapshot(reg?: Registration) {
  return useQuery<LiveResult<unknown>>({
    queryKey: ["live", reg?.id, reg?.endpointUrl],
    queryFn: () => fetchLive(reg!),
    enabled: !!reg?.endpointUrl,
    staleTime: 60_000,
    retry: 1,
  });
}

// Provenance badge — always tells the truth about where a value came from and
// whether the source is currently reachable. Never implies data when there's none.
export function LiveBadge({ result, loading }: { result?: LiveResult<unknown>; loading?: boolean }) {
  if (loading) {
    return <Pill className="bg-slate-100 text-slate-500"><Dot className="animate-pulse bg-slate-400" />Checking…</Pill>;
  }
  if (!result) return <Pill className="bg-slate-100 text-slate-500"><Dot className="bg-slate-300" />No source</Pill>;
  if (result.ok) {
    return (
      <Pill className="bg-emerald-50 text-emerald-700" title={`${result.endpointUrl}\nfetched ${result.fetchedAt}`}>
        <Dot className="bg-emerald-500" />Live{result.latencyMs != null ? ` · ${result.latencyMs}ms` : ""}
      </Pill>
    );
  }
  if (result.reachable) {
    return <Pill className="bg-amber-50 text-amber-700" title={result.error}><Dot className="bg-amber-500" />Reachable · {result.error}</Pill>;
  }
  return <Pill className="bg-red-50 text-red-700" title={result.error}><Dot className="bg-red-500" />Unreachable · {result.error}</Pill>;
}

function Pill({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}
function Dot({ className }: { className?: string }) {
  return <span className={clsx("h-1.5 w-1.5 rounded-full", className)} />;
}
