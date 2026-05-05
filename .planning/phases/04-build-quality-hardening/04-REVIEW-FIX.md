---
phase: 4
fixed_at: 2026-05-05T09:56:00-05:00
review_path: .planning/phases/04-build-quality-hardening/04-REVIEW.md
fix_scope: critical_warning
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-05-05 (CDT)
**Source review:** `.planning/phases/04-build-quality-hardening/04-REVIEW.md`
**Iteration:** 1
**Fix scope:** `critical_warning` — Critical + Warning findings only; Info findings explicitly out of scope per `--fix` flag.

**Summary:**
- Findings in scope: 1 (0 Critical, 1 Warning)
- Fixed: 1
- Skipped: 0
- Out-of-scope (Info findings, not addressed in this run): 4

## Fixed Issues

### WR-01: Two of three jargon-guard surfaces share the DataProvenanceNote dependency, narrowing real coverage

**Files modified:** `frontend/src/test/jargon-guard.test.tsx`
**Commit:** `bb880d3`
**Applied fix:**

Two-part change matching the WR-01 "Fix (cheap)" recommendation:

1. **Coverage broadening** — added a fourth `it()` case rendering `<BusinessInsightsView source="synthetic" records={FAKE_RECORDS} datasetLabel="Test · Synthetic" isLoading={false} error={null} />`. This exercises the synthetic variant of `<DataProvenanceNote>` (the one shipping on the `/ml/insights` route) which previously had no second-surface validation in the jargon-guard. A Rule-1 leak introduced only into the synthetic copy block of `DataProvenanceNote.tsx` would now fail this case.

2. **Assertion tightening** — replaced the smoke-test assertion `expect(body.length).toBeGreaterThan(0)` in all four cases with discriminating marker-string assertions:
   - `QuoteResultPanel`: `expect(body).toMatch(/estimated hours/i)` — matches the eyebrow header copy in `QuoteResultPanel.tsx:70`.
   - `BusinessInsights` / both `BusinessInsightsView` cases: `expect(body).toMatch(/business insights/i)` — matches the `PageHeader` title rendered at `BusinessInsightsView.tsx:261`.

   The `LoadingSkeleton` branch (`BusinessInsightsView.tsx:72-112`) renders only `<SkeletonBlock>` divs with no text content, so the `/business insights/i` marker fails loudly if a future mock regression drops the page into the loading state. (The `aria-label="Loading business insights"` on the skeleton wrapper is an attribute, not a text node — `document.body.textContent` does not include it.)

**Verification:**
- Vitest: `npm test -- --run jargon-guard` → 4 passed (was 3).
- TypeScript: `npx tsc --noEmit` → no errors related to the modified file.

The two existing `BusinessInsights` (via shim) and `BusinessInsightsView` (real-variant) cases were preserved unchanged in structure — they still serve as regression scaffolding for the shim re-export path and the explicit-props path. Only the assertion lines and the case naming (added "(real variant)" qualifier) were touched in those two cases.

## Skipped Issues

None — all in-scope findings were fixed.

## Out of Scope (Info findings — not addressed)

Per the `--fix` flag the fixer only applies Critical + Warning findings. The four Info findings from `04-REVIEW.md` are documented here for traceability but were intentionally not modified in this run:

- **IN-01 (`frontend/src/test/jargon.ts:13-30`)**: BANNED_TOKENS array divergence risk — no test asserts canonical equivalence with the seven other inline jargon-guards. Per CONTEXT D-03 this was an explicit deferred-housekeeping decision for Phase 4 (don't refactor the seven other guards in this phase). A future opportunistic dedup or meta-test (asserting every inline regex set is a subset of `BANNED_TOKENS`) is the correct remediation path; both are out of scope here.
- **IN-02 (`frontend/src/test/jargon.ts:26`)**: `/R²/` lacks the `i` flag while siblings carry it. Byte-equivalent to the original `glossary.test.ts:75` source, no functional impact today (no real lowercase variant exists). Pure consistency nit; deferred.
- **IN-03 (`frontend/src/test/jargon.ts:18`)**: bare `\b` word boundary on Latin-1 tokens — known JS edge case for Unicode prefixes. Today's array is ASCII-only so the issue is theoretical; defensive `u`-flag hardening is appropriate when/if Unicode tokens are added.
- **IN-04 (`frontend/src/lib/glossary.ts:6-12`)**: forward-reference comment "Phase 4 DATA-03 will extend the jargon-guard test to scan this file" is now stale (Phase 4 is done). One-line copy fix at any point — not a defect, comment-only no-op. Per CONTEXT.md §canonical_refs and the 04-03 plan §Out-of-scope, this was an accepted omission for Phase 4.

These four Info items remain in `04-REVIEW.md` as the source of record. None block phase ship; rerun `/gsd-code-review --fix --all` (or address opportunistically in a later phase) to apply them.

---

_Fixed: 2026-05-05_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
