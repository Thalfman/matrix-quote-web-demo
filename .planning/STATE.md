# STATE

> Live project memory. Updated by every GSD command. Read by `/gsd-progress` to route to the next action.

## Identity

- **Project:** matrix-quote-web-demo
- **Project code:** MQW
- **Project title:** Matrix Quote Web
- **Path:** `C:\Users\thalf\OneDrive\Documents\Matrix\matrix-quote-web-demo`
- **Branch:** `feat/demo-tool-separation`
- **Repo type:** brownfield, static-only Vite/React SPA on Vercel CDN

## Current Position

- **Milestone:** v1.0 — Customer-trust fixes
- **Phase:** 1 — Customer-blocking bug sweep
- **Plans created:** 1 (`.planning/phases/01-customer-blocking-bug-sweep/01-PLAN.md`)
- **Plans executed:** 0
- **Stopped at:** Phase 1 PLAN.md authored + plan-check PASS; awaiting `/gsd-execute-phase 1`

## Recent Activity

| Date | Event |
|---|---|
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
