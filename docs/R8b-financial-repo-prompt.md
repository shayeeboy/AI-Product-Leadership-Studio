# R8b — Financial-Intelligence-repo prompt (run inside `Financial-Intelligence-Strategy-Agent`)

> Paste the fenced block below into a Claude Code session opened in the
> **Financial-Intelligence-Strategy-Agent** repo. Self-contained. Scope is minimal and honest:
> it only surfaces metadata the agent already fetched (source recency, coverage, history depth) —
> no invented latency/cost, because a static-JSON data agent has none.
>
> **Note:** the Studio already derives most of these from the existing snapshot (indicator count,
> distinct sources, newest ref-period, reporting lag, decision traces). This change makes the
> contract explicit and adds the two things the Studio can't currently see: the real **data-pull
> time** (`retrieved_at`) and **history depth** (`n_periods`).

```
Task: enrich the Studio snapshot with an honest `observability` block + pass through the agent's
real fetch metadata.

Context
- scripts/studio-snapshot.js builds web/studio-snapshot.json (published on GitHub Pages, consumed
  read-only by the AI Product & Leadership Studio). It reads the committed provenance snapshot at
  data/raw/snapshot_gta_newcomer_credit_opportunity.json and the generated brief.
- In that raw snapshot, snap.run_at is the run time and each snap.data[key] carries: source,
  source_url, latest{ ref_period, value, release_time }, trend, n_periods, retrieved_at.
- The generator currently maps indicators (key/label/value/unit/source/sourceUrl/refPeriod/trend)
  and drops n_periods + retrieved_at. Keep all existing output fields and shapes unchanged.

Add, in scripts/studio-snapshot.js:

1. Pass through two fields on EACH mapped indicator (from the raw series `v`):
     retrievedAt: v.retrieved_at ?? null,
     nPeriods: v.n_periods ?? null,

2. Compute one new top-level `observability` object from the raw series, and add it to `out`.
   Derive everything — never fabricate. Do NOT add latency/cost/error fields (this agent records
   no request telemetry; a static data snapshot has no runtime).

     const series = Object.values(snap.data || {});
     const sources = [...new Set(series.map((v) => v.source).filter(Boolean))];
     const refPeriods = series.map((v) => (v.latest || {}).ref_period).filter(Boolean).sort();
     // STALEST series (oldest ref period) — the conservative "data is only current to"
     // bound. Series update on different cadences (daily BoC rates vs quarterly StatCan
     // ratios); the oldest limits how current the strategic picture really is.
     const sourceDataAsOf = refPeriods.length ? refPeriods[0] : null;
     const retrievedAts = series.map((v) => v.retrieved_at).filter(Boolean).sort();
     const dataRetrievedAt = retrievedAts.length ? retrievedAts[retrievedAts.length - 1] : null;
     const historyPeriods = Math.max(0, ...series.map((v) => v.n_periods || (v.trend || []).length || 0)) || null;
     const runMs = Date.parse(snap.run_at);
     const asOfMs = sourceDataAsOf ? Date.parse(sourceDataAsOf) : null;
     const sourceDataLagDays = asOfMs != null && !Number.isNaN(runMs)
       ? Math.max(0, Math.floor((runMs - asOfMs) / 86_400_000)) : null;

     const observability = {
       sourceCount: sources.length || null,
       indicatorCount: indicators.length || null,
       dataRetrievedAt,      // when the agent last pulled live data
       sourceDataAsOf,       // freshest underlying data point (ref period)
       sourceDataLagDays,    // inherent reporting lag: run − data date
       historyPeriods,       // deepest series history pulled
     };

   Add `observability,` to the `out` object (anywhere alongside indicators/decisionTraces).

3. Update the closing console.log to also mention sources, e.g.:
     `... — ${indicators.length} indicators, ${sources.length} sources, ${out.strategicRecommendations.length} recommendations.`

Verify
- `npm run studio:snapshot` runs clean and rewrites web/studio-snapshot.json.
- Confirm the JSON now has a top-level `observability` object with sane values (sourceCount 3,
  indicatorCount 8, a sourceDataAsOf date, a positive sourceDataLagDays, historyPeriods > 0) and
  that each indicator has retrievedAt + nPeriods. Existing fields must be unchanged.
- `npm test` (the check suite) still passes.
- No secrets touched. Commit + push; the existing Pages workflow republishes the JSON. GitHub
  Pages serves it with Access-Control-Allow-Origin: * (the Studio fetches cross-origin) — don't
  change that.

Output a one-paragraph summary of what changed and the observability JSON you produced.
```

## Studio side — already shipped
The Studio's `financial` adapter + Live Observability card already render these tiles
(**Data sources · Indicators · Data as of + reporting-lag hint · History depth · Decision traces**),
deriving from the existing snapshot so they light up immediately; `retrievedAt`/`nPeriods` and the
explicit `observability` block from this change simply make **History depth** and the pull-time
authoritative. Forward-compatible — nothing breaks before you run it.
