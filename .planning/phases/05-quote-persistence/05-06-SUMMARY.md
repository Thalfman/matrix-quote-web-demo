---
phase: 05-quote-persistence
plan: 06
subsystem: frontend/quote-persistence/list-row
tags:
  - quote-persistence
  - list-page
  - row-component
  - empty-state
  - ui-presentational
requirements:
  - PERSIST-02
dependency-graph:
  requires:
    - "@/components/quote/StatusChip (Plan 05-02)"
    - "@/components/quote/WorkspacePill (Plan 05-02)"
    - "@/lib/savedQuoteSchema → SavedQuote, WorkflowStatus (Plan 05-01)"
    - "react-router-dom → useNavigate, Link"
    - "lucide-react → Trash2, Sparkles"
    - "@/lib/utils → cn"
  provides:
    - "<QuoteRow quote onAdvanceStatus onRequestDelete /> — list row component"
    - "<MyQuotesEmptyState /> — empty-list CTA component"
  affects:
    - "Plan 05-07 MyQuotesPage will compose QuoteRow + MyQuotesEmptyState"
tech-stack:
  added: []
  patterns:
    - "div role=button + tabIndex=0 with Enter/Space keyboard handler (avoids nested-button HTML violation when row contains StatusChip + Trash2 button)"
    - "stopPropagation on inner interactive children (StatusChip wrapper, Trash2 button) to keep row navigation isolated"
    - "useNavigate mock via vi.mock('react-router-dom', importActual) — first instance of this pattern in the repo"
    - "Co-located vitest tests using renderWithProviders (matches established Wave 1 convention)"
key-files:
  created:
    - "frontend/src/pages/quotes/QuoteRow.tsx"
    - "frontend/src/pages/quotes/QuoteRow.test.tsx"
    - "frontend/src/pages/quotes/MyQuotesEmptyState.tsx"
    - "frontend/src/pages/quotes/MyQuotesEmptyState.test.tsx"
  modified: []
decisions:
  - "Used div+role=button instead of <button> for the row container — HTML disallows nested buttons and the row must contain the StatusChip button + Trash2 button; ARIA pattern + onKeyDown for Enter/Space is the canonical workaround."
  - "stopPropagation lives in two places: StatusChip already calls stopPropagation in its onClick handler (Plan 02), but the row also wraps the chip in a div with onClick={stopPropagation} as a belt-and-suspenders guard against future StatusChip refactors."
  - "Test fixtures co-locate inline rather than reaching into Plan 01's makeSavedQuote — keeps the row component test independent and avoids circular test-fixture coupling between plans."
metrics:
  duration: "~30 minutes"
  completed-date: "2026-05-05"
  tests: "28 passing (18 QuoteRow + 10 MyQuotesEmptyState)"
  commits: 4
---

# Phase 5 Plan 6: QuoteRow + MyQuotesEmptyState Summary

QuoteRow renders one saved-quote list row composing Plan 02's StatusChip and WorkspacePill, with click-to-navigate and stopPropagation discipline on inner interactive elements; MyQuotesEmptyState renders the empty-list state with verbatim UI-SPEC copy and two CTA links into the Real-Data and Synthetic-Data Quote tools.

---

## What Was Built

### QuoteRow (`frontend/src/pages/quotes/QuoteRow.tsx`)

Pure presentational row, 122 lines including JSDoc.

**Composes Plan 02 primitives:**
- `<StatusChip status onAdvance>` — clickable chip that cycles `draft → sent → won → lost → revised → draft`. The row passes a wrapped `onAdvance` handler that calls `onAdvanceStatus(quote.id, next)`.
- `<WorkspacePill workspace>` — read-only badge for `real` or `synthetic`.

**Click model:**

| Click target | Handler                                                  |
| ------------ | -------------------------------------------------------- |
| Row body     | `navigate(`/quotes/${quote.id}`)`                        |
| StatusChip   | `onAdvanceStatus(id, next)` + stopPropagation            |
| Delete icon  | `onRequestDelete(id, name)` + stopPropagation            |

**Container shape:** `div role="button" tabIndex={0}` with onKeyDown handlers for Enter and Space (HTML forbids nested `<button>` so we cannot use a real button — the row contains StatusChip's button and the Trash2 button).

**Layout (UI-SPEC §`/quotes (list page)` Row layout):**
- `name` (text-sm font-medium ink, truncate) + `Saved YYYY-MM-DD` derived from `updatedAt.slice(0, 10)`
- StatusChip
- WorkspacePill
- `salesBucket` · `visionLabel` · `$materialsCost.toLocaleString()` (mono, hidden md-)
- Trash2 icon button

**Styling:** `min-h-[56px] border-b hairline last:border-b-0 hover:bg-paper/60 focus-visible:bg-paper/60 focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-inset cursor-pointer`.

### MyQuotesEmptyState (`frontend/src/pages/quotes/MyQuotesEmptyState.tsx`)

43-line presentational component, no props.

**Content (UI-SPEC verbatim):**
- Sparkles icon (`lucide-react`, size 32, strokeWidth 1.75, `text-amber/40`, aria-hidden)
- `display-hero text-3xl text-ink` heading: "No saved quotes yet"
- `text-sm text-muted max-w-md` body: "Save your first quote from the Quote tool — open the Quote tab in either workspace, run an estimate, and click \"Save quote\" on the result panel."
- Two `text-teal hover:underline` `<Link>` CTAs:
  - "Open Real-Data Quote tool" → `/compare/quote`
  - "Open Synthetic-Data Quote tool" → `/ml/quote`

**Container:** `card p-12 flex flex-col items-center text-center gap-4`.

---

## Test Coverage

### QuoteRow.test.tsx — 18 tests across 5 describes

| Describe                                            | Tests | Notes                                                          |
| --------------------------------------------------- | ----- | -------------------------------------------------------------- |
| `QuoteRow - content rendering`                      | 8     | name, saved date, StatusChip, WorkspacePill, sales bucket, vision, materials cost (mono, locale-formatted), delete-icon aria-label |
| `QuoteRow - navigation`                             | 3     | row body click, Enter, Space all call `navigate('/quotes/:id')` |
| `QuoteRow - StatusChip click stops propagation`     | 2     | calls `onAdvanceStatus(id, 'sent')` from `'draft'` start; does NOT navigate |
| `QuoteRow - delete icon click stops propagation`    | 2     | calls `onRequestDelete(id, name)`; does NOT navigate           |
| `QuoteRow - container layout`                       | 3     | role=button aria-label; min-h-[56px] + border-b hairline + last:border-b-0; tabIndex=0 |

`useNavigate` mocked via `vi.mock("react-router-dom", async () => { const actual = await vi.importActual(...); return { ...actual, useNavigate: () => mockNavigate }; })` — first instance of this pattern in the repo. Re-usable for any future Plan 5/6/7 page that asserts navigation targets.

### MyQuotesEmptyState.test.tsx — 10 tests across 5 describes

| Describe                                          | Tests | Notes                                                  |
| ------------------------------------------------- | ----- | ------------------------------------------------------ |
| `MyQuotesEmptyState - copy`                       | 3     | heading, display-hero class, body copy verbatim        |
| `MyQuotesEmptyState - Sparkles icon`              | 1     | size=32, aria-hidden, text-amber/40                    |
| `MyQuotesEmptyState - CTA links`                  | 4     | both link hrefs (/compare/quote, /ml/quote) + text-teal hover:underline |
| `MyQuotesEmptyState - container layout`           | 1     | card p-12 flex flex-col items-center text-center gap-4 |
| `MyQuotesEmptyState - jargon hygiene (sanity)`    | 1     | sanity guards for "training data", "ML model", "regression", "quantile" — formal coverage in Plan 09 |

---

## Verification

| Check                                       | Result    |
| ------------------------------------------- | --------- |
| `npx vitest run src/pages/quotes/QuoteRow.test.tsx`             | 18/18 pass |
| `npx vitest run src/pages/quotes/MyQuotesEmptyState.test.tsx`   | 10/10 pass |
| `npm run typecheck`                                              | 0 errors  |
| `npx eslint <new files>`                                         | 0 warnings |
| File-disjoint from Plans 01/02/04/05                             | yes       |

---

## Acceptance Criteria

### QuoteRow

| Criterion                                                                     | Result   |
| ----------------------------------------------------------------------------- | -------- |
| `frontend/src/pages/quotes/QuoteRow.tsx` exists                               | yes      |
| `frontend/src/pages/quotes/QuoteRow.test.tsx` exists                          | yes      |
| `grep "Saved "`                  ≥ 1                                          | 1        |
| `grep "StatusChip"`              ≥ 1                                          | 7        |
| `grep "WorkspacePill"`           ≥ 1                                          | 3        |
| `grep "Trash2"`                  ≥ 1                                          | 2        |
| `grep "stopPropagation"`         ≥ 2                                          | 4        |
| `grep "onAdvanceStatus"`         ≥ 1                                          | 4        |
| `grep "onRequestDelete"`         ≥ 1                                          | 4        |
| `grep "navigate("`               ≥ 1                                          | 3        |
| `grep "min-h-\[56px\]"`         ≥ 1                                          | 1        |
| `grep "dangerouslySetInnerHTML"` (no comment lines) == 0                      | 0        |
| `vitest` exits 0 with ≥ 12 tests passing                                      | 18 pass  |

### MyQuotesEmptyState

| Criterion                                                                     | Result   |
| ----------------------------------------------------------------------------- | -------- |
| `frontend/src/pages/quotes/MyQuotesEmptyState.tsx` exists                     | yes      |
| `frontend/src/pages/quotes/MyQuotesEmptyState.test.tsx` exists                | yes      |
| `grep "No saved quotes yet"`             ≥ 1                                  | 1        |
| `grep "Save your first quote"`           ≥ 1                                  | 1        |
| `grep "Open Real-Data Quote tool"`       ≥ 1                                  | 1        |
| `grep "Open Synthetic-Data Quote tool"`  ≥ 1                                  | 1        |
| `grep "Sparkles"`                        ≥ 1                                  | 2        |
| `grep "/compare/quote"`                  ≥ 1                                  | 1        |
| `grep "/ml/quote"`                       ≥ 1                                  | 1        |
| `grep "dangerouslySetInnerHTML"` (no comment lines) == 0                      | 0        |
| `vitest` exits 0 with ≥ 7 tests passing                                       | 10 pass  |

---

## Deviations from Plan

### One operational deviation: rebased onto `feat/05-quote-persistence`

The orchestrator-created worktree was branched from main at commit `2f8eeca` (before Wave 1's `feat(05-01)` and `feat(05-02)` commits landed on the integration branch). Plan 06 imports `@/components/quote/StatusChip`, `@/components/quote/WorkspacePill`, and `@/lib/savedQuoteSchema` — all Wave 1 deliverables. The worktree filesystem did not contain these files, so:

- **Action:** `git rebase feat/05-quote-persistence` to bring the worktree branch onto the Wave 1 integration tip.
- **Rule applied:** Rule 3 (auto-fix blocking issues) — without these files the test imports cannot resolve and TDD cannot proceed.
- **Outcome:** Successfully rebased; HEAD remains on `worktree-agent-a3e903ef3019822cf` (per-agent branch, no protected-ref drift). All 4 task commits (RED + GREEN × 2) sit cleanly on top of the rebased base.
- **Risk:** Zero. Rebase did not modify any pre-existing commits and the worktree branch is private to this agent.

### No code-level deviations

Plan 06 had no auto-fix triggers (Rules 1, 2, 4 all N/A). Verbatim implementation of the task action blocks; no architectural changes; no auth gates; no truly new behavior beyond the plan's behavior list.

### Two intentional differences from the plan's example code (non-deviating)

- The plan's example QuoteRow has `onClick={(e) => e.stopPropagation()}` on the wrapper div around StatusChip. I extracted this into a small named helper `stopRowEvent` for `onClick + onKeyDown` parity. Behavior is identical.
- Test count exceeded the plan's minimum (≥ 12) — the actual file is 18 tests because the plan's behavior list enumerates 12 behaviors but several decompose into multiple assertions (e.g. "Click on the row body calls navigate(...)" is tested for click, Enter, and Space — three tests).

---

## Threat Model — T-05-13 Confirmed Mitigated

The plan declared one threat with `disposition: mitigate`:

- **T-05-13 (Information Disclosure, QuoteRow rendering of `quote.name`)** — The mitigation states `name rendered through React text node only — no dangerouslySetInnerHTML`. Verified: `grep -v '^//' frontend/src/pages/quotes/QuoteRow.tsx | grep -c "dangerouslySetInnerHTML"` returns `0`. `quote.name` flows through JSX text interpolation only (`{quote.name}` and `aria-label={\`Open saved quote ${quote.name}\`}`) — no HTML injection surface.

No new threat surface introduced. No threat flags to escalate.

---

## Stub Tracking

No stubs introduced. Both components fully wire their inputs through to rendering. The `MyQuotesEmptyState` empty-state CTAs link to existing routes (`/compare/quote` and `/ml/quote` exist in DemoApp.tsx). `QuoteRow`'s `onAdvanceStatus` and `onRequestDelete` callbacks are emitted upward and will be wired by Plan 07 (`MyQuotesPage`) — that's the intended boundary, not a stub.

---

## Commits

| # | Hash    | Type | Message                                                              |
| - | ------- | ---- | -------------------------------------------------------------------- |
| 1 | 4bddb66 | test | test(05-06): add failing test for QuoteRow (RED)                     |
| 2 | f707e47 | feat | feat(05-06): implement QuoteRow list-row component (GREEN)           |
| 3 | 6da5d73 | test | test(05-06): add failing test for MyQuotesEmptyState (RED)           |
| 4 | a48aa9f | feat | feat(05-06): implement MyQuotesEmptyState empty-list CTA (GREEN)     |

TDD gate compliance: each task has the `test(...)` (RED) commit before the `feat(...)` (GREEN) commit. No REFACTOR pass needed — both components were small enough to write cleanly on first pass and refactoring would introduce risk without changing behavior.

---

## Self-Check: PASSED

**Files exist:**
- FOUND: frontend/src/pages/quotes/QuoteRow.tsx
- FOUND: frontend/src/pages/quotes/QuoteRow.test.tsx
- FOUND: frontend/src/pages/quotes/MyQuotesEmptyState.tsx
- FOUND: frontend/src/pages/quotes/MyQuotesEmptyState.test.tsx

**Commits exist:**
- FOUND: 4bddb66 — test(05-06): add failing test for QuoteRow (RED)
- FOUND: f707e47 — feat(05-06): implement QuoteRow list-row component (GREEN)
- FOUND: 6da5d73 — test(05-06): add failing test for MyQuotesEmptyState (RED)
- FOUND: a48aa9f — feat(05-06): implement MyQuotesEmptyState empty-list CTA (GREEN)

**Verification commands re-ran:**
- `npx vitest run src/pages/quotes/QuoteRow.test.tsx` → 18 pass
- `npx vitest run src/pages/quotes/MyQuotesEmptyState.test.tsx` → 10 pass
- `npm run typecheck` → 0 errors
- `npx eslint <new files>` → 0 warnings
