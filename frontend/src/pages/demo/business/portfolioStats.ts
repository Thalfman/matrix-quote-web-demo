// Pure aggregation layer for the Business Insights page: derives KPIs, bucket totals,
// industry averages, category counts, scatter points, and ranked rows from raw project records.
import { ProjectRecord, recordToPrediction } from "@/demo/realProjects";

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
};

export type PortfolioStats = {
  kpis: PortfolioKpis;
  buckets: BucketRow[];
  industries: IndustryRow[];
  categories: CategoryRow[];
  scatter: ScatterPoint[];
  ranked: RankedRow[];
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

export function buildPortfolio(records: ProjectRecord[]): PortfolioStats {
  if (records.length === 0) {
    return {
      kpis: { projectCount: 0, totalHours: 0, avgHours: 0, medianHours: 0, avgMaterialsCost: null },
      buckets: [],
      industries: [],
      categories: [],
      scatter: [],
      ranked: [],
    };
  }

  const bucketsTotal: Record<string, number> = {};
  const industryMap: Record<string, { count: number; total: number }> = {};
  const categoryMap: Record<string, number> = {};
  const scatter: ScatterPoint[] = [];
  const ranked: RankedRow[] = [];
  const allHours: number[] = [];
  const logMatCosts: number[] = [];

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

    // Ranked row
    ranked.push({
      project_id,
      project_name,
      industry,
      system_category,
      stations,
      total_hours,
      primary_bucket: primaryBucket,
    });
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
  };
}
