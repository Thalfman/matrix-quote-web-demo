---
phase: 05-quote-persistence
plan: 03
subsystem: ui
tags: [react, tailwind, vitest, version-history, accessibility, persist-06]

# Dependency graph
requires:
  - phase: 05-01-data-layer
    provides: "QuoteVersion zod schema + WorkflowStatus type from frontend/src/lib/savedQuoteSchema.ts"
  - phase: 05-02-presentation-primitives
    provides: "StatusChip readOnly variant from frontend/src/components/quote/StatusChip.tsx"
provides:
  - "<VersionHistoryList versions onRestore /> — vertical sidebar component (newest-first, D-07 verbatim format)"
affects: [05-07-savedQuotePage, 05-09-jargonGuard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Card + eyebrow heading + role=list pattern reused from QuoteResultPanel.drivers (lines 86-110)"
    - "<aside> + aria-labelledby=heading-id landmark pattern for screen-reader-friendly named regions"
    - "[...arr].sort((a,b) => b.x - a.x) reverse-sort for newest-first DOM order regardless of input order"
    - "Read-only StatusChip variant inside a list row to display past state without exposing a click affordance"
    - "Three aria-hidden=true <span>·</span> separators for D-07 verbatim middle-dot row format (visual fidelity, no SR noise)"

key-files:
  created:
    - "frontend/src/components/quote/VersionHistoryList.tsx"
    - "frontend/src/components/quote/VersionHistoryList.test.tsx"
  modified: []

key-decisions:
  - "Three middle-dot separators rendered as separate aria-hidden <span> elements (not concatenated into one mono string) so the StatusChip — which is a typed component, not a string — can sit between separators 2 and 3 without JSX text-node fragility."
  - "Heading element is <h3> (not <h2>) — the saved-quote detail page is the document's <h1> level; the sidebar is a sub-region. UI-SPEC §`VersionHistoryList` shows <h3>."
  - "Restore button uses `ml-auto` to push to the right end of the row regardless of how the chip's lengths vary across the five status states. Visually anchors the action to the trailing edge."
  - "Single-version state shows the helper paragraph AND the row itself (so Restore is reachable) — not an either/or. UI-SPEC §`VersionHistoryList` says `versions.length <= 1` shows the helper text alongside the (single) row."

patterns-established:
  - "Co-located *.test.tsx beside source per repo convention (matches StatusChip.test.tsx and QuoteResultPanel.test.tsx layout)"
  - "Test file uses fixture factories (makeVersion, MINIMAL_UNIFIED_RESULT) inline at top of file — no shared fixtures package needed"

requirements-completed: [PERSIST-06]

# Metrics
duration: ~6min
completed: 2026-05-05
---

# Phase 5 Plan 03: VersionHistoryList Summary

**Pure presentational saved-quote version-history sidebar — newest-first vertical list with D-07 verbatim row format and read-only status indicators per row.**

## Performance

- **Duration:** ~6 min (worktree-merge of Wave 1 baseline + npm install accounted for ~30 s)
- **Started:** 2026-05-05T16:24:00Z
- **Completed:** 2026-05-05T16:30:00Z
- **Tasks:** 1 (TDD: RED → GREEN, no refactor needed)
- **Files created:** 2

## Accomplishments

- **`<VersionHistoryList versions onRestore />`** — accepts `QuoteVersion[]` and an `onRestore(versionNumber)` callback; renders newest-first regardless of input order via `[...versions].sort((a,b) => b.version - a.version)`.
- **D-07 verbatim row format** — `v{N} · {YYYY-MM-DD} · {status-chip} · Restore` with THREE textual middle-dot (U+00B7) separators surrounded by spaces. Verified by both a regex test and a separator-count test.
- **Empty + single-version copy** — UI-SPEC verbatim: `Version history` heading always present, `Only one version saved so far. Edit and re-save to add a version.` for the single-version state, `No versions saved yet.` for the empty state.
- **Read-only StatusChip** — uses Plan 02's `readOnly` variant so the row's status display is a `<span>`, not a clickable `<button>`. Only the Restore button is interactive inside a row.
- **Accessibility** — `<aside>` landmark with `aria-labelledby="version-history-title"`; the matching `<h3 id="version-history-title">`. Found by `screen.getByRole("complementary", { name: /version history/i })` in tests.
- **Test coverage:** 15 vitest cases (7 describe blocks, single-assertion `it`'s) covering all 10 behaviours from `<behavior>` plus per-status smoke checks. Full project suite remains green at **749 / 749**.

## Task Commits

1. **Task 1 RED — failing test** — `d614c08` (test — 15 cases authored, run confirmed to fail with `Failed to resolve import "./VersionHistoryList"`)
2. **Task 1 GREEN — VersionHistoryList implementation** — `d245909` (feat — 108 LOC component; 15/15 tests pass; typecheck clean; lint clean)

_Strict TDD per plan. RED state proven by `npx vitest run` exiting non-zero with the import-resolution error before any production code was written. GREEN proven by 15/15 tests passing on the same command after the impl was committed._

## Files Created/Modified

- `frontend/src/components/quote/VersionHistoryList.tsx` (108 LOC) — pure presentational component, no internal state, no external side effects
- `frontend/src/components/quote/VersionHistoryList.test.tsx` (293 LOC, 15 cases) — empty / single / multi / D-07 format / read-only / restore-callback / landmark wiring

## Decisions Made

- **Sort by `version` number, not by `savedAt` timestamp** — version numbers are monotonically increasing per quote (D-05) and are the canonical ordering signal. Sorting by `savedAt` would produce identical results in normal flows but would silently mask a bug if the version number ever drifted from save order (which D-06 — restore-as-fork — could in theory induce if implementation later goes wrong; sorting by version makes any such bug visible immediately rather than disguising it).
- **Three separate `<span aria-hidden="true">·</span>` separators** rather than one inline `mono` string — keeps the JSX trivially readable, lets each separator be styled independently if Plan 09 ever needs to (e.g. dim them on dark mode), and avoids text-node fragility in JSX (where adjacent text nodes can collapse whitespace differently across React versions).
- **`role="list"` on the `<ul>`** — defensive per UI-SPEC §"Accessibility": Safari sometimes drops `<ul>` list semantics when `list-style: none` is applied via the eyebrow / `space-y-2` styling. Explicit `role="list"` re-asserts.
- **Single Test commit RED + Single Implementation commit GREEN** — strict per plan's `tdd="true"` directive. Plan 02 (parallel) folded RED+GREEN into one feat() commit for wave-parallel diff hygiene; this plan executes after Wave 1 finishes and Wave 2 has no parallel scope conflict, so the canonical TDD two-commit gate is preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Merged `feat/05-quote-persistence` into the worktree branch**
- **Found during:** Initial `<files_to_read>` step
- **Issue:** Worktree was branched from `b5fba18` on `main` (the v2 milestone-open commit), which predates the entire `.planning/phases/05-quote-persistence/` directory and the entire Wave 1 implementation (savedQuoteSchema.ts, quoteStorage.ts, StatusChip.tsx, etc.). The plan files referenced in this prompt did not exist on the worktree branch.
- **Fix:** `git merge --no-ff feat/05-quote-persistence -m "merge: pull Wave 1 + plan 05-03 setup into worktree"` — fast-merge (no conflicts) bringing in 31 files / 8,933 insertions, including all 13 phase docs, the Plan 01 + 02 source files, and their co-located tests.
- **Files modified:** None tracked by Plan 03 — the merge brought in pre-existing Wave 1 work. Plan 03's only authored files (`VersionHistoryList.tsx` + `.test.tsx`) post-date the merge.
- **Verification:** `ls .planning/phases/05-quote-persistence/` shows all 13 docs; `cd frontend && npm test` shows 734 pre-existing tests passing (rising to 749 after Plan 03's 15 cases).
- **Committed in:** `34ea992` (merge commit — distinct from the per-task RED / GREEN commits)

**2. [Rule 3 — Blocking] Ran `npm install` in `frontend/`**
- **Found during:** First `npx vitest run` invocation
- **Issue:** `frontend/node_modules/@testing-library` did not exist after the worktree was set up — the worktree directory's `node_modules` is gitignored and uninitialized.
- **Fix:** `cd frontend && npm install --prefer-offline --no-audit --no-fund` → 574 packages installed in ~9 s (offline cache present from prior phase work).
- **Files modified:** None tracked (node_modules is gitignored).
- **Verification:** `npx vitest run` proceeded past startup; subsequent `npm run typecheck`, `npm run lint`, and `npm test` all completed cleanly.
- **Committed in:** N/A (no tracked files changed).

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking-issue resolutions, both worktree-setup mechanics).
**Impact on plan:** Zero scope creep. No code or tests were modified outside the two files listed in `files_modified`. Both deviations are pre-task setup that the plan itself assumes is already done by the orchestrator.

## Issues Encountered

None during planned work. The two deviations above were worktree-setup issues caught and resolved before any task execution began. RED → GREEN proceeded without any debug iteration.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 07 (`SavedQuotePage`) can drop `<VersionHistoryList versions={quote.versions} onRestore={handleRestore} />` directly into the right-column sidebar of the two-column detail layout without further interface negotiation.
- Plan 09 (jargon-guard) will scan `VersionHistoryList.tsx` once the surface ships — no banned ML-jargon tokens (`model`, `feature`, `predict`, `training data`, `regression`, `ensemble`, `P10`/`P50`/`P90`, `quantile`, `confidence interval`) appear in the source. Already verified via local grep scan.
- The component is file-disjoint from every Plan 04, 05, 06, 07, 08 file path — no cross-Wave merge conflict risk.

## Self-Check: PASSED

**Files exist:**
- FOUND: `frontend/src/components/quote/VersionHistoryList.tsx`
- FOUND: `frontend/src/components/quote/VersionHistoryList.test.tsx`

**Commits exist:**
- FOUND: `d614c08` (Task 1 RED — failing test)
- FOUND: `d245909` (Task 1 GREEN — implementation)
- FOUND: `34ea992` (worktree merge — Wave 1 baseline; not a Plan 03 task commit)

**Verification gates:**
- `cd frontend && npm run typecheck` → exits 0
- `cd frontend && npm run lint` → exits 0
- `cd frontend && npx vitest run src/components/quote/VersionHistoryList.test.tsx` → 15 / 15 pass
- `cd frontend && npm test` → 749 / 749 pass full project suite

**Acceptance grep gates (Task 1):**
- `Version history` x2 (≥ 1 ✓)
- `Only one version saved so far` x1 (≥ 1 ✓)
- `Edit and re-save to add a version` x1 (≥ 1 ✓)
- `Restore` x8 (≥ 1 ✓)
- `aria-labelledby="version-history-title"` x1 (≥ 1 ✓)
- `StatusChip` x3 (≥ 1 ✓)
- `readOnly` x1 (≥ 1 ✓)
- `·` x7 (≥ 3 ✓)
- `dangerouslySetInnerHTML` x0 in non-comment lines (== 0 ✓)
- 15 ≥ 10 tests passing ✓

**Jargon-guard pre-scan:** All 12 banned tokens (`training data`, `ML model`, `production`, `feature `, `predict`, `regression`, `ensemble`, `P10`, `P50`, `P90`, `quantile`, `confidence interval`) absent from source.

---
*Phase: 05-quote-persistence*
*Completed: 2026-05-05*
