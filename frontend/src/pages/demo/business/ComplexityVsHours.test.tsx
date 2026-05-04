import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { bucketByComplexity, type LevelRow } from "./complexityBuckets";
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

function pt(over: Partial<ScatterPoint> = {}): ScatterPoint {
  return {
    projectId: over.projectId ?? "p",
    complexity: over.complexity ?? 3,
    stations: over.stations ?? 0,
    hours: over.hours ?? 100,
    industry: over.industry ?? "Automotive",
    name: over.name ?? "Default Name",
  };
}

const SCATTER_DATA: ScatterPoint[] = [
  pt({ projectId: "p1", complexity: 2, stations: 4, hours: 200, industry: "Automotive", name: "Project Alpha" }),
  pt({ projectId: "p2", complexity: 2, stations: 5, hours: 220, industry: "Automotive", name: "Project Gamma" }),
  pt({ projectId: "p3", complexity: 4, stations: 8, hours: 600, industry: "Food & Bev", name: "Project Beta" }),
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

describe("bucketByComplexity (UX-02)", () => {
  it("returns 5 rows, one per complexity level (1..5), even when buckets are empty", () => {
    const rows = bucketByComplexity([]);
    expect(rows.map((r) => r.level)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.every((r) => r.count === 0)).toBe(true);
    expect(rows.every((r) => r.topProjects.length === 0)).toBe(true);
    expect(rows.every((r) => r.overflow === 0)).toBe(true);
  });

  it("retains project triples and sorts desc by hours within a bucket", () => {
    const points = [
      pt({ projectId: "a", name: "Alpha", complexity: 3, hours: 100 }),
      pt({ projectId: "b", name: "Bravo", complexity: 3, hours: 300 }),
      pt({ projectId: "c", name: "Charlie", complexity: 3, hours: 200 }),
    ];
    const rows = bucketByComplexity(points);
    const lvl3 = rows.find((r) => r.level === 3);
    expect(lvl3).toBeDefined();
    expect(lvl3!.count).toBe(3);
    expect(lvl3!.topProjects.map((p) => p.projectId)).toEqual(["b", "c", "a"]);
    expect(lvl3!.topProjects.map((p) => p.hours)).toEqual([300, 200, 100]);
    expect(lvl3!.overflow).toBe(0);
  });

  it("caps topProjects at 5 and reports overflow", () => {
    const points: ScatterPoint[] = [];
    for (let i = 0; i < 12; i++) {
      points.push(pt({ projectId: `id-${i}`, name: `Proj ${i}`, complexity: 4, hours: 100 + i }));
    }
    const rows = bucketByComplexity(points);
    const lvl4 = rows.find((r) => r.level === 4)!;
    expect(lvl4.count).toBe(12);
    expect(lvl4.topProjects.length).toBe(5);
    expect(lvl4.overflow).toBe(7);
    expect(lvl4.topProjects[0].projectId).toBe("id-11");
    expect(lvl4.topProjects[4].projectId).toBe("id-7");
  });

  it("ignores points with complexity outside 1..5", () => {
    const points = [
      pt({ complexity: 0, hours: 999 }),
      pt({ complexity: 6, hours: 999 }),
      pt({ projectId: "x", complexity: 2, hours: 50 }),
    ];
    const rows = bucketByComplexity(points);
    expect(rows.find((r) => r.level === 2)!.count).toBe(1);
    expect(rows.find((r) => r.level === 1)!.count).toBe(0);
    expect(rows.every((r) => r.level >= 1 && r.level <= 5)).toBe(true);
  });

  it("rounds fractional complexity to nearest integer level", () => {
    const points = [
      pt({ complexity: 2.4, hours: 10 }),
      pt({ complexity: 2.5, hours: 20 }),
    ];
    const rows = bucketByComplexity(points);
    expect(rows.find((r) => r.level === 2)!.count).toBe(1);
    expect(rows.find((r) => r.level === 3)!.count).toBe(1);
  });
});

describe("ComplexityVsHours — axis-title glossary affordance (UX-03)", () => {
  it("renders a focusable HelpCircle button next to the eyebrow header", () => {
    renderWithProviders(<ComplexityVsHours data={[]} />);
    const btn = screen.getByRole("button", { name: /What is Complexity \(1–5\)\?/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });

  // Focus-opens-tooltip behavior of the Tooltip wrapper itself is covered by
  // Tooltip.test.tsx. This file's recharts-mocked render does not exercise the
  // Tooltip Portal reliably, so we verify the wiring (button exists with the
  // correct aria-label) and trust the wrapper's own keyboard-open assertion.
});

const _typeProbe: LevelRow | undefined = undefined;
void _typeProbe;
