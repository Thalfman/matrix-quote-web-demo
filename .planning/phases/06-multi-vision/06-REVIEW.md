---
status: issues_found
phase: 6
phase_name: multi-vision
depth: standard
scope: 27
counts:
  blocker: 1
  warning: 5
  info: 6
---

# Phase 6: Multi-vision per project — Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 27 (10 production + 17 test)
**Status:** issues_found

## Summary

Phase 6 ships a clean, well-tested multi-vision aggregator, an idempotent v1→v2 IndexedDB migrator, a tidy `useFieldArray`-based picker, and a "Per-vision contribution" result panel section. Architecture is sound: the aggregator is a pure TS orchestrator over `predictQuote` (no `core/` change, no `_PREDICT_SHIM` change, no HTTP), and the migrator strips legacy keys cleanly per D-13.

However, the review surfaced one BLOCKER and several WARNINGs:

- **BLOCKER (BL-01):** `CompareFindSimilarTab.tsx::handleSubmit` was *not* updated to apply the D-04 shadow input when calling `nearestK`. The Find Similar tab now distance-matches every user query against `vision_type:"None"`/`vision_systems_count:0` regardless of the user's `visionRows` selection, because `transformToQuoteInput` was hard-coded to those defaults in plan 06-04. End-user impact: the "Find similar projects" feature ignores vision selections entirely.
- **WARNINGs:** `buildPerVisionContributions` picks an arbitrary "dominant target" when a row's delta is exactly zero (giving fake-looking driver attribution), and uses *global* feature importances rather than features that actually shifted between baseline and per-row predict (a row's drivers can be unrelated to vision). Per-target confidence is computed via RSS half-widths but never reads `OpPrediction.confidence`, so the D-07 "min across baseline + per-row" rule is enforced only indirectly. `migrateRecordV1ToV2` short-circuits on already-`visionRows` formValues *without* stripping any legacy `vision_type` / `vision_systems_count` keys that may still be present on hand-rolled hybrid records. The aggregator does not guard against `Promise.all` rejection — a single failed per-row predict aborts the entire estimate without surfacing which row failed.
- **INFOs:** `dropdowns.vision_type` is computed in three pages but no longer consumed; `Number(restoreVersion)` in `QuoteForm.tsx` swallows `NaN` silently; the `formInputRecord` cast through `unknown` masks a type-system gap that could be removed by widening `humanFeatureLabel`'s parameter; the auto-suggested-name truncation can produce a visionLabel of just "…"; `inputForMatching` is documented but only `visionRows[0]?.type` is forwarded (acknowledged in plan as v3 deferred); the `formValues.visionRows ?? []` guard in `aggregateMultiVisionEstimate` is unreachable since the schema enforces an array.

All vitest 935/935 pass and typecheck/lint/build are clean, so none of the issues block the demo from running — but BL-01 is a behavioral regression vs. the v1.0 single-vision Find Similar feature that affects what the customer-facing "Most similar past projects" panel returns.

## Blockers

### BL-01: Find-Similar tab ignores `visionRows` when computing nearest-neighbor distance

**File:** `frontend/src/pages/demo/CompareFindSimilarTab.tsx:81-94`
**Issue:** `handleSubmit` calls `transformToQuoteInput(values)` and feeds the result directly into `nearestK(input, records, manifest.feature_stats, 3)`. Per Plan 06-04's `transformToQuoteInput` change, the returned `QuoteInput` *always* carries `vision_type: "None"` and `vision_systems_count: 0` regardless of `formValues.visionRows`. Because `vision_type` is in `QUOTE_CAT_FIELDS` and `vision_systems_count` is in `QUOTE_NUM_FIELDS` (`frontend/src/demo/realProjects.ts:43-62`), `nearestNeighbor.distance` (`frontend/src/lib/nearestNeighbor.ts:35-49`) penalizes mismatches between the user's input and every historical record on those two axes — so users get distance scores computed against a "no vision" baseline regardless of what they actually entered into `<VisionRowsField>`. Pre-Phase-6, the equivalent Find-Similar code path read `vision_type`/`vision_systems_count` straight from form state (D-04 lock comments document this for the two Quote tabs but Find-Similar was missed).

**Why it matters:** Find-Similar is a customer-facing demo surface (Real Data tab in the comparison tool) — Bertsche's review specifically asked for honest similarity matching. Users adding 2D×3 + 3D×1 rows will see "Most similar past projects" rankings that ignore their entire vision configuration; the rankings will move only when they change non-vision fields. This silently breaks the vision dimension of the matching feature without any error surface.

**Fix:** Apply the same D-04 shadow-input pattern used in `MachineLearningQuoteTool.tsx:139-143` and `ComparisonQuote.tsx:137-141`:

```ts
const handleSubmit = () => {
  if (!manifest) return;
  const values = form.getValues();
  // D-04 shadow input: visionRows-derived legacy fields drive nearest-neighbor distance.
  const input: QuoteInput = {
    ...transformToQuoteInput(values),
    vision_type: values.visionRows[0]?.type ?? "None",
    vision_systems_count: values.visionRows.reduce((s, r) => s + r.count, 0),
  };
  const scored = nearestK(input, records, manifest.feature_stats, 3);
  // ... rest unchanged
};
```

A regression test should pin this: create two `ProjectRecord` fixtures differing only in `vision_type` and assert that toggling the form's `visionRows` between `[]` and `[{type: "2D", count: 1}]` flips the closer match.

## Warnings

### WR-01: Per-vision drivers use global feature importances, not features that actually shifted

**File:** `frontend/src/demo/multiVisionAggregator.ts:188-231` (`buildPerVisionContributions`)
**Issue:** For each vision row, the code picks `dominantTarget` (the op key with the largest absolute delta from baseline), then reads `importances[dominantTarget]` and slices the top 2. But `importances` is the *global* feature-importance map for that target — it's the same across baseline and per-row predicts and reflects what generally drives that target, not which features moved between baseline and this specific row's predict. As a result, a 2D vision row could surface "Number of stations" + "Number of robots" as its drivers even though those features are identical between baseline and per-row inputs. The customer reading the Per-vision contribution card would attribute the row's hour delta to features that did not change.

D-08 in `06-CONTEXT.md` explicitly says drivers should be "the top-2 features whose contribution magnitude shifted most between baseline and per-row predict" — the implementation surfaces top features of the dominant target, which is a different (and weaker) signal.

**Why it matters:** The per-vision contribution card is a public-facing claim about *why* this row adds N hours. Picking unrelated drivers undermines the honest-signal posture explicitly carried over from v1.0. A driver list that doesn't move with vision settings makes the section feel like a static decoration rather than a per-row explanation.

**Fix (option A, minimal):** Stamp the row's drivers with `vision_type` / `vision_systems_count` directly when the per-row predict has any non-trivial delta — those are the only features that demonstrably differ between baseline and per-row input. Map them through `humanFeatureLabel` and direction-stamp via `hoursDelta` sign:

```ts
const direction: "increases" | "decreases" = hoursDelta >= 0 ? "increases" : "decreases";
const visionDrivers: Array<{ label: string; direction: typeof direction }> = [
  { label: humanFeatureLabel("vision_type", formInputRecord).label, direction },
  { label: humanFeatureLabel("vision_systems_count", formInputRecord).label, direction },
];
```

**Fix (option B, fuller):** Run a second pass of `getFeatureImportances` per per-row input via SHAP-style local explanation — out of scope for v2.0 per CONTEXT.md, but should be tracked as a v3 task. The Plan 06-02 approach (use `dominantTarget`'s globals as a proxy) should be replaced with option A in v2.0 since it materially misleads.

### WR-02: `buildPerVisionContributions` produces non-deterministic dominantTarget when a row's delta is zero

**File:** `frontend/src/demo/multiVisionAggregator.ts:200-213`
**Issue:** When `pr.total_p50 === baselinePred.total_p50` (i.e., the row's predict is identical to baseline), `hoursDelta = 0` and per-op `absDelta = 0` for every op. The loop initializes `dominantAbsDelta = -1`, so the first op key with a baseline match (e.g., `me10`) becomes `dominantTarget` regardless of whether that op actually moved. The drivers are then arbitrarily picked from `importances["me10_actual_hours"]` and stamped with `direction: "increases"` (since `hoursDelta >= 0` includes zero). For a degenerate "this row added 0 hours" case, the user sees a card claiming "Vision 1: 2D × 1 +0 hrs" with two drivers that have nothing to do with the row.

**Why it matters:** Users will trust the per-vision card more than the bare hours number because it spells out *why*. A zero-delta row showing arbitrary drivers — the same drivers every time, since `Object.entries(pr.ops)` iteration order is stable — is a credibility bug, not a UI bug.

**Fix:** Guard against the all-zero case. When `dominantAbsDelta === 0` (or the loop finishes with `dominantAbsDelta < epsilon`), return `topDrivers: []` so the card renders just the row label and "+0 hrs" without misleading drivers. The `QuoteResultPanel` already handles `topDrivers.length === 0` (line 140 conditional render).

```ts
const EPSILON = 0.5; // half-hour threshold
if (Math.abs(dominantAbsDelta) < EPSILON) {
  return { rowIndex, rowLabel: ..., hoursDelta, topDrivers: [] };
}
```

### WR-03: D-07 "min confidence across baseline + per-row" rule is never enforced

**File:** `frontend/src/demo/multiVisionAggregator.ts:143-177` (`buildAggregatedPrediction`)
**Issue:** D-07 specifies that aggregated per-target confidence must be the minimum across baseline + per-row predicts. The `OpPrediction` payload carries a `confidence: "high" | "moderate" | "lower"` field per op. `buildAggregatedPrediction` reads `p10` / `p50` / `p90` and computes RSS half-widths but never inspects `opBaseline.confidence` or `pr.ops[opKey].confidence`. The aggregated `predByTarget` it returns has no confidence field, and downstream `toUnifiedResult` (in `quoteAdapter.ts`) re-derives confidence from `(p90 - p10) / p50` ratios.

This means a per-row predict with `confidence: "lower"` and a tight half-width (e.g., 0.5h spread) gets flattened to "high" in the aggregated rollup because RSS preserved a small spread. The honest worst-case posture from D-07 is silently lost.

The Plan 06-02 success-criteria comment acknowledges this: *"Confidence per target = min across baseline + per-row predicts (D-07 — handled inside `toUnifiedResult`'s rollUpConfidence acting on the aggregated `predByTarget`)"* — but the implementation provides no path for the `confidence` field to flow through. `toUnifiedResult` only sees `{p10, p50, p90}` per target.

**Why it matters:** Customer-facing confidence chips are a v1.0 ratchet item ("lower confidence is a feature, not a bug to hide"). Multi-vision quotes that should surface "Lower confidence" because one of N predicts had it can falsely show "High confidence." This is a weaker version of BL-01 — the chip is technically present but driven by a proxy signal rather than the rule on paper.

**Fix:** Either (a) extend `PredByTarget` to include a min-confidence field and patch `toUnifiedResult` to honor it, or (b) compute and attach the worst-case confidence to `UnifiedQuoteResult.overallConfidence` directly inside the aggregator after the `toUnifiedResult` call returns:

```ts
function minConfidence(...preds: QuotePrediction[]): "high" | "moderate" | "lower" {
  const order = { high: 2, moderate: 1, lower: 0 };
  let worst: "high" | "moderate" | "lower" = "high";
  for (const p of preds) {
    for (const op of Object.values(p.ops)) {
      if (order[op.confidence] < order[worst]) worst = op.confidence;
    }
  }
  return worst;
}
// after toUnifiedResult:
const aggregatedConfidence = minConfidence(baselinePred, ...perRowPreds);
return {
  result: { ...result, overallConfidence: aggregatedConfidence, perVisionContributions },
  perVisionContributions,
};
```

### WR-04: `migrateFormValuesV1ToV2` short-circuit leaves legacy keys in place on already-v2 formValues

**File:** `frontend/src/lib/quoteStorage.ts:134-150`
**Issue:** The function returns `fv` unchanged when `Array.isArray(f.visionRows)` is true (line 137). For a hand-crafted hybrid record where formValues somehow contains *both* `visionRows` AND legacy `vision_type` / `vision_systems_count` keys, the migrator skips the strip step. The downstream zod parse (default strip-unknown behavior on `quoteFormSchema`) covers most cases, but if a future schema change uses `.passthrough()` on the inner formValues, legacy keys leak through.

This is also asymmetric with the `migrateRecordV1ToV2` outer function: that one always wraps a v1 record into v2 even if the outer record has been hand-modified. The inner short-circuit is more lenient than the outer.

**Why it matters:** Defense-in-depth and the D-13 "clean cutover" lock together imply legacy keys should never appear on a v2 record's formValues anywhere in the data flow. The current short-circuit creates a small window where the invariant fails.

**Fix:** Replace the short-circuit with a strip-and-return:

```ts
function migrateFormValuesV1ToV2(fv: unknown): unknown {
  if (!fv || typeof fv !== "object") return fv;
  const f = fv as Record<string, unknown>;
  // Always strip legacy keys, even on already-v2 records.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { vision_type: _vt, vision_systems_count: _vc, ...rest } = f;
  if (Array.isArray(rest.visionRows)) return rest; // already v2 (now without legacy keys)
  // ... rest of v1 -> v2 logic
}
```

### WR-05: `Promise.all(rows.map(predictQuote))` rejects loudly with no per-row failure context

**File:** `frontend/src/demo/multiVisionAggregator.ts:87-94`
**Issue:** If any single per-row predict fails (Pyodide error, model load race, transient resource), `Promise.all` rejects with the first error and the whole `aggregateMultiVisionEstimate` call throws. The caller (`MachineLearningQuoteTool.tsx::handleSubmit` line 158) catches generic `Error.message` and toasts it. The user sees "Prediction failed" with no indication of *which* vision row caused the failure or whether the baseline call succeeded.

This also means a partial result is unrecoverable — even if N-1 per-row predicts succeed, the user gets no quote at all. Pre-Phase-6 single-vision had no such failure mode.

**Why it matters:** Phase 6 multiplies the number of model calls per quote (1 baseline + N rows) and therefore multiplies the failure surface. A user with 5 rows now has 6× the chance of hitting a transient Pyodide error vs. v1.0's single call. The all-or-nothing failure semantics are weaker than the per-row resilience the customer would intuitively expect.

**Fix:** Wrap each per-row predict and surface partial-failure state. Either (a) `Promise.allSettled` and skip failed rows with a toast/warning indicating which row dropped, or (b) per-row try/catch that synthesizes a zero-delta entry on failure. Given the demo posture, (a) is the lower-friction choice:

```ts
const perRowResults = await Promise.allSettled(
  rows.map((row) =>
    predictQuote(
      { ...baselineNonVision, vision_type: row.type, vision_systems_count: row.count },
      dataset,
    ),
  ),
);
const perRowPreds: QuotePrediction[] = [];
const failedRowIndices: number[] = [];
for (const [i, r] of perRowResults.entries()) {
  if (r.status === "fulfilled") perRowPreds.push(r.value);
  else failedRowIndices.push(i);
}
// Caller can read failedRowIndices off the result and toast accordingly.
```

A regression test should confirm that one rejected per-row predict produces a partial estimate (with the surviving rows' deltas) rather than a top-level throw.

## Info

### IN-01: `dropdowns.vision_type` is computed in three pages but no longer consumed

**File:** `frontend/src/pages/demo/MachineLearningQuoteTool.tsx:51`, `frontend/src/pages/demo/compare/ComparisonQuote.tsx:49`, `frontend/src/pages/demo/CompareFindSimilarTab.tsx:37`
**Issue:** Each page's `buildDropdowns` still includes `vision_type: uniqueStrings(pool, "vision_type")`, but the `<VisionRowsField>` component in `frontend/src/pages/single-quote/VisionRowsField.tsx:59` hard-codes `[...VISION_TYPES]` (`["2D", "3D"]`) for its Select rather than reading `dropdowns.vision_type`. The dropdown values are dead computation across three pages. `DropdownOptions["vision_type"]` (api/types.ts:96) is now a vestigial field.

**Why it matters:** Dead code drift; nothing breaks, but a future maintainer looking at `dropdowns.vision_type` will be unsure whether it's used (the field remains on `DropdownOptions`).

**Fix:** Drop `vision_type` from `buildDropdowns` in all three pages. Optionally remove `vision_type` from the `DropdownOptions` type in api/types.ts. Keeping the trim minimal in this phase is fine — flag a follow-up cleanup task.

### IN-02: `Number(restoreVersion)` in QuoteForm silently degrades to `NaN`-on-find-not-found

**File:** `frontend/src/pages/single-quote/QuoteForm.tsx:48-53`
**Issue:** `Number(restoreVersion)` returns `NaN` for non-numeric input. `saved.versions.find((v) => v.version === NaN)` returns undefined, so the code falls through to `saved.versions[saved.versions.length - 1]`. Result: `?restoreVersion=foo` silently restores the latest version instead of erroring. Users may not notice they're not actually getting the version they asked for.

The parent pages `MachineLearningQuoteTool.tsx:67-74` and `ComparisonQuote.tsx:66-73` *do* validate `restoreVersionParam` via `Number.isInteger(parsedRestoreVersion) && parsedRestoreVersion > 0`, but that validation guards only the SaveQuoteButton's `restoredFromVersion` prop, not the form-reset path here.

**Why it matters:** Pre-Phase-6 issue (carried forward), so not strictly Phase 6. Documented for future hardening — Phase 6 round-trip tests don't exercise malformed `restoreVersion` because the malformed-URL test in `MachineLearningQuoteTool.test.tsx` only covers the save path.

**Fix:** Apply the same `Number.isInteger() && > 0` guard in QuoteForm.tsx's URL parsing, and either error visibly or fall through with a toast saying "Couldn't find version N — showing latest."

### IN-03: `formInputRecord` cast in `buildPerVisionContributions` is double-cast through `unknown`

**File:** `frontend/src/demo/multiVisionAggregator.ts:217`
**Issue:** `const formInputRecord = formInput as unknown as Record<string, unknown>;` is a double-cast that masks a type-system gap: `humanFeatureLabel`'s second parameter is typed `Record<string, unknown>` (featureLabels.ts:73) but receives a `QuoteInput`. The cast through `unknown` defeats type-checking for any field-name mismatch.

`humanFeatureLabel` doesn't actually use the input parameter (its name is `_input`, leading underscore). The cast exists only to satisfy the function signature.

**Why it matters:** Style debt. Removing `_input` from `humanFeatureLabel`'s signature, or widening it to `Record<string, unknown> | QuoteInput`, would let callers pass `formInput` directly without the cast.

**Fix:** Either delete the unused parameter from `humanFeatureLabel` (it's been unused since at least Phase 4 — the tests don't exercise it) and update the call site, or change the cast to a single `formInput as Record<string, unknown>` since `QuoteInput` is structurally compatible.

### IN-04: Auto-suggested name truncation can produce a vision label of just "…"

**File:** `frontend/src/lib/savedQuoteSchema.ts:223-243`
**Issue:** When `truncatedLen = Math.max(0, visionLabel.length - overrun - 1)` evaluates to 0 (extreme overrun case), `truncatedVision = visionLabel.slice(0, 0) + "…" = "…"`. The final candidate is `"{bucket} {hours} · … · {date}"` — fully data-loss for the vision label. The truncation succeeds at 80 chars but the vision content is gone with no visible signal that it was even there.

This is theoretical for typical usage (would require a project name with hours like "1,234,567h" plus "ME+EE" bucket plus 10-digit date, leaving zero room for vision label) but the test `it("truncates to <= 80 chars even with many rows")` doesn't assert anything about *what* survives the truncation — only that the total length stays under 80.

**Why it matters:** Edge-case of plumbing — defensive but not broken. The auto-name is a default the user can edit before saving, so total data loss is recoverable.

**Fix:** Either guarantee a minimum vision-label content (e.g., `Math.max(8, ...)` so at least the first 8 chars survive) or assert a richer post-truncation structure in the test. Low priority.

### IN-05: `formValues.visionRows ?? []` guard is unreachable per zod schema

**File:** `frontend/src/demo/multiVisionAggregator.ts:83`
**Issue:** `const rows = formValues.visionRows ?? []` defends against undefined, but `quoteFormSchema.visionRows` is `z.array(VisionRowSchema)` (no `.optional()`) and `quoteFormDefaults.visionRows = []`. If `formValues` is the output of zod parse (which it always is in the demo flow), `visionRows` is always an array. The `?? []` is dead.

The same defensive guard appears in `savedQuoteSchema.ts:230` (`!values.visionRows || values.visionRows.length === 0`) — also redundant given the schema guarantee.

**Why it matters:** Dead defensive code is fine, but it can mask a future schema change that *does* make `visionRows` optional. Better to either trust the schema or document why the guard is here.

**Fix:** Drop the `?? []` (and the equivalent `!values.visionRows ||` in savedQuoteSchema.ts) or add a comment: `// defense-in-depth — schema guarantees array but caller may pass partial form state`.

### IN-06: D-04 input-for-matching only forwards `visionRows[0]?.type`, dropping all other rows from similarity ranking

**File:** `frontend/src/pages/demo/MachineLearningQuoteTool.tsx:139-143`, `frontend/src/pages/demo/compare/ComparisonQuote.tsx:137-141`
**Issue:** D-04 acknowledges this limitation: similar-projects matching reads `visionRows[0]?.type` (just the first row's type, ignoring rows 2..N) and `sum(row.count)` for the total. A user with `[{2D, 1}, {3D, 2}]` has identical "similarity input" as a user with `[{2D, 3}]` even though the actual project mix is different.

**Why it matters:** Documented and intentional — a true vision-set similarity metric is deferred to v3 per CONTEXT.md D-16/deferred. Recording for visibility because the comment in the page handlers describes the limitation but doesn't link the v3 follow-up.

**Fix:** Add a v3 tracker comment or a TODO referencing the deferred-v3 line in CONTEXT.md so the followup is discoverable from grep:

```ts
// D-04 / deferred-v3: true vision-set similarity (multi-row aware) is a v3 task.
//                    See .planning/phases/06-multi-vision/06-CONTEXT.md "deferred".
```

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
