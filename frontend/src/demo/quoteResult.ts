/** Canonical result shape produced by the adapter and consumed by QuoteResultPanel — shared by both Real and Synthetic Quote tabs. */

/** Per-vision row contribution for the breakdown section in QuoteResultPanel (Phase 6, D-08/D-09). */
export interface PerVisionContribution {
  /** Index of this row inside `formValues.visionRows`. Stable across re-runs. */
  rowIndex: number;
  /**
   * Auto-generated row label for the result panel.
   * Format when no `label` set: "Vision 1: 2D × 2".
   * Format when label set:      "Vision 1 — pick-and-place: 2D × 2".
   */
  rowLabel: string;
  /** p50 hours delta from baseline (perRow.total_p50 - baseline.total_p50). May be negative. */
  hoursDelta: number;
  /** Up to 2 drivers describing what makes this row's contribution non-zero (D-08). */
  topDrivers: Array<{ label: string; direction: "increases" | "decreases" }>;
}

export interface UnifiedQuoteResult {
  estimateHours: number;
  likelyRangeLow: number;
  likelyRangeHigh: number;
  overallConfidence: "high" | "moderate" | "lower";
  perCategory: Array<{
    label: string;
    estimateHours: number;
    rangeLow: number;
    rangeHigh: number;
    confidence: "high" | "moderate" | "lower";
  }>;
  topDrivers: Array<{
    label: string;
    direction: "increases" | "decreases";
    magnitude: "strong" | "moderate" | "minor";
  }>;
  supportingMatches: {
    label: string;
    items: Array<{
      projectId: string;
      projectName: string;
      actualHours: number;
      similarity: number;
    }>;
  };
  /**
   * Phase 6 multi-vision per-row breakdown (D-08/D-09). Optional so v1 quotes
   * without the field round-trip cleanly through Phase 5's savedQuoteSchema
   * `.passthrough()` chain.
   */
  perVisionContributions?: PerVisionContribution[];
}
