# MILESTONES

> Index of shipped milestones. Newest at the top. Each entry is a one-paragraph summary; full archives live in `.planning/milestones/`.

---

## v1.0 — Customer-trust fixes ✅ SHIPPED 2026-05-05

**Started:** 2026-05-04 (`/gsd-new-project`)
**Phases:** 1–4 (4/4 complete)
**Plans:** 15
**v1 Requirements closed:** 10/10 (BUG-01, BUG-02, UX-01, UX-02, UX-03, INSIGHTS-01, INSIGHTS-02, DATA-01, DATA-02, DATA-03)
**PRs merged:** #20 (Phase 2), #21 (Phase 3), #23 (Phase 4). Phase 1 was direct-to-main.
**Tag:** `v1.0`

**Delivered:** Ben's reported `2,000` crash fixed + Total/Avg signal corrected + quote inputs recap (Phase 1). Drill-down tooltips on Complexity vs Hours + glossary tooltips on category labels (Phase 2). Insights pack rework — XLSX + README replaces JSON + CSV in customer bundle; engineer JSON download is opt-in (Phase 3). vercel.json cache rules fixed + LFS-pointer hard-fail + extended jargon-guard with bonus Rule-1 copy fix that the new guard caught (Phase 4).

**Stakeholder:** Ben Bertsche, Application Engineer at Matrix Design LLC. Source of truth for v1 scope was his 2026-05-01 review (`.planning/feedback/2026-05-01-ben-bertsche-review.md`).

**Known deferred items:**
- Manual UAT debt for Phases 2 + 3 (automated checks all green; manual smoke deferred because user was away from PC at verify time). Non-blocking; runnable later via `/gsd-verify-work 2` and `/gsd-verify-work 3`.
- 4 Info findings in Phase 4 code review (IN-01..IN-04: byte-equivalence drift hazard, regex-flag inconsistency, under-asserted body-length invariant, glossary.ts forward-reference comment). Deferred per `--fix` scope; runnable via `/gsd-code-review 4 --fix --all`.

**Archives:**
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`

---

_Future milestones append above this line._
