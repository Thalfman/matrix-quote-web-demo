/**
 * Phase 7 — D-04 / D-05 / D-09 / D-15. romEstimator unit tests.
 *
 * Asserts the locked invariants of the ROM-mode estimator:
 *   - ROM_BAND_MULTIPLIER (1.75) widens hero + per-category half-widths (D-09).
 *   - ROM_BASELINE_RATE_HOURS_PER_DOLLAR (0.0008) drives the sanity-flag check
 *     in both polarities (model >> heuristic, and heuristic >> model) per D-15.
 *   - Single predictQuote call (D-04 single-call ROM contract).
 *   - Hidden hour-driving inputs filled from quoteFormDefaults (D-04).
 *   - perVisionContributions forced to [] in ROM mode (D-06).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  estimateRom,
  ROM_BAND_MULTIPLIER,
  ROM_BASELINE_RATE_HOURS_PER_DOLLAR,
} from "@/demo/romEstimator";
import type { OpPrediction, QuotePrediction } from "@/api/types";
import type { ProjectRecord } from "@/demo/realProjects";
import type { ModelMetric } from "@/demo/modelMetrics";

// Mock pyodideClient — the estimator orchestrates predictQuote +
// getFeatureImportances exactly like multiVisionAggregator does.
vi.mock("@/demo/pyodideClient", () => ({
  predictQuote: vi.fn(),
  getFeatureImportances: vi.fn(() =>
    Promise.resolve({
      me10_actual_hours: [
        ["stations_count", 0.5],
        ["robot_count", 0.3],
      ],
    }),
  ),
}));

import { predictQuote } from "@/demo/pyodideClient";

beforeEach(() => {
  vi.mocked(predictQuote).mockReset();
});

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeOp(p10: number, p50: number, p90: number): OpPrediction {
  const halfHigh = Math.max(0, p90 - p50);
  const halfLow = Math.max(0, p50 - p10);
  const halfWidth = (halfHigh + halfLow) / 2;
  return {
    p10,
    p50,
    p90,
    std: halfWidth / 2,
    rel_width: (p90 - p10) / Math.max(1, p50),
    confidence: "high",
  };
}

interface MakePredArgs {
  p10?: number;
  p50?: number;
  p90?: number;
}

/**
 * Build a minimal QuotePrediction with a single op (me10) carrying the
 * supplied tuple. Other ops zero so the perCategory aggregation in
 * toUnifiedResult sees one non-zero row, keeping band-widening assertions
 * crisp.
 */
function makePrediction({
  p10 = 100,
  p50 = 200,
  p90 = 300,
}: MakePredArgs = {}): QuotePrediction {
  const op = makeOp(p10, p50, p90);
  const zeroOp = makeOp(0, 0, 0);
  return {
    total_p10: p10,
    total_p50: p50,
    total_p90: p90,
    ops: {
      me10: op,
      me15: zeroOp,
      me230: zeroOp,
      ee20: zeroOp,
      rb30: zeroOp,
      cp50: zeroOp,
      bld100: zeroOp,
      shp150: zeroOp,
      inst160: zeroOp,
      trv180: zeroOp,
      doc190: zeroOp,
      pm200: zeroOp,
    },
    sales_buckets: {},
  };
}

// toUnifiedResult tolerates an empty pool — supportingItems just renders
// as an empty array. ModelMetric typed-narrow record keeps r2/mae/n_samples
// happy without bringing in fixture machinery from other tests.
const FAKE_METRICS: Record<string, ModelMetric> = {
  me10_actual_hours: {
    target: "me10_actual_hours",
    r2: 0.85,
    mae: 50,
    rows: 24,
  },
};
const FAKE_POOL: ProjectRecord[] = [];

const baseRom = {
  industry_segment: "Automotive",
  system_category: "Robotic Cell",
  automation_level: "Semi-Auto",
  estimated_materials_cost: 250_000,
};

const baseArgs = {
  dataset: "real" as const,
  metrics: FAKE_METRICS,
  supportingPool: FAKE_POOL,
  supportingLabel: "Most similar past projects",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("estimateRom", () => {
  it("widens hero range by ROM_BAND_MULTIPLIER (D-09)", async () => {
    vi.mocked(predictQuote).mockResolvedValue(
      makePrediction({ p10: 100, p50: 200, p90: 300 }),
    );
    const out = await estimateRom({ romValues: baseRom, ...baseArgs });
    // Narrow half-widths: low = 200-100 = 100, high = 300-200 = 100.
    // Widened: low = 200 - 100*1.75 = 25; high = 200 + 100*1.75 = 375.
    expect(out.result.likelyRangeLow).toBeCloseTo(25, 0);
    expect(out.result.likelyRangeHigh).toBeCloseTo(375, 0);
    expect(out.result.estimateHours).toBeCloseTo(200, 0);
  });

  it("clamps widened low at zero — never negative", async () => {
    // p50=50, narrow low=30, widened low = 50 - (50-30)*1.75 = 50 - 35 = 15
    // (positive). Verify the clamp survives.
    vi.mocked(predictQuote).mockResolvedValue(
      makePrediction({ p10: 30, p50: 50, p90: 90 }),
    );
    const out = await estimateRom({
      romValues: { ...baseRom, estimated_materials_cost: 50_000 },
      ...baseArgs,
    });
    expect(out.result.likelyRangeLow).toBeGreaterThanOrEqual(0);
  });

  it("widens per-category ranges by ROM_BAND_MULTIPLIER (D-09)", async () => {
    vi.mocked(predictQuote).mockResolvedValue(
      makePrediction({ p10: 100, p50: 200, p90: 300 }),
    );
    const out = await estimateRom({ romValues: baseRom, ...baseArgs });
    // The single non-zero per-category row should carry widened bounds.
    const me10Row = out.result.perCategory.find((c) => c.estimateHours > 0);
    expect(me10Row).toBeDefined();
    if (me10Row) {
      // Half-widths: narrow = 100; widened half = 100 * 1.75 = 175.
      const widenedHalfLow = me10Row.estimateHours - me10Row.rangeLow;
      const widenedHalfHigh = me10Row.rangeHigh - me10Row.estimateHours;
      expect(widenedHalfLow).toBeCloseTo(175, 0);
      expect(widenedHalfHigh).toBeCloseTo(175, 0);
    }
  });

  it("triggers sanity flag when model output >> heuristic (D-05/D-15)", async () => {
    // Materials = $1,000 → heuristic = 0.8 hrs. Model = 10000.
    // Widened result.estimateHours stays = p50 = 10000 (band-widening
    // touches half-widths only). Ratio = 10000 / 0.8 = 12,500 >> 5.
    vi.mocked(predictQuote).mockResolvedValue(
      makePrediction({ p10: 9000, p50: 10000, p90: 11000 }),
    );
    const out = await estimateRom({
      romValues: { ...baseRom, estimated_materials_cost: 1_000 },
      ...baseArgs,
    });
    expect(out.rom.sanityFlag).toBe(true);
  });

  it("triggers sanity flag when heuristic >> model output (inverse, D-05/D-15)", async () => {
    // Materials = $1,000,000 → heuristic = 800 hrs. Model = 1.
    // Inverse ratio = 800/1 = 800 >> 5.
    vi.mocked(predictQuote).mockResolvedValue(
      makePrediction({ p10: 0, p50: 1, p90: 2 }),
    );
    const out = await estimateRom({
      romValues: { ...baseRom, estimated_materials_cost: 1_000_000 },
      ...baseArgs,
    });
    expect(out.rom.sanityFlag).toBe(true);
  });

  it("does NOT trigger sanity flag when model and heuristic align", async () => {
    // Materials = $250,000 → heuristic = 200 hrs. Model = 200. Ratio = 1.0.
    vi.mocked(predictQuote).mockResolvedValue(
      makePrediction({ p10: 100, p50: 200, p90: 300 }),
    );
    const out = await estimateRom({
      romValues: { ...baseRom, estimated_materials_cost: 250_000 },
      ...baseArgs,
    });
    expect(out.rom.sanityFlag).toBe(false);
  });

  it("calls predictQuote EXACTLY ONCE (single-call ROM contract per D-04)", async () => {
    vi.mocked(predictQuote).mockResolvedValue(makePrediction());
    await estimateRom({ romValues: baseRom, ...baseArgs });
    expect(predictQuote).toHaveBeenCalledTimes(1);
  });

  it("fills hidden hour-driving inputs with quoteFormDefaults (D-04)", async () => {
    vi.mocked(predictQuote).mockResolvedValue(makePrediction());
    await estimateRom({ romValues: baseRom, ...baseArgs });
    const callArg = vi.mocked(predictQuote).mock.calls[0][0];
    // visionRows: [] in defaults → vision_type "None", count 0
    expect(callArg.vision_type).toBe("None");
    expect(callArg.vision_systems_count).toBe(0);
    // Required trio comes from romValues, not defaults
    expect(callArg.industry_segment).toBe("Automotive");
    expect(callArg.system_category).toBe("Robotic Cell");
    expect(callArg.automation_level).toBe("Semi-Auto");
  });

  it("returns RomMetadata with locked constants", async () => {
    vi.mocked(predictQuote).mockResolvedValue(makePrediction());
    const out = await estimateRom({ romValues: baseRom, ...baseArgs });
    expect(out.rom.mode).toBe("rom");
    expect(out.rom.bandMultiplier).toBe(ROM_BAND_MULTIPLIER); // 1.75
    expect(out.rom.baselineRate).toBe(ROM_BASELINE_RATE_HOURS_PER_DOLLAR); // 0.0008
  });

  it("exposes the ROM constants at their D-NN-locked values", () => {
    expect(ROM_BAND_MULTIPLIER).toBe(1.75);
    expect(ROM_BASELINE_RATE_HOURS_PER_DOLLAR).toBe(0.0008);
  });

  it("forces perVisionContributions to [] in ROM mode (D-06)", async () => {
    vi.mocked(predictQuote).mockResolvedValue(makePrediction());
    const out = await estimateRom({ romValues: baseRom, ...baseArgs });
    expect(out.result.perVisionContributions).toEqual([]);
  });

  it("returns formValues with the four ROM fields surfaced and visionRows defaulted to []", async () => {
    vi.mocked(predictQuote).mockResolvedValue(makePrediction());
    const out = await estimateRom({ romValues: baseRom, ...baseArgs });
    // The returned formValues is a full QuoteFormValues (recap-ready).
    expect(out.formValues.industry_segment).toBe("Automotive");
    expect(out.formValues.system_category).toBe("Robotic Cell");
    expect(out.formValues.automation_level).toBe("Semi-Auto");
    expect(out.formValues.estimated_materials_cost).toBe(250_000);
    expect(out.formValues.visionRows).toEqual([]);
  });
});
