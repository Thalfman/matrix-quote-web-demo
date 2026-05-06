---
phase: 06-multi-vision
plan: 01
subsystem: data-layer
tags: [multi-vision, schema, migration, indexeddb, persistence]
requires: []
provides:
  - VisionRowSchema (source of truth for vision row shape)
  - VisionRow type
  - VISION_TYPES const
  - quoteFormSchema.visionRows: VisionRow[] (replaces flat vision_type/vision_systems_count)
  - savedQuoteSchema schemaVersion: 2
  - QUOTE_DB_VERSION: 2 with v1->v2 cursor-walk migration on upgrade
  - migrateRecordV1ToV2 (idempotent, exported, called on read defensively)
affects:
  - frontend/src/pages/single-quote/QuoteForm.tsx (06-03 will replace flat picker)
  - frontend/src/pages/demo/MachineLearningQuoteTool.tsx (06-04 will swap to aggregator)
  - frontend/src/pages/demo/compare/ComparisonQuote.tsx (06-04)
  - frontend/src/components/quote/QuoteResultPanel.tsx (06-04)
  - frontend/src/demo/realProjects.ts (06-03 page-handler shim)
tech-stack:
  added: []
  patterns:
    - "z.array(z.object(...)) on form schema (first form-side array)"
    - "IndexedDB cursor-walk migration via async upgrade(db, oldVersion, _new, tx)"
    - "Idempotent on-read defensive migrator wrapping savedQuoteSchema.parse"
key-files:
  created:
    - frontend/src/lib/__tests__/quoteStorage.migration.test.ts
    - frontend/src/lib/__tests__/savedQuoteSchema.migration.test.ts
  modified:
    - frontend/src/pages/single-quote/schema.ts
    - frontend/src/lib/savedQuoteSchema.ts
    - frontend/src/lib/quoteStorage.ts
decisions:
  - "Empty visionRows array is the new 'no vision systems' representation (D-02)"
  - "Hard cutover schemaVersion 1 -> 2 with cursor walk plus on-read defense (D-12, D-13)"
  - "Strip legacy vision_type and vision_systems_count keys from migrated records (D-13 clean cutover)"
  - "Brand-new saves write schemaVersion: 2 (the literal-2 zod schema enforces it)"
  - "transformToFormValues synthesizes visionRows from legacy QuoteInput shape using same rule as IDB migrator"
metrics:
  duration: ~30 minutes
  completed_date: 2026-05-05
  tasks_completed: 5
  files_modified: 5
  tests_added: 15
---

# Phase 6 Plan 01: Multi-vision schema + IndexedDB migration Summary

Bumped persisted quote schema from v1 to v2 with a multi-vision row shape (`{type, count, label?}`), defined `VisionRowSchema` as the source of truth, and wired a hard-cutover IndexedDB migration with `onupgradeneeded` cursor walk plus a defensive on-read migrator. Data-layer foundation ready for Plans 06-02 (aggregator), 06-03 (form picker), and 06-04 (wiring + result panel).

## What Shipped

### Schema layer (Task 1, commit `66334d3`)
- Exported `VISION_TYPES = ["2D", "3D"]`, `VisionType`, `VisionRowSchema`, `VisionRow` from `frontend/src/pages/single-quote/schema.ts`.
- Replaced `quoteFormSchema.vision_type` + `vision_systems_count` with `visionRows: z.array(VisionRowSchema)`.
- Replaced the same two keys in `quoteFormDefaults` with `visionRows: []`.
- Removed the same two keys from `transformToQuoteInput` — the aggregator (06-02) overlays per-call `vision_type` + `vision_systems_count` for each predict invocation.

### Saved-quote schema (Task 2, commit `b13fe19`)
- `schemaVersion: z.literal(1)` → `z.literal(2)` (executes Phase 5 D-18 reserved slot).
- `buildAutoSuggestedName` derives the vision label from `visionRows`:
  - Empty: `"No vision"`
  - Single: `"2D×2"`
  - Multi: `"2D×2+3D×1"`
- `transformToFormValues` synthesizes `visionRows` from any legacy `QuoteInput` whose flat `vision_type` is `"2D"|"3D"` — uses the same `Math.max(1, count)` clamp rule as the IDB migrator. Function signature unchanged.
- `quoteFormSchema` is imported once at the top, so the visionRows field propagates automatically into `quoteVersionSchema.formValues`.

### IndexedDB migration (Task 3, commit `a433b1c`)
- `QUOTE_DB_VERSION = 1` → `2`.
- Exported `migrateRecordV1ToV2(rec: unknown): unknown`. Idempotent — short-circuits on already-v2 records, leaves unknown schemaVersion untouched (forward-compat for Phase 7).
- Private `migrateFormValuesV1ToV2` rule (D-13 verbatim):
  - `vision_type === "None"` (any count) → `visionRows: []`
  - `vision_type === ""` → `visionRows: []`
  - `vision_type === "2D" | "3D"` → `[{type, count: Math.max(1, count)}]`
  - Strips legacy `vision_type` + `vision_systems_count` keys (clean cutover).
- `ensureDbReady`'s upgrade callback now `async upgrade(db, oldVersion, _newVersion, tx)`. New `if (oldVersion < 2)` branch walks every record via `tx.objectStore(...).openCursor()` and rewrites in-place.
- `getSavedQuote` and `listSavedQuotes` both call `migrateRecordV1ToV2(rec)` defensively before zod parse (covers tabs open across the upgrade window).
- `deriveVisionLabel` (helper inside `quoteStorage.ts`) updated to derive from `visionRows` — Rule 1 fix because the old reader of `values.vision_type` would have broken `quoteStorage.ts`'s own typecheck.
- Brand-new quotes now write `schemaVersion: 2`.

### Tests (Task 4 commit `ca30dae`, Task 5 commit `546acd1`)
- `frontend/src/lib/__tests__/quoteStorage.migration.test.ts` (10 tests): 7 pure-function migration cases (None+0, None+5 degenerate, 2D+2, 3D+0 count clamp, key-stripping, idempotency, forward-compat unknown version), 2 defensive on-read cases (`listSavedQuotes` + `getSavedQuote` both surface migrated v2 records), 1 onupgradeneeded cursor-walk lifecycle test (open v1, write 2 records of mixed types, reopen v2, verify in-place rewrite + key strip).
- `frontend/src/lib/__tests__/savedQuoteSchema.migration.test.ts` (5 tests): empty / single-row / multi-row / 80-char truncation / no-ML-jargon assertions on `buildAutoSuggestedName`.
- All 15 tests pass against the modified files (run via `npx vitest run` on the two test files).

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/pages/single-quote/schema.ts` | `VisionRowSchema` + `VISION_TYPES` exports; `visionRows` on `quoteFormSchema` and `quoteFormDefaults`; `transformToQuoteInput` no longer copies flat vision fields. |
| `frontend/src/lib/savedQuoteSchema.ts` | `schemaVersion: z.literal(2)`; `buildAutoSuggestedName` and `transformToFormValues` rewritten for visionRows. |
| `frontend/src/lib/quoteStorage.ts` | `QUOTE_DB_VERSION = 2`; exported `migrateRecordV1ToV2`; cursor-walk migration in `onupgradeneeded`; defensive on-read migration in `getSavedQuote` and `listSavedQuotes`; `deriveVisionLabel` rewrite; brand-new saves write `schemaVersion: 2`. |
| `frontend/src/lib/__tests__/quoteStorage.migration.test.ts` | NEW — 10 migration tests. |
| `frontend/src/lib/__tests__/savedQuoteSchema.migration.test.ts` | NEW — 5 buildAutoSuggestedName tests. |

## Tests Added

| Test File | Count | What it covers |
|-----------|-------|----------------|
| `quoteStorage.migration.test.ts` | 10 | Pure-function migration rule, defensive on-read, real cursor-walk lifecycle |
| `savedQuoteSchema.migration.test.ts` | 5 | buildAutoSuggestedName derivation, truncation, jargon-clean output |
| **Total** | **15** | (Plan target: 14 — exceeded by one because the defensive-on-read behavior in the plan was split across `listSavedQuotes` and `getSavedQuote` as separate `it` blocks.) |

## Dead Reads of vision_type / vision_systems_count Left for Downstream Plans

By design (per plan and CONTEXT.md D-04), Task 1's deletion of the flat fields breaks downstream consumers. The TS build will error in OTHER files until 06-02 / 06-03 / 06-04 land. Locations:

- `frontend/src/pages/single-quote/QuoteForm.tsx:181, 197` — picker rendering. **Plan 06-03 replaces with `<VisionRowsField />`.**
- `frontend/src/pages/demo/MachineLearningQuoteTool.tsx::handleSubmit` — currently calls `transformToQuoteInput` and `predictQuote` directly. **Plan 06-04 swaps to `aggregateMultiVisionEstimate(...)` from 06-02.**
- `frontend/src/pages/demo/compare/ComparisonQuote.tsx::handleSubmit` — same. **Plan 06-04.**
- `frontend/src/components/quote/QuoteResultPanel.tsx:235, 240` — inputs-echo block ("Vision type" / "Vision systems count" rows). **Plan 06-04 replaces with single "Vision systems" row driven by `formatVisionSystems(visionRows)`.**
- `frontend/src/demo/realProjects.ts::recordToQuoteInput` — legacy-compat for `nearestNeighbor.ts` distance reads `QUOTE_NUM_FIELDS`/`QUOTE_CAT_FIELDS` which include `"vision_type"` and `"vision_systems_count"`. **Plan 06-03 introduces the page-handler shadow-input shim** so similar-projects matching uses the visible-vision shape (`vision_type = visionRows[0]?.type ?? "None"`, `vision_systems_count = sum(row.count)`).

These are intentional. Tests in this plan run in isolation against the modified files only and do not depend on global typecheck.

## fake-indexeddb Confirmation

`fake-indexeddb` was already present in `frontend/package.json` devDependencies at version `^6.2.5` (added in Phase 5). No new dependency install was required. The migration test imports `fake-indexeddb/auto` and instantiates a fresh `IDBFactory` per test (in `beforeEach`) so DB version state doesn't bleed between tests — necessary because the cursor-walk test reopens the DB at version 1 after earlier tests created it at version 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated `deriveVisionLabel` in `quoteStorage.ts`**
- **Found during:** Task 3 (after Task 1's deletions cascaded).
- **Issue:** `deriveVisionLabel(values: QuoteFormValues)` read `values.vision_type` / `values.vision_type === "None"`. With Task 1 stripping those keys, this would have errored *inside `quoteStorage.ts` itself* — and Task 3's acceptance criteria require `tsc --noEmit` clean for `quoteStorage.ts`.
- **Fix:** Rewrote to derive from `values.visionRows`: empty array → `"No vision"`, otherwise `r.type×r.count` joined by `+`. Mirrors the new `buildAutoSuggestedName` derivation.
- **Files modified:** `frontend/src/lib/quoteStorage.ts` (one function body).
- **Commit:** `a433b1c` (folded into Task 3's commit).

**2. [Rule 1 - Bug] Brand-new save records write `schemaVersion: 2`**
- **Found during:** Task 3 implementation.
- **Issue:** `saveSavedQuote`'s "brand-new quote" branch hardcoded `schemaVersion: 1`. After Task 2's literal bump, savedQuoteSchema.parse would reject the record.
- **Fix:** `schemaVersion: 1` → `schemaVersion: 2` on the new-record branch.
- **Files modified:** `frontend/src/lib/quoteStorage.ts`.
- **Commit:** `a433b1c`.

### Test infrastructure tweak

`beforeEach` in `quoteStorage.migration.test.ts` reinstantiates `globalThis.indexedDB = new IDBFactory()` so each test gets a fresh fake-IDB. The plan's test skeleton noted this concern in a comment but did not show the explicit reset — added it as a one-liner so the cursor-walk test (which must reopen at version 1) doesn't VersionError after earlier tests created the DB at version 2.

No architectural decisions taken. No checkpoint required.

## Acceptance Criteria — All Met

- ✅ `VisionRowSchema`, `VisionRow`, `VISION_TYPES`, `visionRows: z.array(VisionRowSchema)` all present in `schema.ts` exactly as specified.
- ✅ Zero non-comment occurrences of `vision_type:` / `vision_systems_count:` in `schema.ts`.
- ✅ `schemaVersion: z.literal(2)` exactly once in `savedQuoteSchema.ts`.
- ✅ `QUOTE_DB_VERSION = 2`, `migrateRecordV1ToV2` exported once, `migrateFormValuesV1ToV2` defined once, `if (oldVersion < 2)` once, `migrateRecordV1ToV2(` called 4 times (export defn + upgrade + listSavedQuotes + getSavedQuote).
- ✅ Upgrade callback signature is `async upgrade(db, oldVersion, _newVersion, tx)`.
- ✅ All 15 tests pass — `npx vitest run src/lib/__tests__/quoteStorage.migration.test.ts src/lib/__tests__/savedQuoteSchema.migration.test.ts` exits 0.
- ✅ `fake-indexeddb` already in `package.json` devDependencies.

## Self-Check: PASSED

- Files created exist: `frontend/src/lib/__tests__/quoteStorage.migration.test.ts` ✅, `frontend/src/lib/__tests__/savedQuoteSchema.migration.test.ts` ✅.
- Commits exist: `66334d3` (Task 1), `b13fe19` (Task 2), `a433b1c` (Task 3), `ca30dae` (Task 4), `546acd1` (Task 5) — verifiable via `git log --oneline | grep '06-01'`.
- All 15 tests pass against the modified files.
