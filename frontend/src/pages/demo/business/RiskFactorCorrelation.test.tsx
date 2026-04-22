import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { RiskFactorCorrelation } from "./RiskFactorCorrelation";
import type { RiskCorrelationRow } from "./portfolioStats";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const DATA: RiskCorrelationRow[] = [
  { factor: "custom_pct", label: "Custom content %", correlation: 0.55, n: 20, meaning: "Strong: higher → more overrun" },
  { factor: "product_familiarity_score", label: "Product familiarity", correlation: -0.32, n: 20, meaning: "Moderate: higher → less overrun" },
  { factor: "Retrofit", label: "Retrofit", correlation: 0.04, n: 20, meaning: "No clear signal" },
];

const EMPTY: RiskCorrelationRow[] = [
  { factor: "custom_pct", label: "Custom content %", correlation: 0, n: 0, meaning: "No clear signal" },
];

describe("RiskFactorCorrelation", () => {
  it("renders the section heading", () => {
    renderWithProviders(<RiskFactorCorrelation data={DATA} />);
    expect(
      screen.getByText(/risk factors vs\. overrun % · pearson r/i),
    ).toBeInTheDocument();
  });

  it("renders empty-state when no factor has enough data", () => {
    renderWithProviders(<RiskFactorCorrelation data={EMPTY} />);
    expect(
      screen.getByText(/not enough projects with both risk-factor inputs/i),
    ).toBeInTheDocument();
  });

  it("renders empty-state when the data array is empty", () => {
    renderWithProviders(<RiskFactorCorrelation data={[]} />);
    expect(
      screen.getByText(/not enough projects with both risk-factor inputs/i),
    ).toBeInTheDocument();
  });
});
