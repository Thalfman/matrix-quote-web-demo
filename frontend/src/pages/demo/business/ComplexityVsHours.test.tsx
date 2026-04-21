import { screen, fireEvent } from "@testing-library/react";
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
  { complexity: 4, stations: 8, hours: 600, industry: "Food & Bev", name: "Project Beta" },
];

describe("ComplexityVsHours", () => {
  it("renders the section heading", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    expect(screen.getByText(/one dot per project · color = industry/i)).toBeInTheDocument();
  });

  it("renders empty-state text when data is empty", () => {
    renderWithProviders(<ComplexityVsHours data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it("does not render empty-state when data is populated", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });

  it("shows 'Click a dot for detail' hint when onPointClick is provided", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} onPointClick={vi.fn()} />);
    expect(screen.getByText(/click a dot for detail/i)).toBeInTheDocument();
  });

  it("does not show click hint when onPointClick is not provided", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    expect(screen.queryByText(/click a dot for detail/i)).not.toBeInTheDocument();
  });

  it("renders the project count in the sub-heading", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    expect(screen.getByText("2 projects")).toBeInTheDocument();
  });

  it("renders industry labels in the compact legend", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    expect(screen.getByText("Automotive")).toBeInTheDocument();
    expect(screen.getByText("Food & Bev")).toBeInTheDocument();
  });

  it("clicking Complexity axis button keeps it selected (aria-pressed=true)", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    const complexityBtn = screen.getByRole("button", { name: /^complexity$/i });
    expect(complexityBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking Stations axis button switches aria-pressed to true", () => {
    renderWithProviders(<ComplexityVsHours data={SCATTER_DATA} />);
    const stationsBtn = screen.getByRole("button", { name: /^stations$/i });
    fireEvent.click(stationsBtn);
    expect(stationsBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^complexity$/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
