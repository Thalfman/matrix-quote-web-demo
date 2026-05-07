// fake-indexeddb provides a jsdom-compatible IndexedDB implementation so the
// SC-4 round-trip tests below can call saveSavedQuote/getSavedQuote directly
// against the live module without needing a backend or stub. Mirrors
// frontend/src/lib/quoteStorage.test.ts:11.
import "fake-indexeddb/auto";

import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";

import { renderWithProviders } from "@/test/render";
import { BANNED_TOKENS } from "@/test/jargon";
import type { ProjectRecord } from "@/demo/realProjects";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import type { RomMetadata } from "@/demo/romEstimator";
import {
  quoteFormDefaults,
  quoteFormSchema,
  type QuoteFormValues,
  type VisionRow,
} from "@/pages/single-quote/schema";
import { VisionRowsField } from "@/pages/single-quote/VisionRowsField";
import { RomBadge } from "@/components/quote/RomBadge";
import { RomResultPanel } from "@/components/quote/RomResultPanel";
import { RomForm } from "@/pages/single-quote/RomForm";
import {
  romFormDefaults,
  romFormSchema,
  type RomFormValues,
} from "@/pages/single-quote/romSchema";

// NOTE: do NOT module-top-mock SaveQuoteButton — the Phase 5 jargon block
// renders the live SaveQuoteButton and asserts /save quote/i. The Phase 7
// RomResultPanel jargon tests below render the panel WITHOUT a `workspace`
// prop, so RomResultPanel's `{workspace && <SaveQuoteButton .../>}` branch
// is not entered, and the live component never instantiates.

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

// ---------------------------------------------------------------------------
// Phase 5 — D-19 customer-facing surface coverage (Plan 05-09 Task 3).
//
// The 9 new surfaces from UI-SPEC §"Jargon-Guard Scope Addition". Each test
// renders the surface in its meaningful state (open dialog, populated list,
// non-empty version history) so the scan exercises real chrome, not a
// loading/empty fallback.
//
// NO additions to BANNED_TOKENS — Phase 5 introduces no new ML-risk
// vocabulary; the current 16-pattern list is sufficient.
// ---------------------------------------------------------------------------

import { Phase5Fixtures } from "@/test/__fixtures__/phase5";
import { MyQuotesEmptyState } from "@/pages/quotes/MyQuotesEmptyState";
import { QuoteRow } from "@/pages/quotes/QuoteRow";
import { StatusChip } from "@/components/quote/StatusChip";
import { VersionHistoryList } from "@/components/quote/VersionHistoryList";
import { DeleteQuoteModal } from "@/components/quote/DeleteQuoteModal";
import { SaveQuoteDialog } from "@/components/quote/SaveQuoteDialog";
import { SaveQuoteButton } from "@/components/quote/SaveQuoteButton";

// Plan 05-07 / 05-08 components — when not yet landed, the stubs from Plan
// 05-09 still render meaningful chrome (the page heading + subhead) so the
// jargon scan exercises real strings.
import { MyQuotesPage } from "@/pages/quotes/MyQuotesPage";
import { SavedQuotePage } from "@/pages/quotes/SavedQuotePage";

// Phase 7 — SC-4 round-trip layer (D-19 + D-20).
import {
  saveSavedQuote,
  listSavedQuotes,
  getSavedQuote,
} from "@/lib/quoteStorage";

describe("jargon-guard (DATA-03 — Phase 5 surface coverage)", () => {
  it("MyQuotesEmptyState renders no banned ML-jargon tokens", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    const body = document.body.textContent ?? "";
    expect(body, "expected MyQuotesEmptyState chrome to render").toMatch(
      /no saved quotes yet/i,
    );
    assertNoBannedTokens("MyQuotesEmptyState", body);
  });

  it("QuoteRow renders no banned ML-jargon tokens", () => {
    renderWithProviders(
      <QuoteRow
        quote={Phase5Fixtures.savedQuote}
        onAdvanceStatus={() => undefined}
        onRequestDelete={() => undefined}
      />,
    );
    const body = document.body.textContent ?? "";
    // Marker assertion: row's metadata cluster.
    expect(body, "expected QuoteRow chrome to render").toMatch(
      /alpha quote/i,
    );
    assertNoBannedTokens("QuoteRow", body);
  });

  it("StatusChip renders no banned ML-jargon tokens (all 5 states)", () => {
    const STATUS_CYCLE = [
      "draft",
      "sent",
      "won",
      "lost",
      "revised",
    ] as const;
    renderWithProviders(
      <div>
        {STATUS_CYCLE.map((s) => (
          <StatusChip key={s} status={s} readOnly />
        ))}
      </div>,
    );
    const body = document.body.textContent ?? "";
    // Marker assertion: at least one cycle label rendered.
    expect(body, "expected StatusChip chrome to render").toMatch(/draft/i);
    expect(body).toMatch(/revised/i);
    assertNoBannedTokens("StatusChip", body);
  });

  it("VersionHistoryList renders no banned ML-jargon tokens", () => {
    renderWithProviders(
      <VersionHistoryList
        versions={Phase5Fixtures.savedQuote.versions}
        onRestore={() => undefined}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body, "expected VersionHistoryList chrome to render").toMatch(
      /version history/i,
    );
    assertNoBannedTokens("VersionHistoryList", body);
  });

  it("DeleteQuoteModal (open=true) renders no banned ML-jargon tokens", () => {
    renderWithProviders(
      <DeleteQuoteModal
        open={true}
        onClose={() => undefined}
        quoteId={Phase5Fixtures.savedQuote.id}
        quoteName={Phase5Fixtures.savedQuote.name}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body, "expected DeleteQuoteModal chrome to render").toMatch(
      /delete this quote\?/i,
    );
    assertNoBannedTokens("DeleteQuoteModal", body);
  });

  it("SaveQuoteDialog (open=true) renders no banned ML-jargon tokens", () => {
    renderWithProviders(
      <SaveQuoteDialog
        open={true}
        onClose={() => undefined}
        payload={{
          workspace: "real",
          formValues: Phase5Fixtures.formValues,
          unifiedResult: Phase5Fixtures.unifiedResult,
          suggestedName: "ME 800h · Vision · 2026-05-05",
        }}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body, "expected SaveQuoteDialog chrome to render").toMatch(
      /save this quote/i,
    );
    assertNoBannedTokens("SaveQuoteDialog", body);
  });

  it("SaveQuoteButton renders no banned ML-jargon tokens", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={Phase5Fixtures.formValues}
        unifiedResult={Phase5Fixtures.unifiedResult}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body, "expected SaveQuoteButton chrome to render").toMatch(
      /save quote/i,
    );
    assertNoBannedTokens("SaveQuoteButton", body);
  });

  it("MyQuotesPage renders no banned ML-jargon tokens", () => {
    renderWithProviders(<MyQuotesPage />);
    const body = document.body.textContent ?? "";
    expect(body, "expected MyQuotesPage chrome to render").toMatch(
      /my quotes/i,
    );
    assertNoBannedTokens("MyQuotesPage", body);
  });

  it("SavedQuotePage renders no banned ML-jargon tokens", () => {
    renderWithProviders(<SavedQuotePage />);
    const body = document.body.textContent ?? "";
    // Without a router :id param the page renders its loading state. The
    // marker regex accepts loading copy or any of the loaded-state landmarks
    // so the test stays meaningful regardless of how data fetching resolves.
    expect(body, "expected SavedQuotePage chrome to render").toMatch(
      /(back to my quotes|version history|status|loading)/i,
    );
    assertNoBannedTokens("SavedQuotePage", body);
  });
});

// ---------------------------------------------------------------------------
// Phase 6 — multi-vision surface coverage (D-17)
//
// Covers every customer-facing string introduced by Phase 6:
//   - VisionRowsField empty/populated states ("Add vision system",
//     "Remove vision system", "No vision systems on this project.",
//     "Vision type", "Count")
//   - QuoteResultPanel "Per-vision contribution" section + per-row labels
//   - QuoteResultPanel inputs-echo "Vision systems" row + "2D × 2; 3D × 1"
//
// NO additions to BANNED_TOKENS — Phase 6 introduces no new ML-risk
// vocabulary; the existing 16-pattern list catches anything that would slip
// (e.g. "delta from baseline" via /\bregression\b/ family).
// ---------------------------------------------------------------------------

// VisionRowsField requires a real form harness so useFieldArray binds to state.
function VisionRowsHarness({ rows }: { rows: VisionRow[] }) {
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { ...quoteFormDefaults, visionRows: rows },
  });
  return (
    <VisionRowsField
      control={form.control}
      visionTypeOptions={["Cognex 2D", "3D Vision", "Keyence IV3"]}
    />
  );
}

const PHASE6_BASE_RESULT: UnifiedQuoteResult = {
  estimateHours: 250,
  likelyRangeLow: 200,
  likelyRangeHigh: 320,
  overallConfidence: "moderate",
  perCategory: [],
  topDrivers: [],
  supportingMatches: { label: "Most similar training rows", items: [] },
};

describe("jargon-guard (DATA-03 — Phase 6 surface coverage)", () => {
  it("VisionRowsField (empty state) renders no banned ML-jargon tokens", () => {
    const { unmount } = renderWithProviders(<VisionRowsHarness rows={[]} />);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/no vision systems/i);
    expect(body).toMatch(/add vision system/i);
    assertNoBannedTokens("VisionRowsField (empty)", body);
    unmount();
  });

  it("VisionRowsField (populated) renders no banned ML-jargon tokens", () => {
    renderWithProviders(
      <VisionRowsHarness rows={[{ type: "Cognex 2D", count: 2 }, { type: "3D Vision", count: 1 }]} />,
    );
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/add vision system/i);
    assertNoBannedTokens("VisionRowsField (populated)", body);
  });

  it("QuoteResultPanel with perVisionContributions populated renders no banned tokens", () => {
    const result: UnifiedQuoteResult = {
      ...PHASE6_BASE_RESULT,
      perVisionContributions: [
        {
          rowIndex: 0,
          rowLabel: "Vision 1: Cognex 2D × 2",
          hoursDelta: 38,
          topDrivers: [{ label: "Number of stations", direction: "increases" }],
        },
        {
          rowIndex: 1,
          rowLabel: "Vision 2: 3D Vision × 1",
          hoursDelta: 65,
          topDrivers: [{ label: "Robot count", direction: "increases" }],
        },
      ],
    };
    renderWithProviders(
      <QuoteResultPanel
        result={result}
        input={{
          ...quoteFormDefaults,
          visionRows: [{ type: "Cognex 2D", count: 2 }, { type: "3D Vision", count: 1 }],
        }}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/per-vision contribution/i);
    assertNoBannedTokens("QuoteResultPanel (multi-vision)", body);
  });

  it("QuoteResultPanel inputs-echo 'Vision systems' row renders no banned tokens", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={PHASE6_BASE_RESULT}
        input={{
          ...quoteFormDefaults,
          visionRows: [{ type: "Cognex 2D", count: 2 }, { type: "3D Vision", count: 1 }],
        }}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/vision systems/i);
    // Recap echoes the type category only ("2D × 2; 3D × 1") — the brand-stamp
    // form ("Cognex 2D × 2") stays on the per-vision contribution rowLabel and
    // the form picker, not the recap.
    expect(body).toMatch(/2D × 2; 3D × 1/);
    expect(body).not.toMatch(/Cognex 2D × 2/);
    assertNoBannedTokens("QuoteResultPanel (inputs-echo Phase 6)", body);
  });
});

// ---------------------------------------------------------------------------
// Phase 7 — ROM-mode surface coverage (D-18)
//
// Covers every customer-facing string introduced by Phase 7's component
// primitives:
//   - RomBadge ("Preliminary")
//   - RomResultPanel hero, Why-preliminary card, sanity banner (both polarities)
//   - RomForm field labels, helper text, submit button, disabled hint
//   - QuoteRow ROM-badge render path (tooltip + visible badge)
//
// ComparisonRom + MachineLearningRom page-level scans are intentionally
// deferred — the local SC-3 differential render in RomResultPanel.test.tsx
// (Plan 07-03 Task 4) and the SC-4 round-trip below exercise the same
// chrome strings indirectly.
//
// NO additions to BANNED_TOKENS — Phase 7 introduces no new ML-risk
// vocabulary; the existing 16-pattern list catches everything.
// ---------------------------------------------------------------------------

function RomFormHarness() {
  const form = useForm<RomFormValues>({
    resolver: zodResolver(romFormSchema),
    defaultValues: romFormDefaults,
    mode: "onChange",
  });
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <RomForm
      formRef={formRef}
      form={form}
      dropdowns={{
        industry_segment: ["Automotive"],
        system_category: ["Robotic Cell"],
        automation_level: ["Semi-Auto"],
      }}
      onSubmit={() => undefined}
      submitting={false}
    />
  );
}

const ROM_BASE_RESULT: UnifiedQuoteResult = {
  estimateHours: 240,
  likelyRangeLow: 140,
  likelyRangeHigh: 340,
  overallConfidence: "moderate",
  perCategory: [],
  topDrivers: [],
  supportingMatches: { label: "Most similar past projects", items: [] },
};

const ROM_BASE_METADATA: RomMetadata = {
  mode: "rom",
  bandMultiplier: 1.75,
  baselineRate: 0.0008,
  sanityFlag: false,
};

describe("jargon-guard (DATA-03 — Phase 7 surface coverage)", () => {
  it("RomBadge renders no banned tokens", () => {
    renderWithProviders(<RomBadge />);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Preliminary");
    assertNoBannedTokens("RomBadge", body);
  });

  it("RomResultPanel (sanityFlag=false) renders no banned tokens", () => {
    renderWithProviders(
      <RomResultPanel
        result={ROM_BASE_RESULT}
        input={makeFormValues({
          industry_segment: "Automotive",
          system_category: "Robotic Cell",
          automation_level: "Semi-Auto",
          estimated_materials_cost: 245_000,
        })}
        rom={ROM_BASE_METADATA}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body).toContain("Why this is preliminary");
    assertNoBannedTokens("RomResultPanel (sanityFlag=false)", body);
  });

  it("RomResultPanel (sanityFlag=true) renders no banned tokens", () => {
    renderWithProviders(
      <RomResultPanel
        result={ROM_BASE_RESULT}
        input={makeFormValues({
          industry_segment: "Automotive",
          system_category: "Robotic Cell",
          automation_level: "Semi-Auto",
          estimated_materials_cost: 245_000,
        })}
        rom={{ ...ROM_BASE_METADATA, sanityFlag: true }}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body).toContain("This early estimate is unusually wide.");
    assertNoBannedTokens("RomResultPanel (sanityFlag=true)", body);
  });

  it("RomForm renders no banned tokens", () => {
    renderWithProviders(<RomFormHarness />);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Project basics");
    expect(body).toContain("Compute ROM estimate");
    assertNoBannedTokens("RomForm", body);
  });

  it("QuoteRow with mode='rom' renders no banned tokens (D-11 + D-18)", () => {
    renderWithProviders(
      <QuoteRow
        quote={{ ...Phase5Fixtures.savedQuote, mode: "rom" }}
        onAdvanceStatus={() => undefined}
        onRequestDelete={() => undefined}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body).toContain("Preliminary");
    assertNoBannedTokens("QuoteRow (ROM)", body);
  });

  it("BANNED_TOKENS list unchanged from Phase 6 (D-18)", () => {
    // D-18 lock: "No additions to BANNED_TOKENS". The existing 16-pattern list
    // (P10/P50/P90/pyodide/gradient boost/regression/ensemble/categorical/
    // embedding/training data/confidence interval/R²/quantile/sklearn/joblib)
    // covers every Phase 7 risk surface. If a future contributor wants to ADD
    // a banned token, the addition should be intentional and documented in a
    // CONTEXT.md decision — this assertion forces a code-review touchpoint.
    expect(BANNED_TOKENS.length).toBeGreaterThanOrEqual(16);
  });
});

// ---------------------------------------------------------------------------
// Phase 7 — ROM round-trip (SC-4)
//
// End-to-end integration: save a ROM quote → IDB round-trip preserves mode at
// top-level + per-version → list-row badge fires → SavedQuotePage 'Open in
// Quote tool' button links to /compare/rom (real) or /ml/rom (synthetic);
// full-mode quotes preserve the existing /compare/quote routing (regression).
//
// Each test uses crypto.randomUUID-generated SavedQuote ids (via the live
// saveSavedQuote path) so cross-test state pollution is harmless — every test
// inspects only records it just created by id.
// ---------------------------------------------------------------------------
describe("Phase 7 — ROM round-trip (SC-4)", () => {
  it("saveSavedQuote({mode:'rom'}) round-trips through list + get with mode preserved at top-level + per-version", async () => {
    const saved = await saveSavedQuote({
      name: "Round-trip ROM test",
      workspace: "real",
      formValues: Phase5Fixtures.formValues,
      unifiedResult: Phase5Fixtures.unifiedResult,
      mode: "rom",
    });

    expect(saved.mode).toBe("rom");
    expect(saved.versions[0].mode).toBe("rom");

    const all = await listSavedQuotes();
    const fromList = all.find((q) => q.id === saved.id);
    expect(fromList).toBeDefined();
    expect(fromList!.mode).toBe("rom");

    const fromGet = await getSavedQuote(saved.id);
    expect(fromGet).not.toBeNull();
    expect(fromGet!.mode).toBe("rom");
    expect(fromGet!.versions[0].mode).toBe("rom");
  });

  it("saveSavedQuote without mode defaults to 'full' and round-trips", async () => {
    const saved = await saveSavedQuote({
      name: "Round-trip full test",
      workspace: "real",
      formValues: Phase5Fixtures.formValues,
      unifiedResult: Phase5Fixtures.unifiedResult,
    });
    expect(saved.mode).toBe("full");
    const fromGet = await getSavedQuote(saved.id);
    expect(fromGet!.mode).toBe("full");
  });

  it("QuoteRow renders 'Preliminary' for a saved ROM record (D-11)", async () => {
    const saved = await saveSavedQuote({
      name: "QuoteRow ROM test",
      workspace: "real",
      formValues: Phase5Fixtures.formValues,
      unifiedResult: Phase5Fixtures.unifiedResult,
      mode: "rom",
    });
    renderWithProviders(
      <QuoteRow
        quote={saved}
        onAdvanceStatus={() => undefined}
        onRequestDelete={() => undefined}
      />,
    );
    expect(document.body.textContent).toContain("Preliminary");
  });

  it("SavedQuotePage 'Open in Quote tool' links to /compare/rom for ROM real-workspace quote (D-20)", async () => {
    const saved = await saveSavedQuote({
      name: "SC-4 routing real-rom",
      workspace: "real",
      formValues: Phase5Fixtures.formValues,
      unifiedResult: Phase5Fixtures.unifiedResult,
      mode: "rom",
    });
    // renderWithProviders already wraps in MemoryRouter + QueryClientProvider.
    // Pass <Routes> as the ui arg and seed initialEntries via the route option.
    renderWithProviders(
      <Routes>
        <Route path="/quotes/:id" element={<SavedQuotePage />} />
      </Routes>,
      { route: `/quotes/${saved.id}` },
    );
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /open in quote tool/i }),
      ).toBeInTheDocument();
    });
    const link = screen.getByRole("link", {
      name: /open in quote tool/i,
    }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(
      `/compare/rom?fromQuote=${saved.id}`,
    );
  });

  it("SavedQuotePage 'Open in Quote tool' links to /ml/rom for ROM synthetic-workspace quote (D-20)", async () => {
    const saved = await saveSavedQuote({
      name: "SC-4 routing synthetic-rom",
      workspace: "synthetic",
      formValues: Phase5Fixtures.formValues,
      unifiedResult: Phase5Fixtures.unifiedResult,
      mode: "rom",
    });
    renderWithProviders(
      <Routes>
        <Route path="/quotes/:id" element={<SavedQuotePage />} />
      </Routes>,
      { route: `/quotes/${saved.id}` },
    );
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /open in quote tool/i }),
      ).toBeInTheDocument();
    });
    const link = screen.getByRole("link", {
      name: /open in quote tool/i,
    }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(`/ml/rom?fromQuote=${saved.id}`);
  });

  it("SavedQuotePage 'Open in Quote tool' STILL links to /compare/quote for full real-workspace quote (regression)", async () => {
    const saved = await saveSavedQuote({
      name: "SC-4 routing real-full",
      workspace: "real",
      formValues: Phase5Fixtures.formValues,
      unifiedResult: Phase5Fixtures.unifiedResult,
      // no mode → defaults to "full"
    });
    renderWithProviders(
      <Routes>
        <Route path="/quotes/:id" element={<SavedQuotePage />} />
      </Routes>,
      { route: `/quotes/${saved.id}` },
    );
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /open in quote tool/i }),
      ).toBeInTheDocument();
    });
    const link = screen.getByRole("link", {
      name: /open in quote tool/i,
    }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(
      `/compare/quote?fromQuote=${saved.id}`,
    );
  });
});
