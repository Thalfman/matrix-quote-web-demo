---
phase: 05-quote-persistence
plan: 02
subsystem: ui
tags: [react, tailwind, vitest, status-pill, segmented-control, accessibility]

# Dependency graph
requires:
  - phase: 05-01-data-layer
    provides: "WorkflowStatus / Workspace / STATUS_CYCLE type exports from frontend/src/lib/savedQuoteSchema.ts"
provides:
  - "<StatusChip /> — interactive five-state cycler + read-only variant"
  - "<WorkspacePill /> — read-only real / synthetic badge"
  - "<SortControls /> — three-button segmented control for My Quotes sort"
affects: [05-04-hook, 05-05-row-and-saveDialog, 05-06-myQuotesPage, 05-07-savedQuotePage, 05-09-jargonGuard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Variant-table Record<Literal, string> for per-state Tailwind classes (mirrors QuoteResultPanel.CONFIDENCE_TONE)"
    - "Cycle helper pair nextStatus/previousStatus over a `readonly WorkflowStatus[]` constant"
    - "Segmented-control pattern reused from DemoLayout.MobileToolSwitch (active = bg-ink text-white, focus = focus-visible:ring-teal)"
    - "Read-only variant of an interactive component renders <span> instead of <button>; aria-label drops the click-to-advance hint"

key-files:
  created:
    - "frontend/src/components/quote/StatusChip.tsx"
    - "frontend/src/components/quote/StatusChip.test.tsx"
    - "frontend/src/components/quote/WorkspacePill.tsx"
    - "frontend/src/components/quote/WorkspacePill.test.tsx"
    - "frontend/src/components/quote/SortControls.tsx"
    - "frontend/src/components/quote/SortControls.test.tsx"
    - "frontend/src/lib/savedQuoteSchema.ts (TYPE STUB — overwritten by Plan 01 at merge)"
  modified: []

key-decisions:
  - "StatusChip cycle helpers (nextStatus/previousStatus) live inside the component file — no helper export needed in Wave 1; downstream plans cycle exclusively through <StatusChip onAdvance>."
  - "Cycle wrap-around tested in BOTH directions (revised → draft forward; draft → revised on Shift+ArrowRight)."
  - "WorkspacePill is always rendered (no conditional collapse) — D-04 + UI-SPEC mandate workspace as a stable recognition cue."
  - "SortControls labels use UI-SPEC verbatim strings ('Date saved', 'Name', 'Status') — Plan 09 will scan with jargon-guard."

patterns-established:
  - "Phase 5 quote-component conventions: co-located *.test.tsx files; cn() composition; eyebrow + text-xs micro-typography for chip-class controls"
  - "TDD RED→GREEN gate: failing test commits would belong before implementation; here tests + impl shipped in one feat() commit per task to keep wave-parallel diffs minimal"

requirements-completed: [PERSIST-02, PERSIST-05]

# Metrics
duration: ~10min
completed: 2026-05-05
---

# Phase 5 Plan 02: Quote presentation primitives Summary

**Three pure presentational components (StatusChip, WorkspacePill, SortControls) frozen as the visual + interaction contract for every Phase 5 list/detail surface.**

## Performance

- **Duration:** ~10 min (worktree-rebase + npm install accounted for ~1 min)
- **Started:** 2026-05-05T20:57:00Z
- **Completed:** 2026-05-05T21:07:45Z
- **Tasks:** 2
- **Files created:** 7 (6 plan files + 1 schema type stub)

## Accomplishments

- **StatusChip** — five-state cycler with full keyboard parity (Enter / Space / ArrowRight forward; Shift+ArrowRight reverse; Shift+click reverse), wrap-around in both directions, read-only `<span>` variant for version history, per-state Tailwind palette from UI-SPEC §"Status-pill palette".
- **WorkspacePill** — read-only `<span>` badge with the two-tone palette (`bg-ink/5` for real, `bg-amber/15` for synthetic) per UI-SPEC §"Workspace-pill palette".
- **SortControls** — three-button segmented control using UI-SPEC verbatim labels (`Date saved`, `Name`, `Status`), `aria-pressed` accessibility, role=group wrapper, focus-visible:ring-teal everywhere.
- **Test coverage:** 38 new vitest cases (21 StatusChip + 6 WorkspacePill + 11 SortControls); full project suite remains green at **687 / 687**.

## Task Commits

1. **Task 1: StatusChip — five-state cycle + read-only variant** — `170e3cc` (feat — TDD test+impl combined for wave-parallel scope hygiene)
2. **Task 2: WorkspacePill + SortControls** — `e901daf` (feat — TDD test+impl combined; tests written first, then impl)

_Both tasks followed RED → GREEN inside a single commit (test file written + verified failing, then impl written + tests passing). RED state was confirmed in-shell before each GREEN write._

## Files Created/Modified

- `frontend/src/components/quote/StatusChip.tsx` — interactive + read-only status pill, 5-state cycle (Ben's verbatim states)
- `frontend/src/components/quote/StatusChip.test.tsx` — 21 vitest cases (interactive cycle, keyboard, read-only, per-state classes)
- `frontend/src/components/quote/WorkspacePill.tsx` — read-only `<span>` badge for "real" / "synthetic"
- `frontend/src/components/quote/WorkspacePill.test.tsx` — 6 vitest cases
- `frontend/src/components/quote/SortControls.tsx` — three-button segmented control for My Quotes sort
- `frontend/src/components/quote/SortControls.test.tsx` — 11 vitest cases
- `frontend/src/lib/savedQuoteSchema.ts` — **Type-only stub** containing only `Workspace`, `WorkflowStatus`, `STATUS_CYCLE` (Plan 01 owns the full file; this stub will be overwritten at Wave 1 merge). See deviation R3 below.

## Decisions Made

- **Co-located tests** beside source per the codebase convention (`QuoteResultPanel.test.tsx` precedent), not under `frontend/tests/`. PATTERNS.md §"Test-file location convention" recommended this and it matches every existing test.
- **Single commit per task** (TDD RED + GREEN folded). The TDD reference doc allows separate `test()` then `feat()` commits, but Wave 1 parallel executors trade verbosity for tighter file-disjoint commit hygiene; the test-first execution order was preserved (RED state proven in shell before GREEN write).
- **`STATUS_CYCLE` imported from `@/lib/savedQuoteSchema`** rather than redeclared inline, even though Plan 02 owns no file there — done to match Plan 01's interface contract verbatim (so the merge is a no-op for these symbols).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Created type-only stub at `frontend/src/lib/savedQuoteSchema.ts`**
- **Found during:** Task 1 (StatusChip imports `WorkflowStatus`, `STATUS_CYCLE` per `<interfaces>` block)
- **Issue:** Plan 02 imports from `@/lib/savedQuoteSchema`, but that file is owned by Plan 01 (Wave 1, parallel) and was NOT pre-staged on this worktree. Plan 02's `files_modified` list excludes `savedQuoteSchema.ts`, so I cannot author the full schema. Without this file, both `npm run typecheck` and the new vitest suites fail to resolve, blocking the verification step in `<verify>`.
- **Fix:** Wrote a minimal type-only stub exporting ONLY the three symbols Plan 02 needs (`Workspace`, `WorkflowStatus`, `STATUS_CYCLE`) — no zod, no `SavedQuote`, no transforms. Plan 01's interface block (`05-01-PLAN.md` lines 117-121) defines these three symbols with the exact same names and string-literal values, so the upcoming merge is a strict superset overwrite (Plan 01's full schema replaces the stub atomically without renames or value changes).
- **Files modified:** `frontend/src/lib/savedQuoteSchema.ts` (created)
- **Verification:** `npm run typecheck` clean; `npm run lint` clean; `npx vitest run src/components/quote/` 66/66 pass; full suite 687/687 pass.
- **Committed in:** `170e3cc` (Task 1 commit — included alongside StatusChip)

**2. [Rule 3 — Blocking] Ran `npm install` in `frontend/`**
- **Found during:** Task 1 (first `npx vitest run` invocation)
- **Issue:** Vite + Vitest binaries unavailable — worktree's `frontend/node_modules` directory was empty after the rebase reset.
- **Fix:** `cd frontend && npm install --prefer-offline --no-audit --no-fund` → 572 packages installed in ~9 s (offline cache present from prior phase work).
- **Files modified:** None tracked (node_modules is gitignored).
- **Verification:** `npx vitest run` proceeded past startup; subsequent `npm run typecheck`, `npm run lint`, and `npm test` all completed.
- **Committed in:** N/A (no tracked files changed).

**3. [Rule 3 — Blocking] Rebased agent worktree onto current `main`**
- **Found during:** Initial `<files_to_read>` step
- **Issue:** Worktree was branched from `2f8eeca` (v1.0 archive commit) — five commits behind current `main` (which contains the entire `.planning/phases/05-quote-persistence/` directory). Plan files referenced in this prompt did not exist on the worktree branch.
- **Fix:** `git rebase main` → fast-forward, no conflicts (no agent commits existed before plan files arrived).
- **Files modified:** None tracked.
- **Verification:** `ls .planning/phases/05-quote-persistence/` showed all 13 phase docs.
- **Committed in:** N/A (no extra commits — rebase was a fast-forward).

---

**Total deviations:** 3 auto-fixed (all Rule 3 blocking-issue resolutions)
**Impact on plan:** Zero scope creep. The schema stub (R3-1) is the only one that touched a tracked file; it's a contract-frozen subset of Plan 01's interface and will be overwritten by Plan 01's full schema at merge with no diff in the consumed symbols.

## Issues Encountered

None during planned work. The three deviations above were all worktree-setup issues caught and resolved before any task execution began.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave 2 (Plans 04 + 05) can now consume `<StatusChip>`, `<WorkspacePill>`, `<SortControls>` directly without any further interface negotiation. The component contracts are file-disjoint and frozen.
- Plan 01 must merge cleanly to overwrite the `savedQuoteSchema.ts` type stub with the full zod-validated schema — verified non-conflicting (Plan 01's exports of `Workspace`, `WorkflowStatus`, `STATUS_CYCLE` match this stub's literal values exactly).
- Plan 09 (jargon-guard) will scan `StatusChip.tsx`, `WorkspacePill.tsx`, and `SortControls.tsx` once those surfaces ship — no banned ML-jargon tokens (`model`, `feature`, `predict`, `training data`, etc.) exist in any of the three sources today.

## Self-Check: PASSED

**Files exist:**
- FOUND: `frontend/src/components/quote/StatusChip.tsx`
- FOUND: `frontend/src/components/quote/StatusChip.test.tsx`
- FOUND: `frontend/src/components/quote/WorkspacePill.tsx`
- FOUND: `frontend/src/components/quote/WorkspacePill.test.tsx`
- FOUND: `frontend/src/components/quote/SortControls.tsx`
- FOUND: `frontend/src/components/quote/SortControls.test.tsx`
- FOUND: `frontend/src/lib/savedQuoteSchema.ts` (type-only stub — see deviation R3-1)

**Commits exist:**
- FOUND: `170e3cc` (Task 1 — StatusChip + savedQuoteSchema stub)
- FOUND: `e901daf` (Task 2 — WorkspacePill + SortControls)

**Verification gates:**
- `cd frontend && npm run typecheck` → exits 0
- `cd frontend && npm run lint` → exits 0
- `cd frontend && npx vitest run src/components/quote/` → 66 / 66 pass (38 new + 28 preexisting QuoteResultPanel)
- `cd frontend && npm test` → 687 / 687 pass full project suite

**Acceptance grep gates (Task 1):**
- StatusChip.tsx: `STATUS_CLASSES` x3, all five Tailwind tones present, `STATUS_CYCLE` x6, `ArrowRight` x2, `shiftKey` x2, no `dangerouslySetInnerHTML`

**Acceptance grep gates (Task 2):**
- WorkspacePill.tsx: `bg-ink/5 text-ink` x1, `bg-amber/15 text-ink` x1
- SortControls.tsx: `Date saved` x2, `type="button"` x1, no `dangerouslySetInnerHTML`

---
*Phase: 05-quote-persistence*
*Completed: 2026-05-05*
