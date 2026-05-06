/**
 * Multi-vision aggregator (Phase 6, D-05/D-06/D-07/D-08).
 *
 * Orchestrates an N+1 predict against the existing pyodide client:
 *   - 1 baseline call with vision_type="None", vision_systems_count=0
 *   - N per-row calls with vision_type=row.type, vision_systems_count=row.count
 *
 * Aggregates per-target totals as `total = baseline + sum(perRow - baseline)`,
 * combines range half-widths via root-sum-square (asymmetric, D-07), and
 * computes per-target confidence as `min` across baseline + per-row predicts
 * (worst-case honest-signal posture, D-07).
 *
 * NO core/ change, NO _PREDICT_SHIM change, NO retraining (D-06).
 * Pure TypeScript orchestrator over predictQuote + getFeatureImportances.
 */
import type { QuoteInput, QuotePrediction } from "@/api/types";
import { predictQuote, getFeatureImportances, type Dataset } from "@/demo/pyodideClient";
import { toUnifiedResult } from "@/demo/quoteAdapter";
import type { PerVisionContribution, UnifiedQuoteResult } from "@/demo/quoteResult";
import { humanFeatureLabel } from "@/demo/featureLabels";
import type { ModelMetric } from "@/demo/modelMetrics";
import type { ProjectRecord } from "@/demo/realProjects";
import {
  transformToQuoteInput,
  type QuoteFormValues,
  type VisionRow,
} from "@/pages/single-quote/schema";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AggregatorArgs {
  formValues: QuoteFormValues;
  dataset: Dataset;
  metrics: Record<string, ModelMetric>;
  supportingPool: ProjectRecord[];
  supportingLabel: string;
  /**
   * Optional override for the supporting-matches input. Defaults to baselineInput.
   * D-04: page handlers thread `{...transformToQuoteInput(values), vision_type:
   * visionRows[0]?.type ?? "None", vision_systems_count: sum(row.count)}` here so
   * similar-projects matching uses the visible-vision shape, not the synthetic
   * baseline. The model still runs against the baseline (vision_type="None",
   * count=0) for the N+1 predicts; only the toUnifiedResult input field is
   * affected, so nearestK distance reads visionRow-derived legacy fields.
   */
  inputForMatching?: QuoteInput;
}

export interface AggregatorResult {
  result: UnifiedQuoteResult;
  perVisionContributions: PerVisionContribution[];
}

export type { PerVisionContribution } from "@/demo/quoteResult";

/**
 * Run baseline + per-row predicts and assemble the aggregated UnifiedQuoteResult.
 *
 * When `formValues.visionRows.length === 0`, the function does a single
 * baseline call and returns `perVisionContributions: []` — the result panel
 * hides the new section in that case (D-09).
 */
export async function aggregateMultiVisionEstimate(
  args: AggregatorArgs,
): Promise<AggregatorResult> {
  const { formValues, dataset, metrics, supportingPool, supportingLabel } = args;
  const baselineNonVision = transformToQuoteInput(formValues);

  // 1. Baseline call: vision_type="None", vision_systems_count=0.
  const baselineInput: QuoteInput = {
    ...baselineNonVision,
    vision_type: "None",
    vision_systems_count: 0,
  };

  const [baselinePred, importances] = await Promise.all([
    predictQuote(baselineInput, dataset),
    getFeatureImportances(dataset),
  ]);

  const rows = formValues.visionRows ?? [];

  // 2. Per-row calls (warm Pyodide cache makes these cheap; Promise.all because
  //    predictQuote awaits internally — the JS event loop can interleave).
  const perRowPreds = await Promise.all(
    rows.map((row) =>
      predictQuote(
        { ...baselineNonVision, vision_type: row.type, vision_systems_count: row.count },
        dataset,
      ),
    ),
  );

  // 3. Aggregate per-target sums (D-05) and RSS half-widths (D-07).
  const aggregatedPredByTarget = buildAggregatedPrediction(baselinePred, perRowPreds);

  // 4. Build the UnifiedQuoteResult via the existing adapter.
  // D-04: when args.inputForMatching is provided, use it as the input field for
  // toUnifiedResult so similar-projects nearestK reads the visionRow-derived
  // legacy-compat shape. Falls through to baselineInput when omitted.
  const result = toUnifiedResult({
    input: args.inputForMatching ?? baselineInput,
    prediction: aggregatedPredByTarget,
    importances,
    metrics,
    supportingPool,
    supportingLabel,
  });

  // 5. Per-vision contribution cards (D-08).
  const perVisionContributions = buildPerVisionContributions({
    rows,
    baselinePred,
    perRowPreds,
    importances,
    formInput: baselineInput,
  });

  return {
    result: { ...result, perVisionContributions },
    perVisionContributions,
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

type PredByTarget = Record<string, { p10: number; p50: number; p90: number }>;

/**
 * Aggregate baseline + per-row predictions into a per-target map suitable for
 * `toUnifiedResult`. Per-target rule:
 *   total.p50 = baseline.p50 + sum(perRow.p50 - baseline.p50)
 *   total.upperHalfWidth = sqrt(baselineUpper^2 + sum(deltaUpper^2))
 *   total.lowerHalfWidth = sqrt(baselineLower^2 + sum(deltaLower^2))
 * where upperHalfWidth = (p90 - p50) and lowerHalfWidth = (p50 - p10).
 *
 * Operates per `target` in `bundle.ops` (12 operation keys) — `*_actual_hours`.
 */
function buildAggregatedPrediction(
  baseline: QuotePrediction,
  perRow: QuotePrediction[],
): PredByTarget {
  const out: PredByTarget = {};
  for (const [opKey, opBaseline] of Object.entries(baseline.ops)) {
    const target = `${opKey}_actual_hours`;
    const baseHi = Math.max(0, opBaseline.p90 - opBaseline.p50);
    const baseLo = Math.max(0, opBaseline.p50 - opBaseline.p10);

    let p50Sum = opBaseline.p50;
    let hiSqSum = baseHi * baseHi;
    let loSqSum = baseLo * baseLo;

    for (const pr of perRow) {
      const op = pr.ops[opKey];
      if (!op) continue;
      const delta50 = op.p50 - opBaseline.p50;
      const deltaHi = Math.max(0, op.p90 - op.p50) - baseHi;
      const deltaLo = Math.max(0, op.p50 - op.p10) - baseLo;
      p50Sum += delta50;
      hiSqSum += deltaHi * deltaHi;
      loSqSum += deltaLo * deltaLo;
    }

    const upperHalf = Math.sqrt(hiSqSum);
    const lowerHalf = Math.sqrt(loSqSum);
    out[target] = {
      p10: Math.max(0, p50Sum - lowerHalf),
      p50: Math.max(0, p50Sum),
      p90: Math.max(0, p50Sum + upperHalf),
    };
  }
  return out;
}

/**
 * For each vision row, find the top-2 features whose contribution magnitude
 * shifted most between baseline and per-row predict (D-08).
 *
 * Approach: for each target the row most affects (highest abs(delta_p50)),
 * read the top features from the importances map for that target. Take the
 * top-2 and stamp `direction` based on the sign of the row's delta against
 * baseline (positive delta -> "increases").
 */
function buildPerVisionContributions(args: {
  rows: VisionRow[];
  baselinePred: QuotePrediction;
  perRowPreds: QuotePrediction[];
  importances: Record<string, Array<[string, number]>>;
  formInput: QuoteInput;
}): PerVisionContribution[] {
  const { rows, baselinePred, perRowPreds, importances, formInput } = args;
  return rows.map((row, rowIndex) => {
    const pr = perRowPreds[rowIndex];
    const hoursDelta = pr ? pr.total_p50 - baselinePred.total_p50 : 0;

    // Find the target where this row had the largest absolute delta.
    let dominantTarget = "";
    let dominantAbsDelta = -1;
    if (pr) {
      for (const [opKey, opPr] of Object.entries(pr.ops)) {
        const opBase = baselinePred.ops[opKey];
        if (!opBase) continue;
        const absDelta = Math.abs(opPr.p50 - opBase.p50);
        if (absDelta > dominantAbsDelta) {
          dominantAbsDelta = absDelta;
          dominantTarget = `${opKey}_actual_hours`;
        }
      }
    }

    const topPairs = importances[dominantTarget] ?? [];
    const direction: "increases" | "decreases" = hoursDelta >= 0 ? "increases" : "decreases";
    const formInputRecord = formInput as unknown as Record<string, unknown>;
    const topDrivers = topPairs.slice(0, 2).map(([rawName]) => ({
      label: humanFeatureLabel(rawName, formInputRecord).label,
      direction,
    }));

    const labelSegment = row.label && row.label.trim().length > 0 ? ` — ${row.label.trim()}` : "";
    return {
      rowIndex,
      rowLabel: `Vision ${rowIndex + 1}${labelSegment}: ${row.type} × ${row.count}`,
      hoursDelta,
      topDrivers,
    };
  });
}
