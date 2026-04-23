import JSZip from "jszip";

import { toCsv } from "./csv";
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
  zip.file("projects.csv", toCsv(portfolio.ranked));
  zip.file("portfolio.json", JSON.stringify(portfolio, null, 2));
  zip.file("summary.md", buildSummaryMarkdown(portfolio, datasetLabel, generatedAt));
  return zip;
}

/**
 * Build a "Download insights pack" zip containing:
 *   - projects.csv   (the filtered ranked-table, same shape as the CSV export)
 *   - portfolio.json (the full PortfolioStats - KPIs + all aggregations)
 *   - summary.md     (a one-page human-readable summary)
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
