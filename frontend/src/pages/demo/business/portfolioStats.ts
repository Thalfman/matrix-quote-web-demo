// Pure aggregation layer for the Business Insights page: derives KPIs, bucket totals,
// industry averages, category counts, scatter points, and ranked rows from raw project records.
import {
  ProjectRecord,
  recordToPrediction,
  OPERATIONS,
  SALES_BUCKETS,
  SALES_BUCKET_MAP,
} from "@/demo/realProjects";

export type PortfolioKpis = {
  projectCount: number;
  totalHours: number;
  avgHours: number;
  medianHours: number;
  avgMaterialsCost: number | null;
};

export type IndustryRow = {
  industry: string;
  projectCount: number;
  avgHours: number;
  totalHours: number;
};

export type CategoryRow = {
  category: string;
  count: number;
};

export type ScatterPoint = {
  complexity: number;
  stations: number;
  hours: number;
  industry: string;
  name: string;
};

export type BucketRow = {
  bucket: string;
  hours: number;
};

export type RankedRow = {
  project_id: string;
  project_name: string;
  industry: string;
  system_category: string;
  stations: number;
  total_hours: number;
  primary_bucket: string;
  complexity: number;
  // R7 peer-benchmark fields. Null when the project has fewer than 2 peers at
  // the same complexity tier (not enough signal).
  peerMedian: number | null;
  peerP10: number | null;
  peerP90: number | null;
  peerCount: number;
  outlierZ: number | null;
  outlierDirection: "high" | "low" | null;
};

// --- R1: Estimation Accuracy -------------------------------------------------

export type AccuracyPoint = {
  project_id: string;
  project_name: string;
  industry: string;
  complexity: number;
  quoted: number;
  actual: number;
  overrunPct: number; // (actual - quoted) / quoted; null-like rows excluded
};

export type AccuracyBucketRow = {
  bucket: string;
  quoted: number;
  actual: number;
  overrunPct: number; // (actual - quoted) / quoted for the bucket aggregate
  projectCount: number;
};

export type AccuracyStats = {
  points: AccuracyPoint[];
  byBucket: AccuracyBucketRow[];
  totalQuoted: number;
  totalActual: number;
  portfolioOverrunPct: number;  // (totalActual - totalQuoted) / totalQuoted
  medianOverrunPct: number;     // median of per-project overrunPct
  projectsWithQuote: number;    // number of points (= projects with non-zero quoted)
};

// --- R5: Risk factor correlation ---------------------------------------------

export type RiskCorrelationRow = {
  factor: string;        // input field name (for diagnostics)
  label: string;         // human-readable name
  correlation: number;   // Pearson r with overrun %, in [-1, 1]; 0 if n < 3
  n: number;             // projects with both factor and overrun defined
  meaning: string;       // short hint, e.g. "Higher → more overrun"
};

// --- R3: Discipline mix by industry -----------------------------------------

export type DisciplineByIndustryRow = {
  industry: string;
  projectCount: number;
  total: number;
  buckets: Record<string, number>; // bucket name -> hours for this industry
};

// --- R4: Material vs Labor ---------------------------------------------------

export type MaterialLaborPoint = {
  project_id: string;
  project_name: string;
  industry: string;
  stations: number;
  materialCost: number;
  hours: number;
};

export type PortfolioStats = {
  kpis: PortfolioKpis;
  buckets: BucketRow[];
  industries: IndustryRow[];
  categories: CategoryRow[];
  scatter: ScatterPoint[];
  ranked: RankedRow[];
  accuracy: AccuracyStats;
  disciplineByIndustry: DisciplineByIndustryRow[];
  materialLabor: MaterialLaborPoint[];
  riskCorrelations: RiskCorrelationRow[];
};

// R5: which inputs to correlate against overrun %. "invert" flips the meaning
// label so "familiarity" reads as "lower familiarity → more overrun" when the
// raw correlation is negative (familiarity 0 = unfamiliar, 5 = routine).
type RiskFactor = {
  factor: string;
  label: string;
  // When true, show the sign-flipped interpretation in the meaning label.
  interpretAsRisk?: boolean;
};

const RISK_FACTORS: RiskFactor[] = [
  { factor: "process_uncertainty_score", label: "Process uncertainty" },
  { factor: "custom_pct",                label: "Custom content %" },
  { factor: "product_familiarity_score", label: "Product familiarity", interpretAsRisk: true },
  { factor: "has_tricky_packaging",      label: "Tricky packaging" },
  { factor: "Retrofit",                  label: "Retrofit" },
  { factor: "duplicate",                 label: "Duplicate / reuse", interpretAsRisk: true },
  { factor: "complexity_score_1_5",      label: "Complexity" },
];

// --- R2: Per-industry detail (computed on demand) ---------------------------

export type IndustryDetail = {
  industry: string;
  projectCount: number;
  avgHours: number;
  medianOverrunPct: number | null;       // null when no project has a quote
  portfolioMedianOverrunPct: number | null;
  avgProductFamiliarity: number | null;  // 0..5 scale in the dataset
  avgProcessUncertainty: number | null;  // 0..5 scale in the dataset
  avgCustomPct: number | null;           // 0..1
  trickyPackagingShare: number | null;   // 0..1
  retrofitShare: number | null;          // 0..1
  duplicateShare: number | null;         // 0..1
  costPerHour: number | null;            // sum(materialCost) / sum(hours)
  buckets: Record<string, number>;       // discipline mix for the industry
  bucketsShare: Record<string, number>;  // 0..1 share per bucket
};

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toStr(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function emptyAccuracy(): AccuracyStats {
  return {
    points: [],
    byBucket: [],
    totalQuoted: 0,
    totalActual: 0,
    portfolioOverrunPct: 0,
    medianOverrunPct: 0,
    projectsWithQuote: 0,
  };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

// Pearson correlation. Returns 0 when n < 3 or when either series has zero
// variance (constant column) — neither case carries meaningful signal.
function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n !== ys.length || n < 3) return 0;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n;
  const my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const ex = xs[i] - mx;
    const ey = ys[i] - my;
    num += ex * ey;
    dx += ex * ex;
    dy += ey * ey;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

export function buildPortfolio(records: ProjectRecord[]): PortfolioStats {
  if (records.length === 0) {
    return {
      kpis: { projectCount: 0, totalHours: 0, avgHours: 0, medianHours: 0, avgMaterialsCost: null },
      buckets: [],
      industries: [],
      categories: [],
      scatter: [],
      ranked: [],
      accuracy: emptyAccuracy(),
      disciplineByIndustry: [],
      materialLabor: [],
      riskCorrelations: [],
    };
  }

  const bucketsTotal: Record<string, number> = {};
  const industryMap: Record<string, { count: number; total: number }> = {};
  const categoryMap: Record<string, number> = {};
  const scatter: ScatterPoint[] = [];
  const ranked: RankedRow[] = [];
  const allHours: number[] = [];
  const logMatCosts: number[] = [];

  // R1 accumulators
  const accuracyPoints: AccuracyPoint[] = [];
  const bucketQuoted: Record<string, number> = {};
  const bucketActual: Record<string, number> = {};
  const bucketProjects: Record<string, number> = {};

  // R3 accumulator: industry -> bucket -> hours
  const disciplineByIndustry: Record<string, { count: number; buckets: Record<string, number>; total: number }> = {};

  // R4 accumulator
  const materialLabor: MaterialLaborPoint[] = [];

  for (const r of records) {
    const pred = recordToPrediction(r);
    const total_hours = pred.total_p50;
    allHours.push(total_hours);

    // Primary bucket = argmax of sales_buckets by p50
    let primaryBucket = "";
    let maxP50 = -1;
    for (const [bName, bPred] of Object.entries(pred.sales_buckets)) {
      if (bPred.p50 > maxP50) {
        maxP50 = bPred.p50;
        primaryBucket = bName;
      }
    }

    // Accumulate bucket totals
    for (const [bName, bPred] of Object.entries(pred.sales_buckets)) {
      bucketsTotal[bName] = (bucketsTotal[bName] ?? 0) + bPred.p50;
    }

    const industry = toStr(r.industry_segment) || "Unknown";
    const system_category = toStr(r.system_category) || "Unknown";
    const stations = toNum(r.stations_count, 0);
    const complexity = toNum(r.complexity_score_1_5, 0);
    const logMat = toNum(r.log_quoted_materials_cost, NaN);
    const project_id = toStr(r.project_id) || "";
    const project_name = toStr(r.project_name) || project_id || "Unknown";

    // Industry aggregation
    if (!industryMap[industry]) {
      industryMap[industry] = { count: 0, total: 0 };
    }
    industryMap[industry].count += 1;
    industryMap[industry].total += total_hours;

    // Category aggregation
    if (system_category) {
      categoryMap[system_category] = (categoryMap[system_category] ?? 0) + 1;
    }

    // Scatter
    scatter.push({ complexity, stations, hours: total_hours, industry, name: project_name });

    // Log materials cost (guard NaN/0)
    if (Number.isFinite(logMat)) {
      logMatCosts.push(logMat);
    }

    // Ranked row (peer-benchmark fields filled in a second pass below)
    ranked.push({
      project_id,
      project_name,
      industry,
      system_category,
      stations,
      total_hours,
      primary_bucket: primaryBucket,
      complexity,
      peerMedian: null,
      peerP10: null,
      peerP90: null,
      peerCount: 0,
      outlierZ: null,
      outlierDirection: null,
    });

    // R1: per-project quoted vs actual (raw CSV fields)
    let rQuoted = 0;
    let rActual = 0;
    const rBucketQuoted: Record<string, number> = {};
    const rBucketActual: Record<string, number> = {};
    for (const op of OPERATIONS) {
      const q = toNum(r[`quoted_${op}_hours`], NaN);
      const a = toNum(r[`${op}_actual_hours`], NaN);
      const qv = Number.isFinite(q) && q > 0 ? q : 0;
      const av = Number.isFinite(a) && a > 0 ? a : 0;
      rQuoted += qv;
      rActual += av;
      const b = SALES_BUCKET_MAP[op];
      if (b) {
        rBucketQuoted[b] = (rBucketQuoted[b] ?? 0) + qv;
        rBucketActual[b] = (rBucketActual[b] ?? 0) + av;
      }
    }
    if (rQuoted > 0) {
      const overrunPct = (rActual - rQuoted) / rQuoted;
      accuracyPoints.push({
        project_id,
        project_name,
        industry,
        complexity,
        quoted: rQuoted,
        actual: rActual,
        overrunPct,
      });
      // Per-bucket portfolio sums (only count bucket-projects where quoted is present)
      for (const b of SALES_BUCKETS) {
        const bq = rBucketQuoted[b] ?? 0;
        const ba = rBucketActual[b] ?? 0;
        if (bq > 0) {
          bucketQuoted[b] = (bucketQuoted[b] ?? 0) + bq;
          bucketActual[b] = (bucketActual[b] ?? 0) + ba;
          bucketProjects[b] = (bucketProjects[b] ?? 0) + 1;
        }
      }
    }

    // R3: per-(industry, bucket) hours using prediction buckets (same source as chart 02)
    if (!disciplineByIndustry[industry]) {
      disciplineByIndustry[industry] = { count: 0, buckets: {}, total: 0 };
    }
    disciplineByIndustry[industry].count += 1;
    for (const [bName, bPred] of Object.entries(pred.sales_buckets)) {
      disciplineByIndustry[industry].buckets[bName] =
        (disciplineByIndustry[industry].buckets[bName] ?? 0) + bPred.p50;
      disciplineByIndustry[industry].total += bPred.p50;
    }

    // R4: material cost vs labor
    const matCost = toNum(r.quoted_materials_cost, NaN);
    if (Number.isFinite(matCost) && matCost > 0 && total_hours > 0) {
      materialLabor.push({
        project_id,
        project_name,
        industry,
        stations,
        materialCost: matCost,
        hours: total_hours,
      });
    }
  }

  // KPIs
  const totalHours = allHours.reduce((a, b) => a + b, 0);
  const avgHours = allHours.length > 0 ? totalHours / allHours.length : 0;
  const sorted = [...allHours].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianHours = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  let avgMaterialsCost: number | null = null;
  if (logMatCosts.length > 0) {
    const meanLog = logMatCosts.reduce((a, b) => a + b, 0) / logMatCosts.length;
    const val = Math.exp(meanLog);
    avgMaterialsCost = Number.isFinite(val) ? val : null;
  }

  // Buckets sorted desc by hours, filter zero
  const buckets: BucketRow[] = Object.entries(bucketsTotal)
    .filter(([, h]) => h > 0)
    .map(([bucket, hours]) => ({ bucket, hours }))
    .sort((a, b) => b.hours - a.hours);

  // Industries sorted by totalHours desc
  const industries: IndustryRow[] = Object.entries(industryMap)
    .map(([industry, { count, total }]) => ({
      industry,
      projectCount: count,
      avgHours: count > 0 ? total / count : 0,
      totalHours: total,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  // Categories sorted desc
  const categories: CategoryRow[] = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Ranked sorted by total_hours desc
  ranked.sort((a, b) => b.total_hours - a.total_hours);

  // R1: finalize accuracy
  let totalQuoted = 0;
  let totalActual = 0;
  for (const p of accuracyPoints) {
    totalQuoted += p.quoted;
    totalActual += p.actual;
  }
  const portfolioOverrunPct = totalQuoted > 0 ? (totalActual - totalQuoted) / totalQuoted : 0;
  const medianOverrunPct = median(accuracyPoints.map((p) => p.overrunPct));

  const byBucket: AccuracyBucketRow[] = SALES_BUCKETS.map((b) => {
    const q = bucketQuoted[b] ?? 0;
    const a = bucketActual[b] ?? 0;
    return {
      bucket: b,
      quoted: q,
      actual: a,
      overrunPct: q > 0 ? (a - q) / q : 0,
      projectCount: bucketProjects[b] ?? 0,
    };
  }).filter((row) => row.projectCount > 0);

  // R3: materialize disciplineByIndustry; sort buckets within each row using SALES_BUCKETS order.
  const disciplineRows: DisciplineByIndustryRow[] = Object.entries(disciplineByIndustry)
    .map(([industry, { count, buckets: bMap, total }]) => {
      const orderedBuckets: Record<string, number> = {};
      for (const b of SALES_BUCKETS) {
        if ((bMap[b] ?? 0) > 0) orderedBuckets[b] = bMap[b];
      }
      return { industry, projectCount: count, total, buckets: orderedBuckets };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  // R7: peer benchmarks. Peer group = projects with the same integer complexity
  // tier (rounded 1..5), excluding the project itself. Needs >=2 peers for a
  // meaningful band; the outlier flag needs a non-degenerate spread.
  const OUTLIER_Z = 1.5;
  const hoursByTier: Record<number, number[]> = {};
  for (const row of ranked) {
    const t = Math.round(row.complexity);
    if (!Number.isFinite(t) || t < 1 || t > 5) continue;
    if (!hoursByTier[t]) hoursByTier[t] = [];
    hoursByTier[t].push(row.total_hours);
  }
  const tierStats: Record<number, { mean: number; std: number; sortedExcl: (h: number) => number[] } > = {};
  for (const [tierStr, hours] of Object.entries(hoursByTier)) {
    const tier = Number(tierStr);
    const n = hours.length;
    if (n < 2) continue;
    const mean = hours.reduce((a, b) => a + b, 0) / n;
    let vv = 0;
    for (const h of hours) vv += (h - mean) * (h - mean);
    const std = Math.sqrt(vv / n);
    const sorted = [...hours].sort((a, b) => a - b);
    tierStats[tier] = {
      mean,
      std,
      // Helper: percentile band over peers, i.e. the tier sorted with one
      // instance of this project's hours removed (approx — treats ties naively).
      sortedExcl: (h: number) => {
        const idx = sorted.indexOf(h);
        if (idx < 0) return sorted;
        return [...sorted.slice(0, idx), ...sorted.slice(idx + 1)];
      },
    };
  }
  for (const row of ranked) {
    const tier = Math.round(row.complexity);
    const stat = tierStats[tier];
    if (!stat) continue;
    const peers = stat.sortedExcl(row.total_hours);
    if (peers.length < 2) continue;
    row.peerMedian = percentile(peers, 0.5);
    row.peerP10 = percentile(peers, 0.1);
    row.peerP90 = percentile(peers, 0.9);
    row.peerCount = peers.length;
    if (stat.std > 0) {
      const z = (row.total_hours - stat.mean) / stat.std;
      row.outlierZ = z;
      if (z > OUTLIER_Z) row.outlierDirection = "high";
      else if (z < -OUTLIER_Z) row.outlierDirection = "low";
    }
  }

  // R5: Pearson correlation between each risk factor and overrun %. Projects
  // without a quote are excluded (no overrun defined).
  const overrunByProject = new Map<string, number>();
  for (const p of accuracyPoints) overrunByProject.set(p.project_id, p.overrunPct);

  const riskCorrelations: RiskCorrelationRow[] = RISK_FACTORS.map(({ factor, label, interpretAsRisk }) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const r of records) {
      const pid = toStr(r.project_id);
      const over = overrunByProject.get(pid);
      if (over === undefined) continue;
      const v = toNum(r[factor], NaN);
      if (!Number.isFinite(v)) continue;
      xs.push(v);
      ys.push(over);
    }
    const corr = pearson(xs, ys);
    const effectiveSign = interpretAsRisk ? -corr : corr;
    const magnitude = Math.abs(corr);
    let meaning: string;
    if (xs.length < 3 || magnitude < 0.1) {
      meaning = "No clear signal";
    } else {
      const strength =
        magnitude >= 0.5 ? "Strong"
        : magnitude >= 0.3 ? "Moderate"
        : "Weak";
      meaning = effectiveSign > 0
        ? `${strength}: higher → more overrun`
        : `${strength}: higher → less overrun`;
    }
    return { factor, label, correlation: corr, n: xs.length, meaning };
  }).sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return {
    kpis: {
      projectCount: records.length,
      totalHours,
      avgHours,
      medianHours,
      avgMaterialsCost,
    },
    buckets,
    industries,
    categories,
    scatter,
    ranked,
    accuracy: {
      points: accuracyPoints,
      byBucket,
      totalQuoted,
      totalActual,
      portfolioOverrunPct,
      medianOverrunPct,
      projectsWithQuote: accuracyPoints.length,
    },
    disciplineByIndustry: disciplineRows,
    materialLabor,
    riskCorrelations,
  };
}

// --- R2: per-industry detail (computed on demand from a filtered record set)
//
// Caller responsibility: pass records that are already filtered to the industry
// of interest (e.g. the filtered record set when exactly one industry filter
// is selected). `portfolioMedianOverrunPct` should be the portfolio-level
// median from the unfiltered portfolio so the card can show "vs baseline".
export function computeIndustryDetail(
  records: ProjectRecord[],
  industry: string,
  portfolioMedianOverrunPct: number | null,
): IndustryDetail {
  const n = records.length;
  if (n === 0) {
    return {
      industry,
      projectCount: 0,
      avgHours: 0,
      medianOverrunPct: null,
      portfolioMedianOverrunPct,
      avgProductFamiliarity: null,
      avgProcessUncertainty: null,
      avgCustomPct: null,
      trickyPackagingShare: null,
      retrofitShare: null,
      duplicateShare: null,
      costPerHour: null,
      buckets: {},
      bucketsShare: {},
    };
  }

  const overrunPcts: number[] = [];
  const familiarity: number[] = [];
  const uncertainty: number[] = [];
  const customPct: number[] = [];
  let tricky = 0, trickyN = 0;
  let retrofit = 0, retrofitN = 0;
  let duplicate = 0, duplicateN = 0;
  let totalMatCost = 0;
  let totalHoursForCost = 0;
  const bucketTotals: Record<string, number> = {};
  let totalHours = 0;

  for (const r of records) {
    // per-project overrun
    let rQuoted = 0, rActual = 0;
    for (const op of OPERATIONS) {
      const q = toNum(r[`quoted_${op}_hours`], NaN);
      const a = toNum(r[`${op}_actual_hours`], NaN);
      if (Number.isFinite(q) && q > 0) rQuoted += q;
      if (Number.isFinite(a) && a > 0) rActual += a;
    }
    if (rQuoted > 0) overrunPcts.push((rActual - rQuoted) / rQuoted);

    const fam = toNum(r.product_familiarity_score, NaN);
    if (Number.isFinite(fam)) familiarity.push(fam);
    const unc = toNum(r.process_uncertainty_score, NaN);
    if (Number.isFinite(unc)) uncertainty.push(unc);
    const cp = toNum(r.custom_pct, NaN);
    if (Number.isFinite(cp)) customPct.push(cp);

    const tp = toNum(r.has_tricky_packaging, NaN);
    if (Number.isFinite(tp)) { trickyN += 1; if (tp > 0) tricky += 1; }
    const rf = toNum(r.Retrofit, NaN);
    if (Number.isFinite(rf)) { retrofitN += 1; if (rf > 0) retrofit += 1; }
    const du = toNum(r.duplicate, NaN);
    if (Number.isFinite(du)) { duplicateN += 1; if (du > 0) duplicate += 1; }

    const pred = recordToPrediction(r);
    totalHours += pred.total_p50;
    for (const [bName, bPred] of Object.entries(pred.sales_buckets)) {
      bucketTotals[bName] = (bucketTotals[bName] ?? 0) + bPred.p50;
    }
    const matCost = toNum(r.quoted_materials_cost, NaN);
    if (Number.isFinite(matCost) && matCost > 0 && pred.total_p50 > 0) {
      totalMatCost += matCost;
      totalHoursForCost += pred.total_p50;
    }
  }

  const avg = (xs: number[]) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const share = (hit: number, tot: number) => (tot > 0 ? hit / tot : null);

  const orderedBuckets: Record<string, number> = {};
  const orderedShare: Record<string, number> = {};
  const bucketSum = Object.values(bucketTotals).reduce((a, b) => a + b, 0);
  for (const b of SALES_BUCKETS) {
    if ((bucketTotals[b] ?? 0) > 0) {
      orderedBuckets[b] = bucketTotals[b];
      orderedShare[b] = bucketSum > 0 ? bucketTotals[b] / bucketSum : 0;
    }
  }

  return {
    industry,
    projectCount: n,
    avgHours: totalHours / n,
    medianOverrunPct: overrunPcts.length > 0 ? median(overrunPcts) : null,
    portfolioMedianOverrunPct,
    avgProductFamiliarity: avg(familiarity),
    avgProcessUncertainty: avg(uncertainty),
    avgCustomPct: avg(customPct),
    trickyPackagingShare: share(tricky, trickyN),
    retrofitShare: share(retrofit, retrofitN),
    duplicateShare: share(duplicate, duplicateN),
    costPerHour: totalHoursForCost > 0 ? totalMatCost / totalHoursForCost : null,
    buckets: orderedBuckets,
    bucketsShare: orderedShare,
  };
}
