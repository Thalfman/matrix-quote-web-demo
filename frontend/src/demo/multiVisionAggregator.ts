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
import type { Confidence, QuoteInput, QuotePrediction } from "@/api/types";
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
  //    WR-05: wrap each call so a per-row failure surfaces which row dropped
  //    rather than a bare "Prediction failed" toast. Failure semantics are
  //    unchanged (still all-or-nothing — Promise.all rejects on first error).
  const perRowPreds = await Promise.all(
    rows.map((row, idx) =>
      predictQuote(
        { ...baselineNonVision, vision_type: row.type, vision_systems_count: row.count },
        dataset,
      ).catch((err: unknown) => {
        const cause = err instanceof Error ? err.message : String(err);
        throw new Error(
          `vision row ${idx + 1} (${row.type} × ${row.count}): ${cause}`,
        );
      }),
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

  // 6. WR-03 / D-07: pin overallConfidence to the worst case observed across
  //    baseline + per-row predicts. toUnifiedResult derives confidence from
  //    model R^2, which doesn't see the per-call OpPrediction.confidence
  //    field. A per-row predict carrying confidence:"low" must surface as
  //    "lower" on the aggregated result panel even if the RSS half-widths
  //    happen to be tight.
  const aggregatedOverallConfidence = minOverallConfidence(
    result.overallConfidence,
    baselinePred,
    perRowPreds,
  );

  return {
    result: {
      ...result,
      overallConfidence: aggregatedOverallConfidence,
      perVisionContributions,
    },
    perVisionContributions,
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * UI confidence vocabulary on UnifiedQuoteResult differs from the model's
 * OpPrediction.confidence ("high" | "medium" | "low" — see
 * frontend/src/api/types.ts:48). Map medium -> moderate, low -> lower.
 */
type UiConfidence = "high" | "moderate" | "lower";

const UI_CONFIDENCE_RANK: Record<UiConfidence, number> = {
  high: 2,
  moderate: 1,
  lower: 0,
};

function modelConfidenceToUi(c: Confidence): UiConfidence {
  if (c === "high") return "high";
  if (c === "medium") return "moderate";
  return "lower";
}

/**
 * WR-03 / D-07: Aggregated overall confidence = min across the adapter's
 * R^2-driven rollup AND every per-op confidence on baseline + per-row
 * predicts. Worst-case posture — a single per-row predict carrying
 * confidence:"low" must surface as "lower" on the aggregated result even
 * if the RSS half-widths happen to be tight.
 */
function minOverallConfidence(
  adapterRolledUp: UiConfidence,
  baseline: QuotePrediction,
  perRow: QuotePrediction[],
): UiConfidence {
  let worstRank = UI_CONFIDENCE_RANK[adapterRolledUp];
  let worst: UiConfidence = adapterRolledUp;
  const consider = (c: Confidence): void => {
    const ui = modelConfidenceToUi(c);
    if (UI_CONFIDENCE_RANK[ui] < worstRank) {
      worstRank = UI_CONFIDENCE_RANK[ui];
      worst = ui;
    }
  };
  for (const op of Object.values(baseline.ops)) consider(op.confidence);
  for (const pr of perRow) {
    for (const op of Object.values(pr.ops)) consider(op.confidence);
  }
  return worst;
}

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
 * Threshold for "this row meaningfully moved the prediction" (in hours).
 * WR-02: when the dominant per-target delta is below epsilon, the row's
 * drivers are arbitrary (every feature has effectively zero contribution
 * shift), so we suppress drivers entirely rather than surface noise.
 */
const PER_VISION_EPSILON_HOURS = 0.5;

/**
 * For each vision row, surface up to 2 drivers describing what shifted
 * between baseline and per-row predict (D-08).
 *
 * WR-01 fix: prior implementation read globalImportances[dominantTarget]
 * and slice(0,2). Those features are the *generally* dominant drivers of
 * that target, NOT the features that demonstrably moved between baseline
 * and per-row input. The only features that DO change between the two
 * predicts are vision_type and vision_systems_count (the aggregator
 * overlays them per call). True SHAP-style local explanations would
 * compute per-input contribution shifts, but getFeatureImportances() is
 * a global per-dataset cache (no per-input variant exists) and a SHAP
 * pass is deferred to v3 per CONTEXT.md.
 *
 * Behavior:
 *   - Find the target with the largest abs(perRow.p50 - baseline.p50).
 *     WR-02: dominantAbsDelta initializes at 0 (not -1) and ties broken
 *     by lexicographic target name for determinism. When the maximum
 *     abs-delta is < PER_VISION_EPSILON_HOURS, return topDrivers: []
 *     so a degenerate "this row added 0 hours" row renders just the
 *     label and "+0 hrs" with no misleading drivers.
 *   - Otherwise, surface the two features that actually changed between
 *     baseline and per-row inputs: vision_type (categorical, one-hot to
 *     this row's type) and vision_systems_count. Direction is stamped
 *     from hoursDelta sign.
 */
function buildPerVisionContributions(args: {
  rows: VisionRow[];
  baselinePred: QuotePrediction;
  perRowPreds: QuotePrediction[];
  importances: Record<string, Array<[string, number]>>;
  formInput: QuoteInput;
}): PerVisionContribution[] {
  // `importances` is intentionally retained on the args list for forward-compat
  // with a v3 SHAP-style local-explanation pass. The current Option-A path
  // (vision_type + vision_systems_count drivers) does not need it; once v3
  // ships, this helper switches over without a signature break.
  void args.importances;
  const { rows, baselinePred, perRowPreds, formInput } = args;
  const formInputRecord = formInput as unknown as Record<string, unknown>;

  return rows.map((row, rowIndex) => {
    const pr = perRowPreds[rowIndex];
    const hoursDelta = pr ? pr.total_p50 - baselinePred.total_p50 : 0;

    // Find the target where this row had the largest absolute per-target delta.
    // WR-02: dominantAbsDelta initialized at 0 so a row with all-zero deltas
    // never earns a dominantTarget. Ties broken lexicographically for
    // deterministic output across re-runs.
    let dominantTarget = "";
    let dominantAbsDelta = 0;
    if (pr) {
      for (const [opKey, opPr] of Object.entries(pr.ops)) {
        const opBase = baselinePred.ops[opKey];
        if (!opBase) continue;
        const absDelta = Math.abs(opPr.p50 - opBase.p50);
        const target = `${opKey}_actual_hours`;
        if (
          absDelta > dominantAbsDelta ||
          (absDelta === dominantAbsDelta && target < dominantTarget)
        ) {
          dominantAbsDelta = absDelta;
          dominantTarget = target;
        }
      }
    }

    const labelSegment = row.label && row.label.trim().length > 0 ? ` — ${row.label.trim()}` : "";
    const rowLabel = `Vision ${rowIndex + 1}${labelSegment}: ${row.type} × ${row.count}`;

    // WR-02: if the row barely moved the prediction, suppress drivers — any
    // surfaced feature would be arbitrary noise, not a real explanation.
    if (dominantAbsDelta < PER_VISION_EPSILON_HOURS) {
      return { rowIndex, rowLabel, hoursDelta, topDrivers: [] };
    }

    // WR-01: drivers are the two features that actually changed between
    // baseline and per-row inputs (vision_type one-hot for this row's type,
    // and vision_systems_count). Direction stamped from hoursDelta sign.
    const direction: "increases" | "decreases" = hoursDelta >= 0 ? "increases" : "decreases";
    const visionTypeFeature = `vision_type_${row.type}`;
    const topDrivers: Array<{ label: string; direction: "increases" | "decreases" }> = [
      {
        label: humanFeatureLabel(visionTypeFeature, formInputRecord).label,
        direction,
      },
      {
        label: humanFeatureLabel("vision_systems_count", formInputRecord).label,
        direction,
      },
    ];

    return { rowIndex, rowLabel, hoursDelta, topDrivers };
  });
}
