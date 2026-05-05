# STATE

> Live project memory. Updated by every GSD command. Read by `/gsd-progress` to route to the next action.

## Identity

- **Project:** matrix-quote-web-demo
- **Project code:** MQW
- **Project title:** Matrix Quote Web
- **Path:** `C:\Users\thalf\OneDrive\Documents\Matrix\matrix-quote-web-demo`
- **Branch:** `main`
- **Repo type:** brownfield, static-only Vite/React SPA on Vercel CDN

## Current Position

- **Milestone:** v1.0 — Customer-trust fixes
- **Phase:** 3 — Insights pack rework ✅ shipped (PR #21, merged 2026-05-04)
- **Plans created:** 5 (`.planning/phases/03-insights-pack-rework/03-0[1-5]-PLAN.md`)
- **Plans executed:** 5 (3 waves; INSIGHTS-01 + INSIGHTS-02 closed; Vitest 645/645, typecheck + lint clean, build green)
- **Stopped at:** PR #21 merged to `main`; Phase 3 UAT items 7–15 deferred (manual browser smoke + UAT proxy require user PC access), automated 6/15 pass, see `03-UAT.md`. Next phase = Phase 4 (Build / quality hardening, no UI, no Phase 2/3 deps).

## Recent Activity

| Date | Event |
|---|---|
| 2026-05-04 | PR #21 merged to `main` (Phase 3, feat/03-insights-pack-rework, merge commit `fb9a6c0`); ROADMAP Phase 3 row marked ✅ |
| 2026-05-04 | `/gsd-verify-phase 3` (manual fallback) → 6/15 success-gate items PASS automated; manual smoke items 7–15 BLOCKED (user away from PC); UAT committed `c681e9d` |
| 2026-05-04 | `/gsd-execute-phase 3` → 13 atomic commits across 2 waves; INSIGHTS-01 + INSIGHTS-02 closed; Vitest 645/645, typecheck/lint/build all green (xlsx chunk-size warning expected) |
| 2026-05-04 | `/gsd-plan-phase 3` → 5 plans (Wave 1: 03-01 + 03-02; Wave 2: 03-03 + 03-04; Wave 3: 03-05); gsd-plan-checker → APPROVED after triage moved `jsonFilename` from 03-04 to 03-02 to keep Wave 2 file-disjoint |
| 2026-05-04 | `/gsd-ship 2` → PR #20 opened (feat/02-hover-affordances → main); 17 commits, manual smoke deferred per user (auto checks all green) |
| 2026-05-04 | `/gsd-verify-phase 2` (manual fallback) → 6/13 success-gate items PASS automated; manual smoke items 5–11 BLOCKED (user unavailable); UAT committed `39aa56b` |
| 2026-05-04 | `/gsd-execute-phase 2` → 13 atomic commits across 3 waves; UX-02 drill-down + UX-03 glossary tooltips landed; Vitest 599/599, typecheck/lint/build all green |
| 2026-05-04 | `/gsd-verify-phase 1` → gsd-verifier PASS, 5/5 criteria; VERIFICATION.md written |
| 2026-05-04 | `/gsd-execute-phase 1` → 7 atomic commits (T1–T7); BUG-01, BUG-02, UX-01 closed; Vitest 516/516, typecheck + lint clean |
| 2026-05-04 | `/gsd-plan-phase 1` → `01-CONTEXT.md` + `01-PLAN.md` written; gsd-plan-checker → PASS (3 non-blocking nits, 2 absorbed) |
| 2026-05-04 | `/gsd-map-codebase` → 7 docs in `.planning/codebase/` (~2107 lines, commit `9cb67a7`) |
| 2026-05-04 | Stakeholder review intake → `.planning/feedback/2026-05-01-ben-bertsche-review.md` (commit `9cb67a7`) |
| 2026-05-04 | `/gsd-new-project` → `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `config.json` written |

## Decisions Log

| Date | Decision | Why |
|---|---|---|
| 2026-05-04 | Static SPA architecture, no backend (durable) | Existing repo design; documented in `.planning/codebase/ARCHITECTURE.md` |
| 2026-05-04 | North star reframed: "Manager out of the loop" | Customer-validated by Ben Bertsche 2026-05-01 |
| 2026-05-04 | AI Scope-Review tool deferred to v3 | Sibling tool surface, milestone-sized, possibly forces a backend conversation |
| 2026-05-04 | Manager hour-estimator spreadsheets out of scope as training inputs (durable) | Customer deliberate exclusion; data should drive, not crude heuristics |
| 2026-05-04 | Per-phase research disabled by default in `config.json` | Codebase map + customer feedback already provide richer context than research could; flip on per-phase as needed |
| 2026-05-04 | YOLO mode + coarse granularity | Single-dev iteration; auto-advance through approval gates that don't need fresh thought |
| ⏳ pending | Quote persistence: browser-only vs introduce a backend | Decision deferred to v2 milestone discuss-phase |

## Blockers

(none)

## Pending Todos

0 — `/gsd-capture --list` to review (none today)

## Active Debug Sessions

0

## Notes for Future Sessions

- The runtime hook ("no master dataset / 409") is **stale for this repo**. It describes parent-app behavior. Treat it as informational. See memory `project_static_demo_no_backend.md`.
- Specialist agents for backend/auth/storage **do not apply** to this repo. Use `frontend-specialist`, `ui-ux-specialist`, `test-writer` only.
- The user prefers plans with concrete code skeletons / exact strings / exact paths (memory `feedback_plan_specificity.md`), and a two-view plan format (memory `feedback_plan_format.md`). Honor both when running `/gsd-plan-phase`.
