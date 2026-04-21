import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuotesTable } from "./QuotesTable";
import { SavedQuoteSummary } from "@/api/types";

function makeRow(
  id: string,
  hours: number,
  rangeLow: number,
  rangeHigh: number,
): SavedQuoteSummary {
  return {
    id,
    name: `Quote ${id}`,
    project_name: "Project",
    client_name: null,
    industry_segment: "Automotive",
    hours,
    range_low: rangeLow,
    range_high: rangeHigh,
    created_at: "2026-04-17T00:00:00Z",
    created_by: "Tester",
  };
}

describe("QuotesTable confidence pips", () => {
  it("renders 5 amber pips for a 5% band (hours=1000, low=950, high=1050)", () => {
    // band=100, rel=0.1, threshold <=0.10 → 5 dots
    const row = makeRow("a", 1000, 950, 1050);
    render(
      <QuotesTable
        rows={[row]}
        selected={new Set()}
        onToggle={vi.fn()}
        onRowAction={vi.fn()}
      />,
    );

    const confContainer = screen.getByLabelText("Confidence 5 of 5");
    const pips = confContainer.querySelectorAll("span");
    expect(pips).toHaveLength(5);
    pips.forEach((pip) => {
      expect(pip.className).toContain("bg-amber");
    });
  });

  it("renders 1 amber pip and 4 bg-line2 pips for a 100% band (hours=1000, low=500, high=1500)", () => {
    // band=1000, rel=1.0, threshold >0.55 → 1 dot
    const row = makeRow("b", 1000, 500, 1500);
    render(
      <QuotesTable
        rows={[row]}
        selected={new Set()}
        onToggle={vi.fn()}
        onRowAction={vi.fn()}
      />,
    );

    const confContainer = screen.getByLabelText("Confidence 1 of 5");
    const pips = confContainer.querySelectorAll("span");
    expect(pips).toHaveLength(5);

    const amberPips = Array.from(pips).filter((p) => p.className.includes("bg-amber"));
    const dimPips = Array.from(pips).filter((p) => p.className.includes("bg-line2"));
    expect(amberPips).toHaveLength(1);
    expect(dimPips).toHaveLength(4);
  });

  it("aria-label reflects the correct confidence level", () => {
    // band=200, rel=0.2, threshold <=0.20 → 4 dots
    const row = makeRow("c", 1000, 900, 1100);
    render(
      <QuotesTable
        rows={[row]}
        selected={new Set()}
        onToggle={vi.fn()}
        onRowAction={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Confidence 4 of 5")).toBeInTheDocument();
  });
});
