import { QuoteInput } from "@/api/types";
import {
  FeatureStats,
  ProjectRecord,
  QUOTE_CAT_FIELDS,
  QUOTE_NUM_FIELDS,
} from "@/demo/realProjects";

export type Scored = { record: ProjectRecord; distance: number };

const CATEGORICAL_WEIGHT = 2.0;

function numericValue(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function zScore(value: number, mean: number, std: number): number {
  if (std <= 0) return 0;
  return (value - mean) / std;
}

/**
 * Weighted distance between a user's QuoteInput and a historical ProjectRecord.
 * Numeric features are z-scored via `stats`; categorical features contribute
 * a constant penalty per mismatch.
 */
export function distance(
  input: QuoteInput,
  record: ProjectRecord,
  stats: FeatureStats,
): number {
  let sq = 0;
  for (const f of QUOTE_NUM_FIELDS) {
    const s = stats[f];
    if (!s) continue;
    const a = zScore(numericValue((input as Record<string, unknown>)[f]), s.mean, s.std);
    const b = zScore(numericValue(record[f]), s.mean, s.std);
    const d = a - b;
    sq += d * d;
  }
  for (const f of QUOTE_CAT_FIELDS) {
    const a = String((input as Record<string, unknown>)[f] ?? "");
    const b = String(record[f] ?? "");
    if (a !== b) sq += CATEGORICAL_WEIGHT * CATEGORICAL_WEIGHT;
  }
  return Math.sqrt(sq);
}

/** Return the `k` nearest records, sorted ascending by distance. Ties broken by project_id. */
export function nearestK(
  input: QuoteInput,
  pool: ProjectRecord[],
  stats: FeatureStats,
  k: number,
): Scored[] {
  const scored: Scored[] = pool.map((record) => ({
    record,
    distance: distance(input, record, stats),
  }));
  scored.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return String(a.record.project_id ?? "").localeCompare(String(b.record.project_id ?? ""));
  });
  return scored.slice(0, k);
}
