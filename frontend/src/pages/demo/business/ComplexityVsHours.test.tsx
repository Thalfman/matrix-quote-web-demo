import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { ComplexityVsHours } from "./ComplexityVsHours";
import type { ScatterPoint } from "./portfolioStats";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const SCATTER_DATA: ScatterPoint[] = [
  { complexity: 2, stations: 4, hours: 200, industry: "Automotive", name: "Project Alpha" },
  { complexity: 2, stations: 5, hours: 220, industry: "Automotive", name: "Project Gamma" },
  { complexity: 4, stations: 8, hours: 600, industry: "Food & Bev", name: "Project Beta" },
];

describe("ComplexityVsHours", () => {
  it("renders the section heading", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    expect(
      screen.getByText(/average hours per complexity level/i),
    ).toBeInTheDocument();
  });

  it("renders empty-state text when no project falls into any bucket", () => {
    renderWithProviders(<ComplexityVsHours data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it("renders the project count in the sub-heading", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    expect(screen.getByText("3 projects")).toBeInTheDocument();
  });

  it("does not render empty-state when data is populated", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });
});
