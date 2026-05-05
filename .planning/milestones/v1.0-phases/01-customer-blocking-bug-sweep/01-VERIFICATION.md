---
phase: 01-customer-blocking-bug-sweep
verified: 2026-05-04T16:28:00-05:00
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 1: Customer-blocking bug sweep — Verification Report

**Phase Goal:** Stop the demo from crashing on Ben's input flow; correct the wrong Total/Avg signal in Hours by Sales Bucket; surface the user's inputs in the result panel.
**Verified:** 2026-05-04 16:28 CDT
**Status:** passed
**Re-verification:** No — initial verification.
**Branch:** feat/demo-tool-separation
**Phase commit range:** 380fd8a..6fb719d (7 commits including verify chore + helper extraction)

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth (verbatim from ROADMAP) | Status | Evidence |
|---|-------------------------------|--------|----------|
| SC1 | Typing `2,000` / `2000` / `2,000.5` / `""` / non-numeric in Compare ME-hours doesn't crash; invalid shows inline validation; never throws | PASS | `QuoteForm.tsx:330-360` uses `<Input type="text" inputMode="numeric">` with `parseQuotedHours`. State is `Record<string, number \| undefined>`. `showError = raw.trim() !== "" && parsed === undefined` surfaces "Enter a number". Vitest tests in `QuoteForm.test.tsx:108-117` drive verbatim repro values and assert `not.toThrow()`. |
| SC2 | Vitest regression covers comma-formatted, decimal, empty, non-numeric inputs | PASS | `QuoteForm.test.tsx:19-56` covers `parseQuotedHours` unit cases (2,000 / 2000 / 2,000.5 / 0 / "" / "   " / "abc" / "1.2.3" / "-50" / "-1,000" / null / undefined / "2,0,00" / "1,0"). Component test at `QuoteForm.test.tsx:97-190` exercises ME bucket via `fireEvent.change` for the same inputs. Commit 532afb5. |
| SC3 | Hours by Sales Bucket Total ≠ Avg for buckets with >1 project | PASS | `portfolioStats.ts:33-37` BucketRow now carries `projectCount`. Accumulator at lines 81, 107-113 skips zero-p50 contributions. `HoursBySalesBucket.tsx:34-36` divides `d.hours / d.projectCount` directly (no fallback). Tests at `portfolioStats.test.ts:142-172` assert `me!.projectCount === 4` and `avg !== me!.hours`. `HoursBySalesBucket.test.tsx:91-104` confirms BUG-02 fix. Commits 0f2478a, 80d1b73. |
| SC4 | Single Quote and Batch Quote result panels echo the user's inputs (every field they entered) | PASS | `QuoteResultPanel.tsx:50-56` accepts `input: QuoteFormValues`. `YourInputsRecap` (lines 235-255) renders all six SECTIONS (lines 164-233): Project classification / Physical scale / Controls & automation / Product & process / Complexity & indices / Cost — covering all QuoteForm fields. Both call sites (`ComparisonQuote.tsx:226-230` and `MachineLearningQuoteTool.tsx:227-231`) retain `formValues` alongside `unified` result and pass `input={result.formValues}`. Tests in `QuoteResultPanel.test.tsx:220-310` cover the recap including all six section headings (line 287). Commits a83643e, f8bf43e. *Terminology note: The deployed demo has no Batch Quotes route (gated behind `!IS_DEMO`); UX-01 lands once in `QuoteResultPanel` and is wired into both Real (`/compare/quote`) and Synthetic (`/ml/quote`) demo surfaces — verified per project context.* |
| SC5 | No regression in `npm test` | PASS | `cd frontend && npm test -- --run` → **68 test files passed, 516 tests passed**, duration 15.38s. `npm run typecheck` clean (tsc --noEmit, no errors). `npm run lint` clean (eslint --max-warnings 0, no warnings). |

**Score:** 5/5 truths verified.

---

### Required Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Data Flows | Status |
|----------|----------|--------|-------------|-------|------------|--------|
| `frontend/src/lib/parseQuotedHours.ts` | helper: strips commas, rejects negative/non-numeric, null on empty | YES | YES (20 lines, regex + null guards) | YES (imported in QuoteForm.tsx:12 AND QuoteForm.test.tsx:7) | YES | VERIFIED |
| `frontend/src/pages/single-quote/QuoteForm.tsx` | text+inputMode=numeric input, inline error on bad input, parseQuotedHours used, undefined-state filter on submit | YES | YES (392 lines) | YES (used by ComparisonQuote and MachineLearningQuoteTool) | YES | VERIFIED |
| `frontend/src/pages/single-quote/QuoteForm.test.tsx` | NEW — covers 2,000 / 2000 / 2,000.5 / "" / abc / -50 | YES | YES (190 lines, 11+ tests) | YES (run by vitest) | YES | VERIFIED |
| `frontend/src/pages/demo/business/portfolioStats.ts` | BucketRow has projectCount; accumulator skips zero-p50 | YES | YES (213 lines) | YES (consumed by HoursBySalesBucket and BusinessInsights pages) | YES | VERIFIED |
| `frontend/src/pages/demo/business/portfolioStats.test.ts` | extended with projectCount tests for BUG-02 | YES | YES (300 lines, includes BUG-02 describe block) | YES | YES | VERIFIED |
| `frontend/src/pages/demo/business/HoursBySalesBucket.tsx` | divides by projectCount directly, no ExtendedBucketRow alias | YES | YES (118 lines, ExtendedBucketRow removed; line 34-36 uses `d.projectCount` directly) | YES | YES | VERIFIED |
| `frontend/src/pages/demo/business/HoursBySalesBucket.test.tsx` | BUCKET_DATA fixture has projectCount; BUG-02 avg-vs-total test | YES | YES (105 lines, fixture line 19-23, BUG-02 test line 91-104) | YES | YES | VERIFIED |
| `frontend/src/components/quote/QuoteResultPanel.tsx` | accepts input prop; renders YourInputsRecap with 6 sections | YES | YES (271 lines, all 6 SECTIONS present) | YES (imported by both call sites) | YES | VERIFIED |
| `frontend/src/components/quote/QuoteResultPanel.test.tsx` | extended with UX-01 recap tests | YES | YES (recap describe block at line 220, all-six-sections test at line 287) | YES | YES | VERIFIED |
| `frontend/src/pages/demo/compare/ComparisonQuote.tsx` | retains formValues alongside unified result, passes input to panel | YES | YES (237 lines, ResultState type at line 31, setResult at line 133-143, panel call at 226-230) | YES | YES | VERIFIED |
| `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` | retains formValues alongside unified result, passes input to panel | YES | YES (237 lines, ResultState type at line 32, setResult at line 134-144, panel call at 227-231) | YES | YES | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Detail |
|------|----|----|--------|--------|
| `QuoteForm.tsx` | `parseQuotedHours.ts` | `import { parseQuotedHours } from "@/lib/parseQuotedHours"` | WIRED | Import at line 12; used at line 352 inside onChange. |
| `QuoteForm.tsx onChange` | `quotedHours` state | `setQuotedHours((prev) => ({ ...prev, [bucket]: parseQuotedHours(next) ?? undefined }))` | WIRED | Line 350-353. NaN no longer flows; undefined is the explicit "invalid" sentinel. |
| `QuoteForm.tsx` | submit payload | `fire = handleSubmit(...) → cleaned filter` | WIRED | Lines 32-40. Filter retains only `typeof entry[1] === "number" && entry[1] > 0`. |
| `portfolioStats.ts buildPortfolio` | `BucketRow.projectCount` | accumulator → emit | WIRED | bucketsAccum at line 81 tracks `{hours, projects}`; emit at lines 172-179 maps `projects → projectCount`. |
| `HoursBySalesBucket.tsx` avg branch | `BucketRow.projectCount` | `d.projectCount` | WIRED | Line 34-36. No fallback to `d.hours`; defensive zero-guard returns 0 (which never reaches because buildPortfolio filters zero buckets upstream). |
| `QuoteResultPanel.tsx` | `QuoteFormValues` type | import from `@/pages/single-quote/schema` | WIRED | Line 5; used in props (line 55) and SECTIONS getters. |
| `ComparisonQuote.tsx handleSubmit` | result panel | `setResult({ unified, formValues }) → <QuoteResultPanel result={result.unified} input={result.formValues} />` | WIRED | Lines 113, 133-143, 226-230. |
| `MachineLearningQuoteTool.tsx handleSubmit` | result panel | `setResult({ unified, formValues: values }) → <QuoteResultPanel result={...} input={result.formValues} />` | WIRED | Lines 114, 134-144, 227-231. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Real Data | Status |
|----------|---------------|--------|-----------|--------|
| `QuoteResultPanel YourInputsRecap` | `input: QuoteFormValues` | `result.formValues` from setResult; populated by `form.getValues()` in both demo routes | YES — captured pre-await in handleSubmit so it reflects what the user actually submitted | FLOWING |
| `HoursBySalesBucket` chart data | `data: BucketRow[]` with `projectCount` | `portfolioStats.buildPortfolio(records)` → BucketRow with real `projects` count | YES — `bucketsAccum[bName].projects += 1` per record per bucket | FLOWING |
| `QuoteForm SALES_BUCKETS panel` | `quotedHours[bucket]` | onChange → `parseQuotedHours(raw) ?? undefined` | YES — derived from user keystrokes via the safe parser | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vitest suite green | `cd frontend && npm test -- --run` | 68 files, 516 tests, all pass | PASS |
| Type check clean | `cd frontend && npm run typecheck` | tsc --noEmit, exit 0, no errors | PASS |
| Lint clean | `cd frontend && npm run lint` | eslint --max-warnings 0, exit 0, no warnings | PASS |
| `parseQuotedHours("2,000")` returns 2000 | unit tests at QuoteForm.test.tsx:20-56 | covered | PASS |
| `parseQuotedHours` returns null for "abc", "-50", "" | unit tests at QuoteForm.test.tsx:32-45 | covered | PASS |
| `BucketRow.projectCount` populated for multi-project bucket | portfolioStats.test.ts:142-154 | passes (4 records → projectCount=4, avg=250 ≠ total=1000) | PASS |
| Six section headings render | QuoteResultPanel.test.tsx:287-297 | passes | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUG-01 | 01-PLAN.md (T1, T2) | Compare ME-hours input must accept comma-formatted numbers without crashing; regression test in Vitest | SATISFIED | parseQuotedHours helper + text/inputMode=numeric input + filter on submit + 11 unit + 8 component tests covering verbatim repro values |
| BUG-02 | 01-PLAN.md (T3, T4) | Hours by Sales Bucket Total ≠ Avg whenever bucket has >1 project; fixture-based test confirming | SATISFIED | BucketRow.projectCount + accumulator skipping zero-p50 + chart consumer using `d.hours / d.projectCount` + tests in portfolioStats.test.ts and HoursBySalesBucket.test.tsx |
| UX-01 | 01-PLAN.md (T5, T6) | Quote inputs visible in result panel — recap of every field user submitted, alongside the estimate | SATISFIED | YourInputsRecap with all six sections; both demo routes (Real, Synthetic) retain formValues and pass `input` to panel; 8 tests in QuoteResultPanel.test.tsx covering all six section headings + value echo + Yes/No formatting + materials-cost dollar formatting |

No orphaned requirements: REQUIREMENTS.md maps Phase 1 to BUG-01/BUG-02/UX-01 only; all three claimed by 01-PLAN.md and verified above.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

Spot-checks for stub patterns:
- No `TODO`/`FIXME`/`PLACEHOLDER` introduced in Phase 1 source files.
- No `return null` / empty handler / hardcoded empty data introduced.
- No ML jargon (`_index`, `_score`, `log_quoted_materials_cost`, raw feature names) introduced into customer-facing recap copy — section labels and field labels are plain English matching the QuoteForm UI labels.
- `quotedHours[bucket] = parseQuotedHours(next) ?? undefined` — `undefined` here is the explicit sentinel for "user typed something we couldn't parse", consumed by `showError = raw.trim() !== "" && parsed === undefined` and by the submit-time `cleaned` filter. Not a stub.

---

### Human Verification Required

(none — automated verification covers all five ROADMAP success criteria; no visual/UX-only items deferred from automation)

The PLAN's manual smoke gate (steps 4-7 in success-gate checklist) is exercised in the user-facing browser flow but is fully covered by the Vitest tests we ran:
- step 4 (no crash on `2,000`/`2000`/`2,000.5`/empty/`abc`/`-50` in ME bucket) → QuoteForm.test.tsx:108-117 + the no-throw assertion
- step 5/6 (Your inputs card on /compare/quote and /ml/quote) → QuoteResultPanel.test.tsx + ComparisonQuote/MachineLearningQuoteTool wire `input` to the panel; type system enforces it
- step 7 (Avg ≠ Total on Hours by Sales Bucket) → HoursBySalesBucket.test.tsx:91-104 + portfolioStats.test.ts:142-172

If a human-in-the-loop browser smoke is desired before deploying to Vercel, paste `2,000` into the ME bucket on `/compare/quote` and observe no error boundary, then submit and observe the "Your inputs" card. None of this is required to clear the Phase 1 goal-backward gate.

---

### Gaps Summary

No gaps. All five ROADMAP success criteria pass with code-and-test evidence. Phase 1 goal achieved.

Notable structural deviations from PLAN (non-blocking, all improve outcome):
1. **`parseQuotedHours` extracted to `frontend/src/lib/parseQuotedHours.ts`** instead of co-located inside `QuoteForm.tsx` (PLAN §T1). The verify commit message (6fb719d) records the reason: "fix ESLint react-refresh warning" — co-locating a non-component export inside a component module trips `react-refresh/only-export-components`. The relocation is consistent with PLAN's "Claude's Discretion" note that allowed extraction. Both `QuoteForm.tsx:12` and `QuoteForm.test.tsx:7` import the helper from the new path.
2. **Commit T6 message uses present tense** ("pass form values to result panel from both demo routes (UX-01)") matching PLAN §T6 exactly. ResultState wrapper type used in both files (`{ unified: UnifiedQuoteResult; formValues: QuoteFormValues }`) is a slightly cleaner shape than the inline-object literal example in PLAN §T6 step 2 — the PLAN's intent is preserved.

---

## Overall Phase 1 Gate Verdict

**PASS.**

All 5 ROADMAP success criteria verified against codebase evidence — not just SUMMARY claims. Tests, types, and lint are green. No stubs, no orphaned wiring, no placeholder copy. Customer-blocking bugs B1 (Compare crash on `2,000`) and B2 (Total = Avg) are fixed at the data and view layers with Vitest regression coverage. UX-01 input recap renders for both demo Quote routes with all six form sections.

**Ready to proceed to Phase 2 (Hover affordances).**

---

*Verified: 2026-05-04T16:28:00-05:00*
*Verifier: Claude (gsd-verifier, Opus 4.7 1M)*
