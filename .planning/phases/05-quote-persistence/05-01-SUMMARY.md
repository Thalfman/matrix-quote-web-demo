---
phase: 05-quote-persistence
plan: 01
subsystem: frontend/lib
tags: [persistence, indexeddb, schema, broadcast-channel, zod, tdd]
requires:
  - frontend/src/pages/single-quote/schema.ts (quoteFormSchema, transformToQuoteInput, QuoteFormValues)
  - frontend/src/api/types.ts (QuoteInput type-only)
  - frontend/src/demo/quoteResult.ts (UnifiedQuoteResult shape)
provides:
  - frontend/src/lib/savedQuoteSchema.ts (SavedQuote / QuoteVersion / WorkflowStatus / Workspace + zod schemas + transformToFormValues + buildAutoSuggestedName + deriveSalesBucket + STATUS_CYCLE)
  - frontend/src/lib/quoteStorage.ts (ensureDbReady / listSavedQuotes / getSavedQuote / saveSavedQuote / deleteSavedQuote / getVersions / setStatus / restoreVersion / subscribe + QUOTE_DB_NAME / QUOTE_STORE_NAME / QUOTE_DB_VERSION / BROADCAST_CHANNEL_NAME)
affects:
  - frontend/package.json (added idb@^8.0.3, fake-indexeddb@^6.2.5)
tech-stack:
  added:
    - idb@^8.0.3 (typed IndexedDB wrapper)
    - fake-indexeddb@^6.2.5 (devDependency — in-memory IDB for vitest)
  patterns:
    - Module-level singleton (dbPromise + listeners + channel) — mirrors pyodideClient.ts:78-86
    - Lazy bootstrap (ensureDbReady idempotent) — mirrors ensurePyodideReady:290-299
    - subscribe()/unsubscribe pattern — mirrors pyodideClient subscribe:91-100
    - vi.useFakeTimers({ toFake: ['Date'] }) — Date-only fake so fake-indexeddb scheduler stays alive
    - new IDBFactory() per beforeEach + vi.resetModules() — clean module + DB state per test
key-files:
  created:
    - frontend/src/lib/savedQuoteSchema.ts (260 lines)
    - frontend/src/lib/savedQuoteSchema.test.ts (320 lines, 26 tests)
    - frontend/src/lib/quoteStorage.ts (300 lines)
    - frontend/src/lib/quoteStorage.test.ts (470 lines, 21 tests)
  modified:
    - frontend/package.json (deps)
    - frontend/package-lock.json (deps)
decisions:
  - D-01..D-19 honored verbatim from 05-CONTEXT.md
  - schemaVersion: 1 literal at zod level — Phase 6/7 forward-compat via schema bump (D-18)
  - .passthrough() at every nesting level of unifiedQuoteResultSchema — W8 storage fidelity
  - Materials cost float drift in inverse round-trip handled with 1e-6 tolerance (test-side, not source rounding)
metrics:
  duration_minutes: 15
  completed_date: 2026-05-05
  task_count: 2
  file_count_created: 4
  file_count_modified: 2
  commit_count: 5
  test_count_added: 47
  test_count_pass: 47
---

# Phase 5 Plan 01: Saved-Quote Schema + IndexedDB Storage — Summary

Built the data-layer Phase 5 stands on: a typed IndexedDB persistence module
(`quoteStorage.ts`) plus its zod-validated schema (`savedQuoteSchema.ts`),
with cross-tab `BroadcastChannel('matrix-quotes')` and 47 vitest cases that
go all the way through fake-indexeddb. Wave 2/3 builds against this contract
unchanged.

## Objective

Wave 1 contract for Phase 5: every other plan in this phase (the hook, the
modals, the routes) consumes this module. The data layer must be rock-solid
and frozen by the end of Wave 1.

Output:

- `frontend/src/lib/savedQuoteSchema.ts` — types + zod schema + `transformToFormValues` (inverse of `transformToQuoteInput`)
- `frontend/src/lib/quoteStorage.ts` — `openDb`, `listSavedQuotes`, `getSavedQuote`, `saveSavedQuote`, `deleteSavedQuote`, `getVersions`, `setStatus`, `restoreVersion`, `subscribe`
- Co-located tests for both.

## Deliverables

### Created

| Path                                            | Purpose                                                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/lib/savedQuoteSchema.ts`          | `SavedQuote` / `QuoteVersion` / `WorkflowStatus` / `Workspace` types and zod schemas; `transformToFormValues` inverse; `buildAutoSuggestedName`; `deriveSalesBucket`; `STATUS_CYCLE`. |
| `frontend/src/lib/savedQuoteSchema.test.ts`     | 26 tests — schema parse/reject, round-trip inverse, name format, deriveSalesBucket, **W8 production-fixture passthrough fidelity**.                                                  |
| `frontend/src/lib/quoteStorage.ts`              | IndexedDB module: `ensureDbReady`, `listSavedQuotes`, `getSavedQuote`, `saveSavedQuote`, `deleteSavedQuote`, `getVersions`, `setStatus`, `restoreVersion`, `subscribe`.                |
| `frontend/src/lib/quoteStorage.test.ts`         | 21 tests — save/list/get/update/delete/setStatus/restoreVersion/subscribe/BroadcastChannel/schemaVersion-forward-compat.                                                              |

### Modified

| Path                              | Change                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `frontend/package.json`           | Added `idb@^8.0.3` (deps) and `fake-indexeddb@^6.2.5` (devDeps).                                   |
| `frontend/package-lock.json`      | Lockfile updated for the two new dependencies.                                                    |

### Public API frozen for Wave 2/3

```typescript
// from "@/lib/savedQuoteSchema"
export type Workspace = "real" | "synthetic";
export type WorkflowStatus = "draft" | "sent" | "won" | "lost" | "revised";
export const STATUS_CYCLE: readonly WorkflowStatus[];
export interface QuoteVersion { version, savedAt, statusAtTime, formValues, unifiedResult, restoredFromVersion?, compareInputs? }
export interface SavedQuote { id, schemaVersion: 1, name, workspace, status, createdAt, updatedAt, versions, salesBucket, visionLabel, materialsCost }
export const savedQuoteSchema, quoteVersionSchema, savedQuoteNameSchema, unifiedQuoteResultSchema;
export function transformToFormValues(input: QuoteInput): QuoteFormValues;
export function buildAutoSuggestedName(values: QuoteFormValues, estimatedHours: number): string;
export function deriveSalesBucket(values: QuoteFormValues): string;

// from "@/lib/quoteStorage"
export const QUOTE_DB_NAME, QUOTE_STORE_NAME, QUOTE_DB_VERSION, BROADCAST_CHANNEL_NAME;
export type StorageEvent = { type: "save" | "delete" | "restore", id, updatedAt? };
export type StorageListener = (event: StorageEvent) => void;
export interface SaveSavedQuoteArgs { id?, name, workspace, status?, formValues, unifiedResult, compareInputs?, restoredFromVersion? }
export function ensureDbReady(): Promise<void>;
export function listSavedQuotes(): Promise<SavedQuote[]>;
export function getSavedQuote(id: string): Promise<SavedQuote | null>;
export function saveSavedQuote(args: SaveSavedQuoteArgs): Promise<SavedQuote>;
export function deleteSavedQuote(id: string): Promise<void>;
export function getVersions(id: string): Promise<QuoteVersion[]>;
export function setStatus(id: string, status: WorkflowStatus): Promise<SavedQuote>;
export function restoreVersion(id: string, version: number): Promise<{ formValues: QuoteFormValues }>;
export function subscribe(fn: StorageListener): () => void;
```

## Tasks Executed

### Task 1 — `savedQuoteSchema.ts` and tests (TDD)

- **RED** commit `38ea116`: 26 failing tests.
- **GREEN** commit `fcbc8e8`: implementation; all 26 tests pass.
- Behavior coverage: zod parse/reject (empty name, name > 80, unknown enums, schemaVersion ≠ 1, empty versions), `transformToFormValues` round-trip on defaults and a fully-populated form (with float-tolerance for `expm1∘log1p`), `Math.expm1` of `log_quoted_materials_cost`, `0/1 ↔ boolean` (`=== 1` strict comparison), `Retrofit ↔ retrofit` casing, `buildAutoSuggestedName` formatting + `No vision` fallback + `ME+EE` bucket + 80-char truncation, `deriveSalesBucket` "Quote" fallback.
- **W8 — production-fixture passthrough fidelity** (3 dedicated tests + 2 nested-passthrough tests):
  - `safeParse(productionFixture).success === true`
  - deep-equal round-trip preserves all keys
  - `.passthrough()` preserves unknown top-level fields (e.g. `futureField: "phase-6-multivision"`)
  - `.passthrough()` preserves unknown nested fields on `perCategory[*]` and `supportingMatches.items[*]`

### Task 2 — `quoteStorage.ts` and tests (TDD)

- **RED** commit `e9723c3`: 21 failing tests; added `idb` + `fake-indexeddb` deps.
- **GREEN** commit `a67e0b9`: implementation; all 21 tests pass.
- Behavior coverage:
  - `listSavedQuotes()` empty-DB returns `[]`
  - `saveSavedQuote({...})` creates v1 with UUID-v4, schemaVersion 1, status `draft`
  - `getSavedQuote(id)` after save / `getSavedQuote(missing)` returns `null`
  - **D-05 versioning**: same-input re-save → no version inflation; different-input re-save → `versions.length` becomes 2, `version === 2`
  - `listSavedQuotes()` returns DESC by `updatedAt` (timer-controlled)
  - `deleteSavedQuote(id)` hard-deletes; idempotent on missing id
  - `setStatus(id, "won")` updates status + `updatedAt`, leaves `versions` unchanged
  - `restoreVersion(id, N)` returns `formValues` without mutating DB (D-06)
  - `subscribe`: save broadcasts `{type:"save"}`, delete broadcasts `{type:"delete"}`, unsubscribe stops notifications, `BroadcastChannel.postMessage` receives the envelope
  - `ensureDbReady()` is idempotent
  - `saveSavedQuote` zod-rejects empty name and name > 80 (T-05-01)
  - `getVersions(id)` returns versions newest-LAST
  - **Restore-fork flow (D-06 follow-on)**: re-saving after `restoreVersion(1)` produces v3 with `restoredFromVersion: 1`
  - **T-05-05 schemaVersion forward-compat**: `getSavedQuote` throws on records with `schemaVersion: 2` (simulated foreign-tab future write)

### Style hygiene commit

- `4ed7b1b` — reworded an internal comment in `savedQuoteSchema.ts` ("from production" → "from the live shape") to keep the demo's jargon-guard posture (D-19) consistent even in source comments. No behavior change.

## Threats and Mitigations

| ID | Category | Disposition | Implementation |
| -- | -------- | ----------- | -------------- |
| T-05-01 | Tampering — saveSavedQuote() | mitigate | `savedQuoteSchema.parse()` on every write; `savedQuoteNameSchema` (`min(1)`, `max(80)`, `.trim()`) at the boundary. |
| T-05-02 | Information Disclosure — XSS via name | accept | This plan defines shape only; no `dangerouslySetInnerHTML` introduced (verified by grep). Downstream consumers (Plan 06–08) will render via React text nodes. |
| T-05-03 | DoS — IDB quota exhaustion | mitigate | name capped at 80 chars; per-quote payload bounded by `quoteFormSchema`; quota errors propagate as thrown `Error` to caller. |
| T-05-04 | Tampering — broadcast receiver | mitigate | Envelope is `{type, id, updatedAt}` ONLY; no payload body — receivers MUST re-read from IDB (documented in code comment). |
| T-05-05 | Spoofing — schemaVersion downgrade | mitigate | `savedQuoteSchema.parse()` on every read; `schemaVersion: z.literal(1)` rejects `2+` records. Tested explicitly. |

## Decisions Made

- **Schema-side passthrough at every nesting level** (W8 mitigation): the Wave-1 contract explicitly tolerates unknown fields on `UnifiedQuoteResult`, `perCategory[*]`, `topDrivers[*]`, `supportingMatches`, and `supportingMatches.items[*]`. This keeps Phase 6 (multi-vision) and Phase 7 (ROM) free to extend the live shape without breaking already-saved v2 quotes.
- **`vi.useFakeTimers({ toFake: ["Date"] })`** in tests: full-fake timers stalled fake-indexeddb's microtask scheduler. Fake only `Date` so `setSystemTime` controls `updatedAt` without wedging the IDB pump.
- **`new IDBFactory()` per `beforeEach`** instead of `indexedDB.deleteDatabase`: deletion races against open connections held by previous-test module state; swapping the factory plus `vi.resetModules()` is deterministic.
- **`SaveSavedQuoteArgs.unifiedResult: object`** instead of strict `UnifiedQuoteResult`: keeps the storage module decoupled from `UnifiedQuoteResult`'s evolving shape — the schema's `.passthrough()` accepts whatever Wave 2/3 hands in. Storage fidelity > strictness.
- **Float-tolerance round-trip**: `Math.expm1(Math.log1p(50000)) = 50000.000000000015`, so the populated round-trip test asserts non-cost fields field-by-field and the cost separately within `1e-6`. Source code does not round (would silently drop precision).
- **Materials cost denormalization** uses raw dollars on `SavedQuote.materialsCost` (NOT log-transformed), per UI-SPEC list-row metadata.
- **`fake-indexeddb/auto` import is test-file-local** — does NOT pollute `frontend/src/test/setup.ts`. Other tests are unaffected.

## Deviations from Plan

### Auto-fixed issues (Rules 1–3)

**1. [Rule 1 – Bug] Test fixtures used `quoteFormDefaults` empty strings that the form schema rejects on parse**
- **Found during:** Task 1 GREEN — `savedQuoteSchema.parse(makeSavedQuote())` failed because `quoteFormSchema` requires `min(1)` on `industry_segment`/`system_category`/`automation_level` and the defaults are empty placeholders.
- **Fix:** `makeFormValues()` test factory injects `"Automotive" / "Machine Tending" / "Robotic"` placeholders. The pure-default round-trip test still uses `quoteFormDefaults` directly because it only exercises `transformToFormValues`, which doesn't go through schema parse.
- **Files modified:** `frontend/src/lib/savedQuoteSchema.test.ts`
- **Commit:** `fcbc8e8`

**2. [Rule 1 – Bug] `expm1∘log1p` introduces sub-microscopic float drift**
- **Found during:** Task 1 GREEN — the populated-form round-trip test failed with `50000` vs `50000.000000000015`.
- **Fix:** Test now compares non-cost fields with `toEqual` and asserts `estimated_materials_cost` separately with `toBeCloseTo(_, 6)`. The source code does NOT round the inverse — that would silently drop precision in real data.
- **Files modified:** `frontend/src/lib/savedQuoteSchema.test.ts`
- **Commit:** `fcbc8e8`

**3. [Rule 3 – Blocking] `vi.useFakeTimers()` froze the fake-indexeddb scheduler**
- **Found during:** Task 2 GREEN — two tests (`listSavedQuotes` ordering, `setStatus` `updatedAt` bump) timed out at 5s because fake timers stopped IDB microtasks from firing.
- **Fix:** Switched to `vi.useFakeTimers({ toFake: ["Date"] })` so only `Date` is mocked while `setTimeout`/`queueMicrotask` keep running.
- **Files modified:** `frontend/src/lib/quoteStorage.test.ts`
- **Commit:** `a67e0b9`

**4. [Rule 3 – Blocking] `indexedDB.deleteDatabase` blocked on open connections held by previous-test module state**
- **Found during:** Task 2 GREEN — the original `deleteDb` `beforeEach` hung past the 10s hook timeout because previous tests' module instance still held an open IDBPDatabase.
- **Fix:** Swapped `indexedDB.deleteDatabase` for `globalThis.indexedDB = new IDBFactory()` (fake-indexeddb idiom). Combined with `vi.resetModules()`, every test starts with a fresh in-memory IDB AND a fresh module-singleton.
- **Files modified:** `frontend/src/lib/quoteStorage.test.ts`
- **Commit:** `a67e0b9`

**5. [Rule 1 – Bug] Unused `UnifiedQuoteResult` import in source after type-decoupling**
- **Found during:** Task 1 typecheck — `tsc --noEmit` flagged `UnifiedQuoteResult is declared but its value is never read.`
- **Fix:** Removed the unused type import. The schema infers its own row type via `z.infer`, and the storage module uses `Record<string, unknown> | object` for `unifiedResult` to keep decoupling.
- **Files modified:** `frontend/src/lib/savedQuoteSchema.ts`
- **Commit:** `fcbc8e8`

No architectural changes (Rule 4) were needed.

### Auth / human-action gates

None — fully autonomous build.

## Verification Results

| Check                                                                                | Result          |
| ------------------------------------------------------------------------------------ | --------------- |
| `cd frontend && npx vitest run src/lib/savedQuoteSchema.test.ts`                     | 26/26 pass      |
| `cd frontend && npx vitest run src/lib/quoteStorage.test.ts`                         | 21/21 pass      |
| `cd frontend && npm run test` (full suite)                                           | 696/696 pass    |
| `cd frontend && npm run typecheck`                                                   | exit 0          |
| `cd frontend && npm run lint`                                                        | exit 0          |
| Acceptance grep: `savedQuoteSchema`, `STATUS_CYCLE`, `unifiedQuoteResultSchema`, `transformToFormValues`, `buildAutoSuggestedName`, `Math.expm1`, `input.Retrofit === 1` exports/usages on schema | all ≥ 1   |
| Acceptance grep: `.passthrough()` count on schema                                    | 7 (≥ 4 required) |
| Acceptance grep: `dangerouslySetInnerHTML` in non-comment source lines               | 0               |
| Acceptance grep: `BroadcastChannel(BROADCAST_CHANNEL_NAME)`, `openDB(QUOTE_DB_NAME`, `createIndex("updatedAt"`/`"status"`/`"workspace"`, `crypto.randomUUID`, `savedQuoteSchema.parse`, all 5 public functions exported on storage | all ≥ 1; `savedQuoteSchema.parse` count = 3 |
| Acceptance grep: `from "@/api/"` in storage module                                   | 0 (none allowed) |

## Commits

| Hash      | Type     | Description                                                                                                  |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `38ea116` | test     | RED — savedQuoteSchema test (failing; module not found)                                                      |
| `fcbc8e8` | feat     | GREEN — savedQuoteSchema implementation; 26/26 pass                                                          |
| `e9723c3` | test     | RED — quoteStorage test + idb / fake-indexeddb deps (failing; module not found)                              |
| `a67e0b9` | feat     | GREEN — quoteStorage IndexedDB + BroadcastChannel; 21/21 pass                                                |
| `4ed7b1b` | style    | jargon-guard hygiene: rephrase one source comment to avoid the word "production"                             |

## Wave 1 Contract Status — FROZEN

Downstream Phase 5 plans may now import:

- `@/lib/savedQuoteSchema` — types, zod schemas, transform helpers
- `@/lib/quoteStorage` — IDB module, BroadcastChannel, subscribe pattern

Public surface is exactly what was specified in `<interfaces>` of `05-01-PLAN.md`. Wave 2/3 should not reach for new exports — file changes here would re-open the contract.

## Follow-ups

None blocking. For future phases:

- **Phase 6 (multi-vision)** will need to bump `savedQuoteSchema`'s `schemaVersion` literal from `1` to `2`, add a migration path in `ensureDbReady`'s `upgrade` callback, and decide whether multi-vision rows extend `formValues` or live alongside as a parallel array. The `.passthrough()` chain on `unifiedQuoteResultSchema` already protects in-flight v1 records from data loss while the migration is being authored.
- **Phase 7 (ROM mode)** has the same migration tax — schemaVersion bump + upgrade callback + decide if ROM is a flag on the existing form or a sibling form schema. The current `formValues: quoteFormSchema` line is the single point of contact for that decision.
- **`useSavedQuotes()` hook (Plan 04)** consumes `subscribe` for live-updating list state; the hook should re-read via `listSavedQuotes()` on every event (do not trust broadcast payload — T-05-04).
- **DEFERRED — none.** No out-of-scope discoveries during this plan.

## Self-Check: PASSED

- `frontend/src/lib/savedQuoteSchema.ts` — FOUND
- `frontend/src/lib/savedQuoteSchema.test.ts` — FOUND
- `frontend/src/lib/quoteStorage.ts` — FOUND
- `frontend/src/lib/quoteStorage.test.ts` — FOUND
- Commits `38ea116`, `fcbc8e8`, `e9723c3`, `a67e0b9`, `4ed7b1b` — all FOUND in `git log`
- Vitest: 47 new tests, 47/47 pass; full project suite 696/696 pass
- Typecheck + lint clean
