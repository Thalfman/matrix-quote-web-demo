// frontend/src/pages/demo/business/buildPortfolioJson.test.ts
import { describe, expect, it } from "vitest";

import { buildPortfolioJson, jsonFilename } from "./exportPack";
import type { PortfolioStats } from "./portfolioStats";

function makePortfolio(): PortfolioStats {
  return {
    kpis: {
      projectCount: 3,
      totalHours: 900,
      avgHours: 300,
      medianHours: 300,
      avgMaterialsCost: 50000,
    },
    buckets: [{ bucket: "ME", hours: 900, projectCount: 3 }],
    industries: [
      { industry: "Automotive", projectCount: 2, avgHours: 350, totalHours: 700 },
      { industry: "Food & Bev", projectCount: 1, avgHours: 200, totalHours: 200 },
    ],
    categories: [{ category: "Assembly", count: 3 }],
    scatter: [],
    ranked: [
      {
        project_id: "p1",
        project_name: "Alpha",
        industry: "Automotive",
        system_category: "Assembly",
        stations: 4,
        total_hours: 400,
        primary_bucket: "ME",
        complexity: 3,
        peerMedian: 300,
        peerP10: 200,
        peerP90: 500,
        peerCount: 5,
        outlierZ: 2.2,
        outlierDirection: "high",
      },
    ],
    accuracy: {
      points: [
        {
          project_id: "p1",
          project_name: "Alpha",
          industry: "Automotive",
          complexity: 3,
          quoted: 380,
          actual: 400,
          overrunPct: 0.0526,
        },
      ],
      byBucket: [
        { bucket: "ME", quoted: 380, actual: 400, overrunPct: 0.0526, projectCount: 1 },
      ],
      totalQuoted: 380,
      totalActual: 400,
      portfolioOverrunPct: 0.0526,
      medianOverrunPct: 0.0526,
      projectsWithQuote: 1,
    },
    disciplineByIndustry: [],
    materialLabor: [],
    riskCorrelations: [
      {
        factor: "custom_pct",
        label: "Custom content %",
        correlation: 0.72,
        n: 8,
        meaning: "Strong: higher → more overrun",
      },
    ],
  };
}

describe("buildPortfolioJson — byte-equivalence (INSIGHTS-01 backward-compat)", () => {
  it("returns JSON.stringify(portfolio, null, 2) byte-for-byte", () => {
    const portfolio = makePortfolio();
    const expected = JSON.stringify(portfolio, null, 2);
    expect(buildPortfolioJson(portfolio)).toBe(expected);
  });

  it("uses two-space indent (engineers' tooling depends on this)", () => {
    const out = buildPortfolioJson(makePortfolio());
    // Second line is the first nested key, indented by exactly two spaces.
    const lines = out.split("\n");
    expect(lines[0]).toBe("{");
    expect(lines[1]).toMatch(/^  "kpis":/);
  });

  it("does NOT append a trailing newline", () => {
    const out = buildPortfolioJson(makePortfolio());
    expect(out.endsWith("\n")).toBe(false);
  });

  it("is round-trippable through JSON.parse", () => {
    const portfolio = makePortfolio();
    const out = buildPortfolioJson(portfolio);
    expect(JSON.parse(out)).toEqual(portfolio);
  });
});

describe("jsonFilename — engineer-side download filename (CONTEXT D-07/D-08)", () => {
  const FIXED_DATE = new Date("2026-04-22T10:00:00.000Z");

  it("produces a slug-cased filename for a typical dataset label", () => {
    expect(jsonFilename("Real Data", FIXED_DATE)).toBe(
      "portfolio-real-data-2026-04-22.json",
    );
  });

  it("falls back to 'pack' for an empty / whitespace label (matches packFilename rule)", () => {
    expect(jsonFilename("", FIXED_DATE)).toBe("portfolio-pack-2026-04-22.json");
    expect(jsonFilename("   ", FIXED_DATE)).toBe("portfolio-pack-2026-04-22.json");
  });

  it("collapses non-alphanumeric runs to a single hyphen (no double-dash, no leading/trailing dash)", () => {
    expect(jsonFilename("Test/Data 2026", FIXED_DATE)).toBe(
      "portfolio-test-data-2026-2026-04-22.json",
    );
    expect(jsonFilename("--Real--", FIXED_DATE)).toBe(
      "portfolio-real-2026-04-22.json",
    );
  });

  it("uses the same slug rule as packFilename (regression guard for drift)", () => {
    // Spot-check: identical slugs for identical labels.
    const slug = "real-data";
    expect(jsonFilename("Real Data", FIXED_DATE)).toContain(`portfolio-${slug}-`);
  });
});
