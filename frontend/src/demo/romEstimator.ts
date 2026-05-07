/**
 * Phase 7 — D-04 / D-05 / D-09 / D-15. ROM-mode estimator.
 *
 * Single-call orchestrator over the existing pyodide predictQuote. Takes
 * the four ROM inputs (three classification Selects + one currency
 * value), fills every hidden hour-driving input with quoteFormDefaults
 * via toQuoteFormValues, runs ONE prediction, then post-processes the
 * model output to:
 *   1. Widen the p10/p50/p90 half-widths by ROM_BAND_MULTIPLIER (D-09)
 *   2. Compute a sanity-flag based on the ROM_BASELINE_RATE_HOURS_PER_DOLLAR
 *      heuristic (D-05 / D-15) — the result panel uses this to decide
 *      whether to render the wide-range banner.
 *
 * NO core/ change, NO _PREDICT_SHIM change, NO retraining (D-04).
 * Pure TypeScript orchestrator over predictQuote + getFeatureImportances.
 *
 * Naming + structural precedent: frontend/src/demo/multiVisionAggregator.ts.
 */
import type { QuoteInput, QuotePrediction } from "@/api/types";
import {
  predictQuote,
  getFeatureImportances,
  type Dataset,
} from "@/demo/pyodideClient";
import { toUnifiedResult } from "@/demo/quoteAdapter";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import type { ModelMetric } from "@/demo/modelMetrics";
import type { ProjectRecord } from "@/demo/realProjects";
import {
  transformToQuoteInput,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";
import {
  toQuoteFormValues,
  type RomFormValues,
} from "@/pages/single-quote/romSchema";

// ---------------------------------------------------------------------------
// Locked constants (D-05, D-09, D-15)
// ---------------------------------------------------------------------------

/**
 * D-09: deterministic confidence-band widening multiplier applied to the
 * half-widths of the hero range. Justification (UI-SPEC §D-09): Phase 6
 * D-07's RSS aggregation worst-case is √2 ≈ 1.41 on a single-row aggregate;
 * 1.75 places ROM visibly wider than that without becoming meaningless.
 */
export const ROM_BAND_MULTIPLIER = 1.75;

/**
 * D-05: average labor rate, expressed as hours per dollar of materials.
 * 0.0008 = 1 hour per $1,250. Source: model_metrics_real.json totals
 * (mean total ≈ 1,200 hrs, mean materials ≈ $1.5M). Used as a SANITY-CHECK
 * fallback only; the predictive output is still the trained model's.
 * NOT user-facing (UI-SPEC D-05 forbids surfacing it in customer copy).
 */
export const ROM_BASELINE_RATE_HOURS_PER_DOLLAR = 0.0008;

/**
 * D-15: divergence threshold above which the result panel renders the
 * wide-range banner. abs(modelHours / heuristicHours) > 5 OR < 1/5.
 */
export const ROM_SANITY_DIVERGENCE_FACTOR = 5;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RomMetadata {
  mode: "rom";
  bandMultiplier: number;
  baselineRate: number;
  /** True when model output and heuristic diverge by > ROM_SANITY_DIVERGENCE_FACTOR. */
  sanityFlag: boolean;
}

export interface EstimateRomArgs {
  romValues: RomFormValues;
  dataset: Dataset;
  metrics: Record<string, ModelMetric>;
  supportingPool: ProjectRecord[];
  supportingLabel: string;
}

export interface EstimateRomResult {
  result: UnifiedQuoteResult;
  rom: RomMetadata;
  /**
   * The full QuoteFormValues used for the predict — surface back to the
   * result panel's "Your inputs" recap so it renders consistent state.
   */
  formValues: QuoteFormValues;
}

/**
 * Run a single ROM-mode prediction and post-process for D-09 + D-15.
 */
export async function estimateRom(
  args: EstimateRomArgs,
): Promise<EstimateRomResult> {
  const { romValues, dataset, metrics, supportingPool, supportingLabel } = args;

  // 1. Expand the 4 ROM fields into a complete QuoteFormValues with locked
  //    ROM defaults filling every hidden hour-driving input (D-04).
  const formValues = toQuoteFormValues(romValues);
  const baselineInput: QuoteInput = transformToQuoteInput(formValues);

  // 2. Single predict + importances. Both are needed by toUnifiedResult.
  const [prediction, importances] = await Promise.all([
    predictQuote(baselineInput, dataset),
    getFeatureImportances(dataset),
  ]);

  // 3. Build the standard UnifiedQuoteResult via the existing adapter
  //    using the model's narrow band first.
  const narrowPredByTarget = buildPredByTarget(prediction);
  const narrowResult = toUnifiedResult({
    input: baselineInput,
    prediction: narrowPredByTarget,
    importances,
    metrics,
    supportingPool,
    supportingLabel,
  });

  // 4. Widen the hero-card likely range AND every per-category range by
  //    the ROM_BAND_MULTIPLIER (D-09). Apply to half-widths around the p50.
  const widenedResult: UnifiedQuoteResult = {
    ...narrowResult,
    likelyRangeLow: widenLow(
      narrowResult.estimateHours,
      narrowResult.likelyRangeLow,
    ),
    likelyRangeHigh: widenHigh(
      narrowResult.estimateHours,
      narrowResult.likelyRangeHigh,
    ),
    perCategory: narrowResult.perCategory.map((c) => ({
      ...c,
      rangeLow: widenLow(c.estimateHours, c.rangeLow),
      rangeHigh: widenHigh(c.estimateHours, c.rangeHigh),
    })),
    // D-06: per-vision is hidden in ROM mode (no vision rows). Force [].
    perVisionContributions: [],
  };

  // 5. Sanity flag (D-05 / D-15). Skip when materialsCost <= 0
  //    (the form schema rejects this anyway, but guard for type safety).
  const materialsCost = romValues.estimated_materials_cost;
  const heuristicHours = materialsCost * ROM_BASELINE_RATE_HOURS_PER_DOLLAR;
  const sanityFlag =
    materialsCost > 0 &&
    heuristicHours > 0 &&
    widenedResult.estimateHours > 0 &&
    (widenedResult.estimateHours / heuristicHours >
      ROM_SANITY_DIVERGENCE_FACTOR ||
      heuristicHours / widenedResult.estimateHours >
        ROM_SANITY_DIVERGENCE_FACTOR);

  return {
    result: widenedResult,
    rom: {
      mode: "rom",
      bandMultiplier: ROM_BAND_MULTIPLIER,
      baselineRate: ROM_BASELINE_RATE_HOURS_PER_DOLLAR,
      sanityFlag,
    },
    formValues,
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Convert a QuotePrediction's per-op {p10, p50, p90} into the per-target
 * map shape `toUnifiedResult` expects ("{op_key}_actual_hours" → tuple).
 * Mirrors multiVisionAggregator.ts's buildAggregatedPrediction shape.
 */
function buildPredByTarget(
  prediction: QuotePrediction,
): Record<string, { p10: number; p50: number; p90: number }> {
  const out: Record<string, { p10: number; p50: number; p90: number }> = {};
  for (const [opKey, op] of Object.entries(prediction.ops)) {
    out[`${opKey}_actual_hours`] = {
      p10: Math.max(0, op.p10),
      p50: Math.max(0, op.p50),
      p90: Math.max(0, op.p90),
    };
  }
  return out;
}

/**
 * Widen the lower bound: distance from p50 to p10 grows by ROM_BAND_MULTIPLIER.
 * Clamped at zero (predictions cannot be negative hours).
 */
function widenLow(p50: number, narrowLow: number): number {
  const half = Math.max(0, p50 - narrowLow);
  return Math.max(0, p50 - half * ROM_BAND_MULTIPLIER);
}

/**
 * Widen the upper bound: distance from p50 to p90 grows by ROM_BAND_MULTIPLIER.
 */
function widenHigh(p50: number, narrowHigh: number): number {
  const half = Math.max(0, narrowHigh - p50);
  return p50 + half * ROM_BAND_MULTIPLIER;
}
