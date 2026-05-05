import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  buildInsightsPack,
  buildInsightsPackZip,
  buildSummaryMarkdown,
  packFilename,
} from "./exportPack";
import type { PortfolioStats } from "./portfolioStats";

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

describe("buildSummaryMarkdown", () => {
  it("includes the dataset label in the title and an ISO-formatted generated date", () => {
    const md = buildSummaryMarkdown(makePortfolio(), "Real · Data", FIXED_DATE);
    expect(md).toContain("# Business Insights Pack - Real · Data");
    expect(md).toContain("Generated: 2026-04-22T10:00:00.000Z");
  });

  it("renders the Portfolio KPIs block with all four KPIs", () => {
    const md = buildSummaryMarkdown(makePortfolio(), "Real", FIXED_DATE);
    expect(md).toMatch(/## Portfolio KPIs/);
    expect(md).toContain("- Projects: 3");
    expect(md).toContain("- Total hours: 900");
    expect(md).toContain("- Avg hours / project: 300 (median 300)");
    expect(md).toMatch(/Avg materials cost: \$50,000/);
  });

  it("renders the accuracy block including portfolio overrun and the bucket table", () => {
    const md = buildSummaryMarkdown(makePortfolio(), "Real", FIXED_DATE);
    expect(md).toContain("## Estimation accuracy");
    expect(md).toContain("Projects with quote + actual: 1");
    expect(md).toContain("### Overrun by sales bucket");
    expect(md).toMatch(/\| ME \| 380 \| 400 \| \+5\.3% \| 1 \|/);
  });

  it("filters risk correlations to only meaningful rows (|r| >= 0.1 and n >= 3)", () => {
    const md = buildSummaryMarkdown(makePortfolio(), "Real", FIXED_DATE);
    expect(md).toContain("Custom content %");
    expect(md).not.toContain("| Retrofit |"); // r = 0.05, below threshold
  });

  it("lists peer-benchmark outliers in their own section", () => {
    const md = buildSummaryMarkdown(makePortfolio(), "Real", FIXED_DATE);
    expect(md).toContain("## Peer-benchmark outliers");
    expect(md).toMatch(/\| Alpha \| Automotive \| 3 \| 400 \| 300 \| 200–500 \| \+2\.20 \| HIGH \|/);
    // Beta has no outlier direction → should not appear in outliers table
    expect(md).not.toMatch(/\| Beta \| .* \| (HIGH|LOW) \|/);
  });

  it("omits the outliers section entirely when there are none", () => {
    const p = makePortfolio();
    for (const r of p.ranked) {
      r.outlierDirection = null;
      r.outlierZ = null;
    }
    const md = buildSummaryMarkdown(p, "Real", FIXED_DATE);
    expect(md).not.toContain("## Peer-benchmark outliers");
  });

  it("renders a clear fallback when no projects have a quote", () => {
    const p = makePortfolio({
      accuracy: {
        points: [],
        byBucket: [],
        totalQuoted: 0,
        totalActual: 0,
        portfolioOverrunPct: 0,
        medianOverrunPct: 0,
        projectsWithQuote: 0,
      },
    });
    const md = buildSummaryMarkdown(p, "Real", FIXED_DATE);
    expect(md).toContain("_No projects carry both a sales quote and billed actuals in this view._");
  });
});

describe("packFilename", () => {
  it("slugifies the dataset label and appends the ISO date", () => {
    expect(packFilename("Real · Data", FIXED_DATE)).toBe("business-insights-real-data-2026-04-22.zip");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(packFilename("  Synthetic - Pool  ", FIXED_DATE)).toBe(
      "business-insights-synthetic-pool-2026-04-22.zip",
    );
  });

  it("falls back to 'pack' when the label has no alphanumerics", () => {
    expect(packFilename("···", FIXED_DATE)).toBe("business-insights-pack-2026-04-22.zip");
  });
});

describe("buildInsightsPackZip", () => {
  it("populates the zip with summary.md, business-insights.xlsx, and README.md (CONTEXT D-08)", async () => {
    const zip = buildInsightsPackZip(makePortfolio(), "Real", FIXED_DATE);
    expect(zip.file("summary.md")).not.toBeNull();
    expect(zip.file("business-insights.xlsx")).not.toBeNull();
    expect(zip.file("README.md")).not.toBeNull();
  });

  it("does NOT include any .json or .csv entry in the default bundle (INSIGHTS-01 acceptance)", () => {
    const zip = buildInsightsPackZip(makePortfolio(), "Real", FIXED_DATE);
    const filenames = Object.keys(zip.files);
    for (const name of filenames) {
      expect(name.endsWith(".json"), `Unexpected JSON entry: ${name}`).toBe(false);
      expect(name.endsWith(".csv"), `Unexpected CSV entry: ${name}`).toBe(false);
    }
  });

  it("contains exactly three entries in the canonical order", () => {
    const zip = buildInsightsPackZip(makePortfolio(), "Real", FIXED_DATE);
    expect(Object.keys(zip.files)).toEqual([
      "summary.md",
      "business-insights.xlsx",
      "README.md",
    ]);
  });

  it("preserves buildSummaryMarkdown output byte-for-byte inside the zip (CONTEXT D-05)", async () => {
    const portfolio = makePortfolio();
    const zip = buildInsightsPackZip(portfolio, "Real", FIXED_DATE);
    const md = await zip.file("summary.md")!.async("string");
    // Direct call should produce the same string the zip stored.
    expect(md).toBe(buildSummaryMarkdown(portfolio, "Real", FIXED_DATE));
  });
});

describe("buildInsightsPack", () => {
  it("returns a Blob", async () => {
    const blob = await buildInsightsPack(makePortfolio(), "Real", FIXED_DATE);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});

// End-to-end integration: exercises the full zip round-trip without going
// through Blob (Blob.arrayBuffer() is not polyfilled in jsdom). We use
// buildInsightsPackZip directly and round-trip through JSZip.generateAsync
// + JSZip.loadAsync to prove every file survives serialization.
describe("buildInsightsPack — end-to-end integration (INSIGHTS-01, INSIGHTS-02)", () => {
  it("opens summary.md and asserts the canonical heading", async () => {
    const zip = buildInsightsPackZip(makePortfolio(), "Real", FIXED_DATE);
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    const opened = await new (await import("jszip")).default().loadAsync(buf);
    const md = await opened.file("summary.md")!.async("string");
    expect(md).toContain("# Business Insights Pack - Real");
  });

  it("opens business-insights.xlsx and confirms the four canonical sheets are present", async () => {
    const zip = buildInsightsPackZip(makePortfolio(), "Real", FIXED_DATE);
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    const opened = await new (await import("jszip")).default().loadAsync(buf);
    const xlsxBytes = await opened.file("business-insights.xlsx")!.async("arraybuffer");
    const wb = XLSX.read(xlsxBytes, { type: "array" });
    expect(wb.SheetNames).toEqual(["Summary", "Drivers", "Raw", "README"]);
  });

  it("opens README.md and confirms the engineer-side button reference is present (CONTEXT D-07)", async () => {
    const zip = buildInsightsPackZip(makePortfolio(), "Real", FIXED_DATE);
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    const opened = await new (await import("jszip")).default().loadAsync(buf);
    const readme = await opened.file("README.md")!.async("string");
    expect(readme).toContain("Business Insights Pack — Real");
    expect(readme).toContain('"Download raw JSON (for engineers)"');
  });

  it("asserts zip composition matches every ROADMAP success criterion in this phase", async () => {
    const zip = buildInsightsPackZip(makePortfolio(), "Real", FIXED_DATE);
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    const opened = await new (await import("jszip")).default().loadAsync(buf);
    const filenames = Object.keys(opened.files);

    // ROADMAP success #1: zero .json
    for (const f of filenames) {
      expect(f.endsWith(".json")).toBe(false);
    }
    // ROADMAP success #1 (alt path): replaced with .xlsx
    expect(filenames).toContain("business-insights.xlsx");
    // ROADMAP success #2: bundled README sheet documents every column
    const xlsxBytes = await opened.file("business-insights.xlsx")!.async("arraybuffer");
    const wb = XLSX.read(xlsxBytes, { type: "array" });
    expect(wb.SheetNames).toContain("README");
    // ROADMAP success #3: notepad preserved
    const md = await opened.file("summary.md")!.async("string");
    expect(md).toContain("# Business Insights Pack - Real");
    // ROADMAP success #4 (manual UAT proxy): top-level README orients reviewer
    const readme = await opened.file("README.md")!.async("string");
    expect(readme).toContain("## Where to start");
  });
});
