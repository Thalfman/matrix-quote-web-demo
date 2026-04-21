import { screen, fireEvent } from "@testing-library/react";
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
  it("renders the section heading with 'avg' metric by default", () => {
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

  it("shows 'Click a bar to filter' hint when onIndustryClick is provided", () => {
    renderWithProviders(
      <HoursByIndustry data={INDUSTRY_DATA} onIndustryClick={vi.fn()} />,
    );
    expect(screen.getByText(/click a bar to filter/i)).toBeInTheDocument();
  });

  it("does not show filter hint when onIndustryClick is not provided", () => {
    renderWithProviders(<HoursByIndustry data={INDUSTRY_DATA} />);
    expect(screen.queryByText(/click a bar to filter/i)).not.toBeInTheDocument();
  });

  it("shows 'Selected shown in teal' hint when there is an active selection", () => {
    renderWithProviders(
      <HoursByIndustry
        data={INDUSTRY_DATA}
        selectedIndustries={new Set(["Automotive"])}
        onIndustryClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/selected shown in teal/i)).toBeInTheDocument();
  });

  it("clicking the Total button changes the heading to total hours", () => {
    renderWithProviders(<HoursByIndustry data={INDUSTRY_DATA} />);
    const totalBtn = screen.getByRole("button", { name: /^total$/i });
    fireEvent.click(totalBtn);
    expect(screen.getByText(/total hours · by industry/i)).toBeInTheDocument();
  });

  it("clicking Avg button when Total is active restores the avg heading", () => {
    renderWithProviders(<HoursByIndustry data={INDUSTRY_DATA} />);
    // Switch to total first
    fireEvent.click(screen.getByRole("button", { name: /^total$/i }));
    expect(screen.getByText(/total hours · by industry/i)).toBeInTheDocument();
    // Switch back to avg
    fireEvent.click(screen.getByRole("button", { name: /^avg$/i }));
    expect(screen.getByText(/average hours per project · by industry/i)).toBeInTheDocument();
  });

  it("Avg button has aria-pressed=true by default", () => {
    renderWithProviders(<HoursByIndustry data={INDUSTRY_DATA} />);
    expect(screen.getByRole("button", { name: /^avg$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("Total button has aria-pressed=false by default", () => {
    renderWithProviders(<HoursByIndustry data={INDUSTRY_DATA} />);
    expect(screen.getByRole("button", { name: /^total$/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
