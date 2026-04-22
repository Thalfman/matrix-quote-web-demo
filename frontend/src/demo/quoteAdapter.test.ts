import { describe, expect, it } from "vitest";

import type { QuoteInput } from "@/api/types";
import type { ProjectRecord } from "@/demo/realProjects";
import { toUnifiedResult } from "./quoteAdapter";
import type { AdapterArgs } from "./quoteAdapter";
import type { ModelMetric } from "./modelMetrics";

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

function makeInput(over: Partial<QuoteInput> = {}): QuoteInput {
  return {
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    plc_family: "AB Compact Logix",
    hmi_family: "AB YW0",
    vision_type: "None",
    stations_count: 4,
    robot_count: 2,
    ...over,
  };
}

function makeRecord(id: string, hours: number, over: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    project_id: id,
    project_name: `Project ${id}`,
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    plc_family: "AB Compact Logix",
    hmi_family: "AB YW0",
    vision_type: "None",
    stations_count: 4,
    robot_count: 2,
    me10_actual_hours: hours,
    ee20_actual_hours: hours * 0.5,
    bld100_actual_hours: hours * 0.3,
    ...over,
  };
}

function makeMetric(r2: number): ModelMetric {
  return { target: "", rows: 10, mae: 50, r2 };
}

const PREDICTION: AdapterArgs["prediction"] = {
  me10_actual_hours: { p10: 80, p50: 100, p90: 120 },
  ee20_actual_hours: { p10: 40, p50: 50, p90: 60 },
};

const IMPORTANCES: AdapterArgs["importances"] = {
  me10_actual_hours: [
    ["stations_count", 0.4],
    ["robot_count", 0.2],
    ["servo_axes", 0.1],
  ],
  ee20_actual_hours: [
    ["panel_count", 0.35],
    ["stations_count", 0.25],
    ["plc_family_AB", 0.1],
  ],
};

const METRICS: AdapterArgs["metrics"] = {
  me10_actual_hours: makeMetric(0.80),
  ee20_actual_hours: makeMetric(0.55),
};

const POOL: ProjectRecord[] = [
  makeRecord("p1", 200),
  makeRecord("p2", 180),
  makeRecord("p3", 220, { industry_segment: "Food & Beverage" }),
];

const BASE_ARGS: AdapterArgs = {
  input: makeInput(),
  prediction: PREDICTION,
  importances: IMPORTANCES,
  metrics: METRICS,
  supportingPool: POOL,
  supportingLabel: "Most similar past projects",
};

// ---------------------------------------------------------------------------
// Hero estimate
// ---------------------------------------------------------------------------

describe("toUnifiedResult — hero estimate", () => {
  it("sums per-category p50s for estimateHours", () => {
    const result = toUnifiedResult(BASE_ARGS);
    expect(result.estimateHours).toBeCloseTo(150, 5); // 100 + 50
  });

  it("sums per-category p90s for likelyRangeHigh", () => {
    const result = toUnifiedResult(BASE_ARGS);
    expect(result.likelyRangeHigh).toBeCloseTo(180, 5); // 120 + 60
  });

  it("sums per-category p10s for likelyRangeLow (clamped ≥ 0)", () => {
    const result = toUnifiedResult(BASE_ARGS);
    expect(result.likelyRangeLow).toBeCloseTo(120, 5); // 80 + 40
    expect(result.likelyRangeLow).toBeGreaterThanOrEqual(0);
  });

  it("clamps likelyRangeLow to 0 when p10 sum is negative", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: {
        ...PREDICTION,
        ee20_actual_hours: { p10: -999, p50: 50, p90: 60 },
      },
    };
    const result = toUnifiedResult(args);
    expect(result.likelyRangeLow).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Per-category shape
// ---------------------------------------------------------------------------

describe("toUnifiedResult — perCategory", () => {
  it("has one entry per prediction target", () => {
    const result = toUnifiedResult(BASE_ARGS);
    expect(result.perCategory).toHaveLength(2);
  });

  it("each entry has a label from CATEGORY_LABEL or falls back to key", () => {
    const result = toUnifiedResult(BASE_ARGS);
    const labels = result.perCategory.map((c) => c.label);
    // me10_actual_hours should get a business label
    expect(labels.some((l) => l.length > 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Confidence buckets
// ---------------------------------------------------------------------------

describe("toUnifiedResult — r2ToConfidence thresholds", () => {
  it("r2 ≥ 0.70 → high", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: { me10_actual_hours: { p10: 90, p50: 100, p90: 110 } },
      importances: { me10_actual_hours: [["stations_count", 0.3]] },
      metrics: { me10_actual_hours: makeMetric(0.70) },
    };
    const result = toUnifiedResult(args);
    expect(result.perCategory[0].confidence).toBe("high");
  });

  it("r2 = 0.699 → moderate", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: { me10_actual_hours: { p10: 90, p50: 100, p90: 110 } },
      importances: { me10_actual_hours: [["stations_count", 0.3]] },
      metrics: { me10_actual_hours: makeMetric(0.699) },
    };
    const result = toUnifiedResult(args);
    expect(result.perCategory[0].confidence).toBe("moderate");
  });

  it("r2 ≥ 0.50 and < 0.70 → moderate", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: { me10_actual_hours: { p10: 90, p50: 100, p90: 110 } },
      importances: { me10_actual_hours: [["stations_count", 0.3]] },
      metrics: { me10_actual_hours: makeMetric(0.60) },
    };
    const result = toUnifiedResult(args);
    expect(result.perCategory[0].confidence).toBe("moderate");
  });

  it("r2 < 0.50 → lower", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: { me10_actual_hours: { p10: 90, p50: 100, p90: 110 } },
      importances: { me10_actual_hours: [["stations_count", 0.3]] },
      metrics: { me10_actual_hours: makeMetric(0.30) },
    };
    const result = toUnifiedResult(args);
    expect(result.perCategory[0].confidence).toBe("lower");
  });

  it("missing metric (r2 = 0) → lower", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: { me10_actual_hours: { p10: 90, p50: 100, p90: 110 } },
      importances: { me10_actual_hours: [["stations_count", 0.3]] },
      metrics: {},
    };
    const result = toUnifiedResult(args);
    expect(result.perCategory[0].confidence).toBe("lower");
  });
});

// ---------------------------------------------------------------------------
// Overall confidence (rollUp)
// ---------------------------------------------------------------------------

describe("toUnifiedResult — overall confidence rollUp", () => {
  it("all high categories → overall high", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: {
        me10_actual_hours: { p10: 90, p50: 100, p90: 110 },
        ee20_actual_hours: { p10: 40, p50: 50, p90: 60 },
      },
      importances: { me10_actual_hours: [], ee20_actual_hours: [] },
      metrics: {
        me10_actual_hours: makeMetric(0.90),
        ee20_actual_hours: makeMetric(0.85),
      },
    };
    const result = toUnifiedResult(args);
    expect(result.overallConfidence).toBe("high");
  });

  it("all lower categories → overall lower", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: {
        me10_actual_hours: { p10: 90, p50: 100, p90: 110 },
        ee20_actual_hours: { p10: 40, p50: 50, p90: 60 },
      },
      importances: { me10_actual_hours: [], ee20_actual_hours: [] },
      metrics: {
        me10_actual_hours: makeMetric(0.10),
        ee20_actual_hours: makeMetric(0.20),
      },
    };
    const result = toUnifiedResult(args);
    expect(result.overallConfidence).toBe("lower");
  });

  it("weighted score ≥ 0.70 → high (one large high category, one tiny lower)", () => {
    // 90% of estimate is high (score contribution 0.9 * 1 = 0.9), 10% is lower (0.1 * 0 = 0)
    // weighted score = 0.9 ≥ 0.70 → high
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: {
        me10_actual_hours: { p10: 90, p50: 900, p90: 1100 },
        ee20_actual_hours: { p10: 5, p50: 100, p90: 115 },
      },
      importances: { me10_actual_hours: [], ee20_actual_hours: [] },
      metrics: {
        me10_actual_hours: makeMetric(0.80),
        ee20_actual_hours: makeMetric(0.10),
      },
    };
    const result = toUnifiedResult(args);
    expect(result.overallConfidence).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// Drivers rollup
// ---------------------------------------------------------------------------

describe("toUnifiedResult — topDrivers rollup", () => {
  it("returns at most 3 drivers", () => {
    const result = toUnifiedResult(BASE_ARGS);
    expect(result.topDrivers.length).toBeLessThanOrEqual(3);
  });

  it("same raw feature across multiple targets sums weights (stations_count ranks #1)", () => {
    // stations_count appears in both targets:
    // me10: 0.4 * (100/150) ≈ 0.267
    // ee20: 0.25 * (50/150) ≈ 0.083
    // total ≈ 0.35 — should beat any single-target feature
    const result = toUnifiedResult(BASE_ARGS);
    expect(result.topDrivers[0].label).toContain("station");
  });

  it("magnitude > 0.15 → strong", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: { me10_actual_hours: { p10: 90, p50: 100, p90: 110 } },
      importances: { me10_actual_hours: [["stations_count", 0.9]] },
      metrics: { me10_actual_hours: makeMetric(0.80) },
    };
    const result = toUnifiedResult(args);
    expect(result.topDrivers[0].magnitude).toBe("strong");
  });

  it("magnitude 0.08–0.15 → moderate", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: { me10_actual_hours: { p10: 90, p50: 100, p90: 110 } },
      importances: { me10_actual_hours: [["stations_count", 0.10]] },
      metrics: { me10_actual_hours: makeMetric(0.80) },
    };
    const result = toUnifiedResult(args);
    expect(result.topDrivers[0].magnitude).toBe("moderate");
  });

  it("magnitude ≤ 0.08 → minor", () => {
    const args: AdapterArgs = {
      ...BASE_ARGS,
      prediction: { me10_actual_hours: { p10: 90, p50: 100, p90: 110 } },
      importances: { me10_actual_hours: [["stations_count", 0.05]] },
      metrics: { me10_actual_hours: makeMetric(0.80) },
    };
    const result = toUnifiedResult(args);
    expect(result.topDrivers[0].magnitude).toBe("minor");
  });

  it("all drivers have direction = 'increases' (v1 contract)", () => {
    const result = toUnifiedResult(BASE_ARGS);
    result.topDrivers.forEach((d) => {
      expect(d.direction).toBe("increases");
    });
  });
});

// ---------------------------------------------------------------------------
// Supporting matches
// ---------------------------------------------------------------------------

describe("toUnifiedResult — supportingMatches", () => {
  it("carries the supportingLabel through to the result", () => {
    const result = toUnifiedResult(BASE_ARGS);
    expect(result.supportingMatches.label).toBe("Most similar past projects");
  });

  it("returns at most 3 items", () => {
    const result = toUnifiedResult(BASE_ARGS);
    expect(result.supportingMatches.items.length).toBeLessThanOrEqual(3);
  });

  it("each item has a similarity in 0..1", () => {
    const result = toUnifiedResult(BASE_ARGS);
    result.supportingMatches.items.forEach((m) => {
      expect(m.similarity).toBeGreaterThan(0);
      expect(m.similarity).toBeLessThanOrEqual(1);
    });
  });

  it("returns empty items array when pool is empty", () => {
    const args: AdapterArgs = { ...BASE_ARGS, supportingPool: [] };
    const result = toUnifiedResult(args);
    expect(result.supportingMatches.items).toHaveLength(0);
  });
});
