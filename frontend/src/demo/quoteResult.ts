/** Canonical result shape produced by the adapter and consumed by QuoteResultPanel — shared by both Real and Synthetic Quote tabs. */
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
}
