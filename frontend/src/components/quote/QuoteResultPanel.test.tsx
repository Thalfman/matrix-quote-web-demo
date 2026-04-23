import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import { QuoteResultPanel } from "./QuoteResultPanel";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HIGH_CONFIDENCE_RESULT: UnifiedQuoteResult = {
  estimateHours: 1500,
  likelyRangeLow: 1200,
  likelyRangeHigh: 1800,
  overallConfidence: "high",
  perCategory: [
    {
      label: "Mechanical Engineering - primary",
      estimateHours: 800,
      rangeLow: 640,
      rangeHigh: 960,
      confidence: "high",
    },
    {
      label: "Electrical Engineering",
      estimateHours: 400,
      rangeLow: 320,
      rangeHigh: 480,
      confidence: "moderate",
    },
    {
      label: "Build & assembly",
      estimateHours: 300,
      rangeLow: 240,
      rangeHigh: 360,
      confidence: "high",
    },
  ],
  topDrivers: [
    { label: "Number of stations", direction: "increases", magnitude: "strong" },
    { label: "Number of robots", direction: "increases", magnitude: "moderate" },
    { label: "Servo axes", direction: "increases", magnitude: "minor" },
  ],
  supportingMatches: {
    label: "Most similar past projects",
    items: [
      { projectId: "p1", projectName: "Alpha Build Cell", actualHours: 1450, similarity: 0.92 },
      { projectId: "p2", projectName: "Beta Welding Line", actualHours: 1550, similarity: 0.88 },
      { projectId: "p3", projectName: "Gamma Tending", actualHours: 1380, similarity: 0.81 },
    ],
  },
};

const LOWER_CONFIDENCE_RESULT: UnifiedQuoteResult = {
  estimateHours: 900,
  likelyRangeLow: 400,
  likelyRangeHigh: 1400,
  overallConfidence: "lower",
  perCategory: [
    {
      label: "Robotics",
      estimateHours: 600,
      rangeLow: 200,
      rangeHigh: 1000,
      confidence: "lower",
    },
    {
      label: "Controls & PLC",
      estimateHours: 300,
      rangeLow: 200,
      rangeHigh: 400,
      confidence: "lower",
    },
  ],
  topDrivers: [
    { label: "Industry: Automotive", direction: "increases", magnitude: "moderate" },
  ],
  supportingMatches: {
    label: "Most similar training rows",
    items: [
      { projectId: "s1", projectName: "Synthetic Row 42", actualHours: 880, similarity: 0.74 },
    ],
  },
};

// ---------------------------------------------------------------------------
// High-confidence fixture tests
// ---------------------------------------------------------------------------

describe("QuoteResultPanel - high confidence fixture", () => {
  it("renders hero estimate as formatted number", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    // 1,500 hrs formatted with toLocaleString + rounding
    expect(screen.getByText(/1,500 hrs/i)).toBeInTheDocument();
  });

  it("renders the likely range", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    expect(screen.getByText(/1,200–1,800 hrs/i)).toBeInTheDocument();
  });

  it("renders overall confidence chip as 'High confidence'", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    expect(screen.getByText("High confidence")).toBeInTheDocument();
  });

  it("renders all three driver labels", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    expect(screen.getByText("Number of stations")).toBeInTheDocument();
    expect(screen.getByText("Number of robots")).toBeInTheDocument();
    expect(screen.getByText("Servo axes")).toBeInTheDocument();
  });

  it("renders magnitude labels for each driver", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    expect(screen.getByText("Strong driver")).toBeInTheDocument();
    expect(screen.getByText("Moderate driver")).toBeInTheDocument();
    expect(screen.getByText("Minor driver")).toBeInTheDocument();
  });

  it("renders per-category labels", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    expect(screen.getByText("Mechanical Engineering - primary")).toBeInTheDocument();
    expect(screen.getByText("Electrical Engineering")).toBeInTheDocument();
    expect(screen.getByText("Build & assembly")).toBeInTheDocument();
  });

  it("renders per-category confidence short codes", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    // Two "H" chips (high) and one "M" chip (moderate)
    const hChips = screen.getAllByText("H");
    expect(hChips).toHaveLength(2);
    const mChips = screen.getAllByText("M");
    expect(mChips).toHaveLength(1);
  });

  it("renders supporting matches section with the label", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    expect(screen.getByText("Most similar past projects")).toBeInTheDocument();
  });

  it("renders all three supporting match project names", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    expect(screen.getByText("Alpha Build Cell")).toBeInTheDocument();
    expect(screen.getByText("Beta Welding Line")).toBeInTheDocument();
    expect(screen.getByText("Gamma Tending")).toBeInTheDocument();
  });

  it("renders similarity percentages for supporting matches", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} />);
    expect(screen.getByText(/92% match/)).toBeInTheDocument();
    expect(screen.getByText(/88% match/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Lower-confidence fixture tests
// ---------------------------------------------------------------------------

describe("QuoteResultPanel - lower confidence fixture", () => {
  it("renders overall confidence chip as 'Lower confidence'", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} />);
    expect(screen.getByText("Lower confidence")).toBeInTheDocument();
  });

  it("renders per-category 'L' short codes for lower confidence categories", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} />);
    const lChips = screen.getAllByText("L");
    expect(lChips).toHaveLength(2);
  });

  it("renders 'Most similar training rows' label for synthetic variant", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} />);
    expect(screen.getByText("Most similar training rows")).toBeInTheDocument();
  });

  it("renders the single supporting match", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} />);
    expect(screen.getByText("Synthetic Row 42")).toBeInTheDocument();
  });

  it("renders estimate hours for lower confidence result", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} />);
    expect(screen.getByText(/900 hrs/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty drivers
// ---------------------------------------------------------------------------

describe("QuoteResultPanel - empty drivers", () => {
  it("shows fallback text when no drivers", () => {
    const result: UnifiedQuoteResult = {
      ...HIGH_CONFIDENCE_RESULT,
      topDrivers: [],
    };
    renderWithProviders(<QuoteResultPanel result={result} />);
    expect(
      screen.getByText(/no clear drivers/i),
    ).toBeInTheDocument();
  });
});
