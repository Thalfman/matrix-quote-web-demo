# ROADMAP

**Milestone:** v1.0 — Customer-trust fixes
**Status:** active
**Goal:** Ship the fixes Ben Bertsche asked for in the 2026-05-01 review plus build-hygiene cleanups surfaced by the codebase map. When Ben (or any non-technical reviewer) re-tries the demo at https://matrix-quote-web-demo.vercel.app, nothing crashes, every chart says what it claims, and the insights pack is self-explanatory.

**Coverage:** 10 active v1 requirements → 4 phases. 100% mapped.

---

## v1 Phases

| # | Phase | Goal | Requirements | UI hint | Dependencies |
|---|---|---|---|---|---|
| 1 | Customer-blocking bug sweep ✅ | Stop the demo from crashing on Ben's input flow; correct the wrong Total/Avg signal; surface the user's inputs in the result panel. | BUG-01, BUG-02, UX-01 | yes | none |
| 2 | Hover affordances ✅ 2026-05-04 | Add the drill-down tooltips Ben asked for so the user can interrogate charts and category labels without leaving the page. | UX-02, UX-03 | yes | Phase 1 (so we don't ship hover work over a still-broken Compare flow) |
| 3 | Insights pack rework | Make the downloadable bundle self-explanatory to a non-technical audience — drop or label the JSON, document the CSV columns. | INSIGHTS-01, INSIGHTS-02 | yes (download UX + bundle README) | Phase 1 |
| 4 | Build / quality hardening | Fix the dead Vercel cache rule, make the LFS guard fail loudly, extend the jargon guard to uncovered surfaces. | DATA-01, DATA-02, DATA-03 | no | Phase 1 |

Phases 2, 3, 4 are independent of each other once Phase 1 lands — they can run in parallel via `/gsd-execute-phase --wave` if desired.

---

## Phase Details

### Phase 1: Customer-blocking bug sweep

**Goal:** Stop the demo from crashing on Ben's input flow; correct the wrong Total/Avg signal; show the user's inputs in the result panel.

**Requirements:** BUG-01, BUG-02, UX-01
**UI hint:** yes
**Dependencies:** none

**Success criteria:**
1. Typing `2,000`, `2000`, `2,000.5`, empty string, and non-numeric text into the Compare workspace ME-hours input does not crash the app. Invalid input shows inline validation; never throws to the React error boundary.
2. Vitest regression test for the `quoteAdapter` `onChange` handler covers comma-formatted, decimal, empty, and non-numeric inputs.
3. The Business Insights "Hours by Sales Bucket" chart shows distinct Total and Avg values for any bucket with more than one project.
4. The Single Quote and Batch Quote result panels echo the user's inputs (every field they entered) alongside the estimate, so they can see what the model was given.
5. No regression in the existing test suite (`npm test` in `frontend/`).

---

### Phase 2: Hover affordances

**Goal:** Make charts and category labels interrogable in place — Ben specifically asked for these.

**Requirements:** UX-02, UX-03
**UI hint:** yes
**Dependencies:** Phase 1

**Success criteria:**
1. Hovering on a Complexity vs Hours bar reveals a tooltip listing the projects in that complexity bucket (project name + hours, sorted descending).
2. Hovering on any category label (System Category, Sales Bucket, Vision Type, anywhere they appear in the UI) shows a definition tooltip. Definitions are sourced from a single project glossary file so they stay consistent.
3. Tooltips are accessible (focusable / keyboard-triggered) — not pure mouse hover.
4. No new ML jargon enters customer-facing copy through these tooltips (jargon-guard test extension covers them; this dovetails with DATA-03 in Phase 4).

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Wave 1: Add Radix tooltip dep + Tooltip.tsx wrapper + a11y test
- [x] 02-02-PLAN.md — Wave 1: Glossary module (8 terms) + lookup() + jargon-guard test
- [x] 02-03-PLAN.md — Wave 2: UX-02 drill-down on Complexity vs Hours + chart axis glossary affordances
- [x] 02-04-PLAN.md — Wave 2: UX-03 on QuoteResultPanel recap + QuoteForm field labels (Field gains glossaryTerm prop)
- [x] 02-05-PLAN.md — Wave 3: Verification (test/typecheck/lint/build/manual smoke)


---

### Phase 3: Insights pack rework

**Goal:** When a non-technical reviewer downloads the insights pack, every file inside it is openable in their normal toolchain and every column is self-explanatory.

**Requirements:** INSIGHTS-01, INSIGHTS-02
**UI hint:** yes (download UX) + asset (bundle README)
**Dependencies:** Phase 1

**Success criteria:**
1. The default download contains zero `.json` files. Either replaced with `.xlsx` (multi-sheet: Summary / Drivers / Raw / README), or moved to a separate "for engineers" download path that the casual reviewer never encounters.
2. Every column in every CSV/XLSX has a self-explanatory label OR is documented in a bundled README sheet that explains what it means and how to read it.
3. The notepad-style narrative content (which Ben praised) is preserved unchanged.
4. Manual UAT: a non-technical reviewer (Ben, Tom acting as proxy, or an internal customer) can open every file in the bundle and answer "what does this column mean?" without external help.

**Plans:** 5 plans

Plans:
- [ ] 03-01-PLAN.md — Wave 1: Add `xlsx` (SheetJS) dep + `buildPortfolioWorkbook` pure helper (Summary / Drivers / Raw / README sheets) + unit tests
- [ ] 03-02-PLAN.md — Wave 1: `buildBundleReadme` + `buildPortfolioJson` + `jsonFilename` helpers + unit tests
- [ ] 03-03-PLAN.md — Wave 2: Rewire `buildInsightsPackZip` (drop CSV+JSON, add XLSX+README) + integration tests
- [ ] 03-04-PLAN.md — Wave 2: Engineer-side "Download raw JSON (for engineers)" button + tests
- [ ] 03-05-PLAN.md — Wave 3: Verification (jargon-guard extension + test/typecheck/lint/build/manual smoke)

---

### Phase 4: Build / quality hardening

**Goal:** Fix three latent build/quality bugs surfaced by the codebase map. None of these are visible to Ben today, but they reduce trust if they bite.

**Requirements:** DATA-01, DATA-02, DATA-03
**UI hint:** no
**Dependencies:** Phase 1

**Success criteria:**
1. `vercel.json` cache rules cover `/demo-assets/models_real/*` and `/demo-assets/models_synthetic/*` with appropriate cache-control headers. The dead `/demo-assets/models/` rule is removed.
2. `scripts/build_demo_static.py` LFS-pointer guard exits non-zero with an actionable error message ("LFS pointer detected at <path>; run `git lfs pull` and re-build") rather than silent-skipping. Tested by intentionally introducing a pointer file in a build sandbox.
3. The jargon-guard test extends to scan `QuoteResultPanel.tsx`, `BusinessInsights*.tsx`, and any new copy in the result panel + insights surfaces. The banned-term list is unchanged from current.
4. CI / `npm test` continues to pass.

---

## Backlog (later milestones)

The following requirements are scoped but deferred. They will become roadmap phases when their milestone starts (`/gsd-new-milestone`).

### v2 — Workflow fit
- **PERSIST-01** Quote persistence + edit + versioning. Open decision: browser-only (localStorage / IndexedDB) vs introduce a backend for the first time.
- **DATA-04** Multi-vision per project — schema + ML feature engineering + UI multi-row vision picker.
- **ROM-01** ROM-quote mode (material-cost-only path).
- **BENCH-01** Optional benchmark vs Manager spreadsheet estimators.

### v3 — Manager out of the loop
- **DATA-05** Real-data ingest cycle formalized.
- **AI-01** AI Scope-Review tool (Manager question library + LLM gotcha-flagging) — sibling workspace to Single Quote / Batch / Compare / Business Insights.

---

## Notes

- **Specialist agent routing for v1:** all four phases are pure frontend (and Phase 4's build-hygiene work touches `scripts/` Python at build time). Use `frontend-specialist`, `ui-ux-specialist`, `test-writer`. Do **not** invoke `auth-admin-specialist`, `backend-specialist`, or `storage-specialist` — they describe ownership for the parent app, not this static-SPA repo.
- **Discussion before planning:** Phase 1 is well-specified by the bug repro and acceptance criteria above; `/gsd-plan-phase 1` can run directly without `/gsd-discuss-phase 1`. Phases 2 and 3 have minor design questions worth a short discuss pass (where to put hover triggers, what XLSX schema for the insights pack). Phase 4 is mechanical — straight to plan.
- **PRD express path:** `.planning/feedback/2026-05-01-ben-bertsche-review.md` serves as the de facto PRD. `/gsd-plan-phase` can ingest it via `--prd`.
