// frontend/src/pages/demo/business/buildPortfolioWorkbook.test.ts
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { buildPortfolioWorkbook } from "./exportPack";
import type { PortfolioStats } from "./portfolioStats";

// Reuse the same fixture shape as exportPack.test.ts so the two suites stay
// consistent after plan 03-03 rewrites buildInsightsPackZip.
function makePortfolio(overrides: Partial<PortfolioStats> = {}): PortfolioStats {
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
      {
        project_id: "p2",
        project_name: "Beta",
        industry: "Automotive",
        system_category: "Assembly",
        stations: 6,
        total_hours: 300,
        primary_bucket: "ME",
        complexity: 3,
        peerMedian: 300,
        peerP10: 200,
        peerP90: 500,
        peerCount: 5,
        outlierZ: 0,
        outlierDirection: null,
      },
      {
        project_id: "p3",
        project_name: "Gamma",
        industry: "Food & Bev",
        system_category: "Assembly",
        stations: 3,
        total_hours: 200,
        primary_bucket: "ME",
        complexity: 2,
        peerMedian: null,
        peerP10: null,
        peerP90: null,
        peerCount: 0,
        outlierZ: null,
        outlierDirection: null,
      },
    ],
    accuracy: {
      points: [
        { project_id: "p1", project_name: "Alpha", industry: "Automotive", complexity: 3, quoted: 380, actual: 400, overrunPct: 0.0526 },
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
      { factor: "custom_pct", label: "Custom content %", correlation: 0.72, n: 8, meaning: "Strong: higher → more overrun" },
      { factor: "Retrofit", label: "Retrofit", correlation: 0.05, n: 8, meaning: "No clear signal" },
    ],
    ...overrides,
  };
}

const FIXED_DATE = new Date("2026-04-22T10:00:00.000Z");

const RAW_HEADERS = [
  "Project ID",
  "Project name",
  "Industry",
  "System category",
  "Stations",
  "Total hours",
  "Sales bucket",
  "Complexity",
  "Peer median (h)",
  "Peer p10 (h)",
  "Peer p90 (h)",
  "Outlier flag",
];

function readSheet(buffer: ArrayBuffer, sheetName: string): unknown[][] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[sheetName];
  expect(ws, `Sheet "${sheetName}" missing`).toBeDefined();
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
}

function readSheetNames(buffer: ArrayBuffer): string[] {
  return XLSX.read(buffer, { type: "array" }).SheetNames;
}

function flattenWorkbookText(buffer: ArrayBuffer): string {
  const wb = XLSX.read(buffer, { type: "array" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    parts.push(name);
    const ws = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(ws);
    parts.push(csv);
  }
  return parts.join("\n");
}

describe("buildPortfolioWorkbook — sheet structure (CONTEXT D-03)", () => {
  it("returns an ArrayBuffer", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    expect(buf).toBeInstanceOf(ArrayBuffer);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("has exactly four sheets in the canonical order: Summary, Drivers, Raw, README", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    expect(readSheetNames(buf)).toEqual(["Summary", "Drivers", "Raw", "README"]);
  });
});

describe("buildPortfolioWorkbook — Raw sheet (CONTEXT D-04)", () => {
  it("first row is the canonical plain-English header (D-04)", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "Raw");
    expect(rows[0]).toEqual(RAW_HEADERS);
  });

  it("has one data row per project in portfolio.ranked", () => {
    const portfolio = makePortfolio();
    const buf = buildPortfolioWorkbook(portfolio, "Real", FIXED_DATE);
    const rows = readSheet(buf, "Raw");
    // header + N data rows
    expect(rows.length).toBe(1 + portfolio.ranked.length);
  });

  it("renders the outlier flag as HIGH / LOW / — (U+2014 em-dash) per D-04", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "Raw");
    const flagCol = RAW_HEADERS.indexOf("Outlier flag");
    // Alpha: outlierDirection "high" → "HIGH"
    expect(rows[1][flagCol]).toBe("HIGH");
    // Beta: outlierDirection null → "—"
    expect(rows[2][flagCol]).toBe("—");
    // Gamma: outlierDirection null → "—"
    expect(rows[3][flagCol]).toBe("—");
  });

  it("renders peer-benchmark cells as integers when present and — when null", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "Raw");
    const medCol = RAW_HEADERS.indexOf("Peer median (h)");
    const p10Col = RAW_HEADERS.indexOf("Peer p10 (h)");
    const p90Col = RAW_HEADERS.indexOf("Peer p90 (h)");
    // Alpha: peerMedian=300, peerP10=200, peerP90=500
    expect(rows[1][medCol]).toBe(300);
    expect(rows[1][p10Col]).toBe(200);
    expect(rows[1][p90Col]).toBe(500);
    // Gamma: all null
    expect(rows[3][medCol]).toBe("—");
    expect(rows[3][p10Col]).toBe("—");
    expect(rows[3][p90Col]).toBe("—");
  });

  it("Total hours, Stations, Complexity are integer values (rounded)", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "Raw");
    const hoursCol = RAW_HEADERS.indexOf("Total hours");
    const stationsCol = RAW_HEADERS.indexOf("Stations");
    const complexityCol = RAW_HEADERS.indexOf("Complexity");
    expect(rows[1][hoursCol]).toBe(400);
    expect(rows[1][stationsCol]).toBe(4);
    expect(rows[1][complexityCol]).toBe(3);
  });
});

describe("buildPortfolioWorkbook — Summary sheet", () => {
  it("has KPI rows with Metric / Value / Notes columns", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "Summary");
    expect(rows[0]).toEqual(["Metric", "Value", "Notes"]);
    // KPI rows in order: Project count, Total hours, Avg hours, Median hours, Avg materials cost
    expect(rows[1][0]).toBe("Project count");
    expect(rows[1][1]).toBe(3);
    expect(rows[2][0]).toBe("Total hours");
    expect(rows[3][0]).toBe("Avg hours");
    expect(rows[4][0]).toBe("Median hours");
    expect(rows[5][0]).toBe("Avg materials cost");
  });

  it("includes the accuracy block (Projects with quote+actual / Portfolio overrun % / Median overrun % / Totals)", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const flat = flattenWorkbookText(buf);
    expect(flat).toContain("Projects with quote+actual");
    expect(flat).toContain("Portfolio overrun %");
    expect(flat).toContain("Median overrun %");
    expect(flat).toContain("Total quoted");
    expect(flat).toContain("Total actual");
  });
});

describe("buildPortfolioWorkbook — Drivers sheet", () => {
  it("has the Risk-factor block and Hours-by-industry block separated by a blank row", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "Drivers");
    // First non-blank row is the Risk-factor section header
    expect(rows[0][0]).toBe("Risk factor correlations");
    // Header row 1 of the table
    expect(rows[1]).toEqual(["Factor", "Pearson r", "n", "Reading"]);
    // The "Custom content %" row should be in the meaningful list (r=0.72)
    const custom = rows.find((r) => r[0] === "Custom content %");
    expect(custom).toBeDefined();
    expect(custom![1]).toBe(0.72);
    // The "Retrofit" row should NOT be in the meaningful list (r=0.05 below threshold)
    const retrofit = rows.find((r) => r[0] === "Retrofit");
    expect(retrofit).toBeUndefined();
    // Hours by industry section appears below
    const hoursHeader = rows.findIndex((r) => r[0] === "Hours by industry");
    expect(hoursHeader).toBeGreaterThan(1);
    // Industry table header row
    expect(rows[hoursHeader + 1]).toEqual(["Industry", "Projects", "Avg hours", "Total hours"]);
    // Automotive (totalHours=700) appears
    const automotive = rows.find((r) => r[0] === "Automotive");
    expect(automotive).toBeDefined();
    expect(automotive![1]).toBe(2);
    expect(automotive![3]).toBe(700);
  });
});

describe("buildPortfolioWorkbook — README sheet (CONTEXT D-03)", () => {
  it("contains the How-to-read intro, Sheet guide, and Column dictionary blocks", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "README");
    const flat = rows.map((r) => r.join(" | ")).join("\n");
    expect(flat).toContain("How to read this workbook");
    expect(flat).toContain("Sheet guide");
    expect(flat).toContain("Column dictionary (Raw sheet)");
    expect(flat).toContain("Column dictionary (Summary + Drivers sheets)");
  });

  it("documents every Raw column", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "README");
    const flat = rows.map((r) => r.join(" | ")).join("\n");
    for (const header of RAW_HEADERS) {
      expect(flat, `Missing dictionary entry for "${header}"`).toContain(header);
    }
  });

  it("Sheet guide names every non-README sheet", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const rows = readSheet(buf, "README");
    const flat = rows.map((r) => r.join(" | ")).join("\n");
    expect(flat).toContain("Summary");
    expect(flat).toContain("Drivers");
    expect(flat).toContain("Raw");
  });
});

describe("buildPortfolioWorkbook — jargon-guard (cross-cuts DATA-03 in Phase 4)", () => {
  // Banned tokens: ML jargon Ben should never see in the workbook. Phase 4
  // DATA-03 will lift this regex set into a single shared jargon-guard test.
  const BANNED = [
    /\bP10\b/,
    /\bP50\b/,
    /\bP90\b/,
    /Pyodide/i,
    /\bgradient\s*boost(ing|ed)?\b/i,
    /R²/,
    /\bconfidence interval(s)?\b/i,
    /\bensemble\b/i,
    /\bcategorical\b/i,
    /\bembedding\b/i,
    /\btraining data\b/i,
    /\bregression\b/i,
    /\bsklearn\b/i,
    /\bjoblib\b/i,
    /\bquantile\b/i,
  ];

  it("no banned ML-jargon token appears in any cell or sheet name of the produced workbook", () => {
    const buf = buildPortfolioWorkbook(makePortfolio(), "Real", FIXED_DATE);
    const flat = flattenWorkbookText(buf);
    for (const re of BANNED) {
      expect(flat, `Banned token ${re} found in workbook output`).not.toMatch(re);
    }
  });
});
