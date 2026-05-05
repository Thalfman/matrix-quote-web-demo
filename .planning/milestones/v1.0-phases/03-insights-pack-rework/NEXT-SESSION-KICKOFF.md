# Phase 3 — Next Session Kickoff

**Created:** 2026-05-04 (post `/gsd-plan-phase 3`)
**Status:** Plans APPROVED + committed (`b63e586`). Ready to execute.

## State at end of last session

- Phase 2 (Hover affordances) shipped via PR #20 (commit `955c9bc`).
- Phase 3 (Insights pack rework) **planned and approved** by gsd-plan-checker (2nd pass).
- 5 plans + CONTEXT + DISCUSSION-LOG committed to `feat/02-hover-affordances` branch (the planning workflow can't switch branches mid-flow, so the docs landed on the Phase 2 branch).

## Branch hygiene needed BEFORE executing

Current branch is stale. Do this first:

```powershell
# Confirm PR #20 is merged in GitHub
gh pr view 20 --json state,mergedAt

# If merged, sync local main
git checkout main
git pull origin main

# Cherry-pick (or rebase) the Phase 3 planning commits onto fresh main
# The commits are eed97d2 (CONTEXT) + b63e586 (5 plans + ROADMAP)
git checkout -b feat/03-insights-pack-rework
git cherry-pick eed97d2 b63e586

# Or if PR #20 is NOT merged yet: leave Phase 3 commits on feat/02-hover-affordances
# and execute from there — the plans are independent of Phase 2 code anyway.
```

## Outstanding from Phase 2 (PR #20)

7 manual smoke tests deferred — instructions in PR #20 body, items 5–11 from
`.planning/phases/02-hover-affordances/02-05-PLAN.md`. Walk async whenever a
browser is available; not blocking Phase 3 execution.

## Next commands

**Option A — Execute immediately:**
```
/gsd-execute-phase 3
```
Phase 3 plans are wave-organized for parallel execution (3 waves, 5 plans).
ROADMAP success #4 (manual UAT for column meanings) is the only manual gate;
T2 of Plan 03-05 routes to user if no human reviewer is available in the
session.

**Option B — Execute with explicit wave parallelization:**
```
/gsd-execute-phase 3 --wave
```

**Option C — Walk Phase 2 manual smoke first**, then execute Phase 3.

## What Phase 3 delivers

- Default insights pack download = `summary.md` + `business-insights.xlsx` + `README.md`. Zero JSON, zero CSV.
- XLSX has 4 sheets: Summary / Drivers / Raw / README, with plain-English headers.
- `summary.md` byte-unchanged (Ben's praised notepad).
- Engineer-side: secondary "Download raw JSON (for engineers)" button, kept for backward compat.
- New dep: `xlsx` (SheetJS, ~100kB minified).
- Jargon-guard extends to `exportPack.ts` + `BusinessInsightsView.tsx` (cross-cuts Phase 4 DATA-03).

## Files to read first if context evaporates

1. `.planning/ROADMAP.md` §Phase 3 — success criteria
2. `.planning/phases/03-insights-pack-rework/03-CONTEXT.md` — 9 locked design decisions D-01..D-09
3. `.planning/phases/03-insights-pack-rework/03-01-PLAN.md` — Wave 1, plan 1 (the heavyweight: workbook builder)
4. `.planning/feedback/2026-05-01-ben-bertsche-review.md` §U3 — the customer feedback that drives all of this

## Memory pointers (auto-loaded)

- `feedback_plan_specificity.md` + `feedback_plan_format.md` — plan style
- `project_customer_review_2026_05.md` — Ben's review context
- `project_static_demo_no_backend.md` — no backend exists; specialist agents named for backend/auth/storage do NOT apply
- `feedback_context_status_line.md` — append context-usage line to responses
