---
phase: 05-quote-persistence
plan: 04
subsystem: ui
tags: [react, tanstack-query, indexeddb, broadcastchannel, hooks, vitest]

# Dependency graph
requires:
  - phase: 05-quote-persistence
    provides: "Plan 05-01 — quoteStorage IndexedDB module + savedQuoteSchema (the API this hook layer wraps)"
provides:
  - "useSavedQuotes() — list query (BroadcastChannel-invalidated)"
  - "useSavedQuote(id) — single-record query (disabled when id is undefined)"
  - "useSaveQuote / useDeleteQuote / useSetStatus — mutations with cache invalidation"
  - "useRestoreVersion — non-destructive D-06 fork; returns formValues for the form"
  - "QUOTES_QUERY_KEY public constant for direct consumer invalidation"
  - "T-05-09 mitigation in code: BroadcastChannel handler ignores payload, re-reads via validated quoteStorage path"
affects: [05-05, 05-06, 05-07, 05-08, 05-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hook layer mirroring frontend/src/demo/realProjects.ts useQuery shape (queryKey + staleTime: Infinity + queryFn → storage call)"
    - "Cross-tab cache invalidation via storage.subscribe() inside a useEffect — pattern Wave 2/3 list/detail pages can rely on without re-implementing"
    - "Hoisted vi.hoisted() block keeps mock state reachable from inside vi.mock factory (vi.mock is hoisted above top-level consts)"

key-files:
  created:
    - "frontend/src/hooks/useSavedQuotes.ts"
    - "frontend/src/hooks/useSavedQuotes.test.tsx"
  modified: []

key-decisions:
  - "Hook layer is stateless wrapper — every read goes through quoteStorage, no in-hook cache beyond TanStack Query's"
  - "Restore mutation does NOT invalidate cache (D-06 non-destructive — record is unchanged until next save)"
  - "Delete invalidates the umbrella ['quotes'] key, covering both list and detail queries in one call"
  - "Hoisted-mock test pattern formalized for future hook tests that need to capture a subscriber"

patterns-established:
  - "Pattern: TanStack Query namespacing via top-level prefix — ['demo', ...] for read-only static assets, ['quotes', ...] for IDB-backed mutable saved quotes"
  - "Pattern: cross-tab sync = subscribe + invalidate, never accept payload as state (T-05-04/T-05-09 in code)"
  - "Pattern: hoisted vi.hoisted block + destructure for mocked module state in vitest"

requirements-completed: [PERSIST-01, PERSIST-02, PERSIST-04]

# Metrics
duration: 7min
completed: 2026-05-05
---

# Phase 5 Plan 4: useSavedQuotes Hooks Summary

**TanStack Query hook bundle (six hooks) over the Plan 01 quoteStorage IndexedDB module, with cross-tab cache invalidation via BroadcastChannel subscribe — never trusting payload bodies (T-05-09).**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-05T21:28:23Z
- **Completed:** 2026-05-05T21:35:21Z
- **Tasks:** 1 of 1 (TDD: RED → GREEN, no REFACTOR needed)
- **Files modified:** 2 created (`useSavedQuotes.ts`, `useSavedQuotes.test.tsx`)

## Accomplishments

- Six exported hooks: `useSavedQuotes`, `useSavedQuote`, `useSaveQuote`, `useDeleteQuote`, `useSetStatus`, `useRestoreVersion`. Plus `QUOTES_QUERY_KEY` constant for consumer-side invalidation.
- BroadcastChannel sync wired through `quoteStorage.subscribe()` inside a `useEffect`; the handler invokes `qc.invalidateQueries(["quotes"])` and reads no fields from the event body — T-05-09 mitigation enforced in code.
- Mutation hooks invalidate at the right granularity:
  - Save → `["quotes", "all"]` AND `["quotes", saved.id]`
  - Delete → `["quotes"]` umbrella (covers both)
  - SetStatus → `["quotes", "all"]` AND `["quotes", saved.id]`
  - RestoreVersion → no invalidation (D-06 non-destructive; commit happens on next save)
- 12 tests across 3 describe blocks; all green. Full suite still 86 files / 746 tests passing.

## Task Commits

Each task was committed atomically (TDD pattern):

1. **Task 1 RED: failing test** — `46894b7` (`test(05-04): add failing test for useSavedQuotes (RED)`)
2. **Task 1 GREEN: implementation** — `ed64cc8` (`feat(05-04): implement useSavedQuotes hook bundle (GREEN)`)

No REFACTOR commit — the GREEN code already mirrors the established realProjects.ts shape and required no cleanup.

## Files Created/Modified

- **`frontend/src/hooks/useSavedQuotes.ts`** (created, 158 LOC) — six TanStack Query hooks + `QUOTES_QUERY_KEY` export. Imports only from `@/lib/quoteStorage` and `@/lib/savedQuoteSchema` types. No `@/api/` imports (per ARCHITECTURE.md anti-pattern).
- **`frontend/src/hooks/useSavedQuotes.test.tsx`** (created, 391 LOC) — 12 tests covering: empty list, populated list, query-key contract, null record, disabled-when-id-undefined, save mutation, delete mutation, setStatus mutation, restoreVersion return value, subscribe/unsubscribe lifecycle, save broadcast invalidates list, delete broadcast invalidates list.

## Decisions Made

- **Mock at module level via `vi.hoisted` + destructure.** The first GREEN attempt failed because `vi.mock` is hoisted above top-level `const mockListSavedQuotes = vi.fn()`, leaving the mock factory referencing an uninitialised binding. The fix: declare all mocks inside a `vi.hoisted()` block (also hoisted) and destructure for ergonomic access. Pattern is documented in the test file's preamble.
- **Restore mutation skips invalidation.** D-06 specifies restore is a non-destructive fork — the underlying record is unchanged until `saveSavedQuote` is called with `restoredFromVersion: N`. Invalidating here would refetch identical data and give the user a misleading "something happened" signal in the UI.
- **Delete uses the umbrella `["quotes"]` key.** A delete kills both list and detail concerns — invalidating `["quotes"]` (the parent) hits both `["quotes", "all"]` and `["quotes", id]` queries in one call. Save and setStatus invalidate the two specific keys directly because they need to refresh both anyway and explicit is clearer.
- **No HTTP imports.** Followed CONTEXT.md D-01 / ARCHITECTURE.md anti-pattern — the hook layer talks to `@/lib/quoteStorage` only. Verified via `grep "from \"@/api/\""` returning 0.

## Deviations from Plan

None — plan executed exactly as written. The plan body itself contained the full code skeleton; this execution lifted it verbatim with two non-substantive variations:

1. The test file was given a `vi.hoisted` block to satisfy vitest's hoisting rules. The plan's example test code did not include this; the literal copy fails to compile. The fix is mechanical and does not change any assertion or mocked behavior.
2. The delete-broadcast test was reframed to use `mockResolvedValue` (default) rather than `mockResolvedValueOnce` so the second refetch sees `[]` reliably regardless of which order vitest resolves the queued promises.

Both adjustments are test-file plumbing only. Implementation file (`useSavedQuotes.ts`) is byte-equivalent to the plan's `<action>` block in semantics.

## Issues Encountered

- **vitest `vi.mock` hoisting trap.** First GREEN run failed with `Cannot access 'mockListSavedQuotes' before initialization` because `vi.mock` is hoisted above top-level `const`. Solved by switching to `vi.hoisted({...})` and destructuring. Subsequent test failure was the delete-broadcast test consuming `mockResolvedValueOnce` faster than expected; resolved by switching to default `mockResolvedValue`.
- **Worktree was missing Plan 01/02 deliverables.** Worktree was created from an older commit. Resolved by `git merge feat/05-quote-persistence` to bring `quoteStorage.ts` + `savedQuoteSchema.ts` into the worktree (single fast-forward, no conflicts).

## User Setup Required

None — no external services, no environment variables, no dashboard configuration. The hooks operate purely against the in-browser IndexedDB (`matrix-quotes`) opened by Plan 01's `quoteStorage` module.

## Next Phase Readiness

- **Plan 05-05 (My Quotes list page)** can now consume `useSavedQuotes()` directly — list rendering + cross-tab sync are wired.
- **Plan 05-06 (Save dialog)** can call `useSaveQuote().mutateAsync(...)` and the list will refresh automatically in this and other open tabs.
- **Plan 05-07 (Detail/edit page)** can pair `useSavedQuote(id)` with `useSetStatus`, `useRestoreVersion`, and `useSaveQuote` for the full lifecycle.
- **Plan 05-08 (Delete modal)** uses `useDeleteQuote().mutateAsync(id)` and the list invalidates automatically.
- **Plan 05-09 (Cross-cutting tests)** has a clean hook surface to mock against; existing test pattern (`vi.hoisted` + module mock) is reusable.

## Self-Check: PASSED

- [x] `frontend/src/hooks/useSavedQuotes.ts` exists (158 LOC, 6 hooks + QUOTES_QUERY_KEY)
- [x] `frontend/src/hooks/useSavedQuotes.test.tsx` exists (391 LOC, 12 tests)
- [x] Commit `46894b7` (RED) found in git log
- [x] Commit `ed64cc8` (GREEN) found in git log
- [x] All acceptance criteria from plan grep checks pass:
  - `export function useSavedQuotes` ≥ 1 (1 found)
  - `export function useSavedQuote` ≥ 1 (2 — useSavedQuotes + useSavedQuote both match)
  - `export function useSaveQuote` ≥ 1 (1)
  - `export function useDeleteQuote` ≥ 1 (1)
  - `export function useSetStatus` ≥ 1 (1)
  - `export function useRestoreVersion` ≥ 1 (1)
  - `export const QUOTES_QUERY_KEY` ≥ 1 (1)
  - `subscribe(` ≥ 1 (1)
  - `invalidateQueries` ≥ 4 (7)
  - `from "@/lib/quoteStorage"` ≥ 1 (1)
  - `from "@/api/"` == 0 (0)
- [x] `npx vitest run src/hooks/useSavedQuotes.test.tsx` — 12/12 tests pass
- [x] `npm run typecheck` — clean
- [x] `npm run lint` — clean (0 warnings, max-warnings 0)
- [x] Full suite `npx vitest run` — 86/86 files, 746/746 tests pass

---
*Phase: 05-quote-persistence*
*Plan: 04*
*Completed: 2026-05-05*
