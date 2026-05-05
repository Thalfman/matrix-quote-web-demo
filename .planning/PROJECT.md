# Matrix Quote Web — PROJECT.md

> Vision and durable context for the project. Updated at phase transitions and milestone boundaries.

## What This Is

**Matrix Quote Web** is a web tool that helps **Sales Engineers at Matrix Design (LLC)** estimate engineering project labor hours from project attributes — no Operations Manager needed.

The product surface ships as a **non-technical-audience demo** at https://matrix-quote-web-demo.vercel.app, deployed as a static SPA on Vercel. It is intentionally a static-only build — there is no backend at runtime — to keep the demo cheap, fast, and easy to share with prospective customers.

Two parallel "workspaces" sit side-by-side, both ML-powered, both producing the same shape of output (estimate, likely range, drivers, confidence):

- **Real Data** — gradient-boosted regression models trained on Matrix Design's actual historical project book.
- **Synthetic Data** — the same models trained on a much larger synthetic dataset that mirrors the real schema.

The pitch is **"today vs at-scale future"**: the Real side shows what the engine does today on a limited historical book; the Synthetic side shows where the engine would be once Matrix Design has collected more data. Lower confidence on the Real side is a feature of the pitch, not a bug.

Inference runs in the **user's browser via Pyodide** — joblib pickles produced at build time are loaded into WebAssembly scikit-learn. Updating models means rebuild + redeploy.

## Why It Matters / Core Value

> **Remove Operations Managers from the quoting loop.**

Matrix Design Sales Engineers today spend too much time engaging Operations Managers to (a) estimate labor hours and (b) develop scope-clarifying questions to send to customers. The customer (Ben Bertsche, Application Engineer at Matrix Design) reframed the product's north star around this point during his 2026-05-01 review:

> "If we can use this tool you're working on to mine actual data, we could essentially take our managers out of the loop, which will [shorten] quote timelines, possibly increase accuracy, and be a scalable solution that allows Manager to manage, not quote." — Ben Bertsche, 2026-05-01 ([feedback](feedback/2026-05-01-ben-bertsche-review.md))

Success looks like:

- **Sales Engineer self-sufficiency.** A Sales Engineer can produce a credible quote from this tool without consulting an Operations Manager.
- **Time-to-quote.** The path from project description → estimate is fast enough that revising a quote multiple times across weeks of customer conversation is frictionless.
- **Honest signal.** When the model is uncertain, the tool says so visibly. The customer sees confidence, not just a number.
- **Scalability.** As Matrix Design feeds more real projects in, the tool gets better without requiring more Manager hours.

## Stakeholders

| Role | Person | What they care about |
|---|---|---|
| Builder | Tom Halfman (`tomhalfman22@gmail.com`) | Ship a credible demo; thread customer feedback into clear iteration cycles. |
| Primary customer reviewer | **Ben Bertsche**, Application Engineer at Matrix Design LLC (`ben@matrixdesignllc.com`) | Engine that lets him quote without Manager involvement; clarity of UI for non-technical buyers; quote revision over weeks/months. |
| Audience for demo | **Non-technical decision-makers** at Matrix Design and prospective customers | Plain-English UI, no ML jargon, "is this trustworthy?" answer at a glance. |
| Operations Managers | Matrix Design ops staff (indirect) | They are the people we're trying to remove from the quoting loop — and ultimately freed up to manage instead of quote. |

## Codebase Reality

(Authoritative source: `.planning/codebase/` — 7 documents, ~2100 lines, produced by `/gsd-map-codebase` on 2026-05-04.)

- **Repo:** `matrix-quote-web-demo` (this repo). It is a **static Vite/React SPA** deployed to Vercel CDN. The README states explicitly: "Everything runs in the browser. There is no backend."
- **ML inference:** in-browser via Pyodide v0.27.1 (pinned to match sklearn 1.5.2 joblib pickle format). Bundles ship as static assets under `/demo-assets/models_real/` and `/demo-assets/models_synthetic/`.
- **Build pipeline:** `scripts/vercel_build.sh` → `git lfs pull` → pip install → `scripts/build_demo_static.py` (Python at build time only) → `VITE_DEMO_MODE=1 npm run build`.
- **Vestigial code:** `frontend/src/api/`, `frontend/src/pages/Admin*.tsx`, `frontend/src/components/RequireAdmin.tsx` exist but are gated by `IS_DEMO === false` and never activate. The runtime hook that says "no master dataset / 409 until admin uploads + trains" is **stale for this repo** — it describes parent app behavior.
- **Specialist agents:** `frontend-specialist`, `ui-ux-specialist`, `test-writer` apply here. `auth-admin-specialist`, `backend-specialist`, `storage-specialist` describe ownership in the **parent `matrix_quote_app`** and do **not** apply to this repo.
- **Tests:** Vitest only (frontend). No backend pytest in this repo. Recent gap-fill coverage at commit `ac8aaa844dad26f82` covers Pyodide client cache, feature labels, project hours, jargon guard.

## Current Milestone: v2.0 — Workflow fit

**Started:** 2026-05-05 (`/gsd-new-milestone`)

**Goal:** Reshape the tool to match Ben's actual quoting workflow — multi-week revisions, multi-vision projects, and a ROM-quote-only path.

**Target features:**
- **PERSIST-01..06** — Quote persistence (save / list / edit-resave / delete) + workflow status (draft / sent / won / lost / revised, per Ben verbatim) + version history (prior revisions visible and restorable, per Ben verbatim). Headline open sub-decision (browser-only vs introduce a backend) is resolved at the PERSIST phase's discuss step, not at milestone seed.
- **DATA-04 + DATA-06** — Multi-vision per project (schema + ML feature engineering + multi-row UI + per-vision drivers breakdown on QuoteResultPanel).
- **ROM-01 + ROM-02** — ROM-quote mode (material-cost-only path for early-stage estimates, visually distinguished as preliminary with a wider confidence band).

**Previously shipped:** v1.0 — Customer-trust fixes (2026-05-05). All 10 v1 requirements complete. See `.planning/MILESTONES.md` and `.planning/milestones/v1.0-ROADMAP.md`.

## Requirements

### Validated (shipped — production-deployed)

**Pre-v1.0 (existing capabilities at project init):**
- ✓ **Single Quote** — form → ML estimate with drivers + confidence (`frontend/src/demo/.../SingleQuote.tsx`)
- ✓ **Batch Quotes** — multi-row CSV-style intake → batch estimates
- ✓ **Compare** — split route from `feat(compare)` `749d787` — paste in a quoted-by-hand number and compare side-by-side with the model's estimate
- ✓ **Business Insights** — interactive filters, cross-filter, drawer, sort/search, CSV export (`feat(business-insights)` `de32473`, `416d3c4`)
- ✓ **Real + Synthetic dual-bundle ML** — both workspaces use the same gradient-boosted model architecture (`feat(demo)` `066e838`, `feat(real-quote)` `acb8358`)
- ✓ **Shared `QuoteResultPanel`** — uniform output shape (estimate, range, drivers, confidence) across both workspaces (`feat(quote)` `c71a5d7`)
- ✓ **Two-card home + business-language sweep** — non-technical-audience copy (`style(demo)` `604b997`)
- ✓ **In-browser ML via Pyodide** — lazy per-dataset load + cache, second-dataset deadlock fix (`feat(pyodide)` `e9914d5`, `bf29426`)
- ✓ **Jargon guard (initial)** — blocks ML jargon from reaching `DemoHome` and `DataProvenanceNote`

**v1.0 — Customer-trust fixes:**
- ✓ **BUG-01** Compare ME-hours input accepts comma-formatted numbers without crashing — v1.0 (Phase 1)
- ✓ **BUG-02** Hours by Sales Bucket shows distinct Total ≠ Avg — v1.0 (Phase 1)
- ✓ **UX-01** Quote inputs recap on result panel — v1.0 (Phase 1; same-day patch — full persistence is `PERSIST-01` in v2)
- ✓ **UX-02** Drill-down tooltips on Complexity vs Hours bars — v1.0 (Phase 2)
- ✓ **UX-03** Glossary tooltips on category labels (System Category, Sales Bucket, Vision Type, etc.) — v1.0 (Phase 2)
- ✓ **INSIGHTS-01** Insights bundle is XLSX + README; engineer JSON download is opt-in — v1.0 (Phase 3)
- ✓ **INSIGHTS-02** Every column self-explanatory or documented in bundled README — v1.0 (Phase 3)
- ✓ **DATA-01** vercel.json cache rules cover both `models_real/*` and `models_synthetic/*`; dead rule removed — v1.0 (Phase 4)
- ✓ **DATA-02** LFS-pointer guard hard-fails build with locked error format — v1.0 (Phase 4)
- ✓ **DATA-03** Jargon guard extended to QuoteResultPanel + BusinessInsights + BusinessInsightsView — v1.0 (Phase 4; caught real "training data" leak in `DataProvenanceNote.tsx` → in-scope Rule-1 copy fix)

### Active (current milestone — v2.0 Workflow fit)

REQ-IDs land in `.planning/REQUIREMENTS.md`, created at the end of this `/gsd-new-milestone` run.

In scope for v2.0 (10 reqs across 3 phases):
- **PERSIST-01..06** (Phase 5): quote persistence — save / list / edit-resave / delete + workflow status (draft / sent / won / lost / revised) + version history (prior revisions visible and restorable). Headline sub-decision — browser-only (localStorage / IndexedDB) vs introduce a backend for the first time — is resolved at the PERSIST phase's discuss step.
- **DATA-04 + DATA-06** (Phase 6): multi-vision per project — schema + ML feature engineering + UI multi-row vision picker + per-vision drivers breakdown on QuoteResultPanel.
- **ROM-01 + ROM-02** (Phase 7): ROM-quote mode (material-cost-only path) + visually-distinguished "preliminary" framing with wider confidence band.

Deferred from v2.0:
- **BENCH-01** (optional, low priority): benchmark vs Manager spreadsheet estimators. Comparator only, not training inputs. Surfaces if/when Ben asks; no firm slot.

### Reserved (v3 — Manager out of the loop)

- **DATA-05:** Real-data ingest cycle formalized — backend question may resurface here.
- **AI-01:** AI Scope-Review tool (Manager question library + LLM gotcha-flagging) — sibling workspace to Single Quote / Batch / Compare / Business Insights.

### Out of Scope (durable decisions)

- **Manager hour-estimator spreadsheets as training inputs.** Ben deliberately excluded these: "I wanted the data to speak more than someone else's take on an estimator tool. They're also extremely crude tools." May appear later as a benchmark comparator only, not as features or training data.
- **Live retraining at runtime.** The static SPA architecture forces all model updates through a build + redeploy cycle. We do not aim to add a live training endpoint to this repo.
- **Synthetic company names made to look real.** Ben noted with humor that the obviously-fake names amused him. No work to dress them up.
- **Generic "make it look professional" UI rework.** Visual polish is bounded by the non-technical-audience pitch; we are not chasing a generic dashboard aesthetic.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| **Static SPA architecture, no backend.** All inference runs in the browser; Python is build-time only. | Cheap to host (Vercel CDN), zero backend ops, fast cold path for demo URL. Locks us out of live retraining and quote persistence-as-a-service. | ✓ Active. Documented in `.planning/codebase/ARCHITECTURE.md`. |
| **Pyodide pinned to 0.27.1.** | Must match the sklearn 1.5.2 joblib pickle format. Two version churns (`d24f6ff` → `333060b`) demonstrated the brittleness. | ✓ Active. Pin enforced in `frontend/src/demo/pyodideClient.ts:5`. |
| **Real and Synthetic workspaces share identical model code path.** | The product pitch only works if the two sides are apples-to-apples on output shape. The Real side's lower confidence IS the pitch point. | ✓ Active. Documented in memory `project_demo_audience_and_pitch.md`. |
| **North-star reframe: "Manager out of the loop".** | Customer-validated 2026-05-01 by Ben Bertsche. Replaces earlier "help SE quote faster" framing. | ✓ Active. Drives milestone v3. |
| **AI Scope-Review tool deferred to v3.** | Customer asked for it, but it is a sibling tool surface (Manager question library + LLM gotcha-flagging) — wants its own milestone, possibly its own backend conversation. | ✓ Captured. v3 placement in REQUIREMENTS.md. |
| **Quote persistence — implementation route is an open decision.** | Browser-only (localStorage / IndexedDB) is cheap but loses cross-device sync. A real backend forces auth + deployment. Decision deferred until v2 milestone planning. | ⏳ Pending. Flagged for v2 (`PERSIST-01`). |
| **Customer feedback as PRD-express.** Stakeholder review docs in `.planning/feedback/` are ingested directly via `/gsd-plan-phase --prd`, no interpretive layer. | Worked in v1.0 — Ben's 2026-05-01 review drove all 10 requirements with zero re-derivation. | ✓ Validated v1.0. Pattern repeated for future stakeholder reviews. |
| **Wave-coordinated parallel execution when file scopes are disjoint.** | Phase 4 ran 3 plans across 3 worktrees concurrently with zero merge conflict. Plan-checker triage upstream keeps wave file-disjoint. | ✓ Validated v1.0 (Phase 4). |
| **Same-day patch where the right answer is bigger.** | UX-01 ships a quote-inputs recap as a same-day patch; full quote persistence is v2's `PERSIST-01`. Keeps milestones closeable. | ✓ Validated v1.0 (Phase 1). |
| **Jargon-guard scanning of every customer-facing surface is table stakes.** | The non-technical demo audience makes copy a product surface. Phase 4's extended guard caught a real "training data" leak that would have shipped otherwise. | ✓ Validated v1.0 (Phase 4). |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-progress` or `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active (in REQUIREMENTS.md)
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Codebase Reality with current state if architecture moved (e.g., introducing a backend for v2)

---
*Last updated: 2026-05-05 — v2.0 milestone seeded + Ben-feedback alignment pass (PERSIST-01..06, DATA-04 + DATA-06, ROM-01 + ROM-02 in scope; BENCH-01 deferred). Phases 5–7 written. 10/10 v2.0 reqs mapped.*
