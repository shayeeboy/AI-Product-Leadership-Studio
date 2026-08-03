import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiTile, StatusBadge, EmptyState } from "./ui";

// A representative RTL render test — proves the jsdom + Testing Library path is
// wired (setup.ts / jest-dom matchers) and that the shared presentational
// building blocks render their content. The heavy data modules are exercised
// end-to-end by the Playwright smoke suite instead.
describe("KpiTile", () => {
  it("renders its label and value", () => {
    render(<KpiTile label="Monthly AI spend" value="$12,500" />);
    expect(screen.getByText("Monthly AI spend")).toBeInTheDocument();
    expect(screen.getByText("$12,500")).toBeInTheDocument();
  });

  it("shows the delta when provided", () => {
    render(<KpiTile label="ROI" value="150%" delta="+12%" intent="up" />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("renders the human label for a status", () => {
    render(<StatusBadge status="at-risk" />);
    expect(screen.getByText("At Risk")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders the title and optional hint", () => {
    render(<EmptyState title="No products registered" hint="Register one to begin" />);
    expect(screen.getByText("No products registered")).toBeInTheDocument();
    expect(screen.getByText("Register one to begin")).toBeInTheDocument();
  });
});
