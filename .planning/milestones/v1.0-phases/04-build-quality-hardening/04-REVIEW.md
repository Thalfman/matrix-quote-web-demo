---
status: findings
phase: 4
date: 2026-05-05
depth: standard
files_reviewed: 7
findings_critical: 0
findings_warning: 1
findings_info: 4
---

# Phase 4: Code Review Report

**Reviewed:** 2026-05-05 (CDT)
**Depth:** standard (per-file with language-specific checks)
**Files Reviewed:** 7
**Status:** findings (1 Warning, 4 Info)

## Summary

Phase 4 ships three small build/quality fixes (vercel.json cache rules, LFS-pointer hard-fail, jargon-guard extension) and one Rule-1 deviation copy fix in `DataProvenanceNote.tsx`. All seven files are straightforward; the implementation matches PLAN-CHECK's APPROVED-WITH-NITS verdict and the plan-locked decisions D-01 through D-05. No security issues, no logic bugs, no data-loss risks. Per-file diff vs `main` is contained: one production file (DataProvenanceNote.tsx) gets a one-line copy change; everything else is config or test infrastructure.

The single **Warning** is a coverage-narrowing concern in `jargon-guard.test.tsx`: the BusinessInsights render path eventually delegates into the same `<DataProvenanceNote>` that BusinessInsightsView renders, so two of the three `it()` cases scan effectively-overlapping DOM. The third QuoteResultPanel case is genuinely independent. Risk is small (the test still catches the leak that triggered the Rule-1 deviation), but downstream regressions in either ComparisonInsights or BusinessInsightsView could be missed if the page bails into the loading skeleton.

The Info items are byte-equivalence drift hazards on the canonical regex set, a non-functional regex-flag inconsistency, an under-asserted invariant on the body-length check, and a deferred-housekeeping forward-reference comment in `glossary.ts:6-12` that the plan explicitly accepted as out of scope.

This phase is build-hygiene only — zero runtime user-facing impact aside from the DataProvenanceNote copy improvement. Customer trust improves on the next deploy.

---

## Warnings

### WR-01: Two of three jargon-guard surfaces share the DataProvenanceNote dependency, narrowing real coverage

**Files:**
- `frontend/src/test/jargon-guard.test.tsx:124-143` (BusinessInsights + BusinessInsightsView it() cases)
- `frontend/src/pages/demo/BusinessInsights.tsx:1-9` (shim re-exports `ComparisonInsights as BusinessInsights`)
- `frontend/src/pages/demo/business/BusinessInsightsView.tsx:269` (`<DataProvenanceNote variant={source} />`)
- `frontend/src/components/DataProvenanceNote.tsx:11-18`

**Issue:** The plan and SUMMARY claim the new test scans **three** surfaces. In practice it scans **two distinct DOM trees**:

1. `<QuoteResultPanel result={…} input={…} />` — fully independent, hits its own copy + the input recap section.
2. `<BusinessInsights />` — re-exports `ComparisonInsights`, which renders `<BusinessInsightsView source="real" …/>`, which renders `<DataProvenanceNote variant="real" />` plus its own page chrome.
3. `<BusinessInsightsView records={FAKE_RECORDS} datasetLabel="Test · Real" isLoading={false} error={null} />` — *the same* `BusinessInsightsView` rendered above, just with explicit props instead of via the shim. Both tests render `<DataProvenanceNote variant="real">`.

Cases 2 and 3 effectively cover the same render tree. The Rule-1 leak ("training data" in DataProvenanceNote) was caught — but it would have been caught by *either* case alone. There is no second-surface validation for the synthetic variant of `<DataProvenanceNote variant="synthetic">`, even though that variant ships in the demo (`/ml/insights` route).

A future regression where someone adds banned copy *only* to the synthetic-variant body of `DataProvenanceNote.tsx` would slip past this test. (The existing `DataProvenanceNote.test.tsx:73-78` inline guard checks the synthetic variant for P10/P50/P90/gradient/pyodide only — a strict subset of `BANNED_TOKENS`. So the synthetic surface is partially protected, but a leak of e.g. `joblib`, `quantile`, or `regression` into the synthetic variant would not be caught.)

Secondary concern: BusinessInsights/BusinessInsightsView could silently fall into the `<LoadingSkeleton>` branch (`isLoading: true`) and produce a body string that lacks the meaningful copy entirely. The current test uses `expect(body.length).toBeGreaterThan(0)` as a smoke test, but the loading skeleton has aria-label `"Loading business insights"` (`BusinessInsightsView.tsx:74`), which makes `body.length > 0` trivially pass even with no real copy rendered. The realProjects mock returns `isLoading: false` so the current state is fine, but the assertion isn't strong enough to detect a future mock regression that defaults to `isLoading: true`.

**Fix (cheap):** Add a third explicit render of `<BusinessInsightsView ... source="synthetic">` to cover the second `DataProvenanceNote` variant; tighten the body-length assertion to a marker string (e.g. `expect(body).toMatch(/business insights/i)`) so the test fails loud if a future mock change drops everything into the loading branch.

```tsx
it("BusinessInsightsView synthetic variant renders no banned ML-jargon tokens", () => {
  renderWithProviders(
    <BusinessInsightsView
      records={FAKE_RECORDS}
      datasetLabel="Test · Synthetic"
      source="synthetic"
      isLoading={false}
      error={null}
    />,
  );
  const body = document.body.textContent ?? "";
  expect(body, "expected page chrome to render").toMatch(/business insights/i);
  assertNoBannedTokens("BusinessInsightsView (synthetic)", body);
});
```

---

## Info

### IN-01: BANNED_TOKENS array divergence risk — no test asserts canonical equivalence

**File:** `frontend/src/test/jargon.ts:13-30`

**Issue:** The plan's stated invariant is "BANNED_TOKENS is byte-equivalent to the regex array currently inlined at glossary.test.ts:63-80." Today the truth holds (verified via `git show HEAD~3:.../glossary.test.ts | diff` — only the surrounding `const BANNED = [` / `];` framing differs). But after this commit, that historical inlined array is gone, so the canonical-equivalence claim has no executable witness.

The seven other inline jargon-guards (per CONTEXT D-03 explicitly out of scope) at `DataProvenanceNote.test.tsx:63-78`, `BusinessInsightsView.test.tsx:472`, `buildBundleReadme.test.ts:79-83`, `buildPortfolioWorkbook.test.ts:300-304`, `Tooltip.test.tsx:108-110`, `DemoHome.test.tsx:84-88`, `MachineLearningQuoteTool.test.tsx` are subsets of `BANNED_TOKENS`. A future contributor who adds a token to `jargon.ts` won't necessarily add it to those inline guards (or vice versa) — and there is no test that detects drift.

This is the cost of CONTEXT D-03's deliberate "don't refactor the seven other guards in this phase" decision, not a bug in this code. Worth flagging because the SUMMARY's "single source of truth" claim is now half-true: it is the source of truth for two consumers (this new test + glossary.test.ts), but seven other inline subsets still ship.

**Fix (deferred housekeeping):** Either (a) future opportunistic dedup as the plan envisions, or (b) a meta-test that asserts every inline regex set is a subset of `BANNED_TOKENS`. Both are out of scope for Phase 4 per CONTEXT D-03.

---

### IN-02: `/R²/` lacks `i` flag — inconsistent with the rest of the array

**File:** `frontend/src/test/jargon.ts:26`

**Issue:** Every other regex in `BANNED_TOKENS` carries the `i` (case-insensitive) flag. `/R²/` does not. This is byte-equivalent to the original `glossary.test.ts:75` source, so it does not represent a Phase 4 regression — but it is worth noting for two reasons:

1. **No real lowercase variant exists** — `r²` (lowercase r with superscript 2) is not a phrase humans write; the missing flag has no functional impact today.
2. **Inconsistency invites future bugs** — a contributor copying the pattern as a template for a new banned token (e.g. `/χ²/`) might forget the case sensitivity is intentional and add `i`, or copy the no-flag pattern by mistake elsewhere.

**Fix (optional, non-functional):** Add a one-line comment noting why `/R²/` is intentionally case-sensitive while siblings are not. Or add `/i` for symmetry — the ASCII char `r` and Unicode `²` are case-symmetric trivially, so the flag is a no-op but reads as correct.

---

### IN-03: jargon.ts uses bare `\b` word boundary on Unicode/Latin-1 tokens — known JavaScript edge case

**File:** `frontend/src/test/jargon.ts:18`

**Issue:** `/\bP10[–-]P90\b/i` uses `\b` for word boundary. The character class `[–-]` includes the en-dash (U+2013) and ASCII hyphen (U+002D). The trailing `\b` between `0` and any non-word character is trivially fine. The leading `\b` between a non-word character and `P` is fine. But the `\b` *inside* the alternation — implicitly created by the `[–-]` class — is not declared; the regex relies on `0`/`P` being `\w` chars. Today this works because both are ASCII. No bug, but the same pattern with a Unicode prefix (e.g. a future token like `/\bτ-test\b/`) would silently mis-match because `\b` in JS regex (without the `u` flag) treats `τ` as a non-word character.

**Fix (defensive, deferred):** When/if Unicode tokens are added to the list, add the `u` flag to those entries. Today the array is ASCII-only, so the issue is theoretical.

---

### IN-04: `glossary.ts:6-12` forward-reference comment is now stale

**File:** `frontend/src/lib/glossary.ts` lines 6-12 (per CONTEXT D-03 §canonical_refs and the explicit deferred-housekeeping note in 04-03 §Out-of-scope and the SUMMARY)

**Issue:** The comment in `frontend/src/lib/glossary.ts:6-12` says "Phase 4 DATA-03 will extend the jargon-guard test to scan this file." Phase 4 is now done; that line is no longer aspirational. CONTEXT.md §canonical_refs and the 04-03 plan §Out-of-scope both explicitly accepted this as deferred housekeeping; the SUMMARY logs it as not-done with the rationale that it's a comment-only no-op.

This is *not* a defect in the Phase 4 deliverable — it is a known, accepted omission. Flagging here only because the SUMMARY's "Closes DATA-03" assertion is technically true (the new test covers the surface) but a downstream reader of `glossary.ts` will still see an aspirational forward reference that no longer holds. Trivial to fix at any point.

**Fix (one-line, anytime):** Either delete the forward-reference comment or rewrite it in past tense. Example:

```ts
// Phase 4 DATA-03 lifted the canonical jargon-guard regex set into
// frontend/src/test/jargon.ts (BANNED_TOKENS); see jargon-guard.test.tsx
// for the DOM-text scan that covers QuoteResultPanel + BusinessInsights*.
```

---

## Observations not raised as findings

The following were investigated and ruled out:

- **`React.ReactNode` reference without explicit `React` import** (jargon-guard.test.tsx:17). Same pattern is in `BusinessInsights.test.tsx:14` and other places in the repo and typechecks fine under `react-jsx` + `@types/react` global declarations. Project convention.
- **No `cleanup()` between `it()` cases in jargon-guard.test.tsx**. `@testing-library/react@14.3.1` auto-registers `afterEach(cleanup)` when global `afterEach` is available; vitest's `globals: true` in `vite.config.ts:23` makes that the case. Each test gets fresh DOM. Verified via `node_modules/@testing-library/react/dist/index.js` source.
- **vercel.json `headers[]` ordering** — `models_real → models_synthetic → py` matches CONTEXT D-01 exactly. Sources are disjoint regex patterns so order doesn't affect runtime cache behavior; the order is for human readability.
- **`scripts/build_demo_static.py` `_die()` usage** in `_copy_model_bundle:179-183` correctly uses an f-string with the path verbatim. Path is the loop variable from `src.glob("*.joblib")` — already a `Path` object — no quoting issues, no shell interpolation, no log injection (stderr only, no log file).
- **pytest `monkeypatch` scope mismatch** — `build_mod` fixture is `scope="module"` but `monkeypatch` is function-scoped. monkeypatch reverts to the original `DEMO_ROOT` / `OUT` after each test, so test isolation is preserved and the module fixture is reused across tests for cheaper imports. Verified.
- **`SingleQuote.tsx:73,164`, `single-quote/ResultPanel.tsx:39`, `DataExplorer.tsx:20` contain banned tokens** ("confidence intervals", "training dataset"). These are vestigial parent-app pages gated behind `IS_DEMO === false` (`App.tsx:35`); they never render in the deployed static demo. Per PROJECT.md "Codebase Reality" they are documented vestigial code. Out of Phase 4 scope and out of jargon-guard surface scope by design (CONTEXT D-03 enumerates the three target surfaces).
- **`buildPortfolioWorkbook` and `buildBundleReadme` inline jargon-guards still independent** of `BANNED_TOKENS` per CONTEXT D-03 — accepted trade-off (would risk narrowing if changed during this phase).

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
