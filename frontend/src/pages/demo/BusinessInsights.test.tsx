import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { ProjectRecord } from "@/demo/realProjects";

// BusinessInsights is now a shim that renders ComparisonInsights → BusinessInsightsView.
import { BusinessInsights } from "./BusinessInsights";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

// Minimal records - two projects each with one op (me10_actual_hours)
const FAKE_RECORDS: ProjectRecord[] = [
  {
    project_id: "r1",
    project_name: "Real Alpha",
    industry_segment: "Automotive",
    system_category: "Assembly",
    stations_count: 4,
    complexity_score_1_5: 2,
    log_quoted_materials_cost: Math.log(1000),
    me10_actual_hours: 150,
  },
  {
    project_id: "r2",
    project_name: "Real Beta",
    industry_segment: "Food & Bev",
    system_category: "Welding",
    stations_count: 6,
    complexity_score_1_5: 3,
    log_quoted_materials_cost: Math.log(2000),
    me10_actual_hours: 250,
  },
];

vi.mock("@/demo/realProjects", async () => {
  const actual = await vi.importActual<typeof import("@/demo/realProjects")>("@/demo/realProjects");
  return {
    ...actual,
    useRealProjects: () => ({
      data: FAKE_RECORDS,
      isLoading: false,
      error: null,
    }),
  };
});

describe("BusinessInsights page (shim → ComparisonInsights → BusinessInsightsView)", () => {
  it("renders the page title", () => {
    renderWithProviders(<BusinessInsights />);
    expect(screen.getByText(/business insights/i)).toBeInTheDocument();
  });

  it("renders the dataset eyebrow label", () => {
    renderWithProviders(<BusinessInsights />);
    // DatasetLabel is "Real Data · Historical projects" → eyebrow says
    // "Insights · Real Data · Historical projects"
    expect(
      screen.getByText(/real data · historical projects/i),
    ).toBeInTheDocument();
  });

  it("renders the project count chip", () => {
    renderWithProviders(<BusinessInsights />);
    // "2 projects" appears in both the chip and the table's row-count badge
    expect(screen.getAllByText(/2 projects/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Portfolio KPIs section eyebrow", () => {
    renderWithProviders(<BusinessInsights />);
    // Eyebrow "01 · Portfolio KPIs" + the sibling sr-only <h2>Portfolio KPIs</h2>
    // both surface the label, so multiple nodes is expected.
    expect(screen.getAllByText(/portfolio kpis/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Hours by Sales Bucket section eyebrow", () => {
    renderWithProviders(<BusinessInsights />);
    expect(screen.getAllByText(/hours by sales bucket/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Hours by Industry section eyebrow", () => {
    renderWithProviders(<BusinessInsights />);
    expect(screen.getAllByText(/hours by industry/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders System Category Mix section eyebrow", () => {
    renderWithProviders(<BusinessInsights />);
    expect(screen.getAllByText(/system category mix/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Complexity vs Hours section eyebrow", () => {
    renderWithProviders(<BusinessInsights />);
    expect(screen.getAllByText(/complexity vs/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders a Projects tab in the tab bar", () => {
    renderWithProviders(<BusinessInsights />);
    expect(screen.getByRole("tab", { name: /projects/i })).toBeInTheDocument();
  });

  it("does not show loading state when data is present", () => {
    renderWithProviders(<BusinessInsights />);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
