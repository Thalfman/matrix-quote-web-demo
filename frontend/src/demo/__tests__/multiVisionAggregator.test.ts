import { describe, expect, it, vi, beforeEach } from "vitest";

import type { QuoteInput, QuotePrediction, OpPrediction } from "@/api/types";
import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";

// Mock pyodideClient — the aggregator orchestrates predictQuote + getFeatureImportances.
vi.mock("@/demo/pyodideClient", () => ({
  predictQuote: vi.fn(),
  getFeatureImportances: vi.fn(() =>
    Promise.resolve({
      me10_actual_hours: [
        ["stations_count", 0.5],
        ["robot_count", 0.3],
      ],
      ee20_actual_hours: [
        ["servo_axes", 0.4],
        ["drive_count", 0.2],
      ],
      // shorter list ok; the aggregator only reads top-2 per dominant target.
    }),
  ),
}));

// Spy on toUnifiedResult so we can assert what `input` field the aggregator forwards.
vi.mock("@/demo/quoteAdapter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/demo/quoteAdapter")>();
  return {
    ...actual,
    toUnifiedResult: vi.fn(actual.toUnifiedResult),
  };
});

import { predictQuote } from "@/demo/pyodideClient";
import { toUnifiedResult } from "@/demo/quoteAdapter";
import { aggregateMultiVisionEstimate } from "@/demo/multiVisionAggregator";

beforeEach(() => {
  vi.mocked(predictQuote).mockReset();
  vi.mocked(toUnifiedResult).mockClear();
});

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeOp(
  p50: number,
  halfWidth = 10,
  confidence: OpPrediction["confidence"] = "high",
): OpPrediction {
  return {
    p50,
    p10: Math.max(0, p50 - halfWidth),
    p90: p50 + halfWidth,
    std: halfWidth / 2,
    rel_width: halfWidth / Math.max(1, p50),
    confidence,
  };
}

function makePred(
  totalP50: number,
  halfWidth = 10,
  confidence: OpPrediction["confidence"] = "high",
): QuotePrediction {
  // 12 ops; we'll spread totalP50 across me10 and ee20 for testing.
  // Most ops zero so deltas are easy to reason about.
  const ops: Record<string, OpPrediction> = {
    me10: makeOp(totalP50 * 0.6, halfWidth, confidence),
    ee20: makeOp(totalP50 * 0.4, halfWidth, confidence),
    me15: makeOp(0, 0, confidence),
    me230: makeOp(0, 0, confidence),
    rb30: makeOp(0, 0, confidence),
    cp50: makeOp(0, 0, confidence),
    bld100: makeOp(0, 0, confidence),
    shp150: makeOp(0, 0, confidence),
    inst160: makeOp(0, 0, confidence),
    trv180: makeOp(0, 0, confidence),
    doc190: makeOp(0, 0, confidence),
    pm200: makeOp(0, 0, confidence),
  };
  return {
    ops,
    total_p50: totalP50,
    total_p10: Math.max(0, totalP50 - halfWidth * Math.sqrt(2)),
    total_p90: totalP50 + halfWidth * Math.sqrt(2),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("aggregateMultiVisionEstimate", () => {
  it("empty visionRows -> single baseline call, no per-vision contributions", async () => {
    vi.mocked(predictQuote).mockResolvedValueOnce(makePred(100));
    const out = await aggregateMultiVisionEstimate({
      formValues: makeFormValues({ visionRows: [] }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "Most similar training rows",
    });
    expect(vi.mocked(predictQuote)).toHaveBeenCalledTimes(1);
    expect(out.perVisionContributions).toEqual([]);
    expect(out.result.estimateHours).toBeCloseTo(100, 0);
  });

  it("single row 2D x 1 -> baseline + 1 per-row call; result equals perRow total", async () => {
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100)) // baseline
      .mockResolvedValueOnce(makePred(130)); // perRow
    const out = await aggregateMultiVisionEstimate({
      formValues: makeFormValues({ visionRows: [{ type: "2D", count: 1 }] }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "Most similar training rows",
    });
    expect(vi.mocked(predictQuote)).toHaveBeenCalledTimes(2);
    expect(out.perVisionContributions).toHaveLength(1);
    expect(out.perVisionContributions[0]).toMatchObject({
      rowIndex: 0,
      hoursDelta: 30,
    });
    // total = baseline 100 + (130 - 100) = 130
    expect(out.result.estimateHours).toBeCloseTo(130, 0);
  });

  it("three rows mixed types -> 4 calls; per-row sums to total p50", async () => {
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100)) // baseline
      .mockResolvedValueOnce(makePred(130)) // row 0: +30
      .mockResolvedValueOnce(makePred(160)) // row 1: +60
      .mockResolvedValueOnce(makePred(110)); // row 2: +10
    const out = await aggregateMultiVisionEstimate({
      formValues: makeFormValues({
        visionRows: [
          { type: "2D", count: 1 },
          { type: "3D", count: 1 },
          { type: "2D", count: 2 },
        ],
      }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "Most similar training rows",
    });
    expect(vi.mocked(predictQuote)).toHaveBeenCalledTimes(4);
    expect(out.perVisionContributions).toHaveLength(3);
    const sumDeltas = out.perVisionContributions.reduce((s, c) => s + c.hoursDelta, 0);
    expect(out.result.estimateHours).toBeCloseTo(100 + sumDeltas, 0); // 100 + 30 + 60 + 10 = 200
  });

  it("range half-widths combine via root-sum-square (asymmetric, D-07)", async () => {
    // Per-op math (makePred spreads totalP50 across me10 and ee20, both with the
    // same passed halfWidth):
    //   me10: baseHi=10, perRow Hi=30, deltaHi=20 -> RSS = sqrt(10^2 + 20^2) ≈ 22.36
    //   ee20: baseHi=10, perRow Hi=30, deltaHi=20 -> RSS = sqrt(10^2 + 20^2) ≈ 22.36
    // toUnifiedResult sums per-category rangeHigh - estimateHours, so the
    // aggregated upperHalf = ~22.36 + ~22.36 ≈ 44.72.
    // Linear half-width sum (no RSS) would be (10+20)*2 = 60.
    // Plain summing of perRow ranges (no aggregation) would also be 60.
    // We assert the aggregated half-width is materially LESS than the linear
    // sum -> RSS asymmetry preservation holds.
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100, 10))   // baseline halfWidth 10
      .mockResolvedValueOnce(makePred(130, 30));  // perRow halfWidth 30 -> deltaHi 20 per op
    const out = await aggregateMultiVisionEstimate({
      formValues: makeFormValues({ visionRows: [{ type: "2D", count: 1 }] }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "Most similar training rows",
    });
    const upperHalf = out.result.likelyRangeHigh - out.result.estimateHours;
    // 2 * sqrt(10^2 + 20^2) ≈ 44.72
    expect(upperHalf).toBeCloseTo(2 * Math.sqrt(10 * 10 + 20 * 20), 1);
    // Strictly less than linear sum (10+20)*2 = 60 — proves RSS is in effect.
    expect(upperHalf).toBeLessThan(60);
    // Strictly more than baseline alone (10*2 = 20).
    expect(upperHalf).toBeGreaterThan(20);
  });

  it("hoursDelta sign drives direction on per-vision drivers", async () => {
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))  // baseline
      .mockResolvedValueOnce(makePred(150))  // row 0: +50 -> increases
      .mockResolvedValueOnce(makePred(80));  // row 1: -20 -> decreases
    const out = await aggregateMultiVisionEstimate({
      formValues: makeFormValues({
        visionRows: [
          { type: "2D", count: 1 },
          { type: "3D", count: 1 },
        ],
      }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "Most similar training rows",
    });
    expect(out.perVisionContributions[0].hoursDelta).toBeCloseTo(50, 0);
    out.perVisionContributions[0].topDrivers.forEach((d) =>
      expect(d.direction).toBe("increases"),
    );
    expect(out.perVisionContributions[1].hoursDelta).toBeCloseTo(-20, 0);
    out.perVisionContributions[1].topDrivers.forEach((d) =>
      expect(d.direction).toBe("decreases"),
    );
  });

  it("each predictQuote call gets the correct vision_type / vision_systems_count overlay", async () => {
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))
      .mockResolvedValueOnce(makePred(120))
      .mockResolvedValueOnce(makePred(140));
    await aggregateMultiVisionEstimate({
      formValues: makeFormValues({
        visionRows: [
          { type: "2D", count: 2 },
          { type: "3D", count: 1 },
        ],
      }),
      dataset: "real",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
    });
    const calls = vi.mocked(predictQuote).mock.calls;
    expect(calls).toHaveLength(3);
    // Call 0: baseline {"None", 0}.
    expect(calls[0][0]).toMatchObject({ vision_type: "None", vision_systems_count: 0 });
    // Call 1: row 0 {"2D", 2}.
    expect(calls[1][0]).toMatchObject({ vision_type: "2D", vision_systems_count: 2 });
    // Call 2: row 1 {"3D", 1}.
    expect(calls[2][0]).toMatchObject({ vision_type: "3D", vision_systems_count: 1 });
    // Dataset threaded correctly:
    calls.forEach((c) => expect(c[1]).toBe("real"));
  });

  it("row label format: 'Vision N: T x C' and 'Vision N - <label>: T x C' when label present", async () => {
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))
      .mockResolvedValueOnce(makePred(130))
      .mockResolvedValueOnce(makePred(160));
    const out = await aggregateMultiVisionEstimate({
      formValues: makeFormValues({
        visionRows: [
          { type: "2D", count: 2 },
          { type: "3D", count: 1, label: "pick-and-place" },
        ],
      }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
    });
    expect(out.perVisionContributions[0].rowLabel).toBe("Vision 1: 2D × 2");
    expect(out.perVisionContributions[1].rowLabel).toBe("Vision 2 — pick-and-place: 3D × 1");
  });

  it("does not mutate formValues.visionRows", async () => {
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))
      .mockResolvedValueOnce(makePred(120));
    const rows = [{ type: "2D" as const, count: 1 }];
    const fv = makeFormValues({ visionRows: rows });
    await aggregateMultiVisionEstimate({
      formValues: fv,
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
    });
    expect(fv.visionRows).toEqual(rows);
    expect(fv.visionRows).toHaveLength(1);
  });

  it("D-04: inputForMatching override is forwarded to toUnifiedResult; falls through to baselineInput when omitted", async () => {
    // Case A: no override → toUnifiedResult sees baselineInput (vision_type="None", count=0).
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))
      .mockResolvedValueOnce(makePred(130));
    await aggregateMultiVisionEstimate({
      formValues: makeFormValues({ visionRows: [{ type: "2D", count: 2 }] }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
    });
    const callA = vi.mocked(toUnifiedResult).mock.calls[0][0];
    expect(callA.input).toMatchObject({ vision_type: "None", vision_systems_count: 0 });

    // Case B: override provided → toUnifiedResult sees the overridden shape.
    vi.mocked(toUnifiedResult).mockClear();
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100))
      .mockResolvedValueOnce(makePred(130));
    const inputForMatching: QuoteInput = {
      industry_segment: "Aerospace",
      system_category: "Assembly",
      automation_level: "Semi-auto",
      plc_family: "AB Compact Logix",
      hmi_family: "AB PanelView Plus",
      vision_type: "2D",
      vision_systems_count: 2,
    };
    await aggregateMultiVisionEstimate({
      formValues: makeFormValues({ visionRows: [{ type: "2D", count: 2 }] }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
      inputForMatching,
    });
    const callB = vi.mocked(toUnifiedResult).mock.calls[0][0];
    expect(callB.input).toBe(inputForMatching);
    expect(callB.input.vision_type).toBe("2D");
    expect(callB.input.vision_systems_count).toBe(2);
  });

  it("WR-03 / D-07: aggregated overallConfidence is the worst case across baseline + per-row predicts", async () => {
    // Baseline carries "high" everywhere; one per-row predict carries "low"
    // ("lower" in UI vocab). The aggregated rollup must surface "lower" even
    // though RSS half-widths are tight and toUnifiedResult's R^2-driven path
    // would otherwise pick "lower" only because metrics={} (zero R^2).
    vi.mocked(predictQuote)
      .mockResolvedValueOnce(makePred(100, 10, "high"))
      .mockResolvedValueOnce(makePred(120, 10, "high"))
      .mockResolvedValueOnce(makePred(110, 10, "low"));
    const out = await aggregateMultiVisionEstimate({
      formValues: makeFormValues({
        visionRows: [
          { type: "2D", count: 1 },
          { type: "3D", count: 1 },
        ],
      }),
      dataset: "synthetic",
      metrics: {},
      supportingPool: [],
      supportingLabel: "x",
    });
    expect(out.result.overallConfidence).toBe("lower");

    // Inverse case: every predict is "high" — the adapter's rollup would
    // otherwise dictate the result. Confirm the min-confidence overlay
    // doesn't degrade a fully-high run.
    vi.mocked(predictQuote)
      .mockReset()
      .mockResolvedValueOnce(makePred(100, 10, "high"))
      .mockResolvedValueOnce(makePred(120, 10, "high"));
    const out2 = await aggregateMultiVisionEstimate({
      formValues: makeFormValues({ visionRows: [{ type: "2D", count: 1 }] }),
      dataset: "synthetic",
      metrics: {
        // Inject a high-R^2 metric for the dominant target so the adapter
        // rollup also returns "high"; the aggregator's overlay should NOT
        // worsen that result.
        me10_actual_hours: { target: "me10_actual_hours", rows: 100, mae: 1, r2: 0.9 },
        ee20_actual_hours: { target: "ee20_actual_hours", rows: 100, mae: 1, r2: 0.9 },
      },
      supportingPool: [],
      supportingLabel: "x",
    });
    expect(out2.result.overallConfidence).toBe("high");
  });
});
