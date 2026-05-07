---
phase: 07-rom-quote-mode
verified: 2026-05-06T22:05:00Z
status: passed
verdict: PASS
score: 4/4 success criteria verified; 21/21 D-NN locked decisions implemented
verifier: gsd-verifier (Claude)
re_verification:
  is_re_verification: false
green_status:
  typecheck: pass (exit 0)
  lint: pass (exit 0, --max-warnings 0)
  test: pass (1028/1028, 106 test files)
  build: pass (9.92s; pre-existing 500kB BusinessInsightsView chunk warning unchanged)
static_spa_invariants:
  no_core_change: confirmed (git diff 4f0a293..HEAD -- core/ → empty)
  no_predict_shim_change: confirmed (git log 4f0a293..HEAD -- scripts/build_demo_static.py → empty)
  no_idb_schema_bump: confirmed (QUOTE_DB_VERSION === 2; schemaVersion: z.literal(2))
  no_backend_introduced: confirmed (no new endpoints, no FastAPI, no auth)
human_verification: []
---

# Phase 7: ROM-quote mode — Verification Report

**Phase Goal (ROADMAP.md L94-95):** *A Sales Engineer can produce a material-cost-only ROM (rough-order-of-magnitude) quote — the early-stage estimate that doesn't yet have full engineering-hour-driving inputs — and the customer who sees it can tell at a glance that it is preliminary and carries a wider confidence band than a full quote.*

**Verified:** 2026-05-06 (post-merge of 5 plans across 4 waves)
**Verdict:** **PASS**
**Re-verification:** No — initial verification.

---

## Goal Achievement: Success Criteria SC-1..SC-4

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| **SC-1** | SE can enter a ROM-mode quote workflow, supply only material cost, and receive an estimate. | VERIFIED | New routes `/compare/rom` + `/ml/rom` wired in `frontend/src/DemoApp.tsx:77,85` (lazy-loaded); sidebar entries `Real-Data ROM` + `Synthetic-Data ROM` in `frontend/src/components/DemoLayout.tsx:202,222`; `RomForm` (4-field) in `frontend/src/pages/single-quote/RomForm.tsx`; `estimateRom` invoked at `ComparisonRom.tsx:154` and `MachineLearningRom.tsx:155`. Build emits `ComparisonRom-DmmGboCb.js` + `MachineLearningRom-CuI0OZj6.js` chunks. |
| **SC-2** | ROM result is labeled preliminary in plain non-ML language and rendered with a visibly wider confidence band. | VERIFIED | `<RomBadge />` rendered in hero card at `RomResultPanel.tsx:89` (replaces confidence chip per D-08 — `CONFIDENCE_LABEL` is NOT imported, only mentioned in JSDoc explaining the replacement); D-13 verbatim copy `WHY_PRELIMINARY_COPY` exported at `RomResultPanel.tsx:31` and rendered at line 111; band widening by `ROM_BAND_MULTIPLIER = 1.75` enforced in `romEstimator.ts:48` + `widenLow`/`widenHigh` at lines 196-209; jargon-guard test asserts no banned tokens render. |
| **SC-3** | Non-technical reviewer can tell ROM vs full apart side-by-side without explanation. | VERIFIED | Two-layer differential: (a) component-layer — `RomResultPanel.test.tsx` test #13 renders BOTH panels in one test and asserts ROM contains "Preliminary" + "Why this is preliminary" while full does NOT; (b) list-row layer — `QuoteRow.tsx:110-113` renders `<RomBadge />` only when `quote.mode === "rom"`. The `/quotes` list shows ROM and full quotes in one view with the badge as recognition cue. |
| **SC-4** | ROM quotes savable & reopenable through Phase 5 persistence; ROM-vs-full distinction retained on reopen. | VERIFIED | `mode: z.enum(QUOTE_MODE_VALUES).optional().default("full")` on top-level `savedQuoteSchema:117` AND per-version `quoteVersionSchema:137`; `SaveQuoteButton mode="rom"` threaded at `RomResultPanel.tsx:164`; `SavedQuotePage.tsx:62-65` branches `quoteToolPath` to `/compare/rom` / `/ml/rom` when `mode === "rom"`; `ComparisonRom.tsx:123` defensive guard `openedQuote.mode === "rom"` before `form.reset(...)`. 6 SC-4 round-trip tests in `jargon-guard.test.tsx:636+` execute save → list → get → QuoteRow render → SavedQuotePage routing through `fake-indexeddb`. |

**Score: 4/4 success criteria verified.**

---

## D-NN Locked Decision Coverage (21/21)

| D-NN | Description | Implemented In | Evidence |
|------|-------------|----------------|----------|
| **D-01** | New routes per workspace, not a tab toggle | `DemoApp.tsx:77,85` | `path="compare/rom"` + `path="ml/rom"` lazy-loaded |
| **D-02** | 4-field ROM form (3 selects + materials cost), no advanced disclosure | `RomForm.tsx` + `romSchema.ts` | Source has exactly 3 `<Select` + 1 numeric input; no `disclosure`/`Advanced` strings; test #5 asserts 4 inputs |
| **D-03** | `mode: "rom"\|"full"` optional flag, NO IDB schema bump | `savedQuoteSchema.ts:28-29,117,137` + `quoteStorage.ts:35` | `QUOTE_MODE_VALUES`/`QuoteMode` defined; `QUOTE_DB_VERSION === 2` (unchanged); `schemaVersion: z.literal(2)` |
| **D-04** | Single `predictQuote` call with `quoteFormDefaults` | `romEstimator.ts:110` | Exactly ONE `predictQuote(` call site; test #7 asserts `predictQuote` called exactly once |
| **D-05** | `ROM_BASELINE_RATE_HOURS_PER_DOLLAR = 0.0008` internal constant | `romEstimator.ts:57` | Constant exported by name; not in user-facing UI (jargon-guard test 6 covers BANNED_TOKENS lock) |
| **D-06** | RemAIN/REPLACE/HIDE chrome rules | `RomResultPanel.tsx` | No `topDrivers`/`perVisionContributions`/`result.perCategory.map`/`CONFIDENCE_LABEL` imports; tests 7-9 assert hidden sections; test 6 asserts combined-totals row |
| **D-07** | `<RomBadge />` primitive — "Preliminary" chip | `RomBadge.tsx` | No props; locked chrome `bg-amberSoft text-ink eyebrow min-h-[28px]`; aria-label "Preliminary estimate" |
| **D-08** | Hero chip = `RomBadge`, not `CONFIDENCE_LABEL` | `RomResultPanel.tsx:89` | `<RomBadge />` rendered in hero slot; test 2 asserts no "high\|moderate\|lower confidence" text |
| **D-09** | `ROM_BAND_MULTIPLIER = 1.75` widening | `romEstimator.ts:48` + `widenLow`/`widenHigh` | Half-widths multiplied by 1.75; tests 1-3 assert quantitative widening + clamp-at-zero |
| **D-10** | `/quotes` list satisfies side-by-side, no comparator widget | `QuoteRow.tsx:110-113` | List-row badge only; no new comparator surface |
| **D-11** | Saved-quote list-row layout — RomBadge slot between StatusChip and WorkspacePill | `QuoteRow.tsx:22,110-113` | RomBadge import + conditional `quote.mode === "rom"` block + tooltip span "This is a ROM (rough order of magnitude) quote." |
| **D-12** | Form disabled until ready + valid; verbatim hint | `RomForm.tsx:118` | "Fill in the four fields above to enable." verbatim; tests 1+2 enforce both polarities |
| **D-13** | "Why this is preliminary" verbatim copy | `RomResultPanel.tsx:31-32` | `WHY_PRELIMINARY_COPY` constant exported; rendered at line 111 |
| **D-14** | Sidebar entries with verbatim labels | `DemoLayout.tsx:202,222` | `<SidebarLink label="Real-Data ROM" />` + `<SidebarLink label="Synthetic-Data ROM" />` |
| **D-15** | Sanity-check banner verbatim copy + `sanityFlag` gating | `RomResultPanel.tsx:37-38,116` + `romEstimator.ts:154-159` | `SANITY_BANNER_COPY` constant; `rom.sanityFlag &&` guard; `ROM_SANITY_DIVERGENCE_FACTOR = 5` |
| **D-16** | Verbatim error copy (form + toast) | `RomForm.tsx` + `ComparisonRom.tsx:170` + `MachineLearningRom.tsx:171` | "Enter a material cost greater than zero." (form); "Couldn't produce a ROM estimate. Try again, or open the full Quote tool for more detail." (toast) |
| **D-17** | Auto-suggested name format with ROM token | `savedQuoteSchema.ts:258` | `buildAutoSuggestedName(values, hours, mode?)` — inserts " ROM" after salesBucket when `mode === "rom"` |
| **D-18** | Jargon-guard scope addition; BANNED_TOKENS unchanged | `jargon-guard.test.tsx:548-624` + `jargon.ts` | New "Phase 7 surface coverage" describe with 6 cases; `jargon.ts` byte-for-byte unchanged from pre-Phase-7; `expect(BANNED_TOKENS.length).toBeGreaterThanOrEqual(16)` lock at line 620 |
| **D-19** | Persistence flag at TWO layers (top-level + per-version) | `savedQuoteSchema.ts:117,137` + `RomResultPanel.tsx:164` + SC-4 round-trip tests | `mode` declared on both `savedQuoteSchema` AND `quoteVersionSchema`; SaveQuoteButton threaded with `mode="rom"`; round-trip tests assert `saved.mode === "rom"` AND `saved.versions[0].mode === "rom"` |
| **D-20** | Re-open routing to `/compare/rom` or `/ml/rom` | `SavedQuotePage.tsx:62-65` + `ComparisonRom.tsx:123` | 4-way routing matrix in `quoteToolPath`; defensive `openedQuote.mode === "rom"` guard before form hydration |
| **D-21** | Status-chip behavior unchanged on ROM quotes | `savedQuoteSchema.ts` (status field unchanged) | Phase 5 WorkflowStatus enum preserved; no ROM-specific status states added |

**All 21 D-NN locked decisions implemented.**

---

## Required Artifacts (UI-SPEC §"Component Map")

### NEW files (8 code + 8 test = 16)

| Path | Status | Evidence |
|------|--------|----------|
| `frontend/src/components/quote/RomBadge.tsx` | EXISTS | Verified file present; D-07 chrome locked |
| `frontend/src/components/quote/RomBadge.test.tsx` | EXISTS | 5 cases (text, aria-label, chrome, touch target, jargon) |
| `frontend/src/components/quote/RomResultPanel.tsx` | EXISTS | D-06/D-08/D-13/D-15/D-19 implemented |
| `frontend/src/components/quote/RomResultPanel.test.tsx` | EXISTS | 13 cases including SC-3 differential render |
| `frontend/src/pages/single-quote/RomForm.tsx` | EXISTS | 4-field form with verbatim Copywriting Contract strings |
| `frontend/src/pages/single-quote/RomForm.test.tsx` | EXISTS | 8 cases (D-12 disabled, D-16 verbatim error, D-02 four-fields invariant) |
| `frontend/src/pages/single-quote/romSchema.ts` | EXISTS | 4-field zod + `toQuoteFormValues` helper |
| `frontend/src/pages/single-quote/romSchema.test.ts` | EXISTS | 9 cases including D-04 hidden-defaults contract |
| `frontend/src/demo/romEstimator.ts` | EXISTS | Constants + `estimateRom` + `RomMetadata` |
| `frontend/src/demo/romEstimator.test.ts` | EXISTS | 12 cases covering D-04/D-05/D-09/D-15 |
| `frontend/src/pages/demo/compare/ComparisonRom.tsx` | EXISTS | Real Data ROM page handler |
| `frontend/src/pages/demo/ml/MachineLearningRom.tsx` | EXISTS | Synthetic Data ROM page handler |

### MODIFIED files (8)

| Path | Status | Evidence |
|------|--------|----------|
| `frontend/src/lib/savedQuoteSchema.ts` | MODIFIED | `mode` field at top-level + per-version (lines 117, 137); `QuoteMode` exported |
| `frontend/src/lib/quoteStorage.ts` | MODIFIED | `mode` threaded through `SaveSavedQuoteArgs`; `QUOTE_DB_VERSION` stays 2 |
| `frontend/src/components/quote/SaveQuoteButton.tsx` | MODIFIED | `mode?: QuoteMode` prop pass-through |
| `frontend/src/components/quote/SaveQuoteDialog.tsx` | MODIFIED | `mode?` on payload, threaded to `saveSavedQuote` |
| `frontend/src/DemoApp.tsx` | MODIFIED | 2 lazy imports + 2 Route entries (lines 12-14, 32-34, 77, 85) |
| `frontend/src/components/DemoLayout.tsx` | MODIFIED | 2 SidebarLink entries (lines 202, 222) |
| `frontend/src/pages/quotes/QuoteRow.tsx` | MODIFIED | RomBadge import + conditional render (lines 22, 110-113) |
| `frontend/src/pages/quotes/SavedQuotePage.tsx` | MODIFIED | `quoteToolPath` extended with `mode: QuoteMode` parameter (lines 62-65) |
| `frontend/src/test/jargon-guard.test.tsx` | MODIFIED | Phase 7 surface coverage block + Phase 7 round-trip block (lines 548, 636) |

**All artifacts present and substantive (level 1 + 2 + 3 + 4 — exists, substantive, wired, data flowing).**

---

## Key Link Verification (Wiring)

| From | To | Via | Status |
|------|-----|-----|--------|
| `RomForm` user submit | `estimateRom` | `ComparisonRom.tsx:154` / `MachineLearningRom.tsx:155` | WIRED |
| `estimateRom` | `predictQuote` (Pyodide) | `romEstimator.ts:110` | WIRED — single-call contract |
| `RomResultPanel` | `RomBadge` | Direct import + render in hero card | WIRED |
| `RomResultPanel` | `SaveQuoteButton(mode="rom")` | `RomResultPanel.tsx:164` | WIRED |
| `SaveQuoteButton` | `saveSavedQuote(args.mode)` | Threaded through `SaveQuoteDialog` payload | WIRED |
| `saveSavedQuote` | IDB top-level + per-version mode field | `quoteStorage.ts` denormalization | WIRED — round-trip tests pass |
| `QuoteRow` | `<RomBadge />` (when mode==="rom") | Conditional render at line 110 | WIRED |
| `SavedQuotePage "Open"` | `/compare/rom` or `/ml/rom` | `quoteToolPath` 4-way matrix | WIRED — round-trip tests assert hrefs |
| `/compare/rom?fromQuote={id}` | Form rehydration | `useSavedQuote` + defensive mode guard | WIRED |
| Sidebar links | DemoApp routes | `to="/compare/rom"` / `to="/ml/rom"` | WIRED |

---

## Static-SPA Invariants (Required for this Repo)

| Invariant | Status | Evidence |
|-----------|--------|----------|
| No `core/` change | CONFIRMED | `git diff 4f0a293..HEAD -- core/` is empty |
| No `_PREDICT_SHIM` change | CONFIRMED | `git log 4f0a293..HEAD -- scripts/build_demo_static.py` is empty |
| No IDB `schemaVersion` bump beyond Phase 6 | CONFIRMED | `QUOTE_DB_VERSION === 2`; `schemaVersion: z.literal(2)` |
| No backend introduced | CONFIRMED | No new endpoints, no FastAPI, no auth, no remote storage. ROM math is pure-TS over existing Pyodide path |
| No new third-party dependencies | CONFIRMED | `tech-stack.added: []` in all 5 plan SUMMARYs; `package.json` unchanged |

---

## Behavioral Spot-Checks (Step 7b)

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| Vitest suite passes | `npm run test -- --run` | 1028/1028 (106 files) | PASS |
| TypeScript compiles | `npm run typecheck` | exit 0, no output | PASS |
| ESLint clean (--max-warnings 0) | `npm run lint` | exit 0, no output | PASS |
| Production build succeeds | `npm run build` | exit 0 in 9.92s | PASS |
| ROM lazy chunks emitted | `dist/assets/ComparisonRom-*.js` + `MachineLearningRom-*.js` + `romEstimator-*.js` | 3 chunks present (4.43 / 4.46 / 7.49 kB) | PASS |
| ROM-specific tests pass | `romEstimator.test.ts` (12), `RomBadge.test.tsx` (5), `RomForm.test.tsx` (8), `RomResultPanel.test.tsx` (13), `romSchema.test.ts` (9), QuoteRow D-11 (3), jargon-guard Phase 7 surface (6), Phase 7 SC-4 round-trip (6) = 62 ROM-tagged tests | All pass within 1028/1028 | PASS |

**No SKIPPED items. No FAILED items.**

---

## Anti-Patterns Scan (Step 7)

Scanned all NEW + MODIFIED Phase 7 source files for stub markers:

| Pattern | Finding | Severity |
|---------|---------|----------|
| `TODO`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` in new ROM source | None found in production source | OK |
| `return null` / `return [] // empty` stubs | None — all components return real JSX | OK |
| Empty handlers (`onSubmit={() => {}}`) | None | OK |
| `console.log`-only implementations | None | OK |
| Hidden sections genuinely absent | `topDrivers`, `perVisionContributions`, `result.perCategory.map`, `CONFIDENCE_LABEL` import — none present in `RomResultPanel.tsx` (CONFIDENCE_LABEL appears only in a JSDoc comment explaining what was replaced) | OK |
| Banned-jargon tokens in user-facing strings | jargon-guard test 6 cases pass; BANNED_TOKENS lock asserts ≥16 patterns | OK |

---

## Requirements Coverage (REQUIREMENTS.md mapping)

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| **ROM-01** | 07-01..07-04 | User can produce a material-cost-only ROM quote without supplying full hour-driving inputs | SATISFIED | 4-field RomForm + estimateRom with defaults-filled QuoteInput; routes reachable from sidebar |
| **ROM-02** | 07-01, 07-03, 07-05 | ROM quotes visually distinguished — "preliminary" framing + wider confidence band | SATISFIED | RomBadge "Preliminary" + D-13 "Why this is preliminary" copy + 1.75× band widening + jargon-guard scan; SC-3 differential test passes |

Both v2.0 ROM requirements satisfied. No orphaned requirements for Phase 7.

---

## Test Count Delta

| Phase 6 baseline | After 07-01 | After 07-02 | After 07-03 | After 07-04 | After 07-05 |
|------------------|-------------|-------------|-------------|-------------|-------------|
| 937 | 980 (+43) | 956† (+12 net new in plan; some 07-01 tests merged) | 1013 (+57 cumulative since baseline) | 1013 (+0; pages have no new tests in this plan) | **1028 (+91 since baseline; +15 in 07-05)** |

†Per the 07-02 SUMMARY, vitest reported 956 in the worktree (12 new ROM-estimator tests but worktree was based off Wave-1 outputs whose merge produced 980). Net cumulative gain after 07-05: **+91 tests since Phase 6**.

Currently observed: **1028 tests passing** (matches 07-05 SUMMARY claim).

---

## Gaps Summary

**No gaps found.** Every locked decision has at minimum one verifiable artifact in source AND a test that exercises it. Every success criterion has at least one test or render path proving it. Every static-SPA invariant holds. The full pipeline (typecheck / lint / test / build) is green.

The phase goal is achieved: a Sales Engineer can navigate to `/compare/rom` or `/ml/rom`, fill 4 fields (industry / system / automation / materials cost), submit, see a "Preliminary"-badged result with a 1.75× wider band and a "Why this is preliminary" explanation, save it (round-tripping with `mode: "rom"` persisted), see it in `/quotes` distinguished from full quotes by the badge, and re-open it back into the ROM tab — all without retraining the model, modifying `core/`, or introducing a backend.

---

## Verification Notes

- **CONFIDENCE_LABEL absence in RomResultPanel:** The string `CONFIDENCE_LABEL` appears in `RomResultPanel.tsx` line 7 ONLY as part of a JSDoc comment ("Hero estimate with `<RomBadge />` instead of CONFIDENCE_LABEL chip (D-08)"). There is no `import` statement for it and no runtime reference. D-08 is honored.
- **romSchema.ts dual-author note:** Plan 07-02 created a minimal shim (Rule 3 unblock) and Plan 07-01 owns the full file. Wave merge resolved cleanly; the file at HEAD is the full Plan 07-01 version (verified by `mode === "rom"` literal `" ROM"` insertion in `buildAutoSuggestedName`).
- **Mobile sidebar intentionally unchanged:** `MobileSubViewTabs` does NOT list ROM entries — UI-SPEC §"Out of scope" excludes mobile bottom-tab strip from Phase 7. Not a gap.
- **ComparisonRom + MachineLearningRom page-level jargon scans deferred per plan:** Plan 07-05 explicitly defers page-level jargon scans because RomResultPanel coverage in the round-trip path provides indirect coverage. Not a gap; intentional plan-level deferral with stated rationale.
- **No human verification items required.** All SC-1..SC-4 are observable via automated tests. The only judgment calls (visual distinction quality for SC-2/SC-3) are encoded in (a) the `<RomBadge />` "Preliminary" literal text + amber-soft chrome, and (b) the deterministic 1.75× band multiplier — both of which are unit-tested for invariance, not for "feel."

---

_Verified: 2026-05-06 22:05 UTC_
_Verifier: Claude (gsd-verifier, Opus 4.7 1M)_
_Final test/build/lint/typecheck status: ALL GREEN — typecheck exit 0, lint exit 0, vitest 1028/1028 (106 files), build exit 0 in 9.92s_
