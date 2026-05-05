---
phase: 05-quote-persistence
plan: 05
subsystem: frontend/components
tags: [persistence, modals, dialog, react, zod, sonner, tdd]
requires:
  - phase: 05-quote-persistence/01
    provides: savedQuoteNameSchema, SavedQuote/WorkflowStatus/Workspace types, SaveSavedQuoteArgs
  - phase: 05-quote-persistence/04
    provides: useSaveQuote / useDeleteQuote / useSetStatus mutation hooks (consumed by signature; full impl arrives at merge time)
provides:
  - frontend/src/components/quote/SaveQuoteDialog.tsx (centered Save modal with zod validation + revised-assist toast)
  - frontend/src/components/quote/DeleteQuoteModal.tsx (D-17 hard-delete confirmation modal)
affects:
  - 05-06 (list page mounts DeleteQuoteModal from row Trash icon)
  - 05-07 (QuoteResultPanel mounts SaveQuoteDialog from "Save quote" button)
  - 05-08 (detail page mounts both — Delete header button + Save on form re-submit)
  - 05-09 (Compare-side save mounts SaveQuoteDialog with humanQuotedByBucket payload)
tech-stack:
  added: []
  patterns:
    - Centered-modal scaffold (backdrop + ESC handler + role=dialog + aria-modal + form submit)
    - sonner action toast for one-tap follow-ups (D-10 "Mark as revised?" assist)
    - zod re-validation at the UI boundary as defense-in-depth (T-05-10)
    - React text node + <strong> for user-supplied content rendering (T-05-12 — never raw HTML)
key-files:
  created:
    - frontend/src/components/quote/SaveQuoteDialog.tsx (220 lines)
    - frontend/src/components/quote/SaveQuoteDialog.test.tsx (415 lines, 17 tests)
    - frontend/src/components/quote/DeleteQuoteModal.tsx (115 lines)
    - frontend/src/components/quote/DeleteQuoteModal.test.tsx (266 lines, 15 tests)
  modified: []
key-decisions:
  - Modal scaffold reused across both files for visual + a11y consistency (matches ProjectDetailDrawer:38-49 ESC pattern, adapted from slide-over to centered)
  - Save dialog name field gets autofocus + select-all on open so typing replaces the auto-suggested prefill
  - Maximum input length is 120 chars (hard ceiling); zod still rejects > 80 with the verbatim too-long error
  - Mark-as-revised assist gated on saved.versions.length >= 2 AND saved.status !== "revised" (D-10)
  - Delete confirm uses primary-danger button on RIGHT and secondary Cancel on LEFT (UI-SPEC reversal rule for destructive intent)
  - useSavedQuotes module exists as a wave-2 type-only stub in this worktree (not committed) — Plan 04's full hook supersedes at integration
patterns-established:
  - Test fixture loose-typing pattern: `Record<string, unknown>` over-type for makeSavedQuote() fixtures so passthrough-typed schema fields don't fight strict TS
  - Modal a11y: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` referencing an `id="..."` heading
  - Modal interaction: backdrop element gets `role="presentation" aria-hidden="true"` so it's the click-to-close target without competing for screen reader attention
requirements-completed:
  - PERSIST-01
  - PERSIST-04
  - PERSIST-05
duration: 25min
completed: 2026-05-05
---

# Phase 5 Plan 05: Save + Delete modal dialogs Summary

**SaveQuoteDialog and DeleteQuoteModal — centered modal scaffold (ESC + backdrop + role=dialog), zod-validated name field with verbatim UI-SPEC errors, conditional "Mark as revised?" sonner action toast for v2+ saves, and D-17 hard-delete confirm with quote name escaped through React text nodes inside `<strong>`.**

## Performance

- **Duration:** ~25 min (RED + GREEN + refactor across 2 TDD tasks)
- **Started:** 2026-05-05T16:32:00Z
- **Completed:** 2026-05-05T16:40:00Z
- **Tasks:** 2 (both TDD, both autonomous)
- **Files created:** 4
- **Files modified:** 0

## Accomplishments

- `SaveQuoteDialog` opens with auto-suggested or existing name prefilled and selected; ESC, backdrop click, and Cancel all close cleanly.
- Name validation uses `savedQuoteNameSchema.safeParse(name)` so the verbatim UI-SPEC errors ("Please give this quote a name before saving." / "That name is too long — keep it under 80 characters.") surface inline without a network round-trip.
- Successful save fires `toast.success("Quote saved.")`. When the saved record is v2+ AND status is not already "revised", the toast carries an action button labelled "Mark as revised?" that calls `useSetStatus.mutateAsync({ id, status: "revised" })`.
- Save failure surfaces the verbatim "Couldn't save this quote. Browser storage might be full or blocked. Try again, or free up some space." toast and keeps the modal open so the user can retry.
- `DeleteQuoteModal` renders the D-17 verbatim body (`Delete '<name>' permanently? This removes its full version history.`) with the user's quote name interpolated through a React text node inside `<strong>`, so even strings like `Alpha <script>` render as plain text (T-05-12).
- `Keep it` is on the LEFT, `Delete permanently` (primary danger) on the RIGHT — the reversed button order documented in UI-SPEC for destructive intent.
- Delete success path invokes `onDeleted` BEFORE `onClose`, so consumer pages can redirect or close drawers in the correct order; failure path keeps the modal open with a verbatim error toast.

## Task Commits

Each task followed RED → GREEN TDD:

1. **Task 1 RED: SaveQuoteDialog test** — `b968968` (test)
2. **Task 1 GREEN: SaveQuoteDialog impl** — `2a3e3c7` (feat)
3. **Task 2 RED: DeleteQuoteModal test** — `4694302` (test)
4. **Task 2 GREEN: DeleteQuoteModal impl + SaveQuoteDialog test type cleanup** — `4bd6e3a` (feat)

_No separate REFACTOR commits — the only refactor (test-fixture types) was rolled into the Task 2 GREEN commit because it was needed for the typecheck to clear before final acceptance verification._

## Files Created/Modified

- `frontend/src/components/quote/SaveQuoteDialog.tsx` — Centered Save modal: prefill, zod validation, success toast (with optional revised-assist action), error toast, focus management.
- `frontend/src/components/quote/SaveQuoteDialog.test.tsx` — 17 tests: scaffold (5), close behaviour (3), validation (2), submit success (5), submit failure (1), revised assist click (1).
- `frontend/src/components/quote/DeleteQuoteModal.tsx` — D-17 confirmation modal: verbatim body, reversed-order danger button, success/error toasts.
- `frontend/src/components/quote/DeleteQuoteModal.test.tsx` — 15 tests: scaffold (3), body copy (2 incl. `<script>` escape proof), buttons (3), close (3), confirm success (3), confirm failure (1).

## Decisions Made

- **No `dangerouslySetInnerHTML` anywhere** — verified by grep against the source files. Quote names render through React text nodes only.
- **Form-driven submission for SaveQuoteDialog** — wrapped the panel in `<form onSubmit>` so Enter in the name input submits naturally, matching the UI-SPEC interaction table.
- **`onClick={(e) => e.stopPropagation()}` on the panel** — prevents the backdrop's onClick from firing when the user clicks inside the dialog.
- **`window.setTimeout(..., 0)` for autofocus + select** — defers the focus call to the next tick so the input is fully mounted before being focused.
- **`useSavedQuotes.ts` parallel-wave stub** — created as an untracked file in this worktree (NOT committed). It exports the three hooks the modals need (`useSaveQuote`, `useDeleteQuote`, `useSetStatus`) by wrapping `quoteStorage` directly. Plan 04's full implementation (with cache invalidation + BroadcastChannel subscription) replaces it at integration time. This kept Plan 05 typecheck-clean inside the worktree without colliding with Plan 04's commits.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created Plan 04 hook stub so this worktree compiles**

- **Found during:** Task 1 (SaveQuoteDialog imports `@/hooks/useSavedQuotes` which doesn't exist in this worktree branch)
- **Issue:** Wave-2 worktree was forked before Plans 01/04 landed; both modals' production code imports `useSaveQuote`/`useDeleteQuote`/`useSetStatus` from `@/hooks/useSavedQuotes`. Without that file, `tsc --noEmit` fails before tests can run, blocking RED-phase verification.
- **Fix:** Created `frontend/src/hooks/useSavedQuotes.ts` as an UNTRACKED stub matching the Plan 04 hook contract (signatures only, thin wrappers around `quoteStorage` mutations). It is intentionally not staged or committed — Plan 04's full implementation supersedes it at merge time.
- **Files modified:** `frontend/src/hooks/useSavedQuotes.ts` (untracked, not committed)
- **Verification:** `tsc --noEmit` exits clean; both test files run; integration won't conflict because the file is absent from this worktree's commits.
- **Committed in:** N/A — deliberately untracked per project_specifics ("rely on it being wired post-merge")

**2. [Rule 1 - Bug] Reformatted DeleteQuoteModal body so the D-17 verbatim string is grep-findable on a single line**

- **Found during:** Task 2 GREEN acceptance grep
- **Issue:** Initial JSX broke the body across two source lines for readability (`Delete <name> permanently? This\n removes...`). The acceptance criterion `grep -c "permanently? This removes its full version history" >= 1` matched 0 because the substring spans a newline.
- **Fix:** Joined the trailing fragment into a single string literal `{" permanently? This removes its full version history."}` so the grep finds it intact in source. Visual rendering is identical.
- **Files modified:** `frontend/src/components/quote/DeleteQuoteModal.tsx`
- **Verification:** grep count rose to 2 (the string appears once in source plus once in a JSDoc comment); 15/15 tests still pass.
- **Committed in:** `4bd6e3a`

**3. [Rule 1 - Bug] Removed literal "dangerouslySetInnerHTML" mention from JSDoc comment**

- **Found during:** Task 2 GREEN acceptance grep
- **Issue:** Acceptance grep `grep -v '^//' src/.../DeleteQuoteModal.tsx | grep -c "dangerouslySetInnerHTML" == 0` filters out `//` comments but NOT `/* * */` JSDoc lines. The JSDoc explained why we don't use the API but tripped the check.
- **Fix:** Reworded the JSDoc to "no raw HTML insertion" and "auto-escaped" without naming the React API directly.
- **Files modified:** `frontend/src/components/quote/DeleteQuoteModal.tsx`
- **Verification:** Acceptance grep now reports 0 matches.
- **Committed in:** `4bd6e3a`

**4. [Rule 1 - Bug] Loosened test fixture types so SavedQuote fixtures with passthrough-typed unifiedResult assign cleanly**

- **Found during:** Task 2 GREEN typecheck after extending the test fixture set
- **Issue:** zod's `unifiedQuoteResultSchema.passthrough()` infers a wider type than the `UnifiedQuoteResult` interface, so `versions[i].unifiedResult: FAKE_RESULT` failed strict assignment.
- **Fix:** Changed `makeSavedQuote(over: Partial<SavedQuote>)` to `makeSavedQuote(over: Record<string, unknown>)` and final cast `as unknown as SavedQuote`. Also added the missing denormalized fields (`salesBucket`, `visionLabel`, `materialsCost`) the schema requires.
- **Files modified:** `frontend/src/components/quote/SaveQuoteDialog.test.tsx`
- **Verification:** `tsc --noEmit` clean; lint clean; 17/17 tests still pass.
- **Committed in:** `4bd6e3a`

---

**Total deviations:** 4 auto-fixed (1 blocking, 3 bugs)
**Impact on plan:** All auto-fixes were necessary to satisfy acceptance criteria or get the worktree to typecheck inside the parallel-execution model. No scope creep — both modals match the UI-SPEC and `<interfaces>` contracts exactly.

## Issues Encountered

- **Worktree forked before phase 05 landed.** The agent worktree's base commit predated all phase 5 planning files. Resolved by copying the planning artefacts and Plan 01/02 source files from the integration branch (`feat/05-quote-persistence`) into the worktree as untracked working-copy files (not committed). Standard parallel-wave coordination — the integration step deduplicates them.

- **Sonner v1.4 Action.onClick signature mismatch in tests.** The toast `Action` type expects an `onClick(event: MouseEvent)` handler, but the test extracts the action via index signature and calls `.onClick()` with no arg. Resolved with a localised `as any` cast at the extraction site (one line, eslint-disable scoped).

## TDD Gate Compliance

Both tasks followed RED → GREEN with separate commits per phase:

| Task | RED commit | GREEN commit | REFACTOR |
|------|------------|--------------|----------|
| 1 (SaveQuoteDialog) | `b968968` (test) | `2a3e3c7` (feat) | rolled into `4bd6e3a` (test type cleanup) |
| 2 (DeleteQuoteModal) | `4694302` (test) | `4bd6e3a` (feat) | n/a |

Each RED commit was verified to fail before writing the implementation. GREEN commits were verified to pass all behavior assertions before being made.

## User Setup Required

None — purely client-side React components, no external services or env vars.

## Next Phase Readiness

Wave 2 sibling plans 03/04/06 can land in any order — none of them import these modals (they're consumed in Wave 3). Wave 3 plans 07, 08, 09 each mount one or both modals from their consumer pages:

- Plan 07 (QuoteResultPanel save trigger): `<SaveQuoteDialog open={modalOpen} onClose={...} payload={{ ...resultState, suggestedName: buildAutoSuggestedName(formValues, result, new Date()) }} />`
- Plan 08 (detail page header Delete button): `<DeleteQuoteModal open={confirmOpen} onClose={...} quoteId={quote.id} quoteName={quote.name} onDeleted={() => navigate("/quotes")} />`
- Plan 09 (Compare-side save trigger): same as 07 plus `compareInputs: { humanQuotedByBucket }` in the payload.

No blockers. Wave 3 consumers see fully typed `SaveQuoteDialogProps` and `DeleteQuoteModalProps` exported from this plan's source files.

## Self-Check: PASSED

Created files verified:
- `frontend/src/components/quote/SaveQuoteDialog.tsx` — FOUND
- `frontend/src/components/quote/SaveQuoteDialog.test.tsx` — FOUND
- `frontend/src/components/quote/DeleteQuoteModal.tsx` — FOUND
- `frontend/src/components/quote/DeleteQuoteModal.test.tsx` — FOUND

Commits verified in `git log --oneline`:
- `b968968` — FOUND (Task 1 RED)
- `2a3e3c7` — FOUND (Task 1 GREEN)
- `4694302` — FOUND (Task 2 RED)
- `4bd6e3a` — FOUND (Task 2 GREEN + refactor)

Test results: 32/32 passing on the two new test files; 766/766 total project tests still passing.
Typecheck: clean.
Lint: clean.

---
*Phase: 05-quote-persistence*
*Plan: 05*
*Completed: 2026-05-05*
