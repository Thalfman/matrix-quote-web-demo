import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";
import { QuoteResultPanel } from "./QuoteResultPanel";

function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return { ...quoteFormDefaults, ...over };
}

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
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    // 1,500 hrs formatted with toLocaleString + rounding
    expect(screen.getByText(/1,500 hrs/i)).toBeInTheDocument();
  });

  it("renders the likely range", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText(/1,200–1,800 hrs/i)).toBeInTheDocument();
  });

  it("renders overall confidence chip as 'High confidence'", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("High confidence")).toBeInTheDocument();
  });

  it("renders all three driver labels", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("Number of stations")).toBeInTheDocument();
    expect(screen.getByText("Number of robots")).toBeInTheDocument();
    // "Servo axes" appears in both the drivers panel and the Your-inputs recap
    // (since UX-01 added a recap row with the same form-field label).
    expect(screen.getAllByText("Servo axes").length).toBeGreaterThanOrEqual(1);
  });

  it("renders magnitude labels for each driver", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("Strong driver")).toBeInTheDocument();
    expect(screen.getByText("Moderate driver")).toBeInTheDocument();
    expect(screen.getByText("Minor driver")).toBeInTheDocument();
  });

  it("renders per-category labels", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("Mechanical Engineering - primary")).toBeInTheDocument();
    expect(screen.getByText("Electrical Engineering")).toBeInTheDocument();
    expect(screen.getByText("Build & assembly")).toBeInTheDocument();
  });

  it("renders per-category confidence short codes", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    // Two "H" chips (high) and one "M" chip (moderate)
    const hChips = screen.getAllByText("H");
    expect(hChips).toHaveLength(2);
    const mChips = screen.getAllByText("M");
    expect(mChips).toHaveLength(1);
  });

  it("renders supporting matches section with the label", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("Most similar past projects")).toBeInTheDocument();
  });

  it("renders all three supporting match project names", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("Alpha Build Cell")).toBeInTheDocument();
    expect(screen.getByText("Beta Welding Line")).toBeInTheDocument();
    expect(screen.getByText("Gamma Tending")).toBeInTheDocument();
  });

  it("renders similarity percentages for supporting matches", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText(/92% match/)).toBeInTheDocument();
    expect(screen.getByText(/88% match/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Lower-confidence fixture tests
// ---------------------------------------------------------------------------

describe("QuoteResultPanel - lower confidence fixture", () => {
  it("renders overall confidence chip as 'Lower confidence'", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("Lower confidence")).toBeInTheDocument();
  });

  it("renders per-category 'L' short codes for lower confidence categories", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} input={makeFormValues()} />);
    const lChips = screen.getAllByText("L");
    expect(lChips).toHaveLength(2);
  });

  it("renders 'Most similar training rows' label for synthetic variant", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("Most similar training rows")).toBeInTheDocument();
  });

  it("renders the single supporting match", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText("Synthetic Row 42")).toBeInTheDocument();
  });

  it("renders estimate hours for lower confidence result", () => {
    renderWithProviders(<QuoteResultPanel result={LOWER_CONFIDENCE_RESULT} input={makeFormValues()} />);
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
    renderWithProviders(<QuoteResultPanel result={result} input={makeFormValues()} />);
    expect(
      screen.getByText(/no clear drivers/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Your inputs recap (UX-01)
// ---------------------------------------------------------------------------

describe("QuoteResultPanel — Your inputs recap (UX-01)", () => {
  it("renders the 'Your inputs' card heading", () => {
    renderWithProviders(
      <QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />,
    );
    expect(screen.getByText(/your inputs/i)).toBeInTheDocument();
  });

  it("echoes the industry segment the user submitted", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={HIGH_CONFIDENCE_RESULT}
        input={makeFormValues({ industry_segment: "Automotive" })}
      />,
    );
    expect(screen.getByText("Automotive")).toBeInTheDocument();
  });

  it("echoes the system category", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={HIGH_CONFIDENCE_RESULT}
        input={makeFormValues({ system_category: "Machine Tending" })}
      />,
    );
    expect(screen.getByText("Machine Tending")).toBeInTheDocument();
  });

  it("echoes stations count and robot count as numbers", () => {
    // Use distinctive values that won't collide with the 1–5 rating sliders
    // (which default to 3) or the custom_pct (which defaults to 50).
    renderWithProviders(
      <QuoteResultPanel
        result={HIGH_CONFIDENCE_RESULT}
        input={makeFormValues({ stations_count: 42, robot_count: 17 })}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
  });

  it("formats materials cost with $ prefix and grouping", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={HIGH_CONFIDENCE_RESULT}
        input={makeFormValues({ estimated_materials_cost: 250000 })}
      />,
    );
    expect(screen.getByText("$250,000")).toBeInTheDocument();
  });

  it("formats booleans as Yes/No", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={HIGH_CONFIDENCE_RESULT}
        input={makeFormValues({
          has_controls: true,
          has_robotics: true,
          retrofit: false,
          duplicate: false,
        })}
      />,
    );
    expect(screen.getAllByText("Yes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No").length).toBeGreaterThan(0);
  });

  it("renders all six section headings", () => {
    renderWithProviders(
      <QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />,
    );
    expect(screen.getByText(/project classification/i)).toBeInTheDocument();
    expect(screen.getByText(/physical scale/i)).toBeInTheDocument();
    expect(screen.getByText(/controls & automation/i)).toBeInTheDocument();
    expect(screen.getByText(/product & process/i)).toBeInTheDocument();
    expect(screen.getByText(/complexity & indices/i)).toBeInTheDocument();
    expect(screen.getByText(/^cost$/i)).toBeInTheDocument();
  });

  it("renders a — placeholder for empty industry_segment", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={HIGH_CONFIDENCE_RESULT}
        input={makeFormValues({ industry_segment: "" })}
      />,
    );
    // multiple — placeholders may appear (e.g. zero materials cost), so
    // assert at least one is present
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("QuoteResultPanel — glossary tooltips on recap row labels (UX-03)", () => {
  it("renders a focusable HelpCircle next to 'Industry segment' label", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={HIGH_CONFIDENCE_RESULT}
        input={makeFormValues({ industry_segment: "Automotive" })}
      />,
    );
    const btn = screen.getByRole("button", { name: /What is Industry Segment\?/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders HelpCircle for all 7 row labels that match glossary terms", () => {
    renderWithProviders(
      <QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />,
    );
    const labels = [
      "Industry Segment",
      "System Category",
      "Automation Level",
      "PLC Family",
      "HMI Family",
      "Vision Type",
      "Complexity (1–5)",
    ];
    for (const t of labels) {
      const escaped = t.replace(/[()]/g, "\\$&");
      const btn = screen.getByRole("button", { name: new RegExp(`What is ${escaped}\\?`, "i") });
      expect(btn, `Missing glossary affordance for ${t}`).toBeInTheDocument();
    }
  });

  it("does NOT render a HelpCircle for plain row labels (e.g., 'Stations count')", () => {
    renderWithProviders(
      <QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />,
    );
    expect(
      screen.queryByRole("button", { name: /What is Stations count\?/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT render a HelpCircle on section titles (e.g., 'Project classification')", () => {
    renderWithProviders(
      <QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />,
    );
    expect(
      screen.queryByRole("button", { name: /What is Project classification\?/i }),
    ).not.toBeInTheDocument();
  });
});
