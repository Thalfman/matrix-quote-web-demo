# RETROSPECTIVE — Matrix Quote Web

> Living retrospective. Each milestone gets a section. Cross-milestone trends roll up at the bottom.

---

## Milestone: v1.0 — Customer-trust fixes

**Shipped:** 2026-05-05
**Phases:** 4 | **Plans:** 15 | **Started:** 2026-05-04

### What Was Built

- **Phase 1:** Fixed Ben's three customer-blocking issues — `2,000` input crash, Total/Avg parity bug on Hours by Sales Bucket, missing quote-input recap on result panels.
- **Phase 2:** Drill-down tooltips on Complexity vs Hours bars + glossary tooltips on category labels (System Category, Sales Bucket, Vision Type, etc.). Glossary lives in a single `frontend/src/lib/glossary.ts` so definitions stay consistent across the app.
- **Phase 3:** Insights pack default download switched from JSON+CSV to XLSX (multi-sheet: Summary / Drivers / Raw / README) + bundled README. JSON path moved to an opt-in engineer button.
- **Phase 4:** vercel.json cache rules fixed; LFS-pointer guard hard-fails with a locked error format; jargon-guard extended to scan QuoteResultPanel + BusinessInsights + BusinessInsightsView. The new guard caught a real "training data" leak in `DataProvenanceNote.tsx` — Rule-1 in-scope copy fix shipped in the same phase.

### What Worked

- **Customer feedback as PRD-express.** `.planning/feedback/2026-05-01-ben-bertsche-review.md` was the de-facto PRD; `/gsd-plan-phase --prd` ingested it directly. No interpretive layer between the customer's words and the requirements.
- **Codebase map produced before any planning.** `/gsd-map-codebase` ran on day 1 and surfaced Phase 4's three latent build/quality bugs that Ben never saw — they would have eroded trust if they had bitten on a future deploy.
- **Wave-coordinated parallel execution in Phase 4.** Three plans (04-01/02/03) were file-disjoint and independently testable. Three worktrees ran concurrently and merged without conflict. This pattern is worth reaching for when phases have natural file partitioning.
- **Plan-checker triage in Phase 3.** The plan-checker moved `jsonFilename` from 03-04 to 03-02 to keep Wave 2 file-disjoint. The wave parallelization survived because of that pre-execution adjustment.
- **Static-demo discipline.** Every phase respected the no-backend constraint. No phase tried to introduce a runtime data store, even when UX-01 (input recap) tempted it. Quote persistence is correctly deferred to v2.
- **Jargon-guard caught a real leak.** Phase 4 was meant to be pure infrastructure. The new test caught "training data" in `DataProvenanceNote.tsx` — exactly the kind of regression the guard exists to prevent. The Rule-1 in-scope deviation was the right call.

### What Was Inefficient

- **Manual UAT debt accumulated.** Phases 2 and 3 both deferred manual smoke testing because the user was away from PC at verify time. The automated gates passed, but the human-in-the-loop check was skipped twice. Items 5–11 (Phase 2) and 7–15 (Phase 3) sit in `*-UAT.md` waiting for a future `/gsd-verify-work`. This is fine for a single-dev demo, but a more disciplined cadence would have caught them inline.
- **REQUIREMENTS.md bookkeeping lagged behind shipping reality.** When `/gsd-complete-milestone` ran, only DATA-01/02/03 were marked `[x]` even though all 10 v1 requirements were functionally complete. The traceability table also wasn't updated as phases closed. The fix is mechanical (the live file gets archived and recreated fresh next milestone), but the source of the lag — phase verification doesn't auto-tick the requirements — is worth noting.
- **Phase 1, 2, 3 didn't write SUMMARY.md files.** Only Phase 4 produced summaries. The complete-milestone archive had to reconstruct accomplishments from PLAN.md + ROADMAP rather than the canonical artifact. SUMMARY.md is now produced by gsd-execute-phase by default.

### Patterns Established

- **PRD-express via existing feedback file.** When customer feedback is captured in a structured doc already, `/gsd-plan-phase --prd <path>` removes the interpretive step entirely.
- **Per-phase research disabled by default.** Codebase map + customer feedback gave richer context than research could; flipping it on per-phase as needed is a sensible default for brownfield repos with ground-truth artifacts already on disk.
- **Wave-coordinated parallel execution.** When file scopes are disjoint, multiple worktrees + concurrent agent execution + a final read-only verification wave works cleanly. Phase 4 is the canonical example.
- **Code-review with `--fix` and atomic commits per finding.** `/gsd-code-review N --fix` (Critical+Warning by default) is the right ergonomic for low-overhead post-execution polish. The 4 Info findings deferred per scope are a feature, not a bug — they keep the fix loop fast.

### Key Lessons

- **Ship the same-day patch even when the right answer is bigger.** UX-01 (quote-inputs recap) is a same-day fix for the most jarring information loss; full quote persistence is v2 work. The split kept v1 closeable.
- **Customer-facing copy is product surface.** The "training data" leak in `DataProvenanceNote.tsx` was a real customer-trust risk — the demo audience is non-technical. Automated jargon-guard scanning of every customer-facing surface is now table stakes for this repo.
- **Defer `.planning/` bookkeeping until milestone close.** Marking individual REQ-IDs as complete during phase execution adds noise without value. The milestone close is the right time to canonicalize the traceability table and archive.
- **A static SPA constraint is a feature when it is honored.** Every "should we add a backend?" question got pushed to the v2 discuss-phase boundary. The result: zero accidental scope-creep into ops territory during v1.

### Cost Observations

- **Sessions:** ~5 sessions across 2 days (2026-05-04 → 2026-05-05).
- **Total commits:** ~74 since 2026-05-04 (project init), of which ~50 were planning/exec/verification commits and ~23 were `feat/fix/refactor/style/chore` code commits.
- **Worktree usage:** Phase 4 ran 3 worktrees in parallel for Wave 1, then merged sequentially. No worktree conflicts.
- **External AI/CLI runs:** Codex used in Phase 4 review; no other external AI integrations in v1.
- **Notable:** `/gsd-code-review N --fix` produced one fix commit + one docs commit per phase; pattern is repeatable.

---

## Cross-Milestone Trends

_(Will populate after v1.1 / v2.0 ships. Watch for: SUMMARY.md compliance, manual UAT cadence, wave-parallelization repeatability, customer-feedback-as-PRD repeatability.)_
