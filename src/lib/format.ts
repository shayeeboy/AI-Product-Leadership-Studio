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
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
