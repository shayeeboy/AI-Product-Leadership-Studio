export const usd = (n: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact && Math.abs(n) >= 1000 ? 1 : 0,
    notation: compact && Math.abs(n) >= 10000 ? "compact" : "standard",
  }).format(n);

export const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;

export const num = (n: number) => new Intl.NumberFormat("en-US").format(n);

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    // A date-only string (e.g. a "2025-01-01" ref period) parses as UTC midnight;
    // rendering it in a behind-UTC local zone would slip it to the prior day. Pin
    // those to UTC so the calendar date is preserved. Full timestamps stay local.
    ...(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? { timeZone: "UTC" } : {}),
  });
