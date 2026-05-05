# Phase 4 Plan Check

**Date:** 2026-05-04
**Phase:** 4 — Build / quality hardening
**Plans reviewed:** 04-01, 04-02, 04-03, 04-04
**Verdict:** APPROVED-WITH-NITS

## Goal-backward analysis

Working from each ROADMAP §Phase 4 success criterion to the plan that delivers it:

| # | ROADMAP success criterion | Delivered by | Proving success-gate item |
|---|---|---|---|
| 1 | vercel.json covers /demo-assets/models_real/* and /demo-assets/models_synthetic/*; dead /demo-assets/models/ rule removed | **04-01** | gate 7 — node -e canonical-order check via JSON.stringify equality (also cross-checked in 04-04 gate 7) |
| 2 | scripts/build_demo_static.py LFS-pointer guard exits non-zero with actionable msg; tested via sandbox pointer file | **04-02** | gate 5 — pytest passes new test_lfs_pointer_triggers_hard_fail (asserts pytest.raises(SystemExit) + stderr "LFS pointer detected at") |
| 3 | Jargon-guard extends to QuoteResultPanel.tsx, BusinessInsights*.tsx; banned-term list unchanged | **04-03** | gate 10 — vitest describe block runs >= 3 it() cases all PASS; gate 4 confirms 16 patterns preserved |
| 4 | CI / npm test continues to pass | **04-04** | gates 1-4 — npm test, typecheck, lint --max-warnings 0, npm run build all exit 0 |

Every criterion has a single owner plan plus a Wave-2 cross-check. No criterion is double-owned or orphaned.

## Per-plan findings

### 04-01 — DATA-01 (vercel.json)

- **Concrete?** Yes. CODE VIEW T1 contains the exact final JSON block (3 objects, exact strings, exact order). No re-derivation needed.
- **Acceptance grep-able?** All 6 success-gate items use node -e JSON.parse, grep -c, or git diff. No subjective checks. Spot-check: gate 4 (grep -cF for the immutable header value returns 2) and gate 7 (canonical order via JSON.stringify equality) are bulletproof.
- **Two-view format?** Yes — PLAN VIEW lines 28-87, CODE VIEW lines 90-163.
- **Risks real?** R1 (rule precedence — disjoint, irrelevant), R2 (trailing comma — real risk for hand-edits), R3 (do not touch other top-level keys — real, gate 6 catches it), R4 (deploy out of scope) — all substantive, no boilerplate.
- **Out-of-scope discipline?** Strong. Explicitly excludes COEP/COOP/CSP, no rewrites changes.
- **Confirmed against current state:** vercel.json today has ["/demo-assets/models/(.*)","/demo-assets/py/(.*)"] (2 entries) — plan correctly identifies the dead rule + need for 3 entries.
- **Verdict:** APPROVED.

### 04-02 — DATA-02 (LFS hard-fail)

- **Concrete?** Yes. Before/after Python snippets at lines 129-157 are byte-equivalent to current scripts/build_demo_static.py:173-186. Confirmed against source.
- **Acceptance grep-able?** Gates 1-6 all use grep, python3 -c, or pytest exit codes. Spot-check: gate 1 (grep -c "skipped_lfs" returns 0) catches incomplete cleanup; gate 4 uses inspect.getsource to verify in-function presence (not just file-level).
- **Two-view format?** Yes — PLAN VIEW 36-111, CODE VIEW 114-302.
- **Risks real?** R1 (Vercel-build behavior change — intended), R2 (local devs without LFS — accepted with actionable msg), R3 (src-missing branch unchanged — locked in CONTEXT D-02), R4 (monkeypatch works because DEMO_ROOT is read at call time — verified by reading source line 160), R5 (metrics-write skipped after die — correct). All substantive.
- **Out-of-scope discipline?** Strong. No vercel_build.sh changes, no _die refactor, no new pip deps.
- **Wave-2 fixture compatibility:** Existing build_mod fixture is scope="module", but monkeypatch is function-scoped and reverts — test isolation preserved. Verified.
- **Missing-src-branch test message:** Plan asserts "ML tool will be non-functional" in captured.err — confirmed verbatim against _copy_model_bundle line 164. Will pass.
- **NIT — test count off-by-one:** Plan 04-02 gate 5 says "6 tests pass" expecting (4 existing + 2 new). Reality: tests/scripts/test_build_demo_static.py has **5 existing tests** (test_out_dir_is_under_frontend_public, test_model_dir_names_are_models_real_and_models_synthetic, test_metric_json_filenames_match_plan, test_synthetic_pool_cap_is_500, test_joblib_files_list_has_12_entries). Adding 2 yields **7 total**. Plan 04-04 gate 8 has the same off-by-one. Non-blocking; the executor sees actual pytest summary line and updates the commit message accordingly. Should fix to "7 tests pass" before execute.
- **Verdict:** APPROVED-WITH-NITS (test-count typo).

### 04-03 — DATA-03 (jargon-guard)

- **Concrete?** Yes. T1 ships the full 16-line BANNED_TOKENS array verbatim. T2 ships a 130-line .tsx skeleton with mocks, fixtures, and the 3 it() cases.
- **Acceptance grep-able?** 15 success gates, all greppable or test-runnable. Spot-check: gate 4 regex (^\s*(/.+/[i]?,?\s*)$) is **fragile** — will not match /R^2/ (no \b, no i flag) or any pattern that broke across lines. Better: grep -cE "^\s*/.+/" frontend/src/test/jargon.ts >= 16. Nit, not blocker — corroborated by gate 12 (full vitest run). Gate 5 (grep -c the BANNED_TOKENS import in glossary.test.ts returns 1) is sound.
- **Two-view format?** Yes.
- **Risks real?** R1-R9 cover Recharts mock, useRealProjects mock, fixture reuse, alias usage, refactor narrowing, glob pickup, scope creep, and don't-add-new-tokens. All substantive. R6 explicitly forbids accidentally narrowing glossary.test.ts semantics.
- **Out-of-scope discipline?** Strong. No production component edits, no new tokens, no other inline jargon-guards touched.
- **NIT — BusinessInsightsView prop signature mismatch:** Plan CODE VIEW T2 (line 347) renders <BusinessInsightsView dataset="real" records={FAKE_RECORDS} />. Actual component signature (per BusinessInsightsView.test.tsx:61-66) is { records, datasetLabel, isLoading, error } — **no dataset prop exists**. Without datasetLabel + isLoading + error, this will fail typecheck. Plan does include a save-clause at line 356 ("If <BusinessInsightsView> prop signature differs..., READ the test file and copy its exact render call.") so a careful executor recovers. Skeleton itself is wrong. Should fix to <BusinessInsightsView records={FAKE_RECORDS} datasetLabel="Test Real" isLoading={false} error={null} /> before execute.
- **NIT — await import() after vi.mock():** Plan T2 lines 280-282 use top-level await import() for the components (intent: ensure mocks register first). Vitest transformer auto-hoists vi.mock() above static imports — the dynamic-import dance is unnecessary. Static import { QuoteResultPanel } from "@/components/quote/QuoteResultPanel" would behave identically (and matches every other test file in the repo). Will probably work but is non-idiomatic. Should swap to static imports before execute.
- **NIT — Vitest config rationale:** R7 says vite.config.ts uses include: [...]. Reality: frontend/vite.config.ts has no include — relies on Vitest default `**/*.{test,spec}.?(c|m)[jt]s?(x)`. Conclusion is correct (file gets picked up); rationale is wrong. Cosmetic.
- **Confirmed against current state:** glossary.test.ts:62-100 16-pattern BANNED array is byte-equivalent to plan BANNED_TOKENS; QuoteResultPanel.test.tsx:12-60 HIGH_CONFIDENCE_RESULT + makeFormValues match plan exactly; BusinessInsights.test.tsx:10-54 mock blocks match plan exactly; named exports for all three components verified (QuoteResultPanel.tsx:52, BusinessInsightsView.tsx:138, BusinessInsights.tsx:9 — re-export of ComparisonInsights as BusinessInsights).
- **Verdict:** APPROVED-WITH-NITS (skeleton prop mismatch + non-idiomatic dynamic imports + wrong vite-config rationale).

### 04-04 — Verification

- **Gates align with Wave-1 plans?** Yes. 04-04 gate 1 maps to 04-03 gate 12 (full vitest); gates 5-7 map to 04-01 gates 1-5 + canonical-order check; gate 8 maps to 04-02 gate 5; gates 10-11 map to 04-03 gates 1-2-5. No over-promise.
- **Empty-commit pattern?** Confirmed — Phases 2 (d36d7f1) and 3 (b4aa49a) both used empty verify commits (no file changes in `git show --pretty="" --name-status`). 04-04 T3 uses `git commit --allow-empty`. Consistent.
- **Specialist routing:** All tasks owned by frontend-specialist. Compliant with ROADMAP Notes.
- **NIT — same off-by-one as 04-02:** gate 8 says "6 tests pass". Should be 7. Same fix.
- **NIT — gate 12 assumes branch:** `git diff main..HEAD` — assumes orchestrator created a feature branch. Acceptable (orchestrator handles this).
- **Verdict:** APPROVED-WITH-NITS (test-count typo).

## Wave / file-disjointness check

| Plan | Files modified |
|---|---|
| 04-01 | vercel.json |
| 04-02 | scripts/build_demo_static.py, tests/scripts/test_build_demo_static.py |
| 04-03 | frontend/src/test/jargon.ts, frontend/src/test/jargon-guard.test.tsx, frontend/src/lib/glossary.test.ts |
| 04-04 | (none — read-only verification) |

No file appears in more than one plan. Wave-1 (04-01, 04-02, 04-03) can run in parallel without merge risk. 04-04 depends on all three (`depends_on: [04-01, 04-02, 04-03]`).

## Specialist routing

ROADMAP Notes mandate frontend-specialist, ui-ux-specialist, test-writer only — no auth/backend/storage. All four plans assign owner frontend-specialist (per CONTEXT D-05 "general-purpose OR frontend-specialist for 04-01/04-02"). Compliant.

## Requirement coverage

| REQ-ID | Plan | Coverage |
|---|---|---|
| DATA-01 | 04-01 | Full (cache rules + dead-rule removal) |
| DATA-02 | 04-02 | Full (hard-fail + sandbox-pointer pytest) |
| DATA-03 | 04-03 | Full (3 surfaces + shared module + glossary refactor) |

100% of `phase_req_ids: [DATA-01, DATA-02, DATA-03]` covered by Wave-1 plans. Plan 04-04 cross-verifies all three.

## Context compliance (CONTEXT.md decisions)

| Decision | Implementing plan | Status |
|---|---|---|
| D-01 (vercel.json: 2 new rules + delete dead + canonical order) | 04-01 | Honored exactly (CODE VIEW T1 final JSON + gate 7) |
| D-02 (LFS hard-fail via _die; src-missing branch unchanged; pytest with monkeypatch) | 04-02 | Honored (T1 + T2 + R3 explicitly preserves src-missing branch) |
| D-03 (shared BANNED_TOKENS + 3-surface test + glossary refactor; other inline guards untouched) | 04-03 | Honored (T1 + T2 + T3 + out-of-scope explicitly excludes other guards) |
| D-04 (3 Wave-1 plans, file-disjoint; Wave 2 = single 04-04) | 04-01/02/03/04 | Honored (file-disjointness verified above) |
| D-05 (frontend-specialist routing; no auth/backend/storage) | All four | Honored |

No deferred ideas appear in any plan. No locked decision is contradicted. Full context compliance.

## Blockers (must fix before execute-phase)

None.

## Nits (should fix, non-blocking)

1. **04-02 gate 5 + 04-04 gate 8 — wrong test count.** Says "6 tests pass" (assumes 4 existing + 2 new). Reality: 5 existing tests in tests/scripts/test_build_demo_static.py yields 7 total after adding 2. Update both gates and the 04-04 commit body "(4 existing + 2 new for DATA-02)" line.
2. **04-03 T2 skeleton — BusinessInsightsView prop mismatch.** Plan renders `<BusinessInsightsView dataset="real" records={FAKE_RECORDS} />` but actual signature is `{ records, datasetLabel, isLoading, error }`. Replace skeleton render call with `<BusinessInsightsView records={FAKE_RECORDS} datasetLabel="Test Real" isLoading={false} error={null} />` to match BusinessInsightsView.test.tsx:61-66. Plan save-clause (line 356) protects a careful executor, but the skeleton should be correct.
3. **04-03 T2 — non-idiomatic top-level await import().** Lines 280-282 use dynamic imports after vi.mock(). Vitest transformer auto-hoists vi.mock; static imports are equivalent and match every other test file in the repo. Replace with static `import { QuoteResultPanel } from "@/components/quote/QuoteResultPanel"` etc.
4. **04-03 R7 — wrong vite-config rationale.** Says vite.config.ts "typically uses include: [...]". frontend/vite.config.ts has no include — relies on Vitest default. Conclusion correct, explanation should be updated.
5. **04-03 gate 4 regex.** `^\s*(/.+/[i]?,?\s*)$` will not match /R-squared/ (no i flag, no word boundary). Use `grep -cE "^\s*/.+/" frontend/src/test/jargon.ts >= 16` instead. Cosmetic — full vitest run (gate 12) catches divergence anyway.

## Final verdict

**APPROVED-WITH-NITS.** All four success criteria have an owning plan + cross-check; file-disjointness holds; specialist routing complies with ROADMAP; CONTEXT D-01 through D-05 all delivered. Two structural nits (test count + BusinessInsightsView prop signature) and three cosmetic nits (idiom, rationale wording, gate-4 regex) are worth a 5-minute pass before /gsd-execute-phase 4 but none are blocking — a competent executor following the plan will recover from all of them via the existing save-clauses and live pytest/vitest output. Recommend the planner spend 5 minutes addressing nits 1-3, then proceed.
