import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { BANNED_TOKENS } from "@/test/jargon";
import type { ProjectRecord } from "@/demo/realProjects";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import { quoteFormDefaults, type QuoteFormValues } from "@/pages/single-quote/schema";

// ---------------------------------------------------------------------------
// Recharts mock — required for jsdom to render BusinessInsights*.
// Mirrors frontend/src/pages/demo/BusinessInsights.test.tsx:10-18.
// ---------------------------------------------------------------------------
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

// ---------------------------------------------------------------------------
// Real-projects mock — gives BusinessInsights non-empty data so the page body
// actually renders (otherwise the loading state could trivially pass the
// jargon scan).
// Mirrors frontend/src/pages/demo/BusinessInsights.test.tsx:21-54.
// ---------------------------------------------------------------------------
const FAKE_RECORDS: ProjectRecord[] = [
  {
    project_id: "r1",
    project_name: "Real Alpha",
    industry_segment: "Automotive",
    system_category: "Assembly",
    stations_count: 4,
    complexity_score_1_5: 2,
    log_quoted_materials_cost: Math.log(1000),
    me10_actual_hours: 150,
  },
  {
    project_id: "r2",
    project_name: "Real Beta",
    industry_segment: "Food & Bev",
    system_category: "Welding",
    stations_count: 6,
    complexity_score_1_5: 3,
    log_quoted_materials_cost: Math.log(2000),
    me10_actual_hours: 250,
  },
];

vi.mock("@/demo/realProjects", async () => {
  const actual = await vi.importActual<typeof import("@/demo/realProjects")>("@/demo/realProjects");
  return {
    ...actual,
    useRealProjects: () => ({ data: FAKE_RECORDS, isLoading: false, error: null }),
  };
});

// Vitest auto-hoists vi.mock() above static imports, so plain ESM imports here
// are safe and match every other test file in the repo.
import { QuoteResultPanel } from "@/components/quote/QuoteResultPanel";
import { BusinessInsights } from "@/pages/demo/BusinessInsights";
import { BusinessInsightsView } from "@/pages/demo/business/BusinessInsightsView";

// ---------------------------------------------------------------------------
// Fixtures for QuoteResultPanel — mirror frontend/src/components/quote/QuoteResultPanel.test.tsx:12-60.
// ---------------------------------------------------------------------------
function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return { ...quoteFormDefaults, ...over };
}

const HIGH_CONFIDENCE_RESULT: UnifiedQuoteResult = {
  estimateHours: 1500,
  likelyRangeLow: 1200,
  likelyRangeHigh: 1800,
  overallConfidence: "high",
  perCategory: [
    { label: "Mechanical Engineering - primary", estimateHours: 800, rangeLow: 640, rangeHigh: 960, confidence: "high" },
    { label: "Electrical Engineering",           estimateHours: 400, rangeLow: 320, rangeHigh: 480, confidence: "moderate" },
    { label: "Build & assembly",                  estimateHours: 300, rangeLow: 240, rangeHigh: 360, confidence: "high" },
  ],
  topDrivers: [
    { label: "Number of stations", direction: "increases", magnitude: "strong" },
    { label: "Number of robots",   direction: "increases", magnitude: "moderate" },
    { label: "Servo axes",         direction: "increases", magnitude: "minor" },
  ],
  supportingMatches: {
    label: "Most similar past projects",
    items: [
      { projectId: "p1", projectName: "Alpha Build Cell",   actualHours: 1450, similarity: 0.92 },
      { projectId: "p2", projectName: "Beta Welding Line",  actualHours: 1550, similarity: 0.88 },
      { projectId: "p3", projectName: "Gamma Tending",      actualHours: 1380, similarity: 0.81 },
    ],
  },
};

function assertNoBannedTokens(label: string, body: string) {
  for (const re of BANNED_TOKENS) {
    expect(
      body,
      `[jargon-guard] ${label} contains banned token ${re}: ${body.slice(0, 200)}…`,
    ).not.toMatch(re);
  }
}

// ---------------------------------------------------------------------------
// The actual scan.
// ---------------------------------------------------------------------------
describe("jargon-guard (DATA-03 — Phase 4)", () => {
  it("QuoteResultPanel renders no banned ML-jargon tokens", () => {
    // The live <QuoteResultPanel> takes `input: QuoteFormValues` (NOT
    // `formValues` — the plan template's name is stale; per CODE VIEW T2,
    // the test files are the contract, copy from QuoteResultPanel.test.tsx
    // verbatim).
    renderWithProviders(
      <QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />,
    );
    const body = document.body.textContent ?? "";
    // Marker assertion: stable copy from QuoteResultPanel header eyebrow row.
    // Stronger than `length > 0` — guarantees the panel actually rendered
    // its meaningful chrome rather than (e.g.) a future error-boundary fallback.
    expect(body, "expected QuoteResultPanel chrome to render").toMatch(/estimated hours/i);
    assertNoBannedTokens("QuoteResultPanel", body);
  });

  it("BusinessInsights renders no banned ML-jargon tokens", () => {
    renderWithProviders(<BusinessInsights />);
    const body = document.body.textContent ?? "";
    // Marker assertion: PageHeader renders "Business Insights" title.
    // The LoadingSkeleton branch contains only <SkeletonBlock> divs (no text
    // nodes), so this marker fails loudly if a future mock regression drops
    // the BusinessInsights/BusinessInsightsView path into the loading state.
    expect(body, "expected BusinessInsights page chrome to render").toMatch(
      /business insights/i,
    );
    assertNoBannedTokens("BusinessInsights", body);
  });

  it("BusinessInsightsView (real variant) renders no banned ML-jargon tokens", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={FAKE_RECORDS}
        datasetLabel="Test · Real"
        source="real"
        isLoading={false}
        error={null}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body, "expected BusinessInsightsView chrome to render").toMatch(
      /business insights/i,
    );
    assertNoBannedTokens("BusinessInsightsView (real)", body);
  });

  // WR-01 (Phase 4 review): the previous two BusinessInsights* cases both
  // resolve to <DataProvenanceNote variant="real">. The /ml/insights route
  // ships <DataProvenanceNote variant="synthetic"> as well, and a Rule-1
  // leak introduced *only* into the synthetic copy block would slip past
  // the BusinessInsights*-via-shim cases. This third explicit render covers
  // the synthetic variant of DataProvenanceNote and exercises the same
  // BusinessInsightsView surface with `source="synthetic"`.
  it("BusinessInsightsView (synthetic variant) renders no banned ML-jargon tokens", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={FAKE_RECORDS}
        datasetLabel="Test · Synthetic"
        source="synthetic"
        isLoading={false}
        error={null}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body, "expected BusinessInsightsView (synthetic) chrome to render").toMatch(
      /business insights/i,
    );
    assertNoBannedTokens("BusinessInsightsView (synthetic)", body);
  });
});
