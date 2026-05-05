# Phase 4: Build / quality hardening — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Source:** Direct derivation from ROADMAP.md §Phase 4 + REQUIREMENTS.md §DATA-* (no discuss-phase per ROADMAP note "Phase 4 is mechanical — straight to plan").

<domain>
## Phase Boundary

Three latent build/quality bugs surfaced by `.planning/codebase/` mapping. Zero customer-visible UI work. Zero changes to ML behavior, frontend pages, glossary copy, or insights pack contents. The phase exists to remove three "won't bite today, will lose trust if it bites tomorrow" hazards before v1.0 GAs.

In scope:
- `vercel.json` (CDN cache rules — fix dead path, add real paths).
- `scripts/build_demo_static.py` (turn the silent LFS-pointer skip into a hard build failure).
- New `frontend/src/test/jargon.ts` shared module + `frontend/src/test/jargon-guard.test.tsx` shared test that scans `QuoteResultPanel.tsx`, `BusinessInsights.tsx`, and `BusinessInsightsView.tsx` for the canonical banned-token list.
- One Python pytest case in `tests/scripts/test_build_demo_static.py` exercising the new hard-fail behavior.

Out of scope:
- Any new UI affordance, copy change, or visual polish.
- Editing the canonical banned-token list (it stays exactly as it appears in `frontend/src/lib/glossary.test.ts:62-100` today).
- Removing the inline jargon-guards already in `DataProvenanceNote.test.tsx`, `DemoHome.test.tsx`, `glossary.test.ts`, `Tooltip.test.tsx`, `MachineLearningQuoteTool.test.tsx`, `buildBundleReadme.test.ts`, `buildPortfolioWorkbook.test.ts`, and `BusinessInsightsView.test.tsx`. They stay as belt-and-suspenders. Phase 4 only EXTENDS coverage to currently-uncovered surfaces.
- Adding new banned tokens, broadening the regex set, or tightening the existing jargon-guards in any other test file.
- Any dependency add. (No new npm or pip package; SheetJS already shipped in Phase 3.)
- Vercel deploy. The phase verifies locally + commits; ship is a separate `/gsd-ship 4` step.

</domain>

<decisions>
## Implementation Decisions

### D-01 — vercel.json cache rules (DATA-01)
- **Locked:** Replace the single dead `/demo-assets/models/(.*)` rule with two real-path rules: `/demo-assets/models_real/(.*)` and `/demo-assets/models_synthetic/(.*)`.
- **Locked:** Both new rules use the same header value as the dead rule today: `{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }`. Joblibs are content-addressed by the build (file names rewritten on each `git lfs pull` + bundle copy), so `immutable` is correct. The existing `/demo-assets/py/(.*)` `max-age=3600` rule stays unchanged.
- **Locked:** The dead `/demo-assets/models/(.*)` rule is deleted (not commented out) — it's a configuration bug, not a historical artifact.
- **Locked:** Order in `headers[]`: `models_real` before `models_synthetic` before `py`. Matches the alphabetical order in `frontend/public/demo-assets/` after a build.

### D-02 — LFS-pointer hard-fail (DATA-02)
- **Locked:** `scripts/build_demo_static.py:_copy_model_bundle` MUST exit non-zero via the existing `_die()` helper (defined at lines 48-50) when ANY `*.joblib` under `src` is an LFS pointer (file size < 1024 bytes).
- **Locked:** Error message format: `f"LFS pointer detected at {joblib_file}; run \`git lfs pull\` and re-build (joblib bundle = {src_name})"`. Wraps the path in the message so the operator can act without rerunning under verbose mode.
- **Locked:** The hard-fail replaces both the `skipped_lfs += 1; continue` branch (lines 174-176 today) AND the trailing `WARN: {skipped_lfs} joblib(s) ... were LFS pointers and were skipped` print (lines 179-185). The whole "skip and warn" path goes away.
- **Locked:** The "src does not exist at all" branch (lines 161-167) keeps the existing WARN-and-return-0 behavior — that path means the operator chose to build without ML assets at all (e.g., docs-only deploy), which is a different concern from a half-fetched LFS state.
- **Locked:** Test lives at `tests/scripts/test_build_demo_static.py` (existing file). One new `def test_lfs_pointer_triggers_hard_fail(...)` case using `monkeypatch` to redirect `build_mod.DEMO_ROOT` and `build_mod.OUT` to `tmp_path`, creating a fake `models_real/fake.joblib` of 100 bytes, and asserting `pytest.raises(SystemExit)` plus a stderr match on `"LFS pointer detected"`.

### D-03 — Shared jargon-guard module + test (DATA-03)
- **Locked:** New file `frontend/src/test/jargon.ts` exports `BANNED_TOKENS: readonly RegExp[]` — a copy of the canonical regex array currently inlined in `frontend/src/lib/glossary.test.ts:63-80`. The set is unchanged from current; this plan does NOT add new tokens.
- **Locked:** New file `frontend/src/test/jargon-guard.test.tsx` renders three surfaces via `renderWithProviders` and asserts `document.body.textContent` matches none of `BANNED_TOKENS`:
  1. `<QuoteResultPanel result={…} formValues={…} />` (uses an existing fixture pattern; copy from `QuoteResultPanel.test.tsx` top of file).
  2. `<BusinessInsights />` (top-level shim; mocks already exist in `BusinessInsights.test.tsx` and can be re-used; either import the mock module setup OR re-declare the same `vi.mock("recharts", …)` + `vi.mock("@/demo/realProjects", …)` blocks).
  3. `<BusinessInsightsView records={FAKE_RECORDS} datasetLabel="Test · Real" isLoading={false} error={null} />` (matches the actual prop signature from `BusinessInsightsView.test.tsx:61-66` — props are `{ records, datasetLabel, isLoading, error }`, no `dataset` prop).
- **Locked:** `glossary.test.ts:62-100` (the existing `describe("glossary — jargon-guard …")` block) gets refactored to import `BANNED_TOKENS` from `@/test/jargon` instead of duplicating the array inline. This is a pure dedup; the assertions and the test names stay identical.
- **Locked:** The other inline jargon-guards (in `DataProvenanceNote.test.tsx`, `DemoHome.test.tsx`, `Tooltip.test.tsx`, `MachineLearningQuoteTool.test.tsx`, `buildBundleReadme.test.ts`, `buildPortfolioWorkbook.test.ts`, `BusinessInsightsView.test.tsx`) are NOT refactored in this phase. Reason: their inline regex sets are subsets of the canonical list, often paired with file-specific assertions; touching them risks accidentally narrowing coverage. Phase 4 ships the shared module + new test; future phases can dedupe opportunistically.
- **Locked:** Any banned token found in any of the three new-coverage surfaces FAILS the test with the file name and the offending token in the assertion message.
- **Locked:** Test file naming: `frontend/src/test/jargon-guard.test.tsx` (under `frontend/src/test/`, alongside `render.tsx` and `setup.ts`). Vitest auto-discovers it via the existing `frontend/vite.config.ts` test glob.

### D-04 — Wave layout
- **Locked:** Three Wave-1 plans (04-01, 04-02, 04-03) are file-disjoint and run in parallel:
  - 04-01 modifies `vercel.json` only.
  - 04-02 modifies `scripts/build_demo_static.py` + `tests/scripts/test_build_demo_static.py`.
  - 04-03 modifies `frontend/src/test/jargon.ts` (new), `frontend/src/test/jargon-guard.test.tsx` (new), and `frontend/src/lib/glossary.test.ts` (refactor only — replace inline array with import).
- **Locked:** Wave 2 = single verification plan 04-04 (no production-code changes, runs full check matrix + writes verification commit).
- **Locked:** No file is touched by more than one plan. No merge conflict risk.

### D-05 — Specialist routing
- **Locked:** `frontend-specialist` owns 04-03. `general-purpose` (or `frontend-specialist` since the script lives outside `frontend/`) owns 04-01 and 04-02 — neither touches React. Per ROADMAP note, `auth-admin-specialist`, `backend-specialist`, `storage-specialist` DO NOT apply to this static-SPA repo.

### Claude's Discretion
- Exact wording of the error message in `_die()` beyond the locked `"LFS pointer detected at {path}"` prefix.
- Exact wording of the verification commit body for 04-04.
- Whether to add a `// Source: frontend/src/lib/glossary.test.ts:63-80 — Phase 4 lift` provenance comment in `frontend/src/test/jargon.ts` (recommended; cheap, helps the next reader).
- Whether the `BusinessInsights` render in 04-03's test re-declares mocks inline or imports them from a small helper. Either is fine; keep it readable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` (§ Phase 4) — phase goal + 4 success criteria
- `.planning/REQUIREMENTS.md` (§ DATA-01, DATA-02, DATA-03) — acceptance criteria

### Files modified
- `vercel.json` — cache rules
- `scripts/build_demo_static.py` — `_copy_model_bundle` function (lines 149-204), `_die` helper (lines 48-50)
- `tests/scripts/test_build_demo_static.py` — pytest fixture pattern (lines 23-42)
- `frontend/src/lib/glossary.test.ts` (lines 62-100) — canonical `BANNED` regex array source of truth
- `frontend/src/test/render.tsx` — `renderWithProviders` for the new test
- `frontend/src/components/quote/QuoteResultPanel.tsx` + `.test.tsx` — render target + fixture pattern
- `frontend/src/pages/demo/BusinessInsights.tsx` + `.test.tsx` — render target + mock pattern
- `frontend/src/pages/demo/business/BusinessInsightsView.tsx` + `.test.tsx` — render target + fixture pattern

### Stale-warning context (do not violate)
- `frontend/src/lib/glossary.ts:6-12` — comment notes "Phase 4 DATA-03 will extend the jargon-guard test to scan this file." After Phase 4 ships, that line is no longer aspirational; either delete the forward-reference comment or rewrite it to past tense. Either is fine.

</canonical_refs>

<specifics>
## Specific Ideas

- The canonical banned-token regex set is at `frontend/src/lib/glossary.test.ts:63-80`. Sixteen patterns. Copy verbatim into `frontend/src/test/jargon.ts`.
- The Phase 3 R5 risk note (in `.planning/phases/03-insights-pack-rework/03-05-PLAN.md`) explicitly forecasts this lift: *"Phase 4 will lift them into a single shared `jargon-guard.test.ts`."* Phase 4 honors that forecast.
- The existing pytest in `tests/scripts/test_build_demo_static.py` uses `importlib.util.spec_from_file_location` (lines 33-42) to load the script as a module without running it. Reuse the existing `build_mod` fixture; do not write a new loader.
- For 04-03's render of `<BusinessInsights />`: copy the `vi.mock("recharts", …)` + `vi.mock("@/demo/realProjects", …)` blocks from `frontend/src/pages/demo/BusinessInsights.test.tsx:10-54` verbatim. Recharts and the records mock are required for jsdom to render without throwing.
- For 04-03's render of `<QuoteResultPanel />`: reuse the `HIGH_CONFIDENCE_RESULT` + `makeFormValues()` pattern from `frontend/src/components/quote/QuoteResultPanel.test.tsx:12-60`. Don't re-derive the fixture; copy what works.

</specifics>

<deferred>
## Deferred Ideas

- Refactoring the inline jargon-guards in `DataProvenanceNote.test.tsx`, `DemoHome.test.tsx`, `Tooltip.test.tsx`, `MachineLearningQuoteTool.test.tsx`, `buildBundleReadme.test.ts`, `buildPortfolioWorkbook.test.ts`, `BusinessInsightsView.test.tsx` to import `BANNED_TOKENS` — opportunistic future cleanup; not needed for DATA-03.
- Adding new banned tokens (e.g., `feature engineering`, `hyperparameter`, `cross-validation`) — out of scope; Phase 4 keeps the list unchanged per ROADMAP success #3.
- Wiring the shared jargon module into a build-time check (e.g., a vite plugin that scans `dist/`) — overkill for a static demo; the runtime DOM-based test is enough.
- A LFS guard that pre-validates the joblib *contents* (e.g., loadable by joblib.load) — out of scope; size-based pointer detection is the existing pattern and matches the original silent-skip's intent.
- Vercel deploy of the cache rule fix — `/gsd-ship 4` after verification.

</deferred>

---

*Phase: 04-build-quality-hardening*
*Context gathered: 2026-05-04 via direct ROADMAP+REQUIREMENTS derivation (no discuss-phase per ROADMAP note "Phase 4 is mechanical — straight to plan")*
