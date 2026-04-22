import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { EstimationAccuracy } from "./EstimationAccuracy";
import type { AccuracyStats } from "./portfolioStats";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const SAMPLE: AccuracyStats = {
  points: [
    { project_id: "p1", project_name: "Alpha", industry: "Auto", complexity: 3, quoted: 100, actual: 120, overrunPct: 0.2 },
    { project_id: "p2", project_name: "Beta",  industry: "Auto", complexity: 2, quoted: 200, actual: 180, overrunPct: -0.1 },
  ],
  byBucket: [
    { bucket: "ME", quoted: 300, actual: 300, overrunPct: 0, projectCount: 2 },
    { bucket: "EE", quoted: 0, actual: 0, overrunPct: 0, projectCount: 0 },
  ].filter((b) => b.projectCount > 0),
  totalQuoted: 300,
  totalActual: 300,
  portfolioOverrunPct: 0,
  medianOverrunPct: 0.05,
  projectsWithQuote: 2,
};

const EMPTY: AccuracyStats = {
  points: [],
  byBucket: [],
  totalQuoted: 0,
  totalActual: 0,
  portfolioOverrunPct: 0,
  medianOverrunPct: 0,
  projectsWithQuote: 0,
};

describe("EstimationAccuracy", () => {
  it("renders empty-state when no projects carry both a quote and actuals", () => {
    renderWithProviders(<EstimationAccuracy data={EMPTY} />);
    expect(
      screen.getByText(/no projects with both a sales quote and billed actuals/i),
    ).toBeInTheDocument();
  });

  it("defaults to scatter view and renders the scatter sub-heading", () => {
    renderWithProviders(<EstimationAccuracy data={SAMPLE} />);
    expect(
      screen.getByText(/quoted vs actual hours · diagonal = perfect estimate/i),
    ).toBeInTheDocument();
  });

  it("renders the summary strip with portfolio and median overrun", () => {
    renderWithProviders(<EstimationAccuracy data={SAMPLE} />);
    expect(screen.getByText(/portfolio overrun/i)).toBeInTheDocument();
    expect(screen.getByText(/median overrun/i)).toBeInTheDocument();
    // Axis labels also say "Quoted hours" / "Actual hours"; scope to summary strip chip labels only.
    expect(
      screen.getByText((_c, el) =>
        el?.tagName.toLowerCase() === "span" &&
        (el.className || "").includes("eyebrow") &&
        el.textContent === "Quoted hours",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_c, el) =>
        el?.tagName.toLowerCase() === "span" &&
        (el.className || "").includes("eyebrow") &&
        el.textContent === "Actual hours",
      ),
    ).toBeInTheDocument();
  });

  it("switches to bucket view when the toggle is clicked", () => {
    renderWithProviders(<EstimationAccuracy data={SAMPLE} />);
    fireEvent.click(screen.getByRole("button", { name: /by bucket/i }));
    expect(
      screen.getByText(/overrun % by sales bucket · positive = went over/i),
    ).toBeInTheDocument();
  });
});
