/**
 * Phase 6 multi-vision render coverage for QuoteResultPanel (D-09 / D-10 / D-11).
 *
 * Asserts:
 * - "Per-vision contribution" heading + row labels render when populated.
 * - Hours-delta sign formatting (positive `+`, negative leading `-`).
 * - Conditional render guard — heading absent when perVisionContributions undefined.
 * - Inputs-echo "Vision systems" row formats based on input.visionRows.
 * - Sanity jargon-guard scan on the rendered body (full coverage in
 *   jargon-guard.test.tsx).
 */
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/render";
import { QuoteResultPanel } from "../QuoteResultPanel";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import {
  quoteFormDefaults,
  type QuoteFormValues,
  type VisionRow,
} from "@/pages/single-quote/schema";

function fv(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return { ...quoteFormDefaults, ...over };
}

const BASE_RESULT: UnifiedQuoteResult = {
  estimateHours: 250,
  likelyRangeLow: 200,
  likelyRangeHigh: 320,
  overallConfidence: "moderate",
  perCategory: [
    {
      label: "Mechanical",
      estimateHours: 100,
      rangeLow: 80,
      rangeHigh: 130,
      confidence: "high",
    },
  ],
  topDrivers: [
    { label: "Number of stations", direction: "increases", magnitude: "strong" },
  ],
  supportingMatches: { label: "Most similar training rows", items: [] },
};

describe("QuoteResultPanel — multi-vision render (Phase 6 D-09/D-10/D-11)", () => {
  it("renders 'Per-vision contribution' heading + row labels when perVisionContributions populated", () => {
    const visionRows: VisionRow[] = [
      { type: "2D", count: 2 },
      { type: "3D", count: 1 },
    ];
    const result: UnifiedQuoteResult = {
      ...BASE_RESULT,
      perVisionContributions: [
        {
          rowIndex: 0,
          rowLabel: "Vision 1: 2D × 2",
          hoursDelta: 38,
          topDrivers: [{ label: "Number of stations", direction: "increases" }],
        },
        {
          rowIndex: 1,
          rowLabel: "Vision 2: 3D × 1",
          hoursDelta: 65,
          topDrivers: [{ label: "Robot count", direction: "increases" }],
        },
      ],
    };
    renderWithProviders(<QuoteResultPanel result={result} input={fv({ visionRows })} />);
    expect(screen.getByText("Per-vision contribution")).toBeInTheDocument();
    expect(screen.getByText("Vision 1: 2D × 2")).toBeInTheDocument();
    expect(screen.getByText("Vision 2: 3D × 1")).toBeInTheDocument();
  });

  it("hours delta sign — positive renders with '+', negative without", () => {
    const result: UnifiedQuoteResult = {
      ...BASE_RESULT,
      perVisionContributions: [
        {
          rowIndex: 0,
          rowLabel: "Vision 1: 2D × 1",
          hoursDelta: 30,
          topDrivers: [],
        },
        {
          rowIndex: 1,
          rowLabel: "Vision 2: 3D × 1",
          hoursDelta: -15,
          topDrivers: [],
        },
      ],
    };
    renderWithProviders(
      <QuoteResultPanel
        result={result}
        input={fv({ visionRows: [{ type: "2D", count: 1 }, { type: "3D", count: 1 }] })}
      />,
    );
    expect(screen.getByText(/^\+30 hrs$/)).toBeInTheDocument();
    expect(screen.getByText(/^-15 hrs$/)).toBeInTheDocument();
  });

  it("absent perVisionContributions (v1 result) -> heading not rendered (round-trip compat)", () => {
    // BASE_RESULT has no perVisionContributions field.
    renderWithProviders(<QuoteResultPanel result={BASE_RESULT} input={fv({ visionRows: [] })} />);
    expect(screen.queryByText("Per-vision contribution")).not.toBeInTheDocument();
  });

  it("inputs-echo 'Vision systems' row formats based on input.visionRows", () => {
    // Empty rows render '—'.
    const { unmount } = renderWithProviders(
      <QuoteResultPanel result={BASE_RESULT} input={fv({ visionRows: [] })} />,
    );
    const visionSystemsLabel = screen.getByText("Vision systems");
    // The dt+dd pair: walk to the next sibling for the value.
    expect(visionSystemsLabel.parentElement?.parentElement?.textContent).toContain("—");
    unmount();

    // Populated rows render "2D × 2; 3D × 1".
    renderWithProviders(
      <QuoteResultPanel
        result={BASE_RESULT}
        input={fv({ visionRows: [{ type: "2D", count: 2 }, { type: "3D", count: 1 }] })}
      />,
    );
    expect(screen.getByText("2D × 2; 3D × 1")).toBeInTheDocument();
  });

  it("does not render banned ML jargon (sanity check)", () => {
    const result: UnifiedQuoteResult = {
      ...BASE_RESULT,
      perVisionContributions: [
        {
          rowIndex: 0,
          rowLabel: "Vision 1: 2D × 2",
          hoursDelta: 38,
          topDrivers: [{ label: "Number of stations", direction: "increases" }],
        },
      ],
    };
    renderWithProviders(
      <QuoteResultPanel
        result={result}
        input={fv({ visionRows: [{ type: "2D", count: 2 }] })}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/\bP10\b|\bP50\b|\bP90\b/);
    expect(body).not.toMatch(/\bR²/);
    expect(body).not.toMatch(/gradient boosting|confidence intervals|delta from baseline|uncertainty band/i);
  });
});
