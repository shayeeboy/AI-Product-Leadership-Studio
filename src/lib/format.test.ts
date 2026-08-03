import { describe, it, expect } from "vitest";
import { usd, pct, num, shortDate } from "./format";

describe("usd", () => {
  it("formats whole dollars with no decimals", () => {
    expect(usd(1500)).toBe("$1,500");
  });

  it("compact mode abbreviates large amounts", () => {
    // >= 10000 switches to compact notation
    expect(usd(1_500_000, true)).toBe("$1.5M");
  });

  it("handles negative amounts", () => {
    expect(usd(-2000)).toBe("-$2,000");
  });
});

describe("pct", () => {
  it("appends a percent sign with no decimals by default", () => {
    expect(pct(42)).toBe("42%");
  });

  it("respects a requested digit count", () => {
    expect(pct(42.345, 1)).toBe("42.3%");
  });
});

describe("num", () => {
  it("groups thousands", () => {
    expect(num(1234567)).toBe("1,234,567");
  });
});

describe("shortDate", () => {
  it("renders an ISO date as 'Mon D, YYYY'", () => {
    // Use a midday UTC time so the local-date rendering can't slip a day.
    expect(shortDate("2026-03-14T12:00:00Z")).toBe("Mar 14, 2026");
  });
});
