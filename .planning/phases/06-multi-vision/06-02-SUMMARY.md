---
phase: 06-multi-vision
plan: 02
subsystem: demo-aggregator
tags: [multi-vision, aggregator, ts-orchestrator, n-plus-one-predict, rss-halfwidth]
requires:
  - 06-01 (VisionRowSchema, visionRows on quoteFormSchema, transformToQuoteInput post-strip)
provides:
  - aggregateMultiVisionEstimate (N+1 predict orchestrator)
  - AggregatorArgs interface (with inputForMatching?: QuoteInput D-04 hook)
  - AggregatorResult interface ({ result, perVisionContributions })
  - PerVisionContribution type (rowIndex, rowLabel, hoursDelta, topDrivers)
  - UnifiedQuoteResult.perVisionContributions (optional sibling field)
affects:
  - frontend/src/pages/demo/MachineLearningQuoteTool.tsx (06-04 will swap handleSubmit to aggregator)
  - frontend/src/pages/demo/compare/ComparisonQuote.tsx (06-04 mirror)
  - frontend/src/components/quote/QuoteResultPanel.tsx (06-04 reads result.perVisionContributions)
tech-stack:
  added: []
  patterns:
    - "N+1 predict orchestration over Pyodide (1 baseline + N per-row, Promise.all)"
    - "Per-target RSS half-width aggregation preserving asymmetry (D-07)"
    - "Vitest vi.mock spy on quoteAdapter.toUnifiedResult to assert forwarded input shape"
key-files:
  created:
    - frontend/src/demo/multiVisionAggregator.ts
    - frontend/src/demo/__tests__/multiVisionAggregator.test.ts
  modified:
    - frontend/src/demo/quoteResult.ts
decisions:
  - "Aggregator is pure TypeScript orchestrator over predictQuote + getFeatureImportances; no core/ change, no _PREDICT_SHIM change, no retraining (D-06)"
  - "Per-target totals: total.p50 = baseline.p50 + sum(perRow.p50 - baseline.p50); upperHalfWidth = sqrt(baselineUpper^2 + sum(deltaUpper^2)); same for lowerHalfWidth (D-05/D-07)"
  - "perVisionContributions is sibling-attached after toUnifiedResult call so the existing adapter stays single-responsibility"
  - "inputForMatching defaults to baselineInput when omitted; 06-04 page handlers populate it with visionRow-derived legacy-compat shape (D-04)"
  - "Top-2 drivers per row sourced from importances[dominantTarget] (target with largest abs(delta_p50)); direction stamped from hoursDelta sign (D-08)"
metrics:
  duration: ~25 minutes
  completed_date: 2026-05-05
  tasks_completed: 3
  files_modified: 1
  files_created: 2
  tests_added: 9
---

# Phase 6 Plan 02: Multi-vision aggregator (TS-side N+1 orchestrator) Summary

Built the TypeScript-side multi-vision aggregator: `aggregateMultiVisionEstimate` runs an N+1 predict (1 baseline + N per-row) against the existing Pyodide client and aggregates per-target totals via baseline + sum(perRow - baseline) with RSS half-widths preserving asymmetry. Returns the existing `UnifiedQuoteResult` with an optional `perVisionContributions` sibling field carrying per-row hoursDelta + top-2 drivers. Implements D-05/D-06/D-07/D-08 plus the D-04 `inputForMatching` page-handler hook that 06-04 will populate. Zero touches to `core/`, `_PREDICT_SHIM`, or any HTTP client (D-06 architectural invariant honored).

## What Shipped

### Type extension (Task 1, commit `653a6d9`)

- `frontend/src/demo/quoteResult.ts` exports new `PerVisionContribution` interface: `{ rowIndex, rowLabel, hoursDelta, topDrivers: Array<{label, direction}> }`.
- `UnifiedQuoteResult` extended with optional `perVisionContributions?: PerVisionContribution[]` — Phase 5 v1 quotes that lack the field round-trip cleanly through `savedQuoteSchema`'s `.passthrough()` chain (storage fidelity > strictness; load-bearing optional).

### Aggregator (Task 2, commit `c76c1a7`)

- `frontend/src/demo/multiVisionAggregator.ts` exports:
  - `AggregatorArgs` (formValues, dataset, metrics, supportingPool, supportingLabel, optional `inputForMatching: QuoteInput`).
  - `AggregatorResult` (`{ result: UnifiedQuoteResult, perVisionContributions: PerVisionContribution[] }`).
  - `aggregateMultiVisionEstimate(args)` async orchestrator.
  - Re-exports `PerVisionContribution` for ergonomic single-import use by 06-04.
- Orchestration flow:
  1. `transformToQuoteInput(formValues)` → strip-everything-except-vision baseline.
  2. Baseline call: `predictQuote({...baseline, vision_type:"None", vision_systems_count:0}, dataset)` plus `getFeatureImportances(dataset)` via `Promise.all`.
  3. Per-row calls: `Promise.all(rows.map(row => predictQuote({...baseline, vision_type:row.type, vision_systems_count:row.count}, dataset)))`.
  4. `buildAggregatedPrediction` builds the per-target map: per op key (12 ops), `p50Sum = baseline + sum(deltas)`, `upperHalf = sqrt(baseHi^2 + sum(deltaHi^2))`, `lowerHalf = sqrt(baseLo^2 + sum(deltaLo^2))`, then `{p10: max(0, p50Sum - lowerHalf), p50: max(0, p50Sum), p90: max(0, p50Sum + upperHalf)}` with negative-clamp guards (D-07).
  5. `toUnifiedResult({input: args.inputForMatching ?? baselineInput, prediction: aggregated, importances, metrics, supportingPool, supportingLabel})` — D-04 hook lives at this exact call site.
  6. `buildPerVisionContributions` walks each row, finds the target with the largest absolute delta_p50 ("dominant target"), reads top-2 features from `importances[dominantTarget]`, stamps direction from `hoursDelta` sign (D-08).
  7. Returns `{ result: { ...adapter, perVisionContributions }, perVisionContributions }`.
- Empty `visionRows` falls through to single baseline call; `perVisionContributions: []` returned (06-04's UI section is hidden in that case per D-09).

### Tests (Task 3, commit `c65a83a`)

`frontend/src/demo/__tests__/multiVisionAggregator.test.ts` — 9 tests, all pass:

| # | Test | Asserts |
|---|------|---------|
| 1 | empty visionRows → single baseline call | `predictQuote` called 1x, `perVisionContributions: []`, estimateHours = baseline |
| 2 | single 2D×1 row | 2 calls, contributions length 1, hoursDelta = perRow.total_p50 - baseline.total_p50 |
| 3 | three rows mixed | 4 calls, contributions length 3, sum(hoursDeltas) + baseline = result.estimateHours |
| 4 | RSS half-widths (D-07) | upperHalf ≈ 2 × sqrt(10² + 20²) ≈ 44.72 across two non-zero ops (me10 + ee20); strictly less than linear sum 60 |
| 5 | hoursDelta sign → direction | row 0 delta +50 → all topDrivers direction "increases"; row 1 delta -20 → "decreases" |
| 6 | vision overlay per call | call 0 = `{vision_type:"None", count:0}`, call 1 = `{type:row.type, count:row.count}`, dataset literal threaded through |
| 7 | row label format | `"Vision 1: 2D × 2"` (no label) and `"Vision 2 — pick-and-place: 3D × 1"` (with label) — literal × U+00D7 and — U+2014 chars |
| 8 | does not mutate formValues | input rows ref-equal after call |
| 9 | D-04 inputForMatching forwarding | spied `toUnifiedResult` receives baselineInput when omitted; receives override when provided (asserted via `mock.calls[0][0].input`) |

Mocking: `vi.mock("@/demo/pyodideClient", ...)` returns canned `predictQuote` chain + `getFeatureImportances`; `vi.mock("@/demo/quoteAdapter", ...)` wraps the real `toUnifiedResult` in `vi.fn()` so we can spy on the input-field forwarding.

## Files Modified / Created

| File | Status | Change |
|------|--------|--------|
| `frontend/src/demo/quoteResult.ts` | MODIFIED | Added `PerVisionContribution` type + optional `perVisionContributions` field on `UnifiedQuoteResult`. |
| `frontend/src/demo/multiVisionAggregator.ts` | NEW | The N+1 aggregator + private helpers `buildAggregatedPrediction` (RSS) and `buildPerVisionContributions` (top-2 drivers from dominant target). |
| `frontend/src/demo/__tests__/multiVisionAggregator.test.ts` | NEW | 9-test Vitest suite, all passing. |

## Architectural Invariant Verification (D-06)

The aggregator is TS-side only — confirmed via grep against the production source:

```
$ grep -c "from \"core/" frontend/src/demo/multiVisionAggregator.ts
0
$ grep -c "from \"@/api/client\"" frontend/src/demo/multiVisionAggregator.ts
0
$ grep -n "_PREDICT_SHIM" frontend/src/demo/multiVisionAggregator.ts
13: * NO core/ change, NO _PREDICT_SHIM change, NO retraining (D-06).
```

The only `_PREDICT_SHIM` mention is a comment line stating the invariant — no actual usage.

## D-04 inputForMatching Contract (consumed by 06-04)

`AggregatorArgs.inputForMatching?: QuoteInput` is exposed exactly once on the public interface and forwarded exactly once at the `toUnifiedResult` call site (`args.inputForMatching ?? baselineInput`). Verified via grep:

```
$ grep -c "inputForMatching" frontend/src/demo/multiVisionAggregator.ts
3   # field decl + JSDoc reference + call site
```

When omitted, the aggregator falls through to `baselineInput` (`{vision_type:"None", vision_systems_count:0, ...}`) so similar-projects matching uses the synthetic baseline. 06-04 page handlers (`MachineLearningQuoteTool.tsx` / `ComparisonQuote.tsx`) will populate this with `{...transformToQuoteInput(values), vision_type: visionRows[0]?.type ?? "None", vision_systems_count: visionRows.reduce((s,r) => s+r.count, 0)}` so `nearestK` distance reads the visionRow-derived legacy-compat shape.

Test 9 in `multiVisionAggregator.test.ts` pins both the omitted and provided cases.

## Note for Plan 06-04

The result of `aggregateMultiVisionEstimate` already has `perVisionContributions` attached to the returned `UnifiedQuoteResult` — `QuoteResultPanel` consumes `result.perVisionContributions` directly (no separate prop wiring). Page handlers should populate `inputForMatching` per D-04. This is the only contract the page handlers must honor; everything else flows through the existing `setResult({unified: result, formValues: values})` shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test 4 (RSS half-widths) initial bound was wrong**
- **Found during:** Task 3 (first vitest run).
- **Issue:** The test expected `upperHalf < 30`, but `makePred` spreads totalP50 across two non-zero ops (me10 + ee20). Each contributes RSS sqrt(100+400)=22.36 → total upperHalf ≈ 44.72.
- **Fix:** Updated assertion to `toBeCloseTo(2 * Math.sqrt(10² + 20²), 1)` plus the asymmetry guard `< 60` (linear sum = (10+20)*2). The test now precisely pins the RSS math while still proving the asymmetry-preserving property.
- **Files modified:** `frontend/src/demo/__tests__/multiVisionAggregator.test.ts` (single test body).
- **Commit:** `c65a83a` (Task 3 commit; folded into the test commit before publishing).

**2. [Rule 2 - Critical] `humanFeatureLabel` argument typing**
- **Found during:** Task 2 (typecheck).
- **Issue:** `humanFeatureLabel(rawName, input)` expects `Record<string, unknown>`; the aggregator was passing a `QuoteInput` directly which is a structural superset but the strict signature wanted a record.
- **Fix:** Cast `formInput as unknown as Record<string, unknown>` at the call site, mirroring the existing pattern in `quoteAdapter.ts::rollUpDrivers` (line 110: `const inputRecord = input as Record<string, unknown>`).
- **Files modified:** `frontend/src/demo/multiVisionAggregator.ts`.
- **Commit:** `c76c1a7`.

No architectural changes. No checkpoints required.

## Acceptance Criteria — All Met

- ✅ `frontend/src/demo/quoteResult.ts` contains `export interface PerVisionContribution {` exactly once.
- ✅ `frontend/src/demo/quoteResult.ts` contains `perVisionContributions?: PerVisionContribution[];` exactly once.
- ✅ `frontend/src/demo/multiVisionAggregator.ts` exists, exports `aggregateMultiVisionEstimate`, `AggregatorArgs` (with `inputForMatching?: QuoteInput`), `AggregatorResult`.
- ✅ Imports `predictQuote` and `getFeatureImportances` from `@/demo/pyodideClient`; `toUnifiedResult` from `@/demo/quoteAdapter`; `transformToQuoteInput` and `VisionRow` from `@/pages/single-quote/schema`.
- ✅ Zero references to `from "core/"`, `from "@/api/client"`. Only `_PREDICT_SHIM` reference is a comment stating the invariant.
- ✅ `npx tsc --noEmit -p tsconfig.json` reports zero errors in `quoteResult.ts` and `multiVisionAggregator.ts`.
- ✅ `frontend/src/demo/__tests__/multiVisionAggregator.test.ts` contains `vi.mock("@/demo/pyodideClient"` and `vi.mock("@/demo/quoteAdapter"` exactly once each.
- ✅ Test file contains 9 `it(` blocks; one explicitly tests `inputForMatching`.
- ✅ `npx vitest run src/demo/__tests__/multiVisionAggregator.test.ts` exits with code 0 (Tests 9 passed).

## Self-Check: PASSED

- `frontend/src/demo/quoteResult.ts` exists and contains `PerVisionContribution` + `perVisionContributions?` ✅
- `frontend/src/demo/multiVisionAggregator.ts` exists with all required exports ✅
- `frontend/src/demo/__tests__/multiVisionAggregator.test.ts` exists with 9 passing tests ✅
- Commits exist: `653a6d9` (Task 1), `c76c1a7` (Task 2), `c65a83a` (Task 3) — verifiable via `git log --oneline | grep '06-02'`.
- Architectural invariants verified via grep: 0 core imports, 0 api/client imports.
