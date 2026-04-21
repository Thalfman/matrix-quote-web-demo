import { describe, expect, it } from "vitest";

import { buildPortfolio } from "./portfolioStats";
import type { ProjectRecord } from "@/demo/realProjects";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal ProjectRecord builder. Pass `hours` as the value for me10_actual_hours
 * so that recordToPrediction gives total_p50 = hours exactly.
 */
function makeRecord(
  overrides: Partial<ProjectRecord> & { me10_actual_hours: number },
): ProjectRecord {
  return {
    project_id: "test-id",
    project_name: "Test Project",
    industry_segment: "Automotive",
    system_category: "Assembly",
    stations_count: 4,
    complexity_score_1_5: 3,
    log_quoted_materials_cost: null,
    ...overrides,
  };
}

// Four synthetic records: hours 100, 200, 300, 400
// total_p50 per record = me10_actual_hours (the only op with >0 hours)
const RECORDS: ProjectRecord[] = [
  makeRecord({ project_id: "p1", project_name: "Alpha", me10_actual_hours: 100, industry_segment: "Automotive", system_category: "Assembly", log_quoted_materials_cost: Math.log(1000) }),
  makeRecord({ project_id: "p2", project_name: "Beta",  me10_actual_hours: 200, industry_segment: "Automotive", system_category: "Welding",  log_quoted_materials_cost: Math.log(4000) }),
  makeRecord({ project_id: "p3", project_name: "Gamma", me10_actual_hours: 300, industry_segment: "Food & Bev", system_category: "Assembly", log_quoted_materials_cost: Math.log(9000) }),
  makeRecord({ project_id: "p4", project_name: "Delta", me10_actual_hours: 400, industry_segment: "Food & Bev", system_category: "Assembly", log_quoted_materials_cost: null }),
];

// Manual expected values
// totalHours = 100+200+300+400 = 1000
// avgHours   = 1000 / 4 = 250
// medianHours (even n=4): sorted=[100,200,300,400] → (200+300)/2 = 250
// avgMaterialsCost = exp(mean(log(1000), log(4000), log(9000)))
//   = exp((log(1000)+log(4000)+log(9000)) / 3)
//   = exp(log((1000*4000*9000)^(1/3)))
//   = (36_000_000_000)^(1/3) = ≈3301.93

const EXPECTED_TOTAL = 1000;
const EXPECTED_AVG = 250;
const EXPECTED_MEDIAN = 250;
const EXPECTED_AVG_COST = Math.exp(
  (Math.log(1000) + Math.log(4000) + Math.log(9000)) / 3,
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildPortfolio – empty input", () => {
  it("returns zero KPIs and empty arrays", () => {
    const result = buildPortfolio([]);
    expect(result.kpis.projectCount).toBe(0);
    expect(result.kpis.totalHours).toBe(0);
    expect(result.kpis.avgHours).toBe(0);
    expect(result.kpis.medianHours).toBe(0);
    expect(result.kpis.avgMaterialsCost).toBeNull();
    expect(result.buckets).toHaveLength(0);
    expect(result.industries).toHaveLength(0);
    expect(result.categories).toHaveLength(0);
    expect(result.scatter).toHaveLength(0);
    expect(result.ranked).toHaveLength(0);
  });
});

describe("buildPortfolio – KPIs", () => {
  const { kpis } = buildPortfolio(RECORDS);

  it("projectCount matches input length", () => {
    expect(kpis.projectCount).toBe(RECORDS.length);
  });

  it("totalHours equals sum of recordToPrediction(r).total_p50", () => {
    expect(kpis.totalHours).toBeCloseTo(EXPECTED_TOTAL, 5);
  });

  it("avgHours = totalHours / projectCount", () => {
    expect(kpis.avgHours).toBeCloseTo(EXPECTED_AVG, 5);
  });

  it("medianHours is average of middle two for even-length input", () => {
    expect(kpis.medianHours).toBeCloseTo(EXPECTED_MEDIAN, 5);
  });

  it("avgMaterialsCost = exp(mean(log_quoted_materials_cost)) over finite-cost records", () => {
    expect(kpis.avgMaterialsCost).not.toBeNull();
    expect(kpis.avgMaterialsCost!).toBeCloseTo(EXPECTED_AVG_COST, 2);
  });

  it("avgMaterialsCost is null when no records have finite log_quoted_materials_cost", () => {
    const records: ProjectRecord[] = [
      makeRecord({ project_id: "x", me10_actual_hours: 100, log_quoted_materials_cost: null }),
    ];
    const { kpis: k } = buildPortfolio(records);
    expect(k.avgMaterialsCost).toBeNull();
  });
});

describe("buildPortfolio – medianHours for odd count", () => {
  it("picks the middle value for odd-length sorted array", () => {
    const records: ProjectRecord[] = [
      makeRecord({ project_id: "a", me10_actual_hours: 100 }),
      makeRecord({ project_id: "b", me10_actual_hours: 300 }),
      makeRecord({ project_id: "c", me10_actual_hours: 200 }),
    ];
    const { kpis } = buildPortfolio(records);
    // sorted: [100, 200, 300] → median = 200
    expect(kpis.medianHours).toBeCloseTo(200, 5);
  });
});

describe("buildPortfolio – buckets", () => {
  const { buckets } = buildPortfolio(RECORDS);

  it("all hours in ME bucket equal totalHours (only me10 op populated)", () => {
    // me10 maps to ME bucket; others are 0 and filtered out
    const me = buckets.find((b) => b.bucket === "ME");
    expect(me).toBeDefined();
    expect(me!.hours).toBeCloseTo(EXPECTED_TOTAL, 5);
  });

  it("buckets are sorted by hours descending", () => {
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i - 1].hours).toBeGreaterThanOrEqual(buckets[i].hours);
    }
  });

  it("bucket hours sum to totalHours", () => {
    const sum = buckets.reduce((acc, b) => acc + b.hours, 0);
    expect(sum).toBeCloseTo(EXPECTED_TOTAL, 5);
  });
});

describe("buildPortfolio – industries", () => {
  const { industries } = buildPortfolio(RECORDS);

  it("returns one row per unique industry", () => {
    expect(industries).toHaveLength(2);
  });

  it("sorted by totalHours descending", () => {
    for (let i = 1; i < industries.length; i++) {
      expect(industries[i - 1].totalHours).toBeGreaterThanOrEqual(industries[i].totalHours);
    }
  });

  it("Automotive industry: projectCount=2, totalHours=300, avgHours=150", () => {
    const auto = industries.find((i) => i.industry === "Automotive");
    expect(auto).toBeDefined();
    expect(auto!.projectCount).toBe(2);
    expect(auto!.totalHours).toBeCloseTo(300, 5);
    expect(auto!.avgHours).toBeCloseTo(150, 5);
  });

  it("Food & Bev industry: projectCount=2, totalHours=700, avgHours=350", () => {
    const food = industries.find((i) => i.industry === "Food & Bev");
    expect(food).toBeDefined();
    expect(food!.projectCount).toBe(2);
    expect(food!.totalHours).toBeCloseTo(700, 5);
    expect(food!.avgHours).toBeCloseTo(350, 5);
  });
});

describe("buildPortfolio – industry_segment null → 'Unknown'", () => {
  it("groups null industry_segment as 'Unknown'", () => {
    const records: ProjectRecord[] = [
      makeRecord({ project_id: "u1", me10_actual_hours: 50, industry_segment: null }),
      makeRecord({ project_id: "u2", me10_actual_hours: 50, industry_segment: undefined }),
    ];
    const { industries } = buildPortfolio(records);
    const unknown = industries.find((i) => i.industry === "Unknown");
    expect(unknown).toBeDefined();
    expect(unknown!.projectCount).toBe(2);
  });
});

describe("buildPortfolio – categories", () => {
  const { categories } = buildPortfolio(RECORDS);

  it("returns two distinct categories", () => {
    expect(categories).toHaveLength(2);
  });

  it("sorted by count descending", () => {
    for (let i = 1; i < categories.length; i++) {
      expect(categories[i - 1].count).toBeGreaterThanOrEqual(categories[i].count);
    }
  });

  it("Assembly appears first with count 3", () => {
    expect(categories[0].category).toBe("Assembly");
    expect(categories[0].count).toBe(3);
  });

  it("Welding appears second with count 1", () => {
    const welding = categories.find((c) => c.category === "Welding");
    expect(welding).toBeDefined();
    expect(welding!.count).toBe(1);
  });
});

describe("buildPortfolio – scatter", () => {
  const { scatter } = buildPortfolio(RECORDS);

  it("has one entry per record", () => {
    expect(scatter).toHaveLength(RECORDS.length);
  });

  it("each entry has expected fields", () => {
    for (const pt of scatter) {
      expect(typeof pt.complexity).toBe("number");
      expect(typeof pt.stations).toBe("number");
      expect(typeof pt.hours).toBe("number");
      expect(typeof pt.industry).toBe("string");
      expect(typeof pt.name).toBe("string");
    }
  });

  it("first point has name 'Alpha' with hours 100", () => {
    const alpha = scatter.find((p) => p.name === "Alpha");
    expect(alpha).toBeDefined();
    expect(alpha!.hours).toBeCloseTo(100, 5);
  });
});

describe("buildPortfolio – ranked", () => {
  const { ranked } = buildPortfolio(RECORDS);

  it("has one entry per record", () => {
    expect(ranked).toHaveLength(RECORDS.length);
  });

  it("sorted by total_hours descending", () => {
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].total_hours).toBeGreaterThanOrEqual(ranked[i].total_hours);
    }
  });

  it("first ranked row is Delta (400 hours)", () => {
    expect(ranked[0].project_name).toBe("Delta");
    expect(ranked[0].total_hours).toBeCloseTo(400, 5);
  });

  it("last ranked row is Alpha (100 hours)", () => {
    expect(ranked[ranked.length - 1].project_name).toBe("Alpha");
    expect(ranked[ranked.length - 1].total_hours).toBeCloseTo(100, 5);
  });

  it("each row has all required fields", () => {
    for (const row of ranked) {
      expect(typeof row.project_id).toBe("string");
      expect(typeof row.project_name).toBe("string");
      expect(typeof row.industry).toBe("string");
      expect(typeof row.system_category).toBe("string");
      expect(typeof row.stations).toBe("number");
      expect(typeof row.total_hours).toBe("number");
      expect(typeof row.primary_bucket).toBe("string");
    }
  });
});
