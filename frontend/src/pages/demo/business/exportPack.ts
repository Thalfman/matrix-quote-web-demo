import JSZip from "jszip";
import * as XLSX from "xlsx";

import type { PortfolioStats } from "./portfolioStats";

const fmtInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const fmtR = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Build a one-page markdown summary of the (filtered) portfolio. Omits sections
 * with no data so the summary stays honest for narrowly-filtered views.
 */
export function buildSummaryMarkdown(
  portfolio: PortfolioStats,
  datasetLabel: string,
  generatedAt: Date = new Date(),
): string {
  const k = portfolio.kpis;
  const a = portfolio.accuracy;
  const lines: string[] = [];

  lines.push(`# Business Insights Pack - ${datasetLabel}`);
  lines.push("");
  lines.push(`Generated: ${generatedAt.toISOString()}`);
  lines.push("");

  lines.push("## Portfolio KPIs");
  lines.push(`- Projects: ${fmtInt.format(k.projectCount)}`);
  lines.push(`- Total hours: ${fmtInt.format(k.totalHours)}`);
  lines.push(
    `- Avg hours / project: ${fmtInt.format(k.avgHours)} (median ${fmtInt.format(k.medianHours)})`,
  );
  lines.push(
    `- Avg materials cost: ${k.avgMaterialsCost != null ? fmtCurrency.format(k.avgMaterialsCost) : "N/A"}`,
  );
  lines.push("");

  lines.push("## Estimation accuracy");
  if (a.projectsWithQuote === 0) {
    lines.push("_No projects carry both a sales quote and billed actuals in this view._");
  } else {
    lines.push(`- Projects with quote + actual: ${fmtInt.format(a.projectsWithQuote)}`);
    lines.push(`- Portfolio overrun %: ${fmtPct.format(a.portfolioOverrunPct)}`);
    lines.push(`- Median overrun %: ${fmtPct.format(a.medianOverrunPct)}`);
    lines.push(`- Total quoted: ${fmtInt.format(a.totalQuoted)} h`);
    lines.push(`- Total actual: ${fmtInt.format(a.totalActual)} h`);
    if (a.byBucket.length > 0) {
      lines.push("");
      lines.push("### Overrun by sales bucket");
      lines.push("| Bucket | Quoted | Actual | Overrun % | Projects |");
      lines.push("|---|---:|---:|---:|---:|");
      for (const b of a.byBucket) {
        lines.push(
          `| ${b.bucket} | ${fmtInt.format(b.quoted)} | ${fmtInt.format(b.actual)} | ${fmtPct.format(b.overrunPct)} | ${b.projectCount} |`,
        );
      }
    }
  }
  lines.push("");

  lines.push("## Risk factors vs overrun (Pearson r)");
  const meaningfulRisks = portfolio.riskCorrelations.filter(
    (r) => r.n >= 3 && Math.abs(r.correlation) >= 0.1,
  );
  if (meaningfulRisks.length === 0) {
    lines.push("_Not enough signal to correlate._");
  } else {
    lines.push("| Factor | r | n | Reading |");
    lines.push("|---|---:|---:|---|");
    for (const r of meaningfulRisks) {
      lines.push(`| ${r.label} | ${fmtR.format(r.correlation)} | ${r.n} | ${r.meaning} |`);
    }
  }
  lines.push("");

  if (portfolio.industries.length > 0) {
    lines.push("## Hours by industry");
    lines.push("| Industry | Projects | Avg hours | Total hours |");
    lines.push("|---|---:|---:|---:|");
    for (const i of portfolio.industries) {
      lines.push(
        `| ${i.industry} | ${i.projectCount} | ${fmtInt.format(i.avgHours)} | ${fmtInt.format(i.totalHours)} |`,
      );
    }
    lines.push("");
  }

  const outliers = portfolio.ranked.filter((r) => r.outlierDirection != null);
  if (outliers.length > 0) {
    lines.push("## Peer-benchmark outliers");
    lines.push("| Project | Industry | Tier | Hours | Peer median | Peer p10–p90 | Z | Direction |");
    lines.push("|---|---|---:|---:|---:|---|---:|---|");
    for (const r of outliers) {
      const range =
        r.peerP10 != null && r.peerP90 != null
          ? `${fmtInt.format(r.peerP10)}–${fmtInt.format(r.peerP90)}`
          : "-";
      lines.push(
        `| ${r.project_name} | ${r.industry} | ${Math.round(r.complexity)} | ${fmtInt.format(r.total_hours)} | ${r.peerMedian != null ? fmtInt.format(r.peerMedian) : "-"} | ${range} | ${r.outlierZ != null ? fmtR.format(r.outlierZ) : "-"} | ${r.outlierDirection === "high" ? "HIGH" : "LOW"} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Populate a JSZip with the three pack entries. Exported for tests; callers
 * that want a downloadable Blob should use {@link buildInsightsPack}.
 */
export function buildInsightsPackZip(
  portfolio: PortfolioStats,
  datasetLabel: string,
  generatedAt: Date = new Date(),
): JSZip {
  const zip = new JSZip();
  // Order matters for deterministic test snapshots: summary.md first
  // (Ben's praised notepad — CONTEXT D-05), then the new spreadsheet,
  // then the top-level README that points at both.
  zip.file("summary.md", buildSummaryMarkdown(portfolio, datasetLabel, generatedAt));
  zip.file(
    "business-insights.xlsx",
    buildPortfolioWorkbook(portfolio, datasetLabel, generatedAt),
  );
  zip.file("README.md", buildBundleReadme(datasetLabel, generatedAt));
  return zip;
}

/**
 * Build a "Download insights pack" zip containing:
 *   - summary.md             (one-page human-readable summary; unchanged from prior bundles — CONTEXT D-05)
 *   - business-insights.xlsx (multi-sheet workbook: Summary / Drivers / Raw / README — CONTEXT D-03)
 *   - README.md              (short top-level guide pointing at the workbook — CONTEXT D-06)
 *
 * The default bundle deliberately ships no .json and no .csv: per Ben Bertsche's
 * 2026-05-01 review, a non-technical reviewer can't open JSON and CSV columns
 * read as cryptic. Engineers who need raw JSON use the secondary
 * "Download raw JSON (for engineers)" button on BusinessInsightsView (INSIGHTS-01).
 */
export async function buildInsightsPack(
  portfolio: PortfolioStats,
  datasetLabel: string,
  generatedAt: Date = new Date(),
): Promise<Blob> {
  const zip = buildInsightsPackZip(portfolio, datasetLabel, generatedAt);
  return zip.generateAsync({ type: "blob" });
}

/** Filename like `business-insights-real-data-2026-04-22.zip`. */
export function packFilename(datasetLabel: string, generatedAt: Date = new Date()): string {
  const slug = datasetLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = generatedAt.toISOString().slice(0, 10);
  return `business-insights-${slug || "pack"}-${date}.zip`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// XLSX workbook builder (CONTEXT D-02 / D-03 / D-04)
//
// Produces a four-sheet workbook (Summary / Drivers / Raw / README) that
// replaces the prior projects.csv + portfolio.json in the insights pack.
// Pure function: takes the same PortfolioStats input as buildSummaryMarkdown,
// emits an ArrayBuffer suitable for JSZip.file(..., arrayBuffer).
//
// Headers are the canonical plain-English labels in D-04. The README sheet
// documents every column (D-03). Zero ML jargon — INSIGHTS-02 acceptance.
// ---------------------------------------------------------------------------

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
] as const;

const OUTLIER_NULL = "—"; // U+2014 EM DASH

function fmtOutlier(direction: "high" | "low" | null): string {
  if (direction === "high") return "HIGH";
  if (direction === "low") return "LOW";
  return OUTLIER_NULL;
}

function roundOrDash(v: number | null | undefined): number | string {
  if (v == null || !Number.isFinite(v)) return OUTLIER_NULL;
  return Math.round(v);
}

function buildSummarySheet(portfolio: PortfolioStats): XLSX.WorkSheet {
  const k = portfolio.kpis;
  const a = portfolio.accuracy;
  const rows: (string | number)[][] = [
    ["Metric", "Value", "Notes"],
    ["Project count", k.projectCount, "Projects in this filtered view."],
    ["Total hours", Math.round(k.totalHours), "Sum of estimated total hours across the projects."],
    ["Avg hours", Math.round(k.avgHours), "Mean total hours per project."],
    ["Median hours", Math.round(k.medianHours), "Middle value of total hours per project."],
    [
      "Avg materials cost",
      k.avgMaterialsCost != null ? Math.round(k.avgMaterialsCost) : OUTLIER_NULL,
      "Geometric-mean materials cost in U.S. dollars; blank when no projects carry a materials cost.",
    ],
    [],
    ["Accuracy", "", ""],
    [
      "Projects with quote+actual",
      a.projectsWithQuote,
      "Projects where both a sales quote and billed actual hours are present.",
    ],
    [
      "Portfolio overrun %",
      a.projectsWithQuote > 0 ? Math.round(a.portfolioOverrunPct * 1000) / 10 : OUTLIER_NULL,
      "Percent the actual total exceeds the quoted total. Positive = over budget.",
    ],
    [
      "Median overrun %",
      a.projectsWithQuote > 0 ? Math.round(a.medianOverrunPct * 1000) / 10 : OUTLIER_NULL,
      "Per-project overrun, middle value. Less sensitive to one large outlier than the portfolio %.",
    ],
    [
      "Total quoted",
      a.projectsWithQuote > 0 ? Math.round(a.totalQuoted) : OUTLIER_NULL,
      "Sum of sales-quoted hours across projects with both quote and actual.",
    ],
    [
      "Total actual",
      a.projectsWithQuote > 0 ? Math.round(a.totalActual) : OUTLIER_NULL,
      "Sum of billed actual hours across projects with both quote and actual.",
    ],
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildDriversSheet(portfolio: PortfolioStats): XLSX.WorkSheet {
  const meaningful = portfolio.riskCorrelations.filter(
    (r) => r.n >= 3 && Math.abs(r.correlation) >= 0.1,
  );
  const rows: (string | number)[][] = [];
  rows.push(["Risk factor correlations", "", "", ""]);
  rows.push(["Factor", "Pearson r", "n", "Reading"]);
  if (meaningful.length === 0) {
    rows.push(["Not enough signal to correlate.", "", "", ""]);
  } else {
    for (const r of meaningful) {
      rows.push([r.label, Math.round(r.correlation * 100) / 100, r.n, r.meaning]);
    }
  }
  rows.push([]); // blank separator
  rows.push(["Hours by industry", "", "", ""]);
  rows.push(["Industry", "Projects", "Avg hours", "Total hours"]);
  if (portfolio.industries.length === 0) {
    rows.push(["No industry breakdown available.", "", "", ""]);
  } else {
    for (const i of portfolio.industries) {
      rows.push([i.industry, i.projectCount, Math.round(i.avgHours), Math.round(i.totalHours)]);
    }
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildRawSheet(portfolio: PortfolioStats): XLSX.WorkSheet {
  const rows: (string | number)[][] = [Array.from(RAW_HEADERS)];
  for (const r of portfolio.ranked) {
    rows.push([
      r.project_id,
      r.project_name,
      r.industry,
      r.system_category,
      r.stations,
      Math.round(r.total_hours),
      r.primary_bucket,
      Math.round(r.complexity),
      roundOrDash(r.peerMedian),
      roundOrDash(r.peerP10),
      roundOrDash(r.peerP90),
      fmtOutlier(r.outlierDirection),
    ]);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildReadmeSheet(): XLSX.WorkSheet {
  const rows: (string | number)[][] = [];
  rows.push(["How to read this workbook", "", ""]);
  rows.push([
    "This workbook has four tabs. Start on Summary for the headline numbers, Drivers for what's pulling the portfolio, Raw for the per-project list, and this README for column-by-column meaning.",
    "",
    "",
  ]);
  rows.push([]);
  rows.push(["Sheet guide", "", ""]);
  rows.push(["Sheet", "What it shows", "When to use it"]);
  rows.push([
    "Summary",
    "Headline portfolio numbers and accuracy (quote vs actual).",
    "Open this first. One row per metric.",
  ]);
  rows.push([
    "Drivers",
    "What's pulling the portfolio: risk-factor correlations and hours by industry.",
    "Use to see which factors track with overrun and which industries dominate the book.",
  ]);
  rows.push([
    "Raw",
    "One row per project with peer benchmarks and outlier flag.",
    "Sort or filter to dig into specific projects.",
  ]);
  rows.push([]);
  rows.push(["Column dictionary (Raw sheet)", "", ""]);
  rows.push(["Sheet", "Column", "Plain-English meaning"]);
  rows.push(["Raw", "Project ID", "The unique identifier for the project (used for cross-reference)."]);
  rows.push(["Raw", "Project name", "Human-readable project name."]);
  rows.push(["Raw", "Industry", "Customer industry segment (Automotive, Food & Beverage, etc.)."]);
  rows.push(["Raw", "System category", "Kind of automation system delivered (Assembly, Welding, etc.)."]);
  rows.push(["Raw", "Stations", "Number of work stations on the system."]);
  rows.push(["Raw", "Total hours", "Estimated total labor hours for the project."]);
  rows.push([
    "Raw",
    "Sales bucket",
    "The engineering discipline that owns the most hours on this project (ME, EE, Build, etc.).",
  ]);
  rows.push(["Raw", "Complexity", "Overall difficulty rating from 1 (very simple) to 5 (very complex)."]);
  rows.push([
    "Raw",
    "Peer median (h)",
    "Middle hours value among projects at the same complexity tier (excluding this one).",
  ]);
  rows.push([
    "Raw",
    "Peer p10 (h)",
    "Low end of the peer band: 10% of peer projects came in below this hours figure.",
  ]);
  rows.push([
    "Raw",
    "Peer p90 (h)",
    "High end of the peer band: 90% of peer projects came in below this hours figure.",
  ]);
  rows.push([
    "Raw",
    "Outlier flag",
    "HIGH = total hours sits above the peer band; LOW = below; — = within band or no peers.",
  ]);
  rows.push([]);
  rows.push(["Column dictionary (Summary + Drivers sheets)", "", ""]);
  rows.push(["Sheet", "Column", "Plain-English meaning"]);
  rows.push(["Summary", "Metric", "Name of the headline number."]);
  rows.push(["Summary", "Value", "The number itself (rounded)."]);
  rows.push(["Summary", "Notes", "What the number means in plain English."]);
  rows.push([
    "Drivers",
    "Pearson r",
    "A score from -1 to +1 showing how strongly two columns move together. 0 means no relationship.",
  ]);
  rows.push(["Drivers", "n", "How many projects went into the score (small n = less reliable)."]);
  rows.push(["Drivers", "Reading", "Plain-English read-out of the score."]);
  return XLSX.utils.aoa_to_sheet(rows);
}

/**
 * Build the multi-sheet `business-insights.xlsx` workbook (CONTEXT D-03).
 *
 * Sheets in order: Summary, Drivers, Raw, README.
 * Headers are the canonical plain-English labels in CONTEXT D-04.
 * Zero ML jargon — INSIGHTS-02.
 *
 * Returns an ArrayBuffer ready to be added to JSZip via:
 *
 *   zip.file("business-insights.xlsx", buildPortfolioWorkbook(...));
 *
 * Note on signature: `_datasetLabel` and `_generatedAt` are accepted for
 * forward compatibility (they may surface as a Summary footer in a future
 * iteration) but the workbook content does NOT embed them today — Ben
 * already has the dataset label and generated date in the top-level
 * README.md and summary.md (CONTEXT D-06 + D-05). Underscored names mark
 * intentionally-unused params for ESLint / typescript-eslint.
 */
export function buildPortfolioWorkbook(
  portfolio: PortfolioStats,
  _datasetLabel: string,
  _generatedAt: Date = new Date(),
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(portfolio), "Summary");
  XLSX.utils.book_append_sheet(wb, buildDriversSheet(portfolio), "Drivers");
  XLSX.utils.book_append_sheet(wb, buildRawSheet(portfolio), "Raw");
  XLSX.utils.book_append_sheet(wb, buildReadmeSheet(), "README");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

// ---------------------------------------------------------------------------
// Bundle README template + engineer-side JSON helpers (CONTEXT D-06, D-07, D-08)
//
// buildBundleReadme produces the top-level README.md the zip ships with.
// Hand-written; substitutes only {datasetLabel} and {ISO date}.
// Names the three default-bundle files (summary.md, business-insights.xlsx,
// README.md) and points engineers to the secondary "Download raw JSON
// (for engineers)" button per CONTEXT D-07.
//
// buildPortfolioJson is the engineer-side download body. Byte-equivalent to
// the prior bundle's portfolio.json so engineers' downstream tooling keeps
// working without changes.
// ---------------------------------------------------------------------------

/**
 * Top-level README.md that ships inside the insights pack zip.
 *
 * Template per CONTEXT D-06; only {datasetLabel} and {ISO date} are
 * substituted at build time. Zero ML jargon — INSIGHTS-02.
 */
export function buildBundleReadme(
  datasetLabel: string,
  generatedAt: Date = new Date(),
): string {
  return [
    `# Business Insights Pack — ${datasetLabel}`,
    "",
    `Generated: ${generatedAt.toISOString()}`,
    "",
    "## What's inside",
    "- `summary.md` — One-page narrative summary of this dataset.",
    "- `business-insights.xlsx` — Spreadsheet with four tabs: Summary, Drivers, Raw, README.",
    "- `README.md` — This file.",
    "",
    "## Where to start",
    "- Open `summary.md` in any text editor or your browser. (Try VS Code, Notepad, or just double-click.)",
    "- Open `business-insights.xlsx` in Excel, Apple Numbers, or Google Sheets.",
    "  Start with the **README** tab — it explains what every column means.",
    "",
    "## Need the raw data?",
    'A separate "Download raw JSON (for engineers)" button in the app',
    "produces a `portfolio.json` file with the full structured dataset.",
    "",
  ].join("\n");
}

/**
 * Engineer-side JSON download body. Byte-equivalent to the prior bundle's
 * portfolio.json — `JSON.stringify(portfolio, null, 2)`. Used by the
 * secondary "Download raw JSON (for engineers)" button (plan 03-04).
 *
 * Public so tests can assert byte equivalence with the prior bundle.
 */
export function buildPortfolioJson(portfolio: PortfolioStats): string {
  return JSON.stringify(portfolio, null, 2);
}

/**
 * Engineer-side JSON download filename. Mirrors `packFilename`'s slug rule
 * so the on-disk artifact stays recognizable next to its zip cousin.
 *
 * `"Real Data"` + 2026-04-22 → `portfolio-real-data-2026-04-22.json`.
 * Empty / whitespace label → `portfolio-pack-2026-04-22.json` (same fallback
 * `packFilename` uses).
 *
 * Public so `BusinessInsightsView.test.tsx` (plan 03-04) can assert the
 * filename pattern when the engineer-side button fires.
 */
export function jsonFilename(
  datasetLabel: string,
  generatedAt: Date = new Date(),
): string {
  const slug = datasetLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = generatedAt.toISOString().slice(0, 10);
  return `portfolio-${slug || "pack"}-${date}.json`;
}
