import { useQuery } from "@tanstack/react-query";

import {
  OpPrediction,
  QuoteInput,
  QuotePrediction,
  SalesBucketPrediction,
  SavedQuote,
  SavedQuoteSummary,
} from "@/api/types";
import { DEMO_ASSETS } from "@/lib/demoMode";

export type FeatureStats = Record<string, { min: number; max: number; mean: number; std: number }>;

export type DemoManifest = {
  built_at: string;
  real_count: number;
  synthetic_count: number;
  feature_stats: FeatureStats;
};

// Raw CSV-derived record: flat key-value, includes identifier + inputs + per-op actual hours.
export type ProjectRecord = {
  project_id?: string | null;
  project_name?: string | null;
  year?: number | null;
} & Record<string, string | number | null | undefined>;

const OPERATIONS = [
  "me10", "me15", "me230", "ee20", "rb30", "cp50",
  "bld100", "shp150", "inst160", "trv180", "doc190", "pm200",
] as const;

const SALES_BUCKET_MAP: Record<string, string> = {
  me10: "ME", me15: "ME", me230: "ME",
  ee20: "EE", rb30: "Robot", cp50: "Controls",
  bld100: "Build", shp150: "Build", inst160: "Install",
  trv180: "Travel", doc190: "Docs", pm200: "PM",
};

const SALES_BUCKETS = ["ME", "EE", "PM", "Docs", "Build", "Robot", "Controls", "Install", "Travel"];

const QUOTE_CAT_FIELDS = [
  "industry_segment",
  "system_category",
  "automation_level",
  "plc_family",
  "hmi_family",
  "vision_type",
] as const;

const QUOTE_NUM_FIELDS = [
  "stations_count", "robot_count", "fixture_sets", "part_types", "servo_axes",
  "pneumatic_devices", "safety_doors", "weldment_perimeter_ft", "fence_length_ft",
  "conveyor_length_ft", "product_familiarity_score", "product_rigidity",
  "is_product_deformable", "is_bulk_product", "bulk_rigidity_score",
  "has_tricky_packaging", "process_uncertainty_score", "changeover_time_min",
  "safety_devices_count", "custom_pct", "duplicate", "has_controls", "has_robotics",
  "Retrofit", "complexity_score_1_5", "vision_systems_count", "panel_count",
  "drive_count", "stations_robot_index", "mech_complexity_index",
  "controls_complexity_index", "physical_scale_index", "log_quoted_materials_cost",
] as const;

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toStr(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function recordToQuoteInput(r: ProjectRecord): QuoteInput {
  const input: QuoteInput = {
    project_id: r.project_id != null ? String(r.project_id) : null,
    industry_segment: toStr(r.industry_segment),
    system_category: toStr(r.system_category),
    automation_level: toStr(r.automation_level),
    plc_family: toStr(r.plc_family),
    hmi_family: toStr(r.hmi_family),
    vision_type: toStr(r.vision_type),
  };
  const bag = input as unknown as Record<string, unknown>;
  for (const f of QUOTE_NUM_FIELDS) {
    bag[f] = toNum(r[f], 0);
  }
  return input;
}

/** Build a prediction-shaped object from per-op actual hours (treat actuals as p50 with tight band). */
export function recordToPrediction(r: ProjectRecord): QuotePrediction {
  const ops: Record<string, OpPrediction> = {};
  const buckets: Record<string, { p10: number; p50: number; p90: number }> =
    Object.fromEntries(SALES_BUCKETS.map((b) => [b, { p10: 0, p50: 0, p90: 0 }]));
  let t50 = 0, t10 = 0, t90 = 0;

  for (const op of OPERATIONS) {
    const actual = toNum(r[`${op}_actual_hours`], NaN);
    if (!Number.isFinite(actual) || actual <= 0) continue;
    const band = actual * 0.15;
    const p10 = Math.max(0, actual - band);
    const p50 = actual;
    const p90 = actual + band;
    ops[op] = {
      p50, p10, p90,
      std: band / 1.28,
      rel_width: band * 2 / p50,
      confidence: "high",
    };
    const b = SALES_BUCKET_MAP[op];
    if (b && buckets[b]) {
      buckets[b].p10 += p10;
      buckets[b].p50 += p50;
      buckets[b].p90 += p90;
    }
    t50 += p50; t10 += p10; t90 += p90;
  }

  const salesBuckets: Record<string, SalesBucketPrediction> = {};
  for (const [b, totals] of Object.entries(buckets)) {
    const { p10, p50, p90 } = totals;
    const rel = p50 > 0 ? (p90 - p10) / p50 : 0;
    const conf: SalesBucketPrediction["confidence"] =
      rel < 0.3 ? "high" : rel < 0.6 ? "medium" : "low";
    salesBuckets[b] = { p10, p50, p90, rel_width: rel, confidence: conf };
  }

  return {
    ops,
    total_p50: t50,
    total_p10: t10,
    total_p90: t90,
    sales_buckets: salesBuckets,
  };
}

export function recordToSavedQuote(r: ProjectRecord, idx: number): SavedQuote {
  const inputs = recordToQuoteInput(r);
  const prediction = recordToPrediction(r);
  const name = toStr(r.project_name) || toStr(r.project_id) || `Project ${idx + 1}`;
  return {
    id: String(r.project_id ?? `real-${idx}`),
    name,
    project_name: name,
    client_name: null,
    notes: null,
    inputs,
    prediction,
    quoted_hours_by_bucket: null,
    created_at: r.year ? `${r.year}-01-01T00:00:00Z` : new Date(0).toISOString(),
    created_by: "historical",
  };
}

export function recordToSummary(r: ProjectRecord, idx: number): SavedQuoteSummary {
  const q = recordToSavedQuote(r, idx);
  return {
    id: q.id,
    name: q.name,
    project_name: q.project_name,
    client_name: null,
    industry_segment: q.inputs.industry_segment,
    hours: q.prediction.total_p50,
    range_low: q.prediction.total_p10,
    range_high: q.prediction.total_p90,
    created_at: q.created_at,
    created_by: q.created_by,
  };
}

export function useRealProjects() {
  return useQuery<ProjectRecord[]>({
    queryKey: ["demo", "realProjects"],
    queryFn: async () => {
      const res = await fetch(`${DEMO_ASSETS}/real-projects.json`);
      if (!res.ok) throw new Error(`real-projects.json ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useSyntheticPool() {
  return useQuery<ProjectRecord[]>({
    queryKey: ["demo", "syntheticPool"],
    queryFn: async () => {
      const res = await fetch(`${DEMO_ASSETS}/synthetic-pool.json`);
      if (!res.ok) throw new Error(`synthetic-pool.json ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useDemoManifest() {
  return useQuery<DemoManifest>({
    queryKey: ["demo", "manifest"],
    queryFn: async () => {
      const res = await fetch(`${DEMO_ASSETS}/manifest.json`);
      if (!res.ok) throw new Error(`manifest.json ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
  });
}

export { QUOTE_NUM_FIELDS, QUOTE_CAT_FIELDS, OPERATIONS };
