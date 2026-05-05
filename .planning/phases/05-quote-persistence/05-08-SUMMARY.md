---
phase: 05-quote-persistence
plan: 08
subsystem: ui

tags:
  - react
  - react-router
  - tanstack-query
  - saved-quotes
  - workflow-status
  - version-history

# Dependency graph
requires:
  - phase: 05-quote-persistence
    provides: |
      Plan 02 (StatusChip, WorkspacePill), Plan 03 (VersionHistoryList),
      Plan 04 (useSavedQuote, useSetStatus, useRestoreVersion, useDeleteQuote),
      Plan 05 (DeleteQuoteModal), and the savedQuoteSchema + quoteStorage
      from Plan 01.
provides:
  - "<SavedQuotePage /> route component for /quotes/:id"
  - "Workspace-aware Quote tool routing helper (real -> /compare/quote, synthetic -> /ml/quote)"
  - "Restore-version flow that ends in navigate(?fromQuote=&restoreVersion=N)"
  - "Detail-page delete trigger -> DeleteQuoteModal -> /quotes redirect"
affects:
  - 05-09 (DemoApp routing wires this page in)
  - phase 06 (multi-vision UI will live in this same detail surface)
  - phase 07 (ROM-mode hooks into the same status-chip + version-history flow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Workspace-aware URL builder (URLSearchParams) keeps real/synthetic divergence at one helper"
    - "Detail page uses STORED unifiedResult (no Pyodide re-run on open)"

key-files:
  created:
    - frontend/src/pages/quotes/SavedQuotePage.tsx
    - frontend/src/pages/quotes/SavedQuotePage.test.tsx
  modified: []

key-decisions:
  - "QuoteResultPanel is mocked in the SavedQuotePage test to keep the test isolated from glossary/Tooltip wiring; the page itself uses the real component."
  - "Latest version is read as data.versions[length-1] (storage convention: newest appended LAST)."
  - "Restore mutation runs first, then navigate — so any future restore-side cache update lands before the URL rehydration kicks in."
  - "Test uses mockReturnValue (not Once) for delete-flow tests because the modal-open state change re-renders and re-calls useSavedQuote."

patterns-established:
  - "Two-column 1fr/320px grid for detail pages with a sidebar (lg:grid-cols-[minmax(0,1fr)_320px])"
  - "Detail-page delete uses inline button + modal (not menu); confirms via DeleteQuoteModal scaffold"

requirements-completed:
  - PERSIST-03
  - PERSIST-04
  - PERSIST-05
  - PERSIST-06

# Metrics
duration: ~30min
completed: 2026-05-05
---

# Phase 5 Plan 8: SavedQuotePage at /quotes/:id Summary

**Detail/edit/version-history route composing all Wave 2 quote primitives (StatusChip + VersionHistoryList + DeleteQuoteModal + QuoteResultPanel) with workspace-aware Quote tool routing.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files created:** 2
- **Files modified:** 0
- **Tests added:** 18 (target was ≥12)
- **Tests passing:** 18 of 18 (100%)

## Accomplishments

- New `<SavedQuotePage />` route component renders a saved quote's name, status chip, "Open in Quote tool" CTA, full estimate result, and version-history sidebar — all from IndexedDB, no Pyodide re-run.
- Status chip is live-clickable on the detail page; advances through draft → sent → won → lost → revised → draft via `useSetStatus().mutateAsync` (D-08, D-09).
- Restore on a version row calls `useRestoreVersion` then navigates to the matching Quote tool with both `?fromQuote={id}&restoreVersion={N}` so Plan 09's QuoteForm reader can rehydrate (D-06).
- Delete button at the top-right opens `DeleteQuoteModal` with the verbatim D-17 copy; on confirm, navigates back to `/quotes`.
- Workspace routing fork: `real` → `/compare/quote?fromQuote={id}`, `synthetic` → `/ml/quote?fromQuote={id}`.
- Loading state and not-found state both handled (T-05-15: malformed/forged `:id` falls into not-found because schema parse rejects it upstream).

## Task Commits

1. **Task 1 RED: failing tests for SavedQuotePage** — `d0a3241` (test)
2. **Task 1 GREEN: implement SavedQuotePage** — `99f111c` (feat)

_Note: TDD task — RED + GREEN commits per execute-plan TDD protocol._

## Files Created/Modified

- `frontend/src/pages/quotes/SavedQuotePage.tsx` (created) — `/quotes/:id` route component composing StatusChip / VersionHistoryList / DeleteQuoteModal / QuoteResultPanel, with workspace-aware Quote tool routing helper and restore-flow navigation.
- `frontend/src/pages/quotes/SavedQuotePage.test.tsx` (created) — 18 tests covering loading, not-found, page header, status-chip cycle, Open-in-Quote-tool href fork, latest-version selection in QuoteResultPanel, version-history rendering + Restore navigation (real and synthetic), and delete flow.

## Decisions Made

- **Mocked QuoteResultPanel in tests.** The real component pulls in Radix Tooltip + glossary tables. Keeping the page test isolated from those layers focuses the test on this page's contract (latest-version selection, prop wiring) without making it brittle to recap-section markup. The page itself uses the real component at runtime.
- **`mockReturnValue` over `mockReturnValueOnce` in delete-flow tests.** Clicking "Delete quote" sets local state, which re-renders, which re-invokes `useSavedQuote(id)`. Once-only mocks return undefined on the second call and break destructuring.
- **Restore mutation is awaited before navigate.** The hook is non-destructive (returns `formValues`, no DB write) but awaiting it preserves a single sync-point so future restore-time bookkeeping (e.g., toasts, cache touches) lands before the URL changes.
- **Latest version is `data.versions[length-1]`.** Storage convention is newest-LAST in `versions[]` (per `savedQuoteSchema.ts:96`). The detail page reads the last index for the visible estimate; VersionHistoryList sorts to newest-first internally.

## Deviations from Plan

None — plan executed exactly as written. The plan's `<action>` block was followed verbatim except for two test-only adjustments documented above (mockReturnValue vs Once, dialog-scoped query for the quoteName `<strong>`).

## Issues Encountered

- **Worktree branch attribution.** A first commit attempt initially attached to the parent repo's `feat/05-quote-persistence` branch instead of the per-worktree branch because a `cd <abs-path>` to the parent had escaped the worktree. Rolled back the errant commit on the parent (only my own work; no other agent's commits affected) and re-applied on the worktree branch using absolute paths anchored at the worktree. No data loss; the test/feat commits in this summary are the canonical ones on `worktree-agent-ae32877e186301701`.
- **Worktree node_modules.** The worktree's `frontend/` had no `node_modules` directory. Created a directory junction to the parent repo's `frontend/node_modules` so `npx vitest` and `npx tsc` resolve correctly. Doesn't affect committed source.

## Next Phase Readiness

- Plan 09 wires `<SavedQuotePage />` into `DemoApp.tsx` at `/quotes/:id` and adds the `?fromQuote=&restoreVersion=N` URL reader inside `QuoteForm.tsx`. The page already encodes both query params on Restore — Plan 09 only has to consume them.
- The page lays no claim on `<MyQuotesPage />` or `<MyQuotesList />` — Plan 07 owns the list-page composition.
- Phase 6 (multi-vision) and Phase 7 (ROM mode) inherit the schema-passthrough property from Plan 01, so this page renders unmodified for either of those phase outputs (T-05-passthrough mitigation, see `unifiedQuoteResultSchema`).

## Self-Check: PASSED

Files exist on the worktree branch:
- `FOUND: frontend/src/pages/quotes/SavedQuotePage.tsx`
- `FOUND: frontend/src/pages/quotes/SavedQuotePage.test.tsx`

Commits exist on `worktree-agent-ae32877e186301701`:
- `FOUND: d0a3241` (test RED)
- `FOUND: 99f111c` (feat GREEN)

Acceptance grep counts (all required to be ≥1 unless noted):
- `Open in Quote tool`: 2
- `Back to My Quotes`: 2
- `Quote not found`: 1
- `Click to advance`: 1
- `Delete quote`: 1
- `QuoteResultPanel`: 3
- `VersionHistoryList`: 3
- `StatusChip`: 3
- `DeleteQuoteModal`: 3
- `fromQuote`: 4
- `restoreVersion`: 4
- `useRestoreVersion`: 2
- `useSetStatus`: 2
- `from "@/api/`: 0 (must be 0)
- `dangerouslySetInnerHTML`: 0 (must be 0)

Verification:
- `npx vitest run src/pages/quotes/SavedQuotePage.test.tsx` → 18 of 18 pass.
- `npx tsc --noEmit` → exits 0, no errors.
- `npx eslint src/pages/quotes/SavedQuotePage.tsx src/pages/quotes/SavedQuotePage.test.tsx` → exits 0, no errors.
- Quote-area sweep (`npx vitest run src/pages/quotes/ src/components/quote/`) → 175 of 175 pass.

---
*Phase: 05-quote-persistence*
*Plan: 08*
*Completed: 2026-05-05*
