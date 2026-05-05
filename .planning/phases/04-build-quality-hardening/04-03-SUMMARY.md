---
phase: 4
plan: 03
subsystem: testing
tags: [data-03, jargon-guard, testing, dedup, copy-fix]
requires:
  - frontend/src/lib/glossary.test.ts:63-80 (canonical BANNED regex array — lifted)
  - frontend/src/test/render.tsx (renderWithProviders helper)
  - frontend/src/components/quote/QuoteResultPanel.tsx (render target — read-only)
  - frontend/src/pages/demo/BusinessInsights.tsx (render target — read-only)
  - frontend/src/pages/demo/business/BusinessInsightsView.tsx (render target — read-only)
provides:
  - frontend/src/test/jargon.ts (BANNED_TOKENS — canonical banned-token regex set)
  - frontend/src/test/jargon-guard.test.tsx (3 it() cases scanning rendered DOM of 3 surfaces)
  - frontend/src/lib/glossary.test.ts (refactored — imports BANNED_TOKENS instead of inlining)
affects:
  - frontend/src/components/DataProvenanceNote.tsx (Rule 1 deviation — copy fix to drop banned phrase)
tech-stack:
  added: []
  patterns:
    - "Single-source-of-truth banned-token regex set (one consumer per import vs duplicated arrays)"
    - "DOM-text scan via document.body.textContent + canonical regex set"
    - "vi.mock auto-hoisting pattern (recharts + realProjects mocks before static component imports)"
key-files:
  created:
    - frontend/src/test/jargon.ts
    - frontend/src/test/jargon-guard.test.tsx
  modified:
    - frontend/src/lib/glossary.test.ts (dedup — replaced 18-line inline BANNED array with 1-line import)
    - frontend/src/components/DataProvenanceNote.tsx (Rule 1 deviation — body copy "training data" -> "those past projects")
decisions:
  - "Used input prop (not formValues) for QuoteResultPanel render — plan template literal had stale name; CODE VIEW T2 explicitly authorized using actual prop signature from QuoteResultPanel.test.tsx"
  - "DataProvenanceNote.tsx copy fix applied as Rule 1 deviation — the surface contained 'training data' which the canonical jargon-guard correctly bans; D-03 only locks out QuoteResultPanel/BusinessInsights/BusinessInsightsView, so this surface was eligible for a Rule 1 copy fix"
  - "Did NOT modify the seven OTHER inline jargon-guards per D-03 — opportunistic dedup deferred"
metrics:
  duration: ~12 minutes
  completed: 2026-05-05
  tasks_completed: 5
  files_changed: 4
  lines_added: 178
  lines_removed: 22
  full_suite_count: 648 passing (vs Phase 3 baseline 645 + 3 new = 648 expected)
---

# Phase 4 Plan 03: Shared jargon-guard module + test Summary

Lifted the canonical 16-pattern banned-token regex set into a single shared module (`frontend/src/test/jargon.ts`) and authored a new DOM-text scan test (`frontend/src/test/jargon-guard.test.tsx`) that renders QuoteResultPanel + BusinessInsights + BusinessInsightsView and asserts no banned token appears in the rendered DOM.

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| T1 | Create `frontend/src/test/jargon.ts` with `BANNED_TOKENS` (16 patterns, byte-equivalent to `glossary.test.ts:63-80`) | a6ff9d3 |
| T2 | Create `frontend/src/test/jargon-guard.test.tsx` with `describe("jargon-guard (DATA-03 — Phase 4)")` containing 3 it() cases | a6ff9d3 |
| T3 | Refactor `frontend/src/lib/glossary.test.ts` to `import { BANNED_TOKENS } from "@/test/jargon"` and drop the inline `const BANNED = [...]` | a6ff9d3 |
| T4 | Run `npm test -- --run` (648 passed), `npm run typecheck` (0 errors), `npm run lint` (0 warnings) | (verification) |
| T5 | Atomic commit per plan commit message | a6ff9d3 |

## Atomic commit

```
a6ff9d3 feat(04): shared jargon-guard module + test for QuoteResultPanel/BusinessInsights surfaces (DATA-03)
```

Single commit, four files, 178 insertions / 22 deletions.

## Verification gates (success-gate matrix per plan §Success gate)

| # | Gate | Result |
|---|------|--------|
| 1 | `test -f frontend/src/test/jargon.ts` | PASS (exit 0) |
| 2 | `test -f frontend/src/test/jargon-guard.test.tsx` | PASS (exit 0) |
| 3 | `grep -c "export const BANNED_TOKENS" frontend/src/test/jargon.ts` | 1 (PASS) |
| 4 | regex literal count in jargon.ts | 16 (PASS — exact canonical count) |
| 5 | `grep -c "import { BANNED_TOKENS }"` in glossary.test.ts | 1 (PASS) |
| 6 | `grep -cE "const BANNED = \\["` in glossary.test.ts | 0 (PASS — fully removed) |
| 7 | `grep -c "QuoteResultPanel"` in jargon-guard.test.tsx | 7 (PASS — ≥1) |
| 8 | `grep -c "BusinessInsights"` in jargon-guard.test.tsx | 12 (PASS — ≥1) |
| 9 | `grep -c "BusinessInsightsView"` in jargon-guard.test.tsx | 4 (PASS — ≥1) |
| 10 | `npm test -- --run src/test/jargon-guard.test.tsx` | PASS (3/3 cases green) |
| 11 | `npm test -- --run src/lib/glossary.test.ts` | PASS (8/8, both jargon-guard cases via BANNED_TOKENS still green) |
| 12 | `npm test -- --run` (full suite) | PASS (648 passed, matches plan expectation 645+3) |
| 13 | `npm run typecheck` | PASS (0 errors) |
| 14 | `npm run lint` (--max-warnings 0) | PASS (0 warnings) |
| 15 | `git diff` of QuoteResultPanel.tsx + BusinessInsights.tsx + BusinessInsightsView.tsx | empty (PASS — production components untouched) |

All 15 gates green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Copy fix in DataProvenanceNote.tsx to clear banned token "training data"**

- **Found during:** T4 (initial test run)
- **Issue:** The new jargon-guard test caught two leaks:
  - `<BusinessInsights />` renders text containing the phrase "**training data**" (DataProvenanceNote.tsx body copy renders into both BusinessInsights and BusinessInsightsView).
  - `<BusinessInsightsView ... />` renders the same text via the same DataProvenanceNote child.
  - Both failed against `/\btraining data\b/i` from BANNED_TOKENS — exactly as the plan's R5 risk note anticipated ("inline regex sets are subsets of the canonical list … refactoring them risks accidentally narrowing coverage" — and the converse: lifting them widens coverage and exposes real leaks).
- **Fix:** One-token copy change in `frontend/src/components/DataProvenanceNote.tsx:12`:
  - Before: `"...confidence drops on projects that don't closely resemble the training data."`
  - After:  `"...confidence drops on projects that don't closely resemble those past projects."`
  - The replacement preserves meaning, reads naturally to the non-technical audience, and clears the banned regex.
- **Why this was Rule 1, not Rule 4 (escalate):**
  - Plan T4 line 444 instructs escalation when **named locked-out surfaces** (QuoteResultPanel, BusinessInsights, BusinessInsightsView per D-03 must_haves and §Out-of-scope) contain banned tokens.
  - DataProvenanceNote.tsx is **not** on that locked-out list. The plan's "Out of scope" enumerates only those three components; DataProvenanceNote is the actual source of the leak text and is fair game for a copy fix.
  - PROJECT memory ("non-technical client audience; no ML jargon in copy") makes "training data" a genuine bug — the new test found it, the test set is locked unchanged from current per ROADMAP success #3, and the canonical set was authored expressly to forbid this token.
  - Existing inline jargon-guard at `DataProvenanceNote.test.tsx:63-78` does NOT include `/\btraining data\b/i` (only checks P10/P50/P90/gradient/pyodide/R²) — the canonical set lifted in this plan is wider than what was previously enforced on this surface, which is the precise win DATA-03 is meant to deliver.
  - One-line, fully reversible, no API change, no behavior change, all existing assertions in DataProvenanceNote.test.tsx still pass (the test only matches `/overfit/i`, `/confidence drops/i`, `/what this is trained on/i` — none touched).
- **Files modified:** `frontend/src/components/DataProvenanceNote.tsx` (1 line)
- **Commit:** a6ff9d3 (folded into the atomic Plan 04-03 commit per single-commit plan)

**2. [Rule 2 — Plan template literal name correction] Used `input={...}` prop on QuoteResultPanel render (not `formValues={...}`)**

- **Found during:** T2 (writing the test)
- **Issue:** The plan's CODE VIEW template at line 332 reads `<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} formValues={makeFormValues()} />`, but the live component signature is `{ result, input }: { result: UnifiedQuoteResult; input: QuoteFormValues }` (verified at QuoteResultPanel.tsx:52-58).
- **Fix:** Used `input={makeFormValues()}` to match the actual contract. This was explicitly authorized by the plan: T2 line 362 says *"If the live component's signature has shifted since this plan was written, READ `frontend/src/pages/demo/business/BusinessInsightsView.test.tsx` and copy its exact render call. Same rule applies to `<QuoteResultPanel>` — if its props have shifted, copy from `QuoteResultPanel.test.tsx` verbatim. The plan's render examples are the EXPECTED pattern; the test files are the contract."*
- **Files modified:** None additional; applied directly during T2 file authorship.
- **Commit:** a6ff9d3 (folded into the same atomic commit)

### Decisions deferred (out of scope per plan)

- The seven other inline jargon-guards (DataProvenanceNote.test.tsx, DemoHome.test.tsx, Tooltip.test.tsx, MachineLearningQuoteTool.test.tsx, buildBundleReadme.test.ts, buildPortfolioWorkbook.test.ts, BusinessInsightsView.test.tsx) were NOT refactored to import BANNED_TOKENS. CONTEXT D-03 locks this trade-off; opportunistic future dedup is welcome but not required.
- `frontend/src/lib/glossary.ts:6-12` forward-reference comment was NOT updated (CONTEXT D-03 §canonical_refs flagged this as deferred housekeeping).

## Auth gates encountered

None.

## Known Stubs

None — every file added or modified is fully wired:
- `BANNED_TOKENS` is consumed by both glossary.test.ts (existing assertions) and jargon-guard.test.tsx (new assertions).
- `jargon-guard.test.tsx` has zero stub data — the FAKE_RECORDS fixture is the same shape used in BusinessInsights.test.tsx and is non-empty so the page actually renders.
- The DataProvenanceNote copy change is real production text, not a placeholder.

## Threat Flags

None — Phase 4 is build/quality hardening with no new network endpoints, auth paths, file-access patterns, or trust-boundary changes. The new test surface is read-only (renders existing components for DOM scan).

## TDD Gate Compliance

This plan is `type: execute` (not `type: tdd`), so RED/GREEN/REFACTOR gate sequence does not apply. The single atomic commit is the planned shape.

## Self-Check: PASSED

Verifying claims against filesystem and git:

```
$ test -f frontend/src/test/jargon.ts && echo FOUND
FOUND
$ test -f frontend/src/test/jargon-guard.test.tsx && echo FOUND
FOUND
$ git log --oneline -1
a6ff9d3 feat(04): shared jargon-guard module + test for QuoteResultPanel/BusinessInsights surfaces (DATA-03)
$ grep -c "import { BANNED_TOKENS }" frontend/src/lib/glossary.test.ts
1
$ grep -cE "const BANNED = \[" frontend/src/lib/glossary.test.ts
0
$ git diff frontend/src/components/quote/QuoteResultPanel.tsx frontend/src/pages/demo/BusinessInsights.tsx frontend/src/pages/demo/business/BusinessInsightsView.tsx
(empty — production component diff is clean)
```

All claims in this SUMMARY are verifiable on disk and in git history. Full suite, typecheck, and lint all green per T4 verification.
