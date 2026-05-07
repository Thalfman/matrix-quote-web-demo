/**
 * Phase 5 test fixtures used by the jargon-guard scan and any future Phase 5
 * test that needs a populated SavedQuote / formValues / unifiedResult.
 *
 * Plan 05-09 Task 3.
 */
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import type { QuoteVersion, SavedQuote } from "@/lib/savedQuoteSchema";
import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";

const formValues: QuoteFormValues = {
  ...quoteFormDefaults,
  industry_segment: "Automotive",
  system_category: "Machine Tending",
  automation_level: "Robotic",
  stations_count: 4,
  visionRows: [{ type: "Cognex 2D", count: 1 }],
};

const unifiedResult: UnifiedQuoteResult = {
  estimateHours: 800,
  likelyRangeLow: 640,
  likelyRangeHigh: 960,
  overallConfidence: "high",
  perCategory: [
    {
      label: "Mechanical Engineering - primary",
      estimateHours: 480,
      rangeLow: 380,
      rangeHigh: 580,
      confidence: "high",
    },
    {
      label: "Electrical Engineering",
      estimateHours: 220,
      rangeLow: 180,
      rangeHigh: 260,
      confidence: "moderate",
    },
  ],
  topDrivers: [
    {
      label: "Number of stations",
      direction: "increases",
      magnitude: "strong",
    },
  ],
  supportingMatches: {
    label: "Most similar past projects",
    items: [
      {
        projectId: "p1",
        projectName: "Alpha Build Cell",
        actualHours: 780,
        similarity: 0.91,
      },
    ],
  },
};

const savedQuote: SavedQuote = {
  id: "11111111-1111-4111-8111-111111111111",
  schemaVersion: 2,
  name: "Alpha quote",
  workspace: "real",
  status: "draft",
  createdAt: "2026-04-15T12:00:00.000Z",
  updatedAt: "2026-05-05T12:00:00.000Z",
  // Phase 7 D-03: legacy Phase 5 / Phase 6 fixtures are full-mode quotes.
  mode: "full",
  versions: [
    {
      version: 1,
      savedAt: "2026-04-15T12:00:00.000Z",
      statusAtTime: "draft",
      formValues,
      unifiedResult: unifiedResult as QuoteVersion["unifiedResult"],
      mode: "full",
    },
    {
      version: 2,
      savedAt: "2026-05-05T12:00:00.000Z",
      statusAtTime: "sent",
      formValues: { ...formValues, stations_count: 5 },
      unifiedResult: {
        ...unifiedResult,
        estimateHours: 880,
      } as QuoteVersion["unifiedResult"],
      mode: "full",
    },
  ],
  salesBucket: "ME",
  visionLabel: "Cognex 2D",
  materialsCost: 245000,
};

export const Phase5Fixtures = {
  formValues,
  unifiedResult,
  savedQuote,
};
