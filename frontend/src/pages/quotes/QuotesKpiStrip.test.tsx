import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { QuotesKpiStrip } from "./QuotesKpiStrip";
import { SavedQuoteSummary } from "@/api/types";

function makeRow(
  id: string,
  hours: number,
  rangeLow: number,
  rangeHigh: number,
  createdAt: string,
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
    created_at: createdAt,
    created_by: "Tester",
  };
}

describe("QuotesKpiStrip", () => {
  const NOW = new Date("2026-04-17T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders '0' total and '0%' high confidence with no rows", () => {
    render(<QuotesKpiStrip rows={[]} />);

    expect(screen.getByText("Total saved")).toBeInTheDocument();
    expect(screen.getByText("High confidence")).toBeInTheDocument();

    // "0" appears as total saved value
    const totalCard = screen.getByText("Total saved").closest("div.card");
    expect(totalCard).toBeInTheDocument();
    expect(totalCard!.querySelector(".display-hero")!.textContent).toBe("0");

    // "0%" appears as high confidence value
    const highConfCard = screen.getByText("High confidence").closest("div.card");
    expect(highConfCard).toBeInTheDocument();
    expect(highConfCard!.querySelector(".display-hero")!.textContent).toBe("0%");
  });

  it("counts only rows created within the last 7 days", () => {
    const recent1 = makeRow("r1", 1000, 900, 1100, "2026-04-15T00:00:00Z"); // 2 days ago
    const recent2 = makeRow("r2", 1000, 900, 1100, "2026-04-16T00:00:00Z"); // 1 day ago
    const old1 = makeRow("o1", 1000, 900, 1100, "2026-04-09T00:00:00Z");    // 8 days ago
    const old2 = makeRow("o2", 1000, 900, 1100, "2026-01-01T00:00:00Z");    // very old

    render(<QuotesKpiStrip rows={[recent1, recent2, old1, old2]} />);

    const last7Card = screen.getByText("Last 7 days").closest("div.card");
    expect(last7Card!.querySelector(".display-hero")!.textContent).toBe("2");
  });

  it("calculates high-confidence percentage as 50% when 2 of 4 rows have narrow band", () => {
    // band / hours <= 0.25 → high confidence
    const narrow1 = makeRow("n1", 1000, 900, 1100, "2026-04-17T00:00:00Z"); // band=200, 200/1000=0.2 ✓
    const narrow2 = makeRow("n2", 1000, 875, 1125, "2026-04-17T00:00:00Z"); // band=250, 250/1000=0.25 ✓
    const wide1 = makeRow("w1", 1000, 700, 1400, "2026-04-17T00:00:00Z");   // band=700, 700/1000=0.7 ✗
    const wide2 = makeRow("w2", 1000, 600, 1700, "2026-04-17T00:00:00Z");   // band=1100, 1.1 ✗

    render(<QuotesKpiStrip rows={[narrow1, narrow2, wide1, wide2]} />);

    const highConfCard = screen.getByText("High confidence").closest("div.card");
    expect(highConfCard!.querySelector(".display-hero")!.textContent).toBe("50%");
  });

  it("renders bg-amber stripe only on the 4th (High confidence) card", () => {
    const row = makeRow("a", 1000, 900, 1100, "2026-04-17T00:00:00Z");
    render(<QuotesKpiStrip rows={[row]} />);

    const cards = document.querySelectorAll("div.card");
    // 4 cards total; only the last one has the amber stripe span
    expect(cards).toHaveLength(4);
    const amberStripes = document.querySelectorAll(".bg-amber");
    expect(amberStripes).toHaveLength(1);
    // The amber stripe is inside the 4th card
    expect(cards[3].contains(amberStripes[0])).toBe(true);
  });
});
