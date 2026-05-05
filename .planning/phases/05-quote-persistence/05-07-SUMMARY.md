---
phase: 05-quote-persistence
plan: 07
subsystem: frontend
tags:
  - persistence
  - quotes
  - list-view
  - tdd
dependency_graph:
  requires:
    - 02 # SortControls + StatusChip + WorkspacePill
    - 04 # useSavedQuotes hook bundle
    - 05 # DeleteQuoteModal
    - 06 # QuoteRow + MyQuotesEmptyState
  provides:
    - MyQuotesPage # /quotes route component (Plan 09 wires the route)
  affects: []
tech-stack:
  added: []
  patterns:
    - hoisted-vi-mock-on-hook    # vi.hoisted to bind module-mock to test-scoped fns
    - locale-compare-sort        # case-insensitive name sort via Intl
    - controlled-modal-via-target # null|target state pattern for delete modal
key-files:
  created:
    - frontend/src/pages/quotes/MyQuotesPage.tsx
    - frontend/src/pages/quotes/MyQuotesPage.test.tsx
  modified: []
decisions:
  - "Hoisted module mock for @/hooks/useSavedQuotes — mirrors Plan 04's useSavedQuotes.test.tsx and Plan 05's DeleteQuoteModal.test.tsx pattern, avoiding the QueryClient + IndexedDB stack inside this page test."
  - "Sort-by-status order is draft → revised → sent → won → lost (UI-SPEC §'Sort options'), distinct from STATUS_CYCLE chip-click order — both orders are intentional per UI-SPEC."
  - "Page does NOT register itself with the router. Plan 09 wires /quotes; this plan only ships the page component, file-disjoint from Plans 08/09."
  - "Delete-flow state is held locally as { id, name } | null (not boolean). Avoids stale-name flash if a row in the list updates between modal open and close."
metrics:
  duration: ~12 min
  completed: 2026-05-05
requirements:
  - PERSIST-02
  - PERSIST-04
  - PERSIST-05
---

# Phase 05 Plan 07: MyQuotesPage Summary

**One-liner:** `/quotes` route page composes Wave 2 pieces (useSavedQuotes + SortControls + QuoteRow + MyQuotesEmptyState + DeleteQuoteModal) into the list view, with sort + status-cycle + delete-from-row flows wired end-to-end.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1-RED  | Failing tests for MyQuotesPage | `0afe84d` | `frontend/src/pages/quotes/MyQuotesPage.test.tsx` |
| 1-GREEN | Implement MyQuotesPage         | `950c28f` | `frontend/src/pages/quotes/MyQuotesPage.tsx` |

---

## What was built

### `frontend/src/pages/quotes/MyQuotesPage.tsx` (158 lines)

Route component for `/quotes`. Composes:

- **`useSavedQuotes()`** (Plan 04) — drives the list; subscribes to cross-tab `BroadcastChannel('matrix-quotes')` invalidation via the hook itself.
- **`useSetStatus()`** (Plan 04) — chip click cycles status without creating a new version.
- **`PageHeader`** — title `"My Quotes"`, verbatim UI-SPEC subhead.
- **`SortControls`** (Plan 02) — segmented control with default `"date"`, switches to `"name"` / `"status"`.
- **`QuoteRow`** (Plan 06) — one per saved quote inside a single `.card` container.
- **`MyQuotesEmptyState`** (Plan 06) — rendered when `data?.length === 0` and not loading / not error.
- **`DeleteQuoteModal`** (Plan 05) — opened from row's delete icon; verbatim D-17 confirmation.

Four mutually-exclusive render branches:
- `isLoading=true` → centered "Loading saved quotes…" text.
- `error` truthy → `role="alert"` card with AlertTriangle icon + verbatim error copy.
- `data.length === 0` → `MyQuotesEmptyState`.
- `data.length > 0` → `.card` containing N `QuoteRow` components, in `sorted` order.

Sort logic:

```ts
function sortQuotes(quotes: SavedQuote[], key: SortKey): SavedQuote[] {
  const arr = [...quotes];
  if (key === "date")   return arr.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  if (key === "name")   return arr.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  return arr.sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]);
}

const STATUS_SORT_ORDER: Record<WorkflowStatus, number> = {
  draft: 0, revised: 1, sent: 2, won: 3, lost: 4,
};
```

Pure (no in-place mutation of `data`); memoized via `useMemo` keyed on `[data, sortKey]`.

Delete-flow state model:

```ts
const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
```

- Row delete-icon click → `setDeleteTarget({ id, name })`.
- Modal renders only when `deleteTarget !== null`.
- Cancel / success → `setDeleteTarget(null)` via `onClose`.

### `frontend/src/pages/quotes/MyQuotesPage.test.tsx` (453 lines, 16 tests)

| Group | Tests |
|-------|-------|
| Heading + subhead | 3 |
| Loading state | 1 |
| Error state | 2 |
| Empty state | 1 |
| Populated state | 2 |
| Sort behaviour | 3 |
| Status-chip click | 1 |
| Delete flow | 2 |
| Jargon hygiene (sanity) | 1 |
| **Total** | **16** |

Test pattern:
- Hoisted `vi.mock("@/hooks/useSavedQuotes", ...)` returning test-controlled `useSavedQuotes` / `useSetStatus` / `useDeleteQuote` mocks. Mirrors Plan 05's `DeleteQuoteModal.test.tsx`.
- `vi.mock("sonner", ...)` neutralizes the toast call surface.
- `useNavigate` mocked in-place (rest of `react-router-dom` preserved so `MyQuotesEmptyState` `<Link>` still works).
- `setHookState({ data, isLoading, error })` helper consolidates the hook-state arrangement per test.

---

## Verification

**Commands run (in `frontend/`):**

```bash
npx vitest run src/pages/quotes/MyQuotesPage.test.tsx   # 16 / 16 pass
npm run typecheck                                       # exit 0
npm run lint -- src/pages/quotes/MyQuotesPage.tsx \
  src/pages/quotes/MyQuotesPage.test.tsx                # exit 0
npx vitest run                                          # 837 / 837 pass (full suite, no regressions)
```

**Acceptance grep checks (per plan):**

| Check | Required | Found |
|-------|----------|-------|
| `"My Quotes"` ≥ 1 | yes | 2 |
| `"Saved quotes from both Real and Synthetic"` ≥ 1 | yes | 1 |
| `"Loading saved quotes"` ≥ 1 | yes | 1 |
| `"Couldn't open your saved quotes"` ≥ 1 | yes | 1 |
| `useSavedQuotes` ≥ 1 | yes | 3 |
| `QuoteRow` ≥ 1 | yes | 4 |
| `MyQuotesEmptyState` ≥ 1 | yes | 3 |
| `SortControls` ≥ 1 | yes | 3 |
| `DeleteQuoteModal` ≥ 1 | yes | 4 |
| `from "@/api/` == 0 | yes | 0 |
| `dangerouslySetInnerHTML` (non-comment) == 0 | yes | 0 |
| `≥ 12` tests pass | yes | **16** |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing `node_modules` in worktree**

- **Found during:** Initial test run (`npx vitest run` failed with `Cannot find package 'vite'`).
- **Issue:** Worktree was created without running `npm install` in the `frontend/` subdirectory.
- **Fix:** Ran `npm install` once before TDD RED.
- **Files modified:** `frontend/node_modules/` populated; no source changes.
- **Commit:** None — install artifact, not committed.

**2. [Rule 3 - Blocking] Initial Write of test file landed in main repo path**

- **Found during:** TDD RED — first `npx vitest run` reported "no test files found".
- **Issue:** The first `Write` tool call used the path `C:\…\matrix-quote-web-demo\frontend\…` (the main repo, since `.claude/worktrees/...` is a sibling) which resolved outside the worktree. The file landed at the main-repo location, invisible to the worktree's vitest run.
- **Fix:** Deleted the misplaced file from the main repo, re-wrote the test using the explicit worktree-rooted path `C:\…\.claude\worktrees\agent-a2ce652b9d7fdd72c\frontend\…`.
- **Files modified:** Test file relocated; main-repo working tree unchanged after cleanup.
- **Commit:** Subsequent commit `0afe84d` (RED) is on the worktree branch as expected.

### Other deviations

- The orchestrator prompt mentioned "workspace filter" in the success criteria, but the PLAN.md and UI-SPEC §"Sort options (D-11, no filter)" are explicit: **sort only, no filter, for v2.0.** Followed the plan and UI-SPEC. No filter implemented; no deviation flagged because plan-as-source-of-truth supersedes the orchestrator hint.

### Auth gates encountered
None.

---

## Notes for Plan 09 (route wiring)

`MyQuotesPage` is a default-isolated route component. Plan 09 needs only:
1. `lazy()`-import the page in `frontend/src/DemoApp.tsx`.
2. Add `<Route path="/quotes" element={<MyQuotesPage />} />`.
3. Add `frontend/src/pages/quotes/MyQuotesPage.tsx` to the jargon-guard surface list (per UI-SPEC §"Jargon-Guard Scope Addition").

The page renders inside `<DemoLayout>` and inherits its top padding; `<PageHeader>` already supplies the `pb-5 sm:pb-6 mb-6 sm:mb-8` rhythm seen in `BusinessInsightsView.tsx`.

---

## Self-Check: PASSED

- File `frontend/src/pages/quotes/MyQuotesPage.tsx` — FOUND
- File `frontend/src/pages/quotes/MyQuotesPage.test.tsx` — FOUND
- Commit `0afe84d` (RED) — FOUND in `git log`
- Commit `950c28f` (GREEN) — FOUND in `git log`
- 16 / 16 page tests pass
- 837 / 837 full-suite tests pass
- typecheck + lint exit 0
- All 12 plan grep acceptance checks pass
- No `frontend/src/api/` imports
- No `dangerouslySetInnerHTML`
- No new ML jargon (sanity scan in test passes)
