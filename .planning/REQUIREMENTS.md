# Requirements: Matrix Quote Web — v2.0 (Workflow fit)

**Defined:** 2026-05-05
**Core Value:** Remove Operations Managers from the quoting loop — let Sales Engineers self-serve a credible quote, including the multi-week revision and multi-vision realities of how quotes actually get built.

## v2.0 Requirements

Requirements for the v2.0 milestone. Each maps to exactly one roadmap phase (filled in by `/gsd-new-milestone` roadmapper).

### Quote Persistence

- [ ] **PERSIST-01**: User can save a quote (from Single Quote or Compare) and return to it later in a "My Quotes" list.
- [ ] **PERSIST-02**: User can list their saved quotes with enough metadata to find one (at minimum: name + date + key inputs like sales bucket / vision type).
- [ ] **PERSIST-03**: User can open a saved quote, edit its inputs, re-estimate, and save the revised version (multi-week revisions).
- [ ] **PERSIST-04**: User can delete a saved quote.
- [ ] **PERSIST-05**: User can set and change a workflow status on each saved quote — draft / sent / won / lost / revised — so the quote tracks where it is in the customer conversation. (Ben 2026-05-01: *"status (draft / sent / won / lost / revised)"*.)
- [ ] **PERSIST-06**: When the user re-saves an edited quote, prior versions remain visible in the quote's history and the user can restore an earlier version back into the form. (Ben 2026-05-01: *"reopened, edited, re-quoted, versioned"*.)

> Architecture sub-decision (browser-only localStorage/IndexedDB vs introduce a backend for the first time) is resolved at the PERSIST phase's discuss step, not at REQ scoping. All six reqs above are route-agnostic; the route changes the phase shape, not the user-facing capability.

### Multi-vision per project

- [x] **DATA-04**: User can add / edit / remove multiple vision systems on a single project quote (multi-row vision picker).
- [x] **DATA-06**: The ML estimate aggregates correctly across all vision systems present on the quote — drivers, range, and confidence reflect the full vision set, not just the first row.

> DATA-05 is intentionally skipped here because PROJECT.md reserves it for the v3 "real-data ingest cycle formalized" requirement.

### ROM-quote mode

- [ ] **ROM-01**: User can produce a material-cost-only ROM (rough-order-of-magnitude) quote without supplying the full set of engineering-hour-driving inputs.
- [ ] **ROM-02**: ROM quotes are visually distinguished from full-input quotes — clearer "preliminary" framing and an appropriately wider confidence band — so a customer can tell at a glance what kind of estimate they're seeing.

## Future Requirements

Deferred from v2.0. Tracked but not in the v2.0 roadmap.

### Comparator (deferred from v2.0)

- **BENCH-01**: Benchmark Matrix's Manager spreadsheet estimators against the model's estimates as a comparator (display only, not training input). Surfaces if Ben asks; no firm slot.

### v3 — Manager out of the loop (reserved)

- **DATA-05**: Real-data ingest cycle formalized. Backend question may resurface here.
- **AI-01**: AI Scope-Review tool (Manager question library + LLM gotcha-flagging) — sibling workspace to Single Quote / Batch / Compare / Business Insights.

## Out of Scope

Explicit exclusions to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Live retraining at runtime | Static SPA architecture forces build + redeploy. Durable v1.0 decision; documented in `.planning/codebase/ARCHITECTURE.md`. |
| Manager hour-estimator spreadsheets as training inputs | Customer deliberate exclusion (Ben Bertsche 2026-05-01): "I wanted the data to speak more than someone else's take on an estimator tool." May appear later as benchmark comparator (BENCH-01) only. |
| Synthetic company name dressing | Customer prefers the obvious-fake names; no work to disguise them. |
| Generic "make it look professional" UI rework | Visual polish is bounded by the non-technical-audience pitch. Not chasing a generic dashboard aesthetic. |
| Cross-device quote sync without a backend | If PERSIST chooses the browser-storage route, cross-device sync is durably out for v2.0. If PERSIST chooses the backend route, sync becomes available implicitly — no separate REQ needed. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERSIST-01 | Phase 5 | Pending |
| PERSIST-02 | Phase 5 | Pending |
| PERSIST-03 | Phase 5 | Pending |
| PERSIST-04 | Phase 5 | Pending |
| PERSIST-05 | Phase 5 | Pending |
| PERSIST-06 | Phase 5 | Pending |
| DATA-04 | Phase 6 | Complete |
| DATA-06 | Phase 6 | Complete |
| ROM-01 | Phase 7 | Pending |
| ROM-02 | Phase 7 | Pending |

**Coverage:**
- v2.0 requirements: 10 total
- Mapped to phases: 10 (Phase 5: 6, Phase 6: 2, Phase 7: 2)
- Unmapped: 0
- Coverage: 10/10 (100%) ✓

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 — Ben-feedback alignment pass: added PERSIST-05 (workflow status) + PERSIST-06 (version history) verbatim from his 2026-05-01 email; removed speculative "Quote sharing between SEs" out-of-scope row Ben never raised. 10/10 v2.0 reqs mapped 100%.*
