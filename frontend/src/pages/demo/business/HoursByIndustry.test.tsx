import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { HoursByIndustry } from "./HoursByIndustry";
import type { IndustryRow } from "./portfolioStats";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const INDUSTRY_DATA: IndustryRow[] = [
  { industry: "Automotive", projectCount: 5, avgHours: 300, totalHours: 1500 },
  { industry: "Food & Bev", projectCount: 3, avgHours: 200, totalHours: 600 },
];

describe("HoursByIndustry", () => {
  it("renders the section heading", () => {
    renderWithProviders(<HoursByIndustry data={INDUSTRY_DATA} />);
    expect(screen.getByText(/average hours per project · by industry/i)).toBeInTheDocument();
  });

  it("renders empty-state text when data is empty", () => {
    renderWithProviders(<HoursByIndustry data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it("does not render empty-state when data is populated", () => {
    renderWithProviders(<HoursByIndustry data={INDUSTRY_DATA} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });
});
