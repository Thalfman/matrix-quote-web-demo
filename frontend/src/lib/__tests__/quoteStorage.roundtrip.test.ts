/**
 * Phase 6 — end-to-end round-trip test (D-15 + Success Criterion #4).
 *
 * Saves a multi-vision quote via Phase 5 saveSavedQuote, reopens via
 * getSavedQuote, runs aggregateMultiVisionEstimate against the reopened
 * formValues, and asserts the aggregated p50 matches the original.
 */
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";

// Mock predictQuote so two identical aggregator runs produce identical results.
vi.mock("@/demo/pyodideClient", () => ({
  predictQuote: vi.fn(),
  getFeatureImportances: vi.fn(() =>
    Promise.resolve({ me10_actual_hours: [["stations_count", 0.5]] }),
  ),
}));

import { predictQuote } from "@/demo/pyodideClient";

beforeEach(() => {
  // Fresh fake-IDB per test so DB version + record state don't bleed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).indexedDB = new IDBFactory();
  vi.resetModules();
  vi.mocked(predictQuote).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeOp(p50: number, halfWidth = 10) {
  return {
    p50,
    p10: Math.max(0, p50 - halfWidth),
    p90: p50 + halfWidth,
    std: halfWidth / 2,
    rel_width: halfWidth / Math.max(1, p50),
    confidence: "high" as const,
  };
}

function makePred(totalP50: number) {
  const ops: Record<string, ReturnType<typeof makeOp>> = {
    me10: makeOp(totalP50 * 0.6),
    ee20: makeOp(totalP50 * 0.4),
    me15: makeOp(0, 0),
    me230: makeOp(0, 0),
    rb30: makeOp(0, 0),
    cp50: makeOp(0, 0),
    bld100: makeOp(0, 0),
    shp150: makeOp(0, 0),
    inst160: makeOp(0, 0),
    trv180: makeOp(0, 0),
    doc190: makeOp(0, 0),
    pm200: makeOp(0, 0),
  };
  return {
    ops,
    total_p50: totalP50,
    total_p10: Math.max(0, totalP50 - 14),
    total_p90: totalP50 + 14,
    sales_buckets: {},
  };
}

function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return {
    ...quoteFormDefaults,
    industry_segment: "Aerospace",
    system_category: "Assembly",
    automation_level: "Semi-auto",
    ...over,
  };
}

describe("Phase 6 round-trip (Success Criterion #4 + D-15)", () => {
  it("multi-vision quote: save -> reopen preserves visionRows verbatim", async () => {
    const { saveSavedQuote, getSavedQuote } = await import("@/lib/quoteStorage");
    const visionRows = [
      { type: "Cognex 2D", count: 2 },
      { type: "3D Vision", count: 1 },
    ];
    const formValues = makeFormValues({ visionRows });

    // Mock a single baseline + 2 per-row predict results so the aggregator
    // produces a deterministic UnifiedQuoteResult to persist.
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))
      .mockResolvedValueOnce(makePred(140))
      .mockResolvedValueOnce(makePred(180));
    const { aggregateMultiVisionEstimate } = await import("@/demo/multiVisionAggregator");
    const initial = await aggregateMultiVisionEstimate({
      formValues,
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "Most similar training rows",
    });

    const saved = await saveSavedQuote({
      name: "Round-trip multi-vision",
      workspace: "synthetic",
      formValues,
      unifiedResult: initial.result as unknown as Record<string, unknown>,
    });
    expect(saved.id).toBeDefined();
    expect(saved.schemaVersion).toBe(2);

    const reopened = await getSavedQuote(saved.id);
    expect(reopened).not.toBeNull();
    const lastVer = reopened!.versions[reopened!.versions.length - 1];
    expect(lastVer.formValues.visionRows).toEqual(visionRows);
  });

  it("multi-vision quote: save -> reopen -> re-run produces same aggregated p50", async () => {
    const { saveSavedQuote, getSavedQuote } = await import("@/lib/quoteStorage");
    const visionRows = [
      { type: "Cognex 2D", count: 2 },
      { type: "3D Vision", count: 1 },
    ];
    const formValues = makeFormValues({ visionRows });

    // Initial aggregator run — feed predict mocks for the SAVE path.
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))
      .mockResolvedValueOnce(makePred(140))
      .mockResolvedValueOnce(makePred(180));
    const { aggregateMultiVisionEstimate } = await import("@/demo/multiVisionAggregator");
    const initial = await aggregateMultiVisionEstimate({
      formValues,
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
    });
    const initialP50 = initial.result.estimateHours;

    // Save it.
    const saved = await saveSavedQuote({
      name: "Round-trip same p50",
      workspace: "synthetic",
      formValues,
      unifiedResult: initial.result as unknown as Record<string, unknown>,
    });

    // Reopen.
    const reopened = await getSavedQuote(saved.id);
    expect(reopened).not.toBeNull();
    const restoredFormValues =
      reopened!.versions[reopened!.versions.length - 1].formValues;

    // Re-run aggregator with IDENTICAL predict mocks.
    vi.mocked(predictQuote).mockReset();
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))
      .mockResolvedValueOnce(makePred(140))
      .mockResolvedValueOnce(makePred(180));
    const rerun = await aggregateMultiVisionEstimate({
      formValues: restoredFormValues,
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
    });

    // p50 must match within 0.5 hours rounding tolerance.
    expect(rerun.result.estimateHours).toBeCloseTo(initialP50, 0);

    // Per-vision contributions must align (count + ordering).
    expect(rerun.perVisionContributions).toHaveLength(2);
    expect(rerun.perVisionContributions[0].rowIndex).toBe(0);
    expect(rerun.perVisionContributions[1].rowIndex).toBe(1);
  });

  it("empty-visionRows quote: save -> reopen preserves visionRows: []", async () => {
    const { saveSavedQuote, getSavedQuote } = await import("@/lib/quoteStorage");
    const formValues = makeFormValues({ visionRows: [] });

    vi.mocked(predictQuote).mockResolvedValueOnce(makePred(100));
    const { aggregateMultiVisionEstimate } = await import("@/demo/multiVisionAggregator");
    const initial = await aggregateMultiVisionEstimate({
      formValues,
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
    });

    const saved = await saveSavedQuote({
      name: "Round-trip no vision",
      workspace: "synthetic",
      formValues,
      unifiedResult: initial.result as unknown as Record<string, unknown>,
    });

    const reopened = await getSavedQuote(saved.id);
    const lastVer = reopened!.versions[reopened!.versions.length - 1];
    expect(lastVer.formValues.visionRows).toEqual([]);
  });
});
