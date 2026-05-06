# ROADMAP

## Milestones

- ✅ **v1.0 — Customer-trust fixes** — Phases 1–4 (shipped 2026-05-05) — see `.planning/milestones/v1.0-ROADMAP.md`
- 🔄 **v2.0 — Workflow fit** — Phases 5–7 (active, started 2026-05-05) — quote persistence + multi-vision + ROM mode
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

### 🔄 v2.0 — Workflow fit (active)

Goal: reshape the tool to match Ben's actual quoting workflow — multi-week revisions, multi-vision projects, and a ROM-quote-only path. Three phases, eight requirements, coarse granularity.

- [x] **Phase 5: Quote Persistence** — A Sales Engineer can save a quote, find it again later, edit and re-estimate it across weeks, track its workflow status (draft / sent / won / lost / revised), see prior versions, and delete obsolete ones (closes PERSIST-01, PERSIST-02, PERSIST-03, PERSIST-04, PERSIST-05, PERSIST-06) — **shipped 2026-05-05, PR #24**
- [ ] **Phase 6: Multi-vision per project** — A Sales Engineer can quote a project with multiple vision systems, see a per-vision drivers breakdown on the result panel, and the ML estimate aggregates correctly across all of them (closes DATA-04, DATA-06)
- [ ] **Phase 7: ROM-quote mode** — A Sales Engineer can produce a material-cost-only ROM quote that is visually distinguished as preliminary (closes ROM-01, ROM-02)

### 📋 v3.0 — Manager out of the loop (planned)

Goal: complete the north-star reframe with real-data ingest and the AI Scope-Review sibling tool.

Backlog requirements:
- **DATA-05** — Real-data ingest cycle formalized.
- **AI-01** — AI Scope-Review tool (Manager question library + LLM gotcha-flagging) — sibling workspace to Single Quote / Batch / Compare / Business Insights.

---

## Phase Details

### Phase 5: Quote Persistence
**Goal**: A Sales Engineer can save the quote they just produced, find it again later in a "My Quotes" list, edit and re-estimate it across multiple sessions, track its workflow status as it progresses through the customer conversation, and see prior versions when they revise — supporting the multi-week revision cycle that Ben described and the workflow-tracking shape he asked for verbatim.
**Depends on**: v1.0 (shipped). No prior v2 phase.
**Requirements**: PERSIST-01, PERSIST-02, PERSIST-03, PERSIST-04, PERSIST-05, PERSIST-06
**Success Criteria** (what must be TRUE):
  1. A Sales Engineer can save a quote from either the Single Quote tool or the Compare tool, give it an identifying name, and see confirmation that it was saved.
  2. A Sales Engineer can open a "My Quotes" list and see every saved quote with at minimum a name, the date it was saved, and the key inputs (sales bucket, vision type, materials cost) needed to recognize which project it represents.
  3. A Sales Engineer can open a saved quote, change any input, re-run the estimate, and save the revised version — and the revised quote is what they see the next time they open it (multi-week revision works end-to-end).
  4. A Sales Engineer can delete a saved quote from the list, and the deletion persists across page reloads.
  5. The persistence behavior survives a full browser refresh and a closed/reopened tab — saving a quote is not just a session-level convenience.
  6. A Sales Engineer can set and change a workflow status on each saved quote (draft / sent / won / lost / revised), the status persists, and the "My Quotes" list shows status at-a-glance for filtering by stage in the customer conversation.
  7. When a Sales Engineer re-saves an edited quote, the prior version remains visible in that quote's history and the SE can restore an earlier version back into the form — Ben's "versioned" requirement, observable end-to-end.
**Plans**: 9 plans
  - [ ] 05-01-PLAN.md — IndexedDB storage foundation (savedQuoteSchema + quoteStorage + tests; D-01..D-18)
  - [ ] 05-02-PLAN.md — Status / workspace / sort UI components (StatusChip + WorkspacePill + SortControls)
  - [ ] 05-03-PLAN.md — VersionHistoryList component (PERSIST-06 sidebar)
  - [ ] 05-04-PLAN.md — useSavedQuotes hook bundle + cross-tab sync (TanStack Query + BroadcastChannel)
  - [ ] 05-05-PLAN.md — SaveQuoteDialog + DeleteQuoteModal (the two write-path modals; D-10/D-14/D-17)
  - [ ] 05-06-PLAN.md — QuoteRow + MyQuotesEmptyState (list-row + empty-state pieces)
  - [ ] 05-07-PLAN.md — MyQuotesPage (/quotes route — list + sort + delete-flow)
  - [ ] 05-08-PLAN.md — SavedQuotePage (/quotes/:id detail + edit + version history + restore)
  - [ ] 05-09-PLAN.md — App wiring + jargon-guard extension (DemoApp routes / DemoLayout sidebar / QuoteResultPanel Save button / QuoteForm fromQuote rehydration / Compare-side Save / D-19 jargon-guard)
**UI hint**: yes
**Phase notes**:
- **Architecture decision RESOLVED (2026-05-05 discuss step):** browser-only via IndexedDB (D-01/D-02). Specialist routing unchanged: `frontend-specialist`, `ui-ux-specialist`, `test-writer`. `auth-admin-specialist`, `backend-specialist`, `storage-specialist` remain N/A on this repo. See `.planning/phases/05-quote-persistence/05-CONTEXT.md` for the full 19-decision lock.
- Customer-trust hygiene from v1.0 (no ML jargon in any user-facing copy) applies to all new UI: list screen, save dialog, delete confirmation, error toasts.
- The existing `sessionStorage["matrix.singlequote.last"]` recall (mentioned in `.planning/codebase/ARCHITECTURE.md`) is a same-day-patch precursor; this phase replaces it with proper named persistence.

### Phase 6: Multi-vision per project
**Goal**: A Sales Engineer can describe a project that has more than one vision system on it (the realistic case Ben flagged) and get a single coherent ML estimate whose drivers, range, and confidence reflect the full vision set rather than only the first row.
**Depends on**: Phase 5 (Quote Persistence) — saved quotes must round-trip the multi-vision shape, so persistence schema lands first.
**Requirements**: DATA-04, DATA-06
**Success Criteria** (what must be TRUE):
  1. A Sales Engineer can add, edit, and remove multiple vision systems on a single quote via a multi-row vision picker, with at least add/remove of a second and third row demonstrably working.
  2. The ML estimate for a multi-vision quote differs from the same quote with only the first vision row, in a way a human reviewer can confirm reflects the additional vision systems (i.e. the aggregation is real, not a no-op).
  3. `QuoteResultPanel` renders a per-vision drivers breakdown — one driver section per vision row in the quote — so the Sales Engineer (and the customer reading the quote) can see how each vision system contributes to the estimate. (Ben 2026-05-01: *"Result panel (per-vision drivers in the breakdown)"*.)
  4. A multi-vision quote saved in Phase 5 reopens with all vision rows intact and produces the same aggregated estimate on re-run.
**Plans**: TBD
**UI hint**: yes
**Phase notes**:
- DATA-06 is the correctness invariant of DATA-04 (aggregation must be right), not a separate user surface — they live in one phase together.
- Touches three layers simultaneously: the persisted quote schema (Phase 5 artifact), the Pyodide feature-engineering path (`core/features.py` is read-only — aggregation has to happen TS-side or in the predict shim, see ARCHITECTURE.md "Editing `core/` for a frontend feature" anti-pattern), and the multi-row picker UI.
- Specialist routing: `frontend-specialist` + `ui-ux-specialist` for the picker UI; `test-writer` for the aggregation invariant; the build pipeline likely needs a touch in `scripts/build_demo_static.py::_PREDICT_SHIM`.

### Phase 7: ROM-quote mode
**Goal**: A Sales Engineer can produce a material-cost-only ROM (rough-order-of-magnitude) quote — the early-stage estimate that doesn't yet have full engineering-hour-driving inputs — and the customer who sees it can tell at a glance that it is preliminary and carries a wider confidence band than a full quote.
**Depends on**: Phase 5 (Quote Persistence) — ROM quotes are savable like any other quote.
**Requirements**: ROM-01, ROM-02
**Success Criteria** (what must be TRUE):
  1. A Sales Engineer can enter a ROM-mode quote workflow, supply only material cost (no full set of hour-driving inputs), and receive an estimate.
  2. The ROM-quote result is visually distinguished from a full-input quote — labeled as preliminary in plain non-ML language, and rendered with a visibly wider confidence band that conveys the lower input fidelity.
  3. A non-technical reviewer looking at a ROM result and a full-input result side-by-side can tell which is which without being explained the difference.
  4. ROM quotes are savable and reopenable through the Phase 5 persistence flow, and they retain their ROM-vs-full distinction on reopen.
**Plans**: TBD
**UI hint**: yes
**Phase notes**:
- ROM-02 is the customer-trust copy + visual rule. It enforces the v1.0-validated jargon-guard standard: the "preliminary" framing must be plain English, no ML terms (no "uncertainty", no "low signal", no "wide CI"). Jargon-guard scans must cover any new ROM-mode strings.
- The wider confidence band is a UI-side rendering rule on top of the existing ML output; we are not retraining a separate ROM model. The estimate path may also widen the band programmatically based on a ROM flag in the input.
- Honest-signal principle from v1.0: lower confidence on a ROM quote is a feature of the framing, not a bug to hide.

---

## Backlog (later milestones)

The following requirements are scoped but deferred. They become roadmap phases when their milestone starts (`/gsd-new-milestone`).

### v2 — Workflow fit (deferred from v2.0)
- **BENCH-01** Optional benchmark vs Manager spreadsheet estimators. Comparator only, not training inputs. Surfaces if/when Ben asks; no firm slot.

### v3 — Manager out of the loop
- **DATA-05** Real-data ingest cycle formalized. Backend question may resurface here.
- **AI-01** AI Scope-Review tool (Manager question library + LLM gotcha-flagging) — sibling workspace to Single Quote / Batch / Compare / Business Insights.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Quote Persistence | 9/9 | Shipped — PR #24 (awaiting merge) | 2026-05-05 |
| 6. Multi-vision per project | 0/? | Not started | - |
| 7. ROM-quote mode | 0/? | Not started | - |

---

## Notes

- **Specialist agent routing:** all v1 work was pure frontend (with Phase 4's build-hygiene touching `scripts/` Python at build time). Use `frontend-specialist`, `ui-ux-specialist`, `test-writer`. Do **not** invoke `auth-admin-specialist`, `backend-specialist`, or `storage-specialist` — they describe ownership for the parent app, not this static-SPA repo. **Phase 5's `PERSIST-01` open decision may flip this if a backend is introduced.** That is the single point in v2.0 where the routing rule may change; resolved at the Phase 5 discuss step.
- **PRD express path:** `.planning/feedback/2026-05-01-ben-bertsche-review.md` was the v1.0 PRD. Future stakeholder reviews should be captured in `.planning/feedback/` and ingested via `/gsd-plan-phase --prd`.
- **Deferred manual UAT:** Phases 2 and 3 (v1.0) have UAT items 5–11 / 7–15 deferred. Runnable via `/gsd-verify-work 2` and `/gsd-verify-work 3` when convenient — non-blocking.
- **Phase numbering:** v2.0 continues from v1.0 (1–4). Phase 5 is the first v2.0 phase. Decimal phase numbers (e.g. 5.1) are reserved for `/gsd-insert-phase` urgent insertions.
- **Customer-trust hygiene is durable across all v2.0 phases:** non-technical-audience copy, no ML jargon, honest confidence framing. Jargon-guard scanning applies to every new user-facing string introduced in Phases 5, 6, and 7.
