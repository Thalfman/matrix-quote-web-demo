import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { MaterialVsLabor } from "./MaterialVsLabor";
import type { MaterialLaborPoint } from "./portfolioStats";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const DATA: MaterialLaborPoint[] = [
  { project_id: "p1", project_name: "Alpha", industry: "Auto", stations: 4, materialCost: 100000, hours: 500 },
  { project_id: "p2", project_name: "Beta",  industry: "Auto", stations: 6, materialCost: 200000, hours: 700 },
  { project_id: "p3", project_name: "Gamma", industry: "Food",  stations: 3, materialCost: 50000,  hours: 250 },
];

describe("MaterialVsLabor", () => {
  it("renders the section heading", () => {
    renderWithProviders(<MaterialVsLabor data={DATA} />);
    expect(
      screen.getByText(/material cost vs labor hours · sized by stations, colored by industry/i),
    ).toBeInTheDocument();
  });

  it("renders the project count", () => {
    renderWithProviders(<MaterialVsLabor data={DATA} />);
    expect(screen.getByText("3 projects")).toBeInTheDocument();
  });

  it("renders the legend with each industry once", () => {
    renderWithProviders(<MaterialVsLabor data={DATA} />);
    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
  });

  it("renders empty-state when no data", () => {
    renderWithProviders(<MaterialVsLabor data={[]} />);
    expect(
      screen.getByText(/no projects with both material cost and labor hours/i),
    ).toBeInTheDocument();
  });
});
