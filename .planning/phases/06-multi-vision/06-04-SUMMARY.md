---
phase: 06-multi-vision
plan: 04
subsystem: integration
tags: [multi-vision, page-handlers, result-panel, jargon-guard, round-trip, build-health]
requires:
  - 06-01 (VisionRowSchema, visionRows on quoteFormSchema, schemaVersion 2, IndexedDB v1->v2 migrator)
  - 06-02 (aggregateMultiVisionEstimate, AggregatorArgs.inputForMatching, PerVisionContribution, UnifiedQuoteResult.perVisionContributions)
  - 06-03 (VisionRowsField component, QuoteForm picker swap, 5 user-facing strings)
provides:
  - Both Quote tabs (Synthetic + Real) wired to aggregateMultiVisionEstimate
  - D-04 inputForMatching shadow QuoteInput populated from visionRows
  - QuoteResultPanel "Per-vision contribution" card between top-3 drivers and per-category breakdown
  - QuoteResultPanel inputs-echo "Vision systems" row (replaces flat Vision type + count rows)
  - formatVisionSystems helper ("2D × 2; 3D × 1" / "—" empty)
  - Phase 6 jargon-guard surface coverage block (4 new tests)
  - End-to-end save -> reopen -> re-run round-trip test (3 tests)
  - Globally clean repo build (typecheck + lint + test + build all green)
affects:
  - .planning/REQUIREMENTS.md (DATA-04 + DATA-06 marked Complete)
tech-stack:
  added: []
  patterns:
    - "D-04 shadow input: page handler builds inputForMatching = {...transformToQuoteInput(values), vision_type: visionRows[0]?.type ?? 'None', vision_systems_count: sum(row.count)}"
    - "Aggregator-as-single-call replacement for predictQuote/getFeatureImportances/toUnifiedResult chain"
    - "Conditional render guard `result.perVisionContributions && length > 0` for v1-quote round-trip compat"
    - "Jargon-guard VisionRowsHarness pattern (real useForm + zodResolver wrapping useFieldArray)"
    - "Round-trip test pattern: vi.mock predictQuote, save -> reopen -> rerun, toBeCloseTo on aggregated p50"
key-files:
  created:
    - frontend/src/components/quote/__tests__/QuoteResultPanel.multivision.test.tsx
    - frontend/src/lib/__tests__/quoteStorage.roundtrip.test.ts
    - .planning/phases/06-multi-vision/06-04-SUMMARY.md
  modified:
    - frontend/src/components/quote/QuoteResultPanel.tsx
    - frontend/src/pages/demo/MachineLearningQuoteTool.tsx
    - frontend/src/pages/demo/compare/ComparisonQuote.tsx
    - frontend/src/test/jargon-guard.test.tsx
    - frontend/src/pages/single-quote/schema.ts
    - frontend/src/pages/demo/CompareFindSimilarTab.tsx
    - frontend/src/test/__fixtures__/phase5.ts
    - frontend/src/components/quote/QuoteResultPanel.test.tsx
    - frontend/src/components/quote/SaveQuoteButton.test.tsx
    - frontend/src/hooks/useSavedQuotes.test.tsx
    - frontend/src/lib/quoteStorage.test.ts
    - frontend/src/lib/savedQuoteSchema.test.ts
    - frontend/src/lib/__tests__/quoteStorage.migration.test.ts
    - frontend/src/pages/quotes/MyQuotesPage.test.tsx
    - frontend/src/pages/quotes/QuoteRow.test.tsx
    - frontend/src/pages/quotes/SavedQuotePage.test.tsx
    - .planning/REQUIREMENTS.md
decisions:
  - "Page handlers populate inputForMatching from visionRows[0]?.type and sum(row.count) (D-04 LOCKED — true vision-set similarity metric deferred to v3)"
  - "transformToQuoteInput retains vision_type:'None' / vision_systems_count:0 verbatim because QuoteInput.vision_type is a required field on api/types.ts (parent app's openapi shape, fixed by trained joblibs); the aggregator overlays per-row values for each predict call"
  - "Per-vision contribution card sits BETWEEN top-3 drivers card and per-category breakdown (D-10 ordering verbatim)"
  - "Inputs-echo block uses single 'Vision systems' row formatted via formatVisionSystems helper; '×' is U+00D7, separator is '; ' (D-11)"
  - "Vision Type entry removed from QuoteResultPanel glossary MAP because the row label changed from 'Vision type' to 'Vision systems' (no Vision Systems glossary entry exists)"
  - "buildAutoSuggestedName label format moved from {visionType} to {type×count}+... per Plan 06-01; tests in this plan rewritten to match new format ('2D×1', '3D×1', '2D×1+3D×1')"
metrics:
  duration: ~25 minutes
  completed_date: 2026-05-05
  tasks_completed: 6
  files_modified: 17
  files_created: 3
  tests_added: 12
  commits: 6
---

# Phase 6 Plan 04: Wire-up + Result Panel + Round-trip Summary

Stitched Plans 06-01/06-02/06-03 into a working multi-vision feature: both Quote tabs (Synthetic + Real) now call `aggregateMultiVisionEstimate(...)` instead of `predictQuote/getFeatureImportances/toUnifiedResult` directly, populating the D-04 `inputForMatching` shadow QuoteInput so similar-projects matching reads visionRow-derived legacy fields. `QuoteResultPanel` renders a new "Per-vision contribution" card between top-3 drivers and per-category breakdown when populated, and replaces the two flat vision rows in the inputs-echo block with a single "Vision systems" row driven by a new `formatVisionSystems` helper. Jargon-guard extended with a Phase 6 surface coverage block (4 new tests). End-to-end round-trip test (3 tests) closes Success Criterion #4. Cascaded type errors from Plans 06-01/06-03 in 12 downstream test fixtures + 1 production file repaired (Rule 3 — auto-fix blocking issues). Final state: globally clean typecheck, 0-warning lint, 935/935 vitest, build succeeds. Closes DATA-04 and DATA-06.

## What Shipped

### Task 1: Wire aggregator into both Quote tabs (commit `83c0020`)

`MachineLearningQuoteTool.tsx::handleSubmit`:
- Replaced parallel `predictQuote` + `getFeatureImportances` + manual `prediction.ops` -> `predByTarget` remap + `toUnifiedResult` chain with a single `aggregateMultiVisionEstimate({...})` call.
- Adds D-04 `inputForMatching` shadow QuoteInput: `{...transformToQuoteInput(values), vision_type: values.visionRows[0]?.type ?? "None", vision_systems_count: values.visionRows.reduce((s, r) => s + r.count, 0)}`.
- Imports: dropped `predictQuote`, `getFeatureImportances`, `toUnifiedResult`; added `aggregateMultiVisionEstimate`, `QuoteInput` type. Same envelope (try/catch/setSubmitting/scrollIntoView).

`ComparisonQuote.tsx::handleSubmit`: identical swap with `dataset: "real"` and `supportingLabel: "Most similar past projects"`. Same `inputForMatching` block (D-04 LOCKED).

### Task 2: Per-vision contribution section + Vision systems inputs-echo row (commit `0060693`)

`QuoteResultPanel.tsx`:
- New "Per-vision contribution" card sits between Top drivers (`mb-3`/`space-y-2` ul) and Per-category breakdown (`mb-3`/`space-y-3` div) — D-10 ordering verbatim. Conditionally rendered: `result.perVisionContributions && result.perVisionContributions.length > 0`. Each card row renders `pvc.rowLabel`, hours delta with leading `+` for positive (`{pvc.hoursDelta >= 0 ? "+" : ""}{fmtHrs(pvc.hoursDelta)} hrs`), and up-to-2 driver pills with `TrendingUp` (amber, increases) or `TrendingDown` (teal, decreases) icons.
- `SECTIONS["Controls & automation"]` rows: removed "Vision type" (line 235) and "Vision systems count" (line 240); inserted single `["Vision systems", (v) => formatVisionSystems(v.visionRows)]` row.
- New helper: `formatVisionSystems(rows): string` — empty array returns `"—"` (em-dash U+2014); populated returns `r.type × r.count` joined by `"; "` (e.g., `"2D × 2; 3D × 1"`). The `×` is the literal U+00D7 character.
- `recapLabelToGlossaryTerm` MAP: removed stale `"Vision type": "Vision Type"` entry (the row label is now "Vision systems" with no glossary entry; renders plainly).

### Task 3: QuoteResultPanel multi-vision render Vitest (commit `cd5076e`)

`frontend/src/components/quote/__tests__/QuoteResultPanel.multivision.test.tsx` — 5 tests, all pass:

| # | Test | Asserts |
|---|------|---------|
| 1 | Per-vision contribution heading + row labels render when populated | "Per-vision contribution" + "Vision 1: 2D × 2" + "Vision 2: 3D × 1" |
| 2 | Hours delta sign formatting | `/^\+30 hrs$/`, `/^-15 hrs$/` |
| 3 | Absent perVisionContributions (v1 result) -> heading not rendered | `queryByText("Per-vision contribution") === null` |
| 4 | Inputs-echo 'Vision systems' row format | empty -> "—"; populated -> "2D × 2; 3D × 1" |
| 5 | Sanity jargon-guard scan | no P10/P50/P90, no R², no "delta from baseline" / "uncertainty band" |

### Task 4: Jargon-guard Phase 6 surface coverage (commit `654920e`)

`frontend/src/test/jargon-guard.test.tsx` — appended `describe("jargon-guard (DATA-03 — Phase 6 surface coverage)", ...)` block with 4 new tests:

| # | Test | Marker |
|---|------|--------|
| 1 | VisionRowsField empty state | "No vision systems on this project." + "Add vision system" |
| 2 | VisionRowsField populated | "Add vision system" + "Remove vision system" (aria-label) |
| 3 | QuoteResultPanel + perVisionContributions | "Per-vision contribution" |
| 4 | QuoteResultPanel inputs-echo Phase 6 | "Vision systems" + "2D × 2" |

`VisionRowsHarness({ rows })` wraps `<VisionRowsField control={form.control}>` in a real `useForm<QuoteFormValues>({ resolver: zodResolver(quoteFormSchema), defaultValues: { ...quoteFormDefaults, visionRows: rows } })` so `useFieldArray` binds to actual form state during the scan.

Imports added at top-of-file (CONVENTIONS.md order — third-party `useForm` + `zodResolver`, then `@/`-aliased `VisionRowsField`, `quoteFormSchema`, `VisionRow`). Reused existing `assertNoBannedTokens` helper. **No additions to `BANNED_TOKENS`** — the existing 16-pattern list catches anything ML-jargony that might slip ("delta from baseline" etc.).

Full suite (Phase 4 + 5 + 6) — 17 tests pass.

### Task 5: Round-trip Vitest (commit `517c323`)

`frontend/src/lib/__tests__/quoteStorage.roundtrip.test.ts` — 3 tests, all pass:

| # | Test | Asserts |
|---|------|---------|
| 1 | save -> reopen preserves visionRows verbatim | `lastVer.formValues.visionRows === [{2D×2}, {3D×1}]` exactly |
| 2 | save -> reopen -> re-run produces same aggregated p50 | `rerun.result.estimateHours` ≈ `initial.result.estimateHours` (toBeCloseTo, 0); `perVisionContributions` length 2 with rowIndex 0/1 ordering preserved |
| 3 | empty-visionRows quote: save -> reopen preserves [] | `lastVer.formValues.visionRows === []` |

`vi.mock("@/demo/pyodideClient")` with chained `mockResolvedValueOnce` sequence delivers deterministic predictions across the save and re-run aggregator calls. Each test gets a fresh `IDBFactory()` in `beforeEach` so DB version state doesn't bleed across tests.

### Task 6: Final whole-repo validation (commit `45f9bfe`)

Plans 06-01 and 06-03 cascaded type errors into 1 production file + 11 test fixtures that 06-04 must repair to ship a globally clean build. Rule 3 (auto-fix blocking issues) — fixed inline:

**Production fixes:**
- `frontend/src/pages/single-quote/schema.ts::transformToQuoteInput` — sets `vision_type: "None"` / `vision_systems_count: 0` literally so `QuoteInput.vision_type` (required by api/types.ts) is satisfied. The aggregator overlays per-row values for each predict call (D-06); the baseline call uses these defaults verbatim.
- `frontend/src/pages/demo/CompareFindSimilarTab.tsx` — drop now-removed `vision_type` form-default override.

**Test-fixture fixes (schemaVersion 1 -> 2; vision_type -> visionRows):**
- `frontend/src/test/__fixtures__/phase5.ts` — `vision_type: "2D"` -> `visionRows: [{type:"2D", count:1}]`; `schemaVersion: 1` -> `2`.
- `frontend/src/lib/savedQuoteSchema.test.ts` — `makeSavedQuote` schemaVersion 1 -> 2; literal-rejection test now asserts `parse({schemaVersion: 3})` throws (literal accepts 2). `transformToFormValues` round-trip test uses `visionRows: []` (multi-vision NOT round-trippable through QuoteInput boundary in v2). `buildAutoSuggestedName` tests rewritten for new label format ("2D×1", "2D×1+3D×1").
- `frontend/src/lib/quoteStorage.test.ts` — schemaVersion 1 -> 2 in saveSavedQuote test. "Future" tests use `schemaVersion: 99` (since 2 is now canonical). `openDB("matrix-quotes", 1)` -> `2` for record-injection.
- `frontend/src/lib/__tests__/quoteStorage.migration.test.ts` — replaced 6 `(v2 as any)` casts with a typed helper `getFirstVersionFormValues(rec: unknown): Record<string, unknown>` to satisfy lint (`@typescript-eslint/no-explicit-any` under `--max-warnings 0`).
- `frontend/src/pages/quotes/SavedQuotePage.test.tsx` — `QuoteResultPanel` mock updated to read `input.visionRows` (not `input.vision_type`); test asserts new "2D×1" rendered format.
- `frontend/src/components/quote/QuoteResultPanel.test.tsx` — glossary-tooltip test 7 -> 6 labels ("Vision Type" entry removed from MAP per D-11 in Task 2).
- `frontend/src/components/quote/SaveQuoteButton.test.tsx`, `MyQuotesPage.test.tsx`, `QuoteRow.test.tsx`, `useSavedQuotes.test.tsx` — schemaVersion + visionRows fixture updates.

**Final validation results:**
- `npx tsc --noEmit -p tsconfig.json` exits 0
- `npm run lint` exits 0 (0 warnings under `--max-warnings 0`)
- `npm test` — 935/935 tests pass across 101 files
- `npm run build` succeeds (vite build completes; `multiVisionAggregator-*.js` chunk = 16.49 kB / 6.48 kB gzipped)

## Files Modified / Created

| File | Status | Change |
|------|--------|--------|
| `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` | MODIFIED | handleSubmit calls aggregateMultiVisionEstimate (synthetic) with D-04 inputForMatching |
| `frontend/src/pages/demo/compare/ComparisonQuote.tsx` | MODIFIED | handleSubmit calls aggregateMultiVisionEstimate (real) with D-04 inputForMatching |
| `frontend/src/components/quote/QuoteResultPanel.tsx` | MODIFIED | Per-vision contribution card + Vision systems inputs-echo row + formatVisionSystems helper + MAP cleanup |
| `frontend/src/test/jargon-guard.test.tsx` | MODIFIED | Phase 6 surface coverage describe block (4 new tests) |
| `frontend/src/components/quote/__tests__/QuoteResultPanel.multivision.test.tsx` | NEW | 5 multi-vision render tests |
| `frontend/src/lib/__tests__/quoteStorage.roundtrip.test.ts` | NEW | 3 round-trip tests |
| `frontend/src/pages/single-quote/schema.ts` | MODIFIED | transformToQuoteInput sets vision_type:"None" + vision_systems_count:0 verbatim |
| `frontend/src/pages/demo/CompareFindSimilarTab.tsx` | MODIFIED | drop removed vision_type form default |
| `frontend/src/test/__fixtures__/phase5.ts` | MODIFIED | visionRows + schemaVersion 2 |
| `frontend/src/components/quote/QuoteResultPanel.test.tsx` | MODIFIED | glossary 7 -> 6 labels |
| `frontend/src/components/quote/SaveQuoteButton.test.tsx` | MODIFIED | visionRows fixture |
| `frontend/src/hooks/useSavedQuotes.test.tsx` | MODIFIED | schemaVersion 2 |
| `frontend/src/lib/quoteStorage.test.ts` | MODIFIED | schemaVersion 2 + future tests use 99 |
| `frontend/src/lib/savedQuoteSchema.test.ts` | MODIFIED | schemaVersion 2 + visionRows + autoname format |
| `frontend/src/lib/__tests__/quoteStorage.migration.test.ts` | MODIFIED | typed helper replaces `as any` casts |
| `frontend/src/pages/quotes/MyQuotesPage.test.tsx` | MODIFIED | schemaVersion 2 |
| `frontend/src/pages/quotes/QuoteRow.test.tsx` | MODIFIED | schemaVersion 2 |
| `frontend/src/pages/quotes/SavedQuotePage.test.tsx` | MODIFIED | visionRows + mock + schemaVersion 2 |
| `.planning/REQUIREMENTS.md` | MODIFIED | DATA-04 + DATA-06 marked Complete |
| `.planning/phases/06-multi-vision/06-04-SUMMARY.md` | NEW | this file |

## Tests Added

| Test File | Count | What it covers |
|-----------|-------|----------------|
| `QuoteResultPanel.multivision.test.tsx` | 5 | D-09/D-10/D-11 render + sign formatting + v1 round-trip compat |
| `jargon-guard.test.tsx` (Phase 6 block) | 4 | All 5 user-facing strings from D-17 |
| `quoteStorage.roundtrip.test.ts` | 3 | save/reopen/re-run aggregated p50 preservation |
| **Total** | **12** | (Plan target: 5+4+3 = 12 — exact) |

## D-04 inputForMatching Contract Honored

Both page handlers thread `inputForMatching` through the aggregator so `nearestNeighbor.distance` reads visionRow-derived legacy fields:

```ts
const inputForMatching: QuoteInput = {
  ...transformToQuoteInput(values),
  vision_type: values.visionRows[0]?.type ?? "None",
  vision_systems_count: values.visionRows.reduce((s, r) => s + r.count, 0),
};
const { result } = await aggregateMultiVisionEstimate({
  formValues: values,
  dataset: "synthetic",  // or "real" in ComparisonQuote
  metrics: metricsByTarget,
  supportingPool: pool ?? [],
  supportingLabel: "Most similar training rows",  // or "Most similar past projects"
  inputForMatching,
});
```

Per the 06-02 contract, when `args.inputForMatching` is provided the aggregator forwards it as `toUnifiedResult({input: args.inputForMatching, ...})`. The model's per-row predicts still use the per-row vision overlay verbatim (synthetic baseline + N per-row calls); only the supporting-matches input changes. This is the locked v2.0 behavior; a true vision-set similarity metric is deferred to v3.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] schema.ts::transformToQuoteInput required vision_type set verbatim**

- **Found during:** Task 6 (whole-repo typecheck).
- **Issue:** Plan 06-01 deleted `vision_type: v.vision_type` and `vision_systems_count: v.vision_systems_count` from `transformToQuoteInput`. But `QuoteInput.vision_type` is typed as a required `string` field on `frontend/src/api/types.ts:12` (parent app's openapi shape, fixed by trained joblibs and `core/config.py:96`). `tsc --noEmit` errored:
  ```
  src/pages/single-quote/schema.ts(129,3): error TS2741: Property 'vision_type' is missing in type '{...}' but required in type 'QuoteInput'.
  ```
- **Fix:** Set `vision_type: "None"` and `vision_systems_count: 0` verbatim. The aggregator (06-02) already overlays per-row values for each predict call; this is the same shape the baseline call uses internally (`{...transformToQuoteInput(formValues), vision_type: "None", vision_systems_count: 0}` per `multiVisionAggregator.ts:72-76`). Page handlers populate `inputForMatching` for similar-projects matching (D-04). Comment block documents the contract in-place.
- **Files modified:** `frontend/src/pages/single-quote/schema.ts`.
- **Commit:** `45f9bfe`.

**2. [Rule 3 - Blocking] CompareFindSimilarTab.tsx referenced removed vision_type field**

- **Found during:** Task 6.
- **Issue:** `defaultValues` block reads `vision_type: dropdowns.vision_type[0] ?? quoteFormDefaults.vision_type` — but `quoteFormDefaults.vision_type` was removed in Plan 06-01.
- **Fix:** Drop the `vision_type` line from the defaults override. Form schema's `visionRows: []` default carries through. `dropdowns.vision_type` is still populated from CSV columns (which remain unchanged) but is no longer rendered as a Select; that line is dead code now and has been removed.
- **Files modified:** `frontend/src/pages/demo/CompareFindSimilarTab.tsx`.
- **Commit:** `45f9bfe`.

**3. [Rule 3 - Blocking] 11 test fixtures schemaVersion 1 -> 2 + visionRows shape**

- **Found during:** Task 6.
- **Issue:** Plan 06-01 bumped `schemaVersion: z.literal(1)` -> `z.literal(2)` in `savedQuoteSchema.ts` and removed `vision_type` / `vision_systems_count` from `quoteFormSchema`. 11 test fixture/factory functions still hardcoded `schemaVersion: 1` and 6 fixtures referenced `vision_type: "..."` directly. Vitest didn't catch them because tests parse via the schema; once the schema rejects `schemaVersion: 1`, factory output fails `.parse()`. Some tests asserted on the OLD shape (e.g., `expect(out.schemaVersion).toBe(1)`) and would have failed had Plan 06-01 not been packaged in isolation.
- **Fix:** Bumped all 11 schemaVersion literals to 2; replaced 6 `vision_type` field references with `visionRows: [{type, count}]` arrays. Updated buildAutoSuggestedName tests to assert the new "2D×1" format. Updated `QuoteResultPanel` mock in SavedQuotePage.test.tsx to read `visionRows` and concatenate via `r.type×r.count`.
- **Files modified:** 11 test/fixture files (see "Files Modified" table).
- **Commit:** `45f9bfe`.

**4. [Rule 3 - Blocking] quoteStorage.migration.test.ts had 6 `(v2 as any)` casts triggering ESLint --max-warnings 0**

- **Found during:** Task 6 (`npm run lint`).
- **Issue:** Plan 06-01's migration test used `(v2 as any).versions[0]...` to drill into untyped migrator output. Lint config rejects `any` under `@typescript-eslint/no-explicit-any` with 6 errors.
- **Fix:** Added `getFirstVersionFormValues(rec: unknown): Record<string, unknown>` helper at the top of the describe block. Each test calls `getFirstVersionFormValues(v2).visionRows` instead of `(v2 as any).versions[0].formValues.visionRows`. The first test (which also reads `schemaVersion`) casts via `as { schemaVersion: number }` — narrow inline shape. Same eslint-disable pattern at line 17-18 (the `globalThis as any` indexedDB reset) was preserved verbatim because that one is a global write requiring `any`.
- **Files modified:** `frontend/src/lib/__tests__/quoteStorage.migration.test.ts`.
- **Commit:** `45f9bfe`.

**5. [Rule 1 - Bug] QuoteResultPanel.test.tsx glossary count 7 -> 6**

- **Found during:** Task 6.
- **Issue:** Task 2 (this plan) removed the `"Vision type": "Vision Type"` MAP entry per D-11 verbatim. Existing test `it("renders HelpCircle for all 7 row labels that match glossary terms")` enumerated 7 labels including "Vision Type". Test failed because that affordance is no longer rendered.
- **Fix:** Renamed test to "all 6 row labels", removed "Vision Type" from the labels array, added a comment explaining the D-11 removal.
- **Files modified:** `frontend/src/components/quote/QuoteResultPanel.test.tsx`.
- **Commit:** `45f9bfe`.

No architectural changes. No checkpoints required. No untracked / generated artifacts.

## Acceptance Criteria — All Met

- ✅ `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` contains `aggregateMultiVisionEstimate` import + `dataset: "synthetic"` call + `inputForMatching` literal twice; zero non-comment `predictQuote(` / `getFeatureImportances(` occurrences.
- ✅ `frontend/src/pages/demo/compare/ComparisonQuote.tsx` contains `aggregateMultiVisionEstimate` import + `dataset: "real"` call + `inputForMatching` literal twice; zero non-comment `predictQuote(` / `getFeatureImportances(` occurrences.
- ✅ `frontend/src/components/quote/QuoteResultPanel.tsx` contains `Per-vision contribution` exactly once + `function formatVisionSystems(` exactly once + `["Vision systems", (v) => formatVisionSystems(v.visionRows)]` exactly once + the conditional render guard `result.perVisionContributions && result.perVisionContributions.length > 0`; zero non-comment `"Vision type"` / `"Vision systems count"` occurrences.
- ✅ `frontend/src/test/jargon-guard.test.tsx` contains `Phase 6 surface coverage` exactly once + 4 new `it(` blocks; each calls `assertNoBannedTokens(`. Imports for `useForm`, `zodResolver`, `VisionRowsField`, `quoteFormSchema`, `VisionRow` in top-of-file block.
- ✅ `frontend/src/components/quote/__tests__/QuoteResultPanel.multivision.test.tsx` exists; 5 `it(` blocks; vitest exits 0.
- ✅ `frontend/src/lib/__tests__/quoteStorage.roundtrip.test.ts` exists; `import "fake-indexeddb/auto";` first import; 3 `it(` blocks; one calls both `saveSavedQuote(` + `getSavedQuote(`; one calls `aggregateMultiVisionEstimate(` twice with `toBeCloseTo` p50 assertion; vitest exits 0.
- ✅ `cd frontend && npm run typecheck` exits 0.
- ✅ `cd frontend && npm run lint` exits 0 (`--max-warnings 0`).
- ✅ `cd frontend && npm test` exits 0 — 935/935 tests pass.
- ✅ `cd frontend && npm run build` exits 0.
- ✅ Phase 6 plan-level success criterion 4 (round-trip preserves multi-vision) covered by Task 5's 3 tests.
- ✅ DATA-04 + DATA-06 traceability table updated to Complete in `.planning/REQUIREMENTS.md`.

## Self-Check: PASSED

- Files created exist:
  - `frontend/src/components/quote/__tests__/QuoteResultPanel.multivision.test.tsx` ✅
  - `frontend/src/lib/__tests__/quoteStorage.roundtrip.test.ts` ✅
  - `.planning/phases/06-multi-vision/06-04-SUMMARY.md` ✅
- Commits exist (verifiable via `git log --oneline | grep '06-04'`):
  - `83c0020` feat(06-04): wire aggregator into both Quote tabs with D-04 shadow input
  - `0060693` feat(06-04): add Per-vision contribution section + Vision systems inputs-echo row
  - `cd5076e` test(06-04): QuoteResultPanel multi-vision render coverage
  - `654920e` test(06-04): extend jargon-guard with Phase 6 surface coverage block
  - `517c323` test(06-04): round-trip multi-vision save -> reopen -> re-run preserves p50
  - `45f9bfe` fix(06-04): repair downstream consumers of post-06-01 vision schema
- All 12 new tests pass (5 + 4 + 3). Whole-repo state: 935/935 vitest, typecheck clean, lint clean, build succeeds.
- DATA-04 + DATA-06 marked Complete in REQUIREMENTS.md.
