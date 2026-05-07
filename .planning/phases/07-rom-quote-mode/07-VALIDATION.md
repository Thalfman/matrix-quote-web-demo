---
phase: 7
slug: rom-quote-mode
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 7 — Validation Strategy

> Per-phase validation contract. Phase 7 is post-execution; this document is reconstructed from `07-VERIFICATION.md` and the five plan SUMMARYs.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + React Testing Library |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npm run test -- --run <path>` |
| **Full suite command** | `cd frontend && npm run test -- --run` |
| **Estimated runtime** | ~10s full suite (1028 tests / 106 files at HEAD) |

Static-SPA repo — no backend tests. Pre-existing infrastructure (vitest + RTL + `fake-indexeddb`) covered all Phase 7 needs; no Wave 0 test scaffolding required.

---

## Sampling Rate

- **After every task commit:** `cd frontend && npm run test -- --run <touched test file>`
- **After every plan wave:** `cd frontend && npm run test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green (was — 1028/1028 at verification time)
- **Max feedback latency:** ~10s

---

## Per-Plan Verification Map

| Plan | Wave | Requirement | Threat Ref | Test File(s) | Test Count | Automated Command | Status |
|------|------|-------------|------------|--------------|------------|-------------------|--------|
| 07-01 schema-and-primitives | 1 | ROM-02 | T-07-01..T-07-04 | `frontend/src/lib/savedQuoteSchema.test.ts`, `frontend/src/lib/quoteStorage.test.ts`, `frontend/src/components/quote/SaveQuoteButton.test.tsx`, `frontend/src/components/quote/SaveQuoteDialog.test.tsx`, `frontend/src/components/quote/RomBadge.test.tsx`, `frontend/src/pages/single-quote/romSchema.test.ts` | 5 (RomBadge) + 9 (romSchema) + schema/storage/button/dialog deltas | `npm run test -- --run src/lib/savedQuoteSchema.test.ts src/lib/quoteStorage.test.ts src/components/quote/SaveQuoteButton.test.tsx src/components/quote/SaveQuoteDialog.test.tsx src/components/quote/RomBadge.test.tsx src/pages/single-quote/romSchema.test.ts` | ✅ green |
| 07-02 rom-estimator | 1 | ROM-01 | T-07-05..T-07-07 | `frontend/src/demo/romEstimator.test.ts` | 12 | `npm run test -- --run src/demo/romEstimator.test.ts` | ✅ green |
| 07-03 form-and-result-panel | 2 | ROM-01, ROM-02 | T-07-08..T-07-11 | `frontend/src/pages/single-quote/RomForm.test.tsx`, `frontend/src/components/quote/RomResultPanel.test.tsx` | 8 (RomForm) + 13 (RomResultPanel, incl. SC-3 differential) | `npm run test -- --run src/pages/single-quote/RomForm.test.tsx src/components/quote/RomResultPanel.test.tsx` | ✅ green |
| 07-04 pages-and-routes | 3 | ROM-01 | T-07-12..T-07-14 | Page-level coverage via `RomForm.test.tsx` (resolver wiring) + integration in `jargon-guard.test.tsx` round-trip block; defensive `openedQuote.mode === "rom"` guard exercised by SC-4 round-trip | covered by 07-03 + 07-05 suites | (covered by adjacent plans) | ✅ green |
| 07-05 list-and-roundtrip | 4 | ROM-02 (SC-3, SC-4) | T-07-15..T-07-17 | `frontend/src/test/jargon-guard.test.tsx` (Phase 7 surface coverage block + Phase 7 round-trip block), `frontend/src/pages/quotes/QuoteRow` D-11 cases | 6 (jargon-guard surface) + 6 (SC-4 round-trip) + 3 (QuoteRow D-11) | `npm run test -- --run src/test/jargon-guard.test.tsx src/pages/quotes/QuoteRow.test.tsx` | ✅ green |

**ROM-tagged test total:** 62 cases (per `07-VERIFICATION.md` "Behavioral Spot-Checks")
**Full suite at HEAD:** 1028 / 1028 (+91 since Phase 6 baseline 937)

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Per-Decision Verification Map (D-NN)

Each locked decision from `07-UI-SPEC.md` is exercised by at least one automated test:

| D-NN | Test Anchor | Status |
|------|-------------|--------|
| D-01 | New routes asserted by lazy-chunk emission in build + `MachineLearningRom.test`/`ComparisonRom` page render | ✅ |
| D-02 | `RomForm.test.tsx#5` — exactly 4 inputs (3 selects + 1 currency) | ✅ |
| D-03 | `savedQuoteSchema.test.ts` — `mode` enum + default + no schemaVersion bump; `quoteStorage.test.ts` — `QUOTE_DB_VERSION === 2` | ✅ |
| D-04 | `romEstimator.test.ts#7` — `predictQuote` invoked exactly once with defaults-filled QuoteInput | ✅ |
| D-05 | `romEstimator.test.ts` — exported constant value (no UI surfacing tested via D-18 jargon-guard) | ✅ |
| D-06 | `RomResultPanel.test.tsx#7-9` — hidden sections (topDrivers / perVisionContributions / perCategory) absent | ✅ |
| D-07 | `RomBadge.test.tsx` — 5 cases (text, aria, chrome, touch target, jargon) | ✅ |
| D-08 | `RomResultPanel.test.tsx#2` — no "high\|moderate\|lower confidence" rendered | ✅ |
| D-09 | `romEstimator.test.ts#1-3` — quantitative widening + clamp-at-zero | ✅ |
| D-10 | `QuoteRow` test — list-row badge only; no comparator surface | ✅ |
| D-11 | `QuoteRow` D-11 cases (3) — RomBadge slot + tooltip | ✅ |
| D-12 | `RomForm.test.tsx#1-2` — disabled until valid + verbatim hint | ✅ |
| D-13 | `RomResultPanel.test.tsx` — `WHY_PRELIMINARY_COPY` rendered | ✅ |
| D-14 | `DemoLayout` — sidebar entries asserted by build artifact + page render | ✅ |
| D-15 | `RomResultPanel.test.tsx` — sanity banner copy + `sanityFlag` gating | ✅ |
| D-16 | `RomForm.test.tsx` — verbatim form error; `ComparisonRom`/`MachineLearningRom` toast verbatim | ✅ |
| D-17 | `savedQuoteSchema.test.ts` — `buildAutoSuggestedName` ROM token insertion | ✅ |
| D-18 | `jargon-guard.test.tsx` — Phase 7 surface coverage block (6 cases) + BANNED_TOKENS lock `≥16` | ✅ |
| D-19 | `quoteStorage.test.ts` + `jargon-guard.test.tsx` round-trip — top-level + per-version mode persistence | ✅ |
| D-20 | `jargon-guard.test.tsx` Phase 7 round-trip — `quoteToolPath` 4-way matrix routing assertions | ✅ |
| D-21 | `savedQuoteSchema.test.ts` — WorkflowStatus enum unchanged | ✅ |

**21/21 D-NN decisions covered.**

---

## Per-Success-Criterion Verification Map (SC-1..SC-4)

| SC | Test Anchor | Status |
|----|-------------|--------|
| SC-1 (ROM workflow reachable) | Routes wired in `DemoApp.tsx`; `ComparisonRom` + `MachineLearningRom` page handlers exercise `estimateRom` end-to-end | ✅ |
| SC-2 (preliminary label + wider band) | `RomBadge.test.tsx` (5) + `RomResultPanel.test.tsx` (D-08, D-13) + `romEstimator.test.ts` (D-09 quantitative widening) | ✅ |
| SC-3 (side-by-side ROM vs full distinction) | `RomResultPanel.test.tsx#13` — both panels rendered in one test, asserts ROM-only "Preliminary" + "Why this is preliminary" copy | ✅ |
| SC-4 (round-trip ROM-vs-full retention) | `jargon-guard.test.tsx` Phase 7 round-trip block (6) — save → list → get → QuoteRow render → SavedQuotePage routing through `fake-indexeddb` | ✅ |

**4/4 success criteria covered.**

---

## Wave 0 Requirements

Existing infrastructure (Vitest + RTL + `fake-indexeddb`) covered all Phase 7 requirements. No new test scaffolding, no new framework, no shared fixtures introduced. `wave_0_complete: true`.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

The only judgment calls in Phase 7 are visual-quality assertions for SC-2/SC-3, and these are encoded as deterministic invariants:
- `<RomBadge />` "Preliminary" verbatim text + `bg-amberSoft text-ink eyebrow` chrome (lockable in unit tests)
- Band widening by exact `ROM_BAND_MULTIPLIER = 1.75` (lockable as numeric assertion)

No human-only check is required. SC-1..SC-4 are observable via automated tests. UAT-style customer feedback (does it *feel* preliminary?) is intentionally out of scope for Nyquist gating and belongs to `/gsd-verify-work` if requested.

---

## Validation Audit 2026-05-06

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| ROM-tagged tests at HEAD | 62 |
| Full suite at HEAD | 1028 / 1028 green |
| Test files added by Phase 7 | 8 NEW + edits to `jargon-guard.test.tsx` |

Discovery method: `07-VERIFICATION.md` cross-referenced with all 5 plan SUMMARY files. Auditor agent skipped per workflow Step 3 ("No gaps → skip to Step 6, set `nyquist_compliant: true`").

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — n/a, no MISSING entries
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-06
