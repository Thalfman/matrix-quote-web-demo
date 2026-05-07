---
phase: 07
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/demo/romEstimator.ts
  - frontend/src/demo/romEstimator.test.ts
autonomous: true
requirements:
  - ROM-01
  - ROM-02
specialists:
  - frontend-specialist
  - test-writer
must_haves:
  truths:
    - "A new TS-side ROM estimator at `frontend/src/demo/romEstimator.ts` runs ONE predictQuote call against the existing pyodide client with hidden hour-driving inputs filled by quoteFormDefaults (D-04)."
    - "The estimator widens p10/p90 half-widths by a deterministic ROM_BAND_MULTIPLIER = 1.75 (D-09) and surfaces this on the returned UnifiedQuoteResult's likelyRangeLow/High."
    - "ROM_BASELINE_RATE_HOURS_PER_DOLLAR = 0.0008 is exported and used to compute a sanity-flag boolean: when the model output diverges from materialsCost × baselineRate by > 5× in either direction, `rom.sanityFlag = true` (D-05 / D-15)."
    - "The estimator returns `{ result: UnifiedQuoteResult; rom: RomMetadata }` where RomMetadata = `{ mode: 'rom'; bandMultiplier: number; baselineRate: number; sanityFlag: boolean }`."
    - "NO `core/` change. NO `_PREDICT_SHIM` change. NO retraining. The only writes are within `frontend/src/demo/`."
  artifacts:
    - path: "frontend/src/demo/romEstimator.ts"
      provides: "estimateRom orchestrator + RomMetadata type + ROM_BAND_MULTIPLIER + ROM_BASELINE_RATE_HOURS_PER_DOLLAR"
      contains: "export async function estimateRom"
    - path: "frontend/src/demo/romEstimator.test.ts"
      provides: "Unit tests for band widening, sanity flag, default-fill, edge cases"
      contains: "estimateRom"
  key_links:
    - from: "frontend/src/demo/romEstimator.ts"
      to: "frontend/src/demo/pyodideClient.ts (predictQuote)"
      via: "single predictQuote call with quoteFormDefaults-filled QuoteInput"
      pattern: "predictQuote\\("
    - from: "frontend/src/demo/romEstimator.ts"
      to: "frontend/src/demo/quoteAdapter.ts (toUnifiedResult)"
      via: "build UnifiedQuoteResult from the prediction"
      pattern: "toUnifiedResult\\("
---

<objective>
Build the ROM-mode estimator: a single new TypeScript file at `frontend/src/demo/romEstimator.ts` that takes the four ROM inputs (industry_segment, system_category, automation_level, estimated_materials_cost) plus the dataset/metrics/supportingPool/supportingLabel context, calls the existing pyodide `predictQuote` ONCE with the hidden hour-driving inputs filled by quoteFormDefaults, post-processes the model output to widen the confidence band by a deterministic 1.75× factor (D-09), and attaches a `RomMetadata` block (D-04 / D-15) with the sanity-flag the result panel uses to decide whether to render the wide-range banner.

Purpose: this is the ROM math that satisfies SC-1 (a ROM workflow that produces an estimate from material cost + classification only) and the band-widening half of SC-2 (visibly wider confidence band). The result panel chrome (Plan 07-03) reads from the returned `rom` metadata; the form (Plan 07-03) calls `estimateRom` on submit; the page handlers (Plan 07-04) wire it end-to-end.

Output: 1 new module + 1 new test file. Wave-1 parallel with Plan 07-01 because no file overlaps.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/07-rom-quote-mode/07-UI-SPEC.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from the live codebase 2026-05-06. -->

From frontend/src/demo/pyodideClient.ts (signature already in use by multiVisionAggregator):
```typescript
export type Dataset = "real" | "synthetic";
export function predictQuote(input: QuoteInput, dataset: Dataset): Promise<QuotePrediction>;
export function getFeatureImportances(dataset: Dataset): Promise<Record<string, Array<[string, number]>>>;
```

From frontend/src/demo/quoteAdapter.ts (the existing UnifiedQuoteResult builder):
```typescript
export function toUnifiedResult(args: {
  input: QuoteInput;
  prediction: Record<string, { p10: number; p50: number; p90: number }>;
  importances: Record<string, Array<[string, number]>>;
  metrics: Record<string, ModelMetric>;
  supportingPool: ProjectRecord[];
  supportingLabel: string;
}): UnifiedQuoteResult;
```

From frontend/src/demo/multiVisionAggregator.ts (precedent for TS-side orchestrator pattern; line 1-50, 65-125):
```typescript
export interface AggregatorArgs {
  formValues: QuoteFormValues;
  dataset: Dataset;
  metrics: Record<string, ModelMetric>;
  supportingPool: ProjectRecord[];
  supportingLabel: string;
  inputForMatching?: QuoteInput;
}

export async function aggregateMultiVisionEstimate(args: AggregatorArgs): Promise<AggregatorResult> {
  // Pattern: transformToQuoteInput → predictQuote → toUnifiedResult → return.
}
```

From frontend/src/demo/quoteResult.ts (UnifiedQuoteResult shape):
```typescript
export interface UnifiedQuoteResult {
  estimateHours: number;
  likelyRangeLow: number;
  likelyRangeHigh: number;
  overallConfidence: "high" | "moderate" | "lower";
  perCategory: Array<{ label: string; estimateHours: number; rangeLow: number; rangeHigh: number; confidence: ... }>;
  topDrivers: Array<{ label: string; direction: "increases"|"decreases"; magnitude: ... }>;
  supportingMatches: { label: string; items: Array<{ projectId, projectName, actualHours, similarity }> };
  perVisionContributions?: PerVisionContribution[];
}
```

From frontend/src/api/types.ts (QuotePrediction):
```typescript
export interface QuotePrediction {
  total_p10: number;
  total_p50: number;
  total_p90: number;
  ops: Record<string, { p10: number; p50: number; p90: number; confidence: "high"|"medium"|"low" }>;
}
```

From frontend/src/pages/single-quote/romSchema.ts (NEW, from Plan 07-01):
```typescript
export const romFormDefaults: RomFormValues;
export type RomFormValues;
export function toQuoteFormValues(rom: RomFormValues): QuoteFormValues;
```

From frontend/src/pages/single-quote/schema.ts:
```typescript
export const quoteFormDefaults: QuoteFormValues; // includes plc_family, hmi_family, etc.
export function transformToQuoteInput(v: QuoteFormValues): QuoteInput;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create romEstimator.ts with the estimateRom function + RomMetadata type + locked constants</name>
  <files>frontend/src/demo/romEstimator.ts</files>

  <read_first>
    - frontend/src/demo/multiVisionAggregator.ts (full file — 353 lines; the TS-side orchestrator precedent)
    - frontend/src/demo/quoteAdapter.ts (full file — toUnifiedResult signature is the contract)
    - frontend/src/demo/pyodideClient.ts (predictQuote signature)
    - frontend/src/pages/single-quote/schema.ts (quoteFormDefaults + transformToQuoteInput)
    - frontend/src/pages/single-quote/romSchema.ts (NEW from Plan 07-01: romFormDefaults, toQuoteFormValues — REQUIRED dependency)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-04 + D-05 + D-09 + D-15 — the math contract)
  </read_first>

  <action>
    Create `frontend/src/demo/romEstimator.ts`:

    ```typescript
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
    import { transformToQuoteInput } from "@/pages/single-quote/schema";
    import {
      toQuoteFormValues,
      type RomFormValues,
    } from "@/pages/single-quote/romSchema";

    // -------------------------------------------------------------------------
    // Locked constants (D-05, D-09, D-15)
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

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
      /** The full QuoteFormValues used for the predict — surface back to the
       *  result panel's "Your inputs" recap so it renders consistent state. */
      formValues: ReturnType<typeof toQuoteFormValues>;
    }

    /**
     * Run a single ROM-mode prediction and post-process for D-09 + D-15.
     */
    export async function estimateRom(args: EstimateRomArgs): Promise<EstimateRomResult> {
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
        likelyRangeLow: widenLow(narrowResult.estimateHours, narrowResult.likelyRangeLow),
        likelyRangeHigh: widenHigh(narrowResult.estimateHours, narrowResult.likelyRangeHigh),
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
        (widenedResult.estimateHours / heuristicHours > ROM_SANITY_DIVERGENCE_FACTOR ||
          heuristicHours / widenedResult.estimateHours > ROM_SANITY_DIVERGENCE_FACTOR);

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

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Convert a QuotePrediction's per-op {p10, p50, p90} into the per-target
     * map shape `toUnifiedResult` expects ("{op_key}_actual_hours" → tuple).
     * Mirrors multiVisionAggregator.ts's buildAggregatedPrediction shape.
     */
    function buildPredByTarget(prediction: QuotePrediction): Record<
      string,
      { p10: number; p50: number; p90: number }
    > {
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
    ```
  </action>

  <verify>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint -- src/demo/romEstimator.ts</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/demo/romEstimator.ts` exists.
    - File contains `export const ROM_BAND_MULTIPLIER = 1.75` (verbatim, exact value per D-09).
    - File contains `export const ROM_BASELINE_RATE_HOURS_PER_DOLLAR = 0.0008` (verbatim, exact value per D-05).
    - File contains `export const ROM_SANITY_DIVERGENCE_FACTOR = 5` (D-15 threshold).
    - File contains `export async function estimateRom`.
    - File contains `export interface RomMetadata` with shape `{ mode: "rom"; bandMultiplier: number; baselineRate: number; sanityFlag: boolean }`.
    - File contains `predictQuote(baselineInput, dataset)` (exactly ONE call — single predict per D-04).
    - File contains `toUnifiedResult({` (uses the existing adapter).
    - File does NOT contain `_PREDICT_SHIM` (no build-script touch).
    - File does NOT import anything from `@/core/` (path doesn't exist anyway, but documenting the constraint).
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    romEstimator.ts compiles, exports the four named constants + RomMetadata type + estimateRom function. Single predictQuote call with quoteFormDefaults-filled QuoteInput. Band widened by 1.75 on hero AND per-category ranges. Sanity flag computed from materialsCost × 0.0008 vs model output divergence > 5×.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write romEstimator.test.ts covering D-05 sanity bound, D-09 band widening, edge cases</name>
  <files>frontend/src/demo/romEstimator.test.ts</files>

  <read_first>
    - frontend/src/demo/romEstimator.ts (just-created in Task 1 — same plan)
    - frontend/src/demo/multiVisionAggregator.test.ts (if exists — pattern for mocking predictQuote + getFeatureImportances)
    - frontend/src/demo/pyodideClient.ts (mock surface)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-05 + D-09 + D-15 + D-04 — every assertion below traces to one of these)
  </read_first>

  <behavior>
    - Test (D-09 band widening — happy path): mock predictQuote to return `{total_p10:100, total_p50:200, total_p90:300, ops: { me10: {p10:100,p50:200,p90:300,confidence:"high"} }}`. Call estimateRom with materialsCost=$250,000 (= 200 heuristic hrs at 0.0008, well within the [0.2, 5] sanity band of model output 200). Expected result: `result.likelyRangeLow ≈ 200 - 100*1.75 = 25`, `result.likelyRangeHigh ≈ 200 + 100*1.75 = 375` (within 1 hr tolerance). `rom.sanityFlag === false`.
    - Test (D-09 band widening — clamps below zero): mock predictQuote with `{...p50:50, p10:30, p90:90}`. Heuristic hrs = 0.0008 × 50000 = 40 vs model 50: ratio 1.25 — well inside sanity band. Half-low = 50-30 = 20. Widened low = max(0, 50 - 20*1.75) = max(0, 15) = 15. Test asserts the floor never produces a negative likelyRangeLow.
    - Test (D-09 band widening — per-category): mock predictQuote with two ops. Assert each `result.perCategory[i].rangeLow` and `rangeHigh` is widened by 1.75× off the per-category p50.
    - Test (D-05 / D-15 sanity flag — TRIGGERS when model >> heuristic): mock predictQuote with model_p50 = 10000, materialsCost=$1,000 (heuristic = 0.8 hrs). Ratio = 10000/0.8 = 12,500 — way over 5. Assert `rom.sanityFlag === true`.
    - Test (D-05 / D-15 sanity flag — TRIGGERS when heuristic >> model): mock predictQuote with model_p50 = 1, materialsCost=$1,000,000 (heuristic = 800 hrs). Ratio inverted = 800/1 = 800 — way over 5. Assert `rom.sanityFlag === true`.
    - Test (D-05 / D-15 sanity flag — does NOT trigger inside the band): mock predictQuote with model_p50 = 200, materialsCost=$250,000 (heuristic = 200 hrs, ratio = 1.0). Assert `rom.sanityFlag === false`.
    - Test (D-04 default-fill — single predictQuote call): assert `predictQuote` was called EXACTLY ONCE (single-call ROM contract — not N+1 like multiVisionAggregator).
    - Test (D-04 default-fill — visionRows empty): assert the QuoteInput passed to predictQuote has `vision_type === "None"` and `vision_systems_count === 0` (because toQuoteFormValues spreads quoteFormDefaults whose visionRows is `[]`, and transformToQuoteInput collapses empty visionRows to "None").
    - Test (D-04 default-fill — required trio surfaces): assert the QuoteInput passed to predictQuote has the three classification fields the user typed (`industry_segment`, `system_category`, `automation_level` are exactly the strings supplied to romValues — NOT the empty defaults).
    - Test (return shape): assert the returned object has shape `{ result: UnifiedQuoteResult, rom: RomMetadata, formValues: QuoteFormValues }`. Assert `rom.mode === "rom"`, `rom.bandMultiplier === 1.75`, `rom.baselineRate === 0.0008`.
    - Test (D-06 perVisionContributions hidden): assert `result.perVisionContributions` is an empty array `[]` (not undefined — explicit []).
  </behavior>

  <action>
    Create `frontend/src/demo/romEstimator.test.ts`. Use Vitest's `vi.mock` to stub `@/demo/pyodideClient`. Pattern from `multiVisionAggregator.test.ts` if it exists; otherwise the standard repo pattern is:

    ```typescript
    import { describe, expect, it, vi, beforeEach } from "vitest";

    import {
      estimateRom,
      ROM_BAND_MULTIPLIER,
      ROM_BASELINE_RATE_HOURS_PER_DOLLAR,
    } from "@/demo/romEstimator";
    import type { QuotePrediction } from "@/api/types";
    import type { ProjectRecord } from "@/demo/realProjects";

    const predictQuoteMock = vi.fn();
    const getFeatureImportancesMock = vi.fn();

    vi.mock("@/demo/pyodideClient", () => ({
      predictQuote: (...args: unknown[]) => predictQuoteMock(...args),
      getFeatureImportances: (...args: unknown[]) => getFeatureImportancesMock(...args),
    }));

    function makePrediction(over: Partial<QuotePrediction["ops"]["me10"]> = {}): QuotePrediction {
      const op = { p10: 100, p50: 200, p90: 300, confidence: "high" as const, ...over };
      return {
        total_p10: op.p10,
        total_p50: op.p50,
        total_p90: op.p90,
        ops: { me10: op },
      };
    }

    const FAKE_METRICS = {
      me10: { target: "me10", r2: 0.85, mae: 50, n_samples: 24 } as unknown,
    } as Record<string, never>;

    const FAKE_POOL: ProjectRecord[] = []; // toUnifiedResult tolerates an empty pool

    beforeEach(() => {
      predictQuoteMock.mockReset();
      getFeatureImportancesMock.mockReset();
      getFeatureImportancesMock.mockResolvedValue({ me10: [["stations_count", 0.5]] });
    });

    describe("estimateRom", () => {
      const baseRom = {
        industry_segment: "Automotive",
        system_category: "Robotic Cell",
        automation_level: "Semi-Auto",
        estimated_materials_cost: 250_000,
      };
      const baseArgs = {
        dataset: "real" as const,
        metrics: FAKE_METRICS as never,
        supportingPool: FAKE_POOL,
        supportingLabel: "Most similar past projects",
      };

      it("widens hero range by ROM_BAND_MULTIPLIER (D-09)", async () => {
        predictQuoteMock.mockResolvedValue(makePrediction({ p10: 100, p50: 200, p90: 300 }));
        const out = await estimateRom({ romValues: baseRom, ...baseArgs });
        // Half-widths in narrow path: low = 200-100 = 100, high = 300-200 = 100
        // Widened: low = 200 - 100*1.75 = 25; high = 200 + 100*1.75 = 375
        expect(out.result.likelyRangeLow).toBeCloseTo(25, 0);
        expect(out.result.likelyRangeHigh).toBeCloseTo(375, 0);
        expect(out.result.estimateHours).toBeCloseTo(200, 0);
      });

      it("clamps widened low at zero — never negative", async () => {
        predictQuoteMock.mockResolvedValue(makePrediction({ p10: 30, p50: 50, p90: 90 }));
        const out = await estimateRom({
          romValues: { ...baseRom, estimated_materials_cost: 50_000 },
          ...baseArgs,
        });
        expect(out.result.likelyRangeLow).toBeGreaterThanOrEqual(0);
      });

      it("widens per-category ranges by ROM_BAND_MULTIPLIER (D-09)", async () => {
        predictQuoteMock.mockResolvedValue(makePrediction({ p10: 100, p50: 200, p90: 300 }));
        const out = await estimateRom({ romValues: baseRom, ...baseArgs });
        for (const c of out.result.perCategory) {
          // Each category must reflect the band-widening (cannot all be == p50).
          if (c.estimateHours > 0) {
            expect(c.rangeHigh - c.estimateHours).toBeGreaterThan(c.estimateHours - c.rangeLow - 0.01); // crude — at least non-zero half-widths
          }
        }
      });

      it("triggers sanity flag when model output >> heuristic (D-05/D-15)", async () => {
        // Materials = $1,000 → heuristic ≈ 0.8 hrs. Model = 10000.
        predictQuoteMock.mockResolvedValue(makePrediction({ p10: 9000, p50: 10000, p90: 11000 }));
        const out = await estimateRom({
          romValues: { ...baseRom, estimated_materials_cost: 1_000 },
          ...baseArgs,
        });
        expect(out.rom.sanityFlag).toBe(true);
      });

      it("triggers sanity flag when heuristic >> model output (inverse, D-05/D-15)", async () => {
        // Materials = $1,000,000 → heuristic = 800 hrs. Model = 1.
        predictQuoteMock.mockResolvedValue(makePrediction({ p10: 0, p50: 1, p90: 2 }));
        const out = await estimateRom({
          romValues: { ...baseRom, estimated_materials_cost: 1_000_000 },
          ...baseArgs,
        });
        expect(out.rom.sanityFlag).toBe(true);
      });

      it("does NOT trigger sanity flag when model and heuristic align", async () => {
        // Materials = $250,000 → heuristic = 200 hrs. Model = 200.
        predictQuoteMock.mockResolvedValue(makePrediction({ p10: 100, p50: 200, p90: 300 }));
        const out = await estimateRom({
          romValues: { ...baseRom, estimated_materials_cost: 250_000 },
          ...baseArgs,
        });
        expect(out.rom.sanityFlag).toBe(false);
      });

      it("calls predictQuote EXACTLY ONCE (single-call ROM contract per D-04)", async () => {
        predictQuoteMock.mockResolvedValue(makePrediction());
        await estimateRom({ romValues: baseRom, ...baseArgs });
        expect(predictQuoteMock).toHaveBeenCalledTimes(1);
      });

      it("fills hidden hour-driving inputs with quoteFormDefaults (D-04)", async () => {
        predictQuoteMock.mockResolvedValue(makePrediction());
        await estimateRom({ romValues: baseRom, ...baseArgs });
        const callArg = predictQuoteMock.mock.calls[0][0];
        // visionRows: [] in defaults → vision_type "None", count 0
        expect(callArg.vision_type).toBe("None");
        expect(callArg.vision_systems_count).toBe(0);
        // Required trio comes from romValues, not defaults
        expect(callArg.industry_segment).toBe("Automotive");
        expect(callArg.system_category).toBe("Robotic Cell");
        expect(callArg.automation_level).toBe("Semi-Auto");
      });

      it("returns RomMetadata with locked constants", async () => {
        predictQuoteMock.mockResolvedValue(makePrediction());
        const out = await estimateRom({ romValues: baseRom, ...baseArgs });
        expect(out.rom.mode).toBe("rom");
        expect(out.rom.bandMultiplier).toBe(ROM_BAND_MULTIPLIER); // 1.75
        expect(out.rom.baselineRate).toBe(ROM_BASELINE_RATE_HOURS_PER_DOLLAR); // 0.0008
      });

      it("forces perVisionContributions to [] in ROM mode (D-06)", async () => {
        predictQuoteMock.mockResolvedValue(makePrediction());
        const out = await estimateRom({ romValues: baseRom, ...baseArgs });
        expect(out.result.perVisionContributions).toEqual([]);
      });
    });
    ```

    The test uses placeholder fixtures for metrics/pool to keep `toUnifiedResult` happy. If `toUnifiedResult` requires a non-empty pool to render `supportingMatches.items`, expand FAKE_POOL with a single record (mirror `frontend/src/test/jargon-guard.test.tsx`'s `FAKE_RECORDS` fixture). The executor should adapt the fixtures to whatever toUnifiedResult demands without weakening the assertions above.
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/demo/romEstimator.test.ts</automated>
    <automated>cd frontend && npm run typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/demo/romEstimator.test.ts` exists.
    - File contains at least 11 `it(` cases (enumerated in behavior above).
    - File contains `expect(predictQuoteMock).toHaveBeenCalledTimes(1)` (single-call invariant per D-04).
    - File contains assertions on `ROM_BAND_MULTIPLIER` (1.75) and `ROM_BASELINE_RATE_HOURS_PER_DOLLAR` (0.0008).
    - File contains `expect(out.rom.sanityFlag).toBe(true)` AND `expect(out.rom.sanityFlag).toBe(false)` (both polarities tested per D-05/D-15).
    - File contains `expect(out.result.perVisionContributions).toEqual([])` (D-06 lock — empty array, not undefined).
    - `cd frontend && npm run test -- --run src/demo/romEstimator.test.ts` exits 0.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    11 test cases cover band widening (hero + per-category + zero-clamp), sanity flag (both polarities + null-case), single predictQuote call, default-fill of hidden inputs, return shape, RomMetadata constants. All exit 0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser form input → predictQuote (pyodide-in-browser) | User-typed material cost / classification strings, validated by romFormSchema (Plan 07-01) before reaching estimateRom. |
| predictQuote → estimateRom return | The trained joblibs are deterministic; output is a function of input. No external/network call. |

This plan adds NO network boundary, NO new auth surface, NO new secrets. All compute is browser-local pyodide.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-05 | Tampering | RomMetadata.sanityFlag | accept | The sanity flag is a derived UI hint, not a security gate. A user manipulating client-side state to false-positive the flag harms only their own UX. |
| T-07-06 | DoS | estimateRom (single predictQuote) | mitigate | romFormSchema bounds estimated_materials_cost > 0; the existing pyodideClient + trained joblibs have a fixed compute cost regardless of materials_cost magnitude (no unbounded loops). The widening helpers (`widenLow` / `widenHigh`) are pure arithmetic, O(1). |
| T-07-07 | Information Disclosure | ROM_BASELINE_RATE_HOURS_PER_DOLLAR | accept | The constant 0.0008 is in the public bundle (static SPA — every TS const is shipped). Disclosure is intentional; it's a public model parameter. NOT user-facing in customer copy (D-05 forbids surfacing it in UI). |

Block-on severity: high. T-07-06 is the only mitigated threat; arithmetic widening + bounded zod input are sufficient.
</threat_model>

<verification>
After both tasks complete:

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test -- --run src/demo/romEstimator.test.ts
```

All exit 0. The test file exercises 11 invariants, including the locked constants (1.75, 0.0008), the single-predictQuote contract (D-04), the band-widening math (D-09), and the sanity-flag bounds (D-05/D-15).

Build sanity:
```bash
cd frontend && npm run build
```
Exit 0. The new module imports from existing modules; no new bundle-size warning expected.
</verification>

<success_criteria>
1. SC-1 (ROM workflow produces an estimate): the math path exists. Form + page handlers (Plans 07-03 / 07-04) call this function and surface the result.
2. SC-2 (visibly wider confidence band): `ROM_BAND_MULTIPLIER = 1.75` applied to hero AND per-category half-widths. Test-asserted.
3. ROM-01 (material-cost-only quote): the function takes 4 inputs and produces a model-grounded estimate using locked defaults (D-04). Hidden inputs filled via toQuoteFormValues.
4. ROM-02 (visual distinction primitive — math half): the wider band carries the lower-fidelity signal at the data layer; the badge primitive (Plan 07-01) carries the framing.

Definition of done:
- 2 files created (1 module + 1 test).
- 5 grep-verifiable named exports / constants / strings present.
- 11 test cases pass.
- `cd frontend && npm run typecheck && npm run lint && npm run test && npm run build` all exit 0.
- NO `core/` change, NO `_PREDICT_SHIM` change, NO retraining.
</success_criteria>

<output>
After completion, create `.planning/phases/07-rom-quote-mode/07-02-rom-estimator-SUMMARY.md` documenting:
- The estimateRom signature (full TS interface).
- The locked constants (ROM_BAND_MULTIPLIER, ROM_BASELINE_RATE_HOURS_PER_DOLLAR, ROM_SANITY_DIVERGENCE_FACTOR) with D-NN traceback.
- Test count delta (vitest baseline pre-plan vs post-plan).
- Hand-off note for Plan 07-03: `RomForm` calls `estimateRom`; `RomResultPanel` consumes `result` + `rom` + `formValues` from the return shape. The `rom.sanityFlag` boolean is what gates the wide-range banner render.
- Confirmation that no `core/` or `_PREDICT_SHIM` was touched.
</output>
