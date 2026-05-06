---
phase: 05-quote-persistence
plan: 09
subsystem: frontend / quote-persistence
tags: [integration, routing, persistence, jargon-guard]
requires:
  - 05-01 (savedQuoteSchema, quoteStorage)
  - 05-04 (useSavedQuotes hook)
  - 05-05 (SaveQuoteDialog)
  - 05-07 (MyQuotesPage — sibling, RULE-3 stub used during this plan)
  - 05-08 (SavedQuotePage — sibling, RULE-3 stub used during this plan)
provides:
  - SaveQuoteButton (host-anywhere trigger + post-save navigation)
  - /quotes and /quotes/:id route registrations
  - workspace prop on QuoteResultPanel
  - ?fromQuote=<id> rehydration in QuoteForm (replacement for UX-01)
affects:
  - DemoApp.tsx (routes)
  - DemoLayout.tsx (sidebar)
  - QuoteResultPanel (Save button slot + Export PDF demoted)
  - ComparisonQuote, MachineLearningQuoteTool (workspace prop)
  - QuoteForm (?fromQuote rehydration; LAST_KEY removed)
  - CompareBrowseTab (Save button — D-13)
  - jargon-guard (9 new customer-facing surfaces scanned)
tech-stack:
  added: []
  patterns: [react-router useSearchParams, dynamic-import-on-effect, lazy-route]
key-files:
  created:
    - frontend/src/components/quote/SaveQuoteButton.tsx
    - frontend/src/components/quote/SaveQuoteButton.test.tsx
    - frontend/src/test/__fixtures__/phase5.ts
    - frontend/src/pages/quotes/MyQuotesPage.tsx (RULE-3 stub — Plan 05-07 will overwrite)
    - frontend/src/pages/quotes/SavedQuotePage.tsx (RULE-3 stub — Plan 05-08 will overwrite)
  modified:
    - frontend/src/DemoApp.tsx
    - frontend/src/components/DemoLayout.tsx
    - frontend/src/components/quote/QuoteResultPanel.tsx
    - frontend/src/components/quote/QuoteResultPanel.test.tsx
    - frontend/src/pages/demo/compare/ComparisonQuote.tsx
    - frontend/src/pages/demo/MachineLearningQuoteTool.tsx
    - frontend/src/pages/single-quote/QuoteForm.tsx
    - frontend/src/pages/single-quote/QuoteForm.test.tsx
    - frontend/src/pages/demo/CompareBrowseTab.tsx
    - frontend/src/pages/SingleQuote.test.tsx (removed stale UX-01 test)
    - frontend/src/test/jargon-guard.test.tsx
decisions:
  - "Plans 07/08 stubs (RULE-3) installed because the integration plan (09) depends on those pages but they're sibling-parallel and may not have landed at execution time"
  - "I1 fallback for Compare-side save: persist FIRST selected project's record-derived prediction; compareInputs.humanQuotedByBucket reserved (empty in this UI; populated by QuoteForm-side save flow when human-input numbers are entered)"
  - "Removed the UX-01 sessionStorage test in SingleQuote.test.tsx instead of preserving it — D-16 deprecated the behaviour and the QuoteForm.test.tsx ?fromQuote describe is the canonical replacement"
metrics:
  duration: ~30 min
  completed: 2026-05-05
---

# Phase 5 Plan 9: Phase 5 Integration Wiring Summary

End-to-end wiring of Phase 5 features: SaveQuoteButton creation, /quotes routing, sidebar entry, QuoteResultPanel workspace prop, ?fromQuote rehydration replacing the deprecated UX-01 sessionStorage recall, Compare-tab Save button, and the D-19 jargon-guard expansion to nine Phase 5 customer-facing surfaces.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| Pre + Task 1 RED | RED test for SaveQuoteButton + Plan 07/08 stubs | 11c950e | SaveQuoteButton.test.tsx, MyQuotesPage.tsx (stub), SavedQuotePage.tsx (stub) |
| Task 1 GREEN | SaveQuoteButton trigger + dialog plumbing | e72f6a2 | SaveQuoteButton.tsx (9/9 tests pass) |
| Task 2 | Wire Phase 5 integration points | b95b9a1 | DemoApp, DemoLayout, QuoteResultPanel + .test, ComparisonQuote, MachineLearningQuoteTool, QuoteForm + .test, CompareBrowseTab |
| Task 3 | Extend jargon-guard for 9 Phase 5 surfaces | 6f95b6e | jargon-guard.test.tsx, __fixtures__/phase5.ts, SingleQuote.test.tsx (cleanup) |

All tasks committed individually with `feat`/`test` types per Conventional Commits.

## Verification

- `cd frontend && npm run typecheck` exits 0.
- `cd frontend && npm run lint` exits 0.
- `cd frontend && npx vitest run` — 844/844 green inside the worktree (full sweep).
- `cd frontend && npx vitest run src/components/quote/SaveQuoteButton.test.tsx` — 9/9 green.
- `cd frontend && npx vitest run src/components/quote/QuoteResultPanel.test.tsx` — 31/31 green (3 new Save-button branch tests).
- `cd frontend && npx vitest run src/pages/single-quote/QuoteForm.test.tsx` — 22/22 green (3 new ?fromQuote tests + 19 carry-overs).
- `cd frontend && npx vitest run src/test/jargon-guard.test.tsx` — 13/13 green (4 carry-overs + 9 Phase 5 surfaces).

Acceptance-criteria grep checks:

- `MyQuotesPage` and `SavedQuotePage` referenced in DemoApp.tsx (lazy + Routes).
- `to="/quotes"` and `label="My Quotes"` in DemoLayout.tsx sidebar.
- `SaveQuoteButton` and `workspace?:` in QuoteResultPanel.tsx.
- `workspace="real"` in ComparisonQuote.tsx; `workspace="synthetic"` in MachineLearningQuoteTool.tsx.
- `fromQuote` and `useSearchParams` in QuoteForm.tsx.
- `LAST_KEY`, `readLastValues`, `matrix.singlequote.last`, `Populate with last quote`, and `sessionStorage.setItem` all absent from QuoteForm.tsx.
- `SaveQuoteButton` in CompareBrowseTab.tsx.
- 9 new `<surface> renders no banned` tests in jargon-guard.test.tsx.

## Threat Model Status

| ID | Disposition | Status |
|----|-------------|--------|
| T-05-16 (Tampering — `?fromQuote` rehydration) | mitigate | satisfied. `getSavedQuote` (Plan 05-01) re-validates via `savedQuoteSchema.parse`; malformed records return null and the form falls back to defaults silently. The rehydrated `formValues` is then quoteFormSchema-validated by react-hook-form/zodResolver on first interaction. |
| T-05-17 (Information Disclosure — jargon leakage) | mitigate | satisfied. jargon-guard test extended to scan all 9 Phase 5 customer-facing surfaces (UI-SPEC §"Jargon-Guard Scope Addition"). Build fails on any banned token. |

## Deviations from Plan

### Rule-3 Stubs for Plan 07 / Plan 08 dependencies

**Found during:** Pre-task discovery (file scan after merging feat/05).

- **Issue:** Plan 09 depends on `MyQuotesPage` (Plan 07) and `SavedQuotePage` (Plan 08). Both Plans 07 and 08 are parallel siblings; the worktree was at af8e4d5 (Wave 2 head, plans 04-06 only). Without the page modules, DemoApp.tsx routes do not compile.
- **Fix:** Added two RULE-3 STUBS at the canonical paths. Both are clearly marked with comments stating their stub status and pointing at the plans that will overwrite them. The stubs render minimal chrome (page heading + back-link) so the jargon-guard scan exercises real strings instead of a blank page.
- **Files added:** `frontend/src/pages/quotes/MyQuotesPage.tsx` (stub), `frontend/src/pages/quotes/SavedQuotePage.tsx` (stub).
- **Commit:** 11c950e (alongside the RED test).
- **Merge plan:** Plans 07 / 08 will overwrite the stubs at merge time. The stubs match the import shape (`export function MyQuotesPage` / `SavedQuotePage`) the lazy DemoApp routes expect.

### I1 — Compare-side save data shape simplification

**Found during:** Task 2 (CompareBrowseTab wiring).

- **Issue:** The Compare-tool side does NOT collect a single `QuoteFormValues` + `UnifiedQuoteResult` to save. CompareBrowseTab is a BROWSE / COMPARE-2-TO-3 tab over historical records. The `selectedQuotes` array is shaped from `recordToSavedQuote(...)` (the v1.0 Compare-tool `SavedQuote` type from `@/api/types` — distinct from Plan 05's `SavedQuote`).
- **Fix:** I1 simplification per the plan:
  - Use FIRST selected project's record-derived prediction as the saveable shape.
  - Convert `selectedQuotes[0].inputs` → `QuoteFormValues` via the inverse `transformToFormValues` (Plan 05-01).
  - Build a minimal `UnifiedQuoteResult` from `prediction.total_p10/p50/p90`.
  - `compareInputs.humanQuotedByBucket = {}` (empty record): the CompareBrowseTab UI itself does not collect human comparator numbers — that's a QuoteForm-side concern. The schema field is still wired through so a future plan can populate it without re-touching the Compare flow. D-13 explicitly says "persist the human comparator number ALONGSIDE the model-side fields" — when none is entered, the field is empty.
- **Files modified:** `frontend/src/pages/demo/CompareBrowseTab.tsx`.
- **Commit:** b95b9a1.

### Removed stale UX-01 SingleQuote test

**Found during:** Full vitest sweep at the end of Task 2.

- **Issue:** `frontend/src/pages/SingleQuote.test.tsx` had one test (`shows the 'Populate with last quote' link when sessionStorage is populated and fills form on click`) that pre-seeded `sessionStorage["matrix.singlequote.last"]` and asserted the recall button rendered. D-16 deprecated that behaviour and Task 2 removed the button + readLastValues + LAST_KEY.
- **Fix:** Replaced the test with a comment pointing at the QuoteForm.test.tsx ?fromQuote describe block (Plan 05-09 Task 2 — the canonical replacement).
- **Files modified:** `frontend/src/pages/SingleQuote.test.tsx`.
- **Commit:** 6f95b6e (in the same Task 3 commit; this is a SingleQuote test correction caused by the QuoteForm refactor in Task 2).

### `node_modules` symlink in worktree

**Found during:** GREEN gate execution of SaveQuoteButton tests.

- **Issue:** Claude Code worktree at `.claude/worktrees/agent-a715fb43bfd697660/frontend/` did not have `node_modules`; vitest crashed on `Cannot find package 'vite'`.
- **Fix:** Created a Windows junction (`mklink /J node_modules ..\..\..\..\frontend\node_modules`). This is a workspace-only convenience — it is not committed and will not affect the merge.
- **Files modified:** none (junction is untracked).

## Self-Check

Per `<self_check>`:

- `frontend/src/components/quote/SaveQuoteButton.tsx` — FOUND.
- `frontend/src/components/quote/SaveQuoteButton.test.tsx` — FOUND.
- `frontend/src/test/__fixtures__/phase5.ts` — FOUND.
- `frontend/src/pages/quotes/MyQuotesPage.tsx` (stub) — FOUND.
- `frontend/src/pages/quotes/SavedQuotePage.tsx` (stub) — FOUND.
- Commit `11c950e` (RED + stubs) — FOUND in `git log`.
- Commit `e72f6a2` (GREEN) — FOUND.
- Commit `b95b9a1` (Task 2) — FOUND.
- Commit `6f95b6e` (Task 3) — FOUND.

## Self-Check: PASSED

## TDD Gate Compliance

Plan 05-09 is `type: execute` (not `type: tdd`); only Task 1 has `tdd="true"`. Gate sequence for Task 1:

- RED gate: commit `11c950e` (`test(05-09): add failing test...`) — present.
- GREEN gate: commit `e72f6a2` (`feat(05-09): implement SaveQuoteButton...`) — present.
- REFACTOR gate: not needed; minimal implementation is the GREEN code.

## Threat Flags

None. The new surfaces are scanned by extended jargon-guard; the new persistence touchpoint (`?fromQuote=<id>` rehydration) routes through the existing validated `getSavedQuote` boundary; the new Compare-side save uses the same `quoteStorage` boundary as the QuoteResultPanel save.
