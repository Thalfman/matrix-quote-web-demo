import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { DisciplineMixByIndustry } from "./DisciplineMixByIndustry";
import type { DisciplineByIndustryRow } from "./portfolioStats";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const DATA: DisciplineByIndustryRow[] = [
  {
    industry: "Automotive",
    projectCount: 3,
    total: 1000,
    buckets: { ME: 500, EE: 200, Robot: 300 },
  },
  {
    industry: "Food & Bev",
    projectCount: 2,
    total: 500,
    buckets: { ME: 250, PM: 100, Controls: 150 },
  },
];

describe("DisciplineMixByIndustry", () => {
  it("renders the default share heading", () => {
    renderWithProviders(<DisciplineMixByIndustry data={DATA} />);
    expect(
      screen.getByText(/discipline mix · share of hours per industry/i),
    ).toBeInTheDocument();
  });

  it("switches to total-hours heading on toggle", () => {
    renderWithProviders(<DisciplineMixByIndustry data={DATA} />);
    fireEvent.click(screen.getByRole("button", { name: /total/i }));
    expect(
      screen.getByText(/discipline mix · total hours per industry/i),
    ).toBeInTheDocument();
  });

  it("renders empty state for empty data", () => {
    renderWithProviders(<DisciplineMixByIndustry data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });
});
