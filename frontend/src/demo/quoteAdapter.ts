import type { QuoteInput } from "@/api/types";
import { type FeatureStats, type ProjectRecord, QUOTE_NUM_FIELDS } from "@/demo/realProjects";
import { nearestK } from "@/lib/nearestNeighbor";
import { sumActualHours } from "@/lib/projectHours";
import { CATEGORY_LABEL } from "@/demo/categoryLabels";
import { humanFeatureLabel } from "@/demo/featureLabels";
import type { UnifiedQuoteResult } from "./quoteResult";
import type { ModelMetric } from "./modelMetrics";

export interface AdapterArgs {
  input: QuoteInput;
  prediction: Record<string, { p10: number; p50: number; p90: number }>;
  importances: Record<string, Array<[string, number]>>;
  metrics: Record<string, ModelMetric>;
  supportingPool: ProjectRecord[];
  /** "Most similar past projects" or "Most similar training rows" */
  supportingLabel: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function toUnifiedResult(args: AdapterArgs): UnifiedQuoteResult {
  const targets = Object.keys(args.prediction);

  const perCategory = targets.map((t) => ({
    label: CATEGORY_LABEL[t] ?? t,
    estimateHours: args.prediction[t].p50,
    rangeLow: args.prediction[t].p10,
    rangeHigh: args.prediction[t].p90,
    confidence: r2ToConfidence(args.metrics[t]?.r2 ?? 0),
  }));

  const estimateHours = perCategory.reduce((s, c) => s + c.estimateHours, 0);
  const likelyRangeLow = Math.max(
    0,
    perCategory.reduce((s, c) => s + c.rangeLow, 0),
  );
  const likelyRangeHigh = perCategory.reduce((s, c) => s + c.rangeHigh, 0);
  const overallConfidence = rollUpConfidence(perCategory);
  const topDrivers = rollUpDrivers(args.prediction, args.importances, args.input);

  // Build feature stats from pool for nearest-neighbor search
  const stats = buildFeatureStats(args.supportingPool);
  const supportingItems = nearestK(args.input, args.supportingPool, stats, 3).map((m) => ({
    projectId: m.record.project_id ?? "",
    projectName: m.record.project_name ?? "",
    actualHours: sumActualHours(m.record),
    similarity: 1 / (1 + m.distance),
  }));

  return {
    estimateHours,
    likelyRangeLow,
    likelyRangeHigh,
    overallConfidence,
    perCategory,
    topDrivers,
    supportingMatches: {
      label: args.supportingLabel,
      items: supportingItems,
    },
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function r2ToConfidence(r2: number): "high" | "moderate" | "lower" {
  if (r2 >= 0.7) return "high";
  if (r2 >= 0.5) return "moderate";
  return "lower";
}

function rollUpConfidence(
  perCategory: Array<{ estimateHours: number; confidence: "high" | "moderate" | "lower" }>,
): "high" | "moderate" | "lower" {
  const total = perCategory.reduce((s, c) => s + c.estimateHours, 0);
  if (total === 0) return "lower";
  const score = perCategory.reduce((s, c) => {
    const w = c.estimateHours / total;
    const v = c.confidence === "high" ? 1 : c.confidence === "moderate" ? 0.5 : 0;
    return s + w * v;
  }, 0);
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "moderate";
  return "lower";
}

function rollUpDrivers(
  prediction: AdapterArgs["prediction"],
  importances: AdapterArgs["importances"],
  input: QuoteInput,
): UnifiedQuoteResult["topDrivers"] {
  const totalEstimate = Object.values(prediction).reduce((s, p) => s + p.p50, 0);
  if (totalEstimate <= 0) return [];

  const accum = new Map<string, number>();
  for (const [tgt, pairs] of Object.entries(importances)) {
    const w = (prediction[tgt]?.p50 ?? 0) / totalEstimate;
    for (const [name, imp] of pairs) {
      accum.set(name, (accum.get(name) ?? 0) + imp * w);
    }
  }

  const sorted = [...accum.entries()].sort((a, b) => b[1] - a[1]);
  const inputRecord = input as Record<string, unknown>;

  return sorted.slice(0, 3).map(([rawName, weight]) => {
    const { label, direction } = humanFeatureLabel(rawName, inputRecord);
    const magnitude: "strong" | "moderate" | "minor" =
      weight > 0.15 ? "strong" : weight > 0.08 ? "moderate" : "minor";
    return { label, direction, magnitude };
  });
}

/**
 * Compute per-field mean/std/min/max statistics from a pool of ProjectRecords.
 * Used to z-score numeric features for nearest-neighbor distance calculations.
 * Only numeric fields from QUOTE_NUM_FIELDS are included.
 */
function buildFeatureStats(pool: ProjectRecord[]): FeatureStats {
  if (pool.length === 0) return {};

  const stats: FeatureStats = {};
  for (const f of QUOTE_NUM_FIELDS) {
    const values: number[] = [];
    for (const r of pool) {
      const v = r[f];
      if (v === null || v === undefined || v === "") continue;
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) values.push(n);
    }
    if (values.length === 0) continue;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((s, x) => s + x, 0) / values.length;
    const variance =
      values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    stats[f] = { min, max, mean, std };
  }
  return stats;
}
