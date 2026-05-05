# ROADMAP

## Milestones

- ✅ **v1.0 — Customer-trust fixes** — Phases 1–4 (shipped 2026-05-05) — see `.planning/milestones/v1.0-ROADMAP.md`
- 📋 **v2.0 — Workflow fit** (planned) — quote persistence + multi-vision schema + ROM mode
- 📋 **v3.0 — Manager out of the loop** (planned) — real-data ingest cycle + AI Scope-Review tool

---

## Phases

<details>
<summary>✅ v1.0 — Customer-trust fixes (Phases 1–4) — SHIPPED 2026-05-05</summary>

- [x] Phase 1: Customer-blocking bug sweep (1 plan, 7 tasks) — completed 2026-05-04 — closes BUG-01, BUG-02, UX-01
- [x] Phase 2: Hover affordances (5 plans) — completed 2026-05-04 — closes UX-02, UX-03 — PR #20
- [x] Phase 3: Insights pack rework (5 plans) — completed 2026-05-04 — closes INSIGHTS-01, INSIGHTS-02 — PR #21
- [x] Phase 4: Build / quality hardening (4 plans) — completed 2026-05-05 — closes DATA-01, DATA-02, DATA-03 — PR #23

Full milestone: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 📋 v2.0 — Workflow fit (planned)

Goal: reshape the tool to match Ben's actual quoting workflow (multi-week revisions, multi-vision projects, ROM-quote-only path). Run `/gsd-new-milestone` to seed phases.

Backlog requirements (will be split into phases at `/gsd-new-milestone`):
- **PERSIST-01** — Quote persistence + edit + versioning. **OPEN DECISION:** browser-only (localStorage / IndexedDB) vs introduce a backend for the first time. Decide during v2 discuss-phase.
- **DATA-04** — Multi-vision per project — schema + ML feature engineering + UI multi-row vision picker.
- **ROM-01** — ROM-quote mode (material-cost-only path).
- **BENCH-01** (optional) — Benchmark vs Manager spreadsheet estimators.

### 📋 v3.0 — Manager out of the loop (planned)

Goal: complete the north-star reframe with real-data ingest and the AI Scope-Review sibling tool.

Backlog requirements:
- **DATA-05** — Real-data ingest cycle formalized.
- **AI-01** — AI Scope-Review tool (Manager question library + LLM gotcha-flagging) — sibling workspace to Single Quote / Batch / Compare / Business Insights.

---

## Backlog (later milestones)

The following requirements are scoped but deferred. They become roadmap phases when their milestone starts (`/gsd-new-milestone`).

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

- **Specialist agent routing:** all v1 work was pure frontend (with Phase 4's build-hygiene touching `scripts/` Python at build time). Use `frontend-specialist`, `ui-ux-specialist`, `test-writer`. Do **not** invoke `auth-admin-specialist`, `backend-specialist`, or `storage-specialist` — they describe ownership for the parent app, not this static-SPA repo. v2's `PERSIST-01` open decision may flip this if a backend is introduced.
- **PRD express path:** `.planning/feedback/2026-05-01-ben-bertsche-review.md` was the v1.0 PRD. Future stakeholder reviews should be captured in `.planning/feedback/` and ingested via `/gsd-plan-phase --prd`.
- **Deferred manual UAT:** Phases 2 and 3 have UAT items 5–11 / 7–15 deferred. Runnable via `/gsd-verify-work 2` and `/gsd-verify-work 3` when convenient — non-blocking.
