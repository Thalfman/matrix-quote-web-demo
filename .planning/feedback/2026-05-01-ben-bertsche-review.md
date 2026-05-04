---
name: Ben Bertsche stakeholder review — 2026-05-01
description: First customer-side review of the Matrix Quote Web demo from Ben Bertsche (Application Engineer, Matrix Design). Sets new product direction and surfaces P0 bugs.
type: feedback
source: email
source_file: C:\Users\thalf\Downloads\Gmail - Matrix Quote Demo.pdf
received: 2026-05-01
intake: 2026-05-04
stakeholder:
  name: Ben Bertsche
  role: Application Engineer
  org: Matrix Design, LLC
  email: ben@matrixdesignllc.com
status: open
---

# Ben Bertsche stakeholder review — 2026-05-01

## Executive summary

First customer-side review of the deployed demo (https://matrix-quote-web-demo.vercel.app). Reception is **very positive** ("Wow, this interface looks amazing"), but the email surfaces **two crashes** in the Compare workspace, **multiple UX/data correctness gaps**, and — most importantly — a **strategic shift** that reframes the product:

> **The north star is no longer "help Sales Engineers quote faster." It is "remove Operations Managers from the quoting loop entirely."**

Ben also proposes a **second tool** in the same family: an AI scope-reviewer that consults a Manager-question library and flags gotchas in customer scope or proposed solutions. That belongs in a future milestone, not v1.

Ben commits to providing **more real data** ("I'll work to get more data"), which will replace the synthetic-only training in the next bundle build.

---

## Codebase reality check (corrects fix-surface assumptions below)

The codebase map produced by `/gsd-map-codebase` (see `.planning/codebase/`) corrected a working assumption I had when first digesting this feedback. **This repo is a static SPA — there is no backend.** Implications for the fix levels listed below:

- The deployed demo is a Vite/React SPA on Vercel CDN. Pyodide 0.27.1 runs in the browser and loads pre-built joblib bundles (`models_real/`, `models_synthetic/`) generated at build time by `scripts/build_demo_static.py`.
- There is no FastAPI runtime, no live Parquet store, no JWT-protected admin upload route, no "upload + train" flow at request time. The empty-master-dataset 409 state advertised by the runtime hook does **not** apply to this repo — it's stale wiring from the parent backend app.
- Vestigial admin/upload/auth code exists under `frontend/src/api/`, `frontend/src/pages/Admin*.tsx`, `frontend/src/components/RequireAdmin.tsx` but is gated by `IS_DEMO === false` and never activates because the Vercel build always sets `VITE_DEMO_MODE=1`.
- The `.claude/agents/auth-admin-specialist.md`, `backend-specialist.md`, `storage-specialist.md` files describe ownership in the **parent `matrix_quote_app`**, not this demo repo. Their target paths (`backend/`, JWT routes, parquet upload log) do not exist here.
- Updating the trained models requires a **rebuild + redeploy** (regenerate joblib bundles via `scripts/build_demo_static.py`, ship through Vercel). There's no live retrain endpoint.

**What this changes in the fix surface below:**

- **B1 (Compare crash)** — confirmed pure frontend fix (`frontend/src/...quoteAdapter*`). No backend coordination needed.
- **U1 (quote persistence)** — "save to a database" is **not** an inline addition; this repo has no backend. Options collapse to:
  - **U1.a (browser-only):** Persist to `localStorage` / IndexedDB, scoped per-browser. Works for the demo. Loses cross-device sync. No real audit trail.
  - **U1.b (introduce a backend):** First-class quote persistence requires standing up a backend (FastAPI + SQLite/Postgres or Vercel Postgres / Vercel KV). This is a **milestone-sized** lift: deploy story, auth (this is single-tenant in Ben's hands today, but a real backend forces the question), CORS, CI, etc.
  - **Recommendation:** Ship a U1 quick-win (echo inputs into the result panel) immediately. Defer U1.a (browser-only persistence) to v1 if Ben needs single-device revisit. Treat U1.b (real backend) as a v2 decision point that the "Manager out of the loop" north star may force anyway.
- **U2 (multi-vision data model)** — touches:
  - Build-time Python that creates the joblib bundle (`scripts/build_demo_static.py`, master Parquet generator).
  - The frontend quote form (multi-row vision picker).
  - The result-panel "drivers" rendering (per-vision contribution).
  - Ben's data ingest format (he'll need to record N visions per project going forward).
  - A bundle rebuild + redeploy is required for the model side to take effect.
- **S3 (AI Scope-Review tool)** — same backend question as U1.b. Either browser-only LLM call (API key in client = bad) or a backend serverless function (Vercel function / FastAPI). The fact that S3 *needs* an LLM API call probably forces the backend conversation regardless of what we decide for U1.

**Other concerns surfaced by the mapper agents (relevant to planning):**
- `vercel.json:11` cache header points at `/demo-assets/models/` but actual paths are `/demo-assets/models_real/` and `/demo-assets/models_synthetic/` — a dead cache rule worth fixing.
- `scripts/build_demo_static.py:163` LFS-pointer guard "silent-skips" — broken builds can ship without failing.
- Pyodide CDN script is loaded without SRI (`pyodideClient.ts:111-122`); first-party-controlled, but still a hardening gap.
- Cold-start payload ≈50–65 MB, not the README's claimed 30 MB.
- Jargon guard covers `DemoHome` and `DataProvenanceNote` only; `QuoteResultPanel` + Insights pages are uncovered. Insights-pack rework (U3) and any new copy in the result panel must extend the guard's scope.
- The 110-line `PYODIDE_RUNTIME` Python embedded as a JS template literal has no syntax/type check against `core/config.py` — drift risk if either side changes.

These are not from Ben's email but they should be on the radar when we phase the work.

---

## Bugs

### B1 — Compare workspace crashes when typing into "ME hours" input  ▸ **P0**

**Symptom:** User fills out a dummy quote, clicks "compare to my quoted hours", starts typing in the ME hours field, app crashes with React error boundary screen ("Something went wrong / A page in the Matrix Quote Web app crashed"). Reproduced **twice** with the value `2,000`.

**Stack trace (top frame):**
```
fr/<.children<.children<.children</onChange/<@
  https://matrix-quote-web-demo.vercel.app/assets/quoteAdapter-DkGTk6kG.js:11:39741
Ui@.../assets/index-CX1gP5DN.js:39:17827
Rl@.../assets/index-CX1gP5DN.js:39:18285
useState@.../assets/index-CX1gP5DN.js:39:24665
```

**Likely root cause:** The `onChange` handler in the Compare/QuoteAdapter component is doing a numeric coercion on user input. The input value `2,000` (with thousands separator) likely produces `NaN` from `Number()` or `parseFloat()`, and downstream code (chart rendering, state setter, or computed prop) does not tolerate `NaN`. The crash propagates up through React's reconciler.

**Investigation surface:**
- `frontend/src/.../quoteAdapter.*` — the bundle name `quoteAdapter-DkGTk6kG.js` suggests a `quoteAdapter` module.
- `Compare` route component (added in `749d787 feat(compare): split Comparison tool into Quote and Compare routes`).
- ME-hours input field's `onChange`.

**Acceptance criteria:**
- Typing `2,000`, `2000`, `2,000.5`, empty string, and non-numeric text into the ME-hours input does **not** crash the app.
- Invalid input shows inline validation, never throws.
- Add a regression test in Vitest that drives the input via `fireEvent.change`.

---

### B2 — "Hours by Sales Bucket" shows identical Total and Avg values  ▸ **P1**

**Symptom:** In Business Insights, the "Hours by Sales Bucket" chart/table reports the same value for Total and Avg columns.

**Likely root cause:** Aggregation pipeline reuses the sum without dividing by count, or both computed fields point to the same field accessor.

**Acceptance criteria:**
- Total ≠ Avg whenever bucket has more than one project.
- Verify with a fixture dataset that has known totals and averages.

---

## UX & data-correctness gaps

### U1 — Quote inputs are lost after submit  ▸ Strategic, foundational

**Quote (verbatim):**
> "If I input data on the form to quote hours, I can get the hours estimate summary but I cannot see what I input in the form. If I move on, I'll lose that form. Either the output should include my inputs, or the input form could be saved in a database for me to come back to and edit later. **The database approach is more in line with our quoting process — we often revise quotes several times over many weeks or months.**"

**Two fix levels:**

1. **Quick (cheap):** Echo input values into the result panel so they are at least visible in the same view.
2. **Right (foundational):** Persist quotes to a database. Each quote gets an ID, can be reopened, edited, re-quoted, versioned. Lists, search, status (draft / sent / won / lost / revised). This matches the customer's actual workflow ("revised several times over many weeks or months").

**Recommendation:** Implement (1) immediately as a small win, while spec-ing (2) as its own milestone. (2) is large — it's effectively introducing a Quote entity, persistence layer, list/detail UI, edit flow, and version history.

### U2 — Multiple vision types per project  ▸ Data-model change

**Quote:** "On some projects we use multiple vision types. That's a limitation of how I recorded the data, but I was trying to keep data entry simple. How could it work to list visions; cameras can all vary in hours required?"

**Implication:** The current schema treats `vision_type` as a single field per project. Reality is **N vision types per project, each with its own hours contribution**. This affects:
- Master Parquet schema (a quote's vision becomes a list of `{type, count, hours}`).
- ML feature engineering (need per-vision-type features, or a learned aggregation).
- Quote input form (multi-row vision picker).
- Result panel (per-vision drivers in the breakdown).

**Recommendation:** Treat as a first-class data-model evolution; do not patch around it.

### U3 — Insights pack download is confusing  ▸ Polish + comms

**Quote:** "The 'Download insights pack' looks like the .csv is just a few columns. Not sure what I'm looking at here. ... How do I open a JSON file? I haven't heard of this before. Looking online it makes me think of a data visualizer like MatLab?"

**Three sub-issues:**
- **CSV unclear** — columns are not self-explanatory; reviewer can't tell what they're looking at.
- **JSON file is alien to a non-technical audience** — Ben is the target user persona; if he can't open it, no one in his audience can.
- **Notepad data is good** — explicit positive callout. Keep this.

**Fix options:**
- Drop JSON entirely from the consumer-facing pack; keep it only for the admin/technical export if needed.
- Replace with a clearly-labeled XLSX (multi-sheet: Summary / Drivers / Raw / README sheet explaining columns).
- Add a one-page "How to read this" PDF or a README inside the bundle.

### U4 — Hover affordances on charts and category labels  ▸ Small wins

**U4a — Complexity vs Hours hover-to-expand:**
> "Complexity Vs Hours – If I want to hover over a column to see which projects make up each level, is that an easy feature to add?"

Drill-down tooltip listing the projects in each complexity bucket. Reuses the same data already on the client.

**U4b — Category-name tooltips:**
> "It's a nice to have, but would there be a way to include definitions for each category when you hover over the name?"

Lightweight glossary tooltip on category labels (System Category, Sales Bucket, Vision Type, etc.).

---

## Strategic feedback

### S1 — North star: "Manager out of the loop"  ▸ Reframes the product

**Quote (verbatim):**
> "Problem: Sales engineers engage too much with Operations Managers to get accurate hours estimates and develop questions to customers on what our scope is.
>
> I see this being solved in two ways:
> 1. Managers add value by estimating hours, which is the tool we're working on. They do this using Hours Estimation tools that they've developed in the last year and experience with personal judgement. **If we can use this tool you're working on to mine actual data, we could essentially take our managers out of the loop** which will [shorten] quote timelines, possibly increase accuracy, and be a scalable solution that allows Manager to manage, not quote.
> 2. The next way we can remove them from the loop is to create a list of questions from Managers (with some associated context and who said it) and use AI to review [the] customer's requested scope of work or our proposed solution. Then, this tool will help ID 'gotchas' and other areas that Managers usually add value."

**Implication for PROJECT.md vision:**
- Primary user is **Sales Engineer**, not Operations Manager.
- Success metric is **Sales Engineer self-sufficiency** — quote produced without Manager involvement.
- Secondary metric: **time-to-quote** (was: presumably accuracy or fidelity).
- Tertiary: **scalability** — Managers freed for management.

### S2 — Material Cost vs Labor Hours validates a ROM-quote shortcut

**Quote:** "These are great insights. The Material Cost vs. Labor Hours is especially telling. I could see a case where simply taking a material cost estimate and then an average lab[or rate would] yield quicker rough order of magnitude (ROM) quotes and be roughly equivalent to actual hours."

**Implication:** There is appetite for a **ROM-quote mode** that takes only material cost and outputs an hours estimate using a simple linear/average model. This is lighter than the full feature-based ML quote and would serve as the fastest path through the tool.

### S3 — Future tool: AI Scope-Review  ▸ Future milestone, not v1

The "second way to remove Managers from the loop" — a Manager-authored question library + LLM that reviews customer scope or proposed solutions for gotchas. **This is a separate product** that would live alongside Single Quote, Batch Quotes, Compare, and Business Insights as another tool in the workspace.

**Components implied:**
- Manager question library (CRUD, with attribution: who said it, context, why it matters).
- Scope-review intake (paste customer RFQ or our proposed solution).
- LLM pass over the scope using the question library as a checklist.
- Output: structured gotcha/risk report with citations to the relevant Manager questions.

### S4 — Manager hour-estimator tools intentionally out of scope

**Quote:** "I intentionally [didn't] include it in the scope because I wanted the data to speak more than someone else's take on an estimator tool. They're also extremely crude tools."

**Implication:** Do **not** ingest Manager-built spreadsheet estimators as features or training inputs. The product's premise is data-driven, not heuristic-driven. This is a deliberate scoping decision; preserve it.

**Open question Ben raised:** "Would their hour estimator tools help in developing this tool you've worked on?" — left for Tom to answer. **My recommendation:** No, for the reason Ben gave; we may use them as a benchmark to compare against (does our model beat their crude tool?), but not as an input.

---

## Data status

- Synthetic dataset is the sole training source today; master Parquet for real data is empty (the 409 state on Single Quote / Batch Quotes).
- Ben commits: "I'll work to get more data."
- Synthetic company names are clearly synthetic; Ben noted with humor ("I wish those companies in the synthetic data were all our real customers haha"). Keep them obviously synthetic — no need to make fake names look real.

---

## Suggested mapping into GSD planning

> Phase numbering below is illustrative; will be finalized during `/gsd-new-project` or `/gsd-new-milestone` after `.planning/codebase/` mapping completes.

### Milestone v1 — Customer-trust-fixes (urgent)
- **Phase 1: P0 Bug Sweep** — Fix B1 (Compare crash on `2,000`), B2 (Total/Avg duplication), and the input-recap quick-win for U1.
- **Phase 2: Hover affordances** — U4a (Complexity drill-down) + U4b (category tooltips).
- **Phase 3: Insights pack rework** — U3 (drop/replace JSON, README inside bundle, clarify CSV).

### Milestone v2 — Workflow fit
- **Phase 4: Quote persistence** — U1 done right. Quote entity, list/detail UI, edit + version, draft/sent/won/lost status.
- **Phase 5: Multi-vision data model** — U2. Master Parquet schema migration, retraining, multi-row vision UI, per-vision result drivers.
- **Phase 6: ROM-quote mode** — S2. "Just give me a number from material cost" lightweight path.

### Milestone v3 — Manager-out-of-the-loop
- **Phase 7: Real-data ingest** — formalize the upload/retrain loop once Ben's data lands.
- **Phase 8: AI Scope-Review (new tool)** — S3. Manager question library + LLM scope reviewer with attribution and gotcha output.

### Out of scope (durable decisions)
- Manager-built hour-estimator spreadsheets are not training inputs (S4). May appear as benchmark comparators only.

---

## Open questions for Tom (answer before `/gsd-new-project`)

1. **U1 — quick fix or right fix first?** Do we ship the input-recap-in-result-panel as a same-day patch, then plan persistence as its own milestone? Or skip the quick fix and go straight to persistence?
2. **B1 fix urgency** — Is the Compare crash a `/gsd-fast` job to do today, or does it roll into Phase 1?
3. **S3 scope-review tool** — Confirm we want this in v3, not earlier. It's a separate product surface and might warrant its own repo.
4. **S4 benchmark** — Do we want to formally benchmark our model against Manager spreadsheets in v2? Or leave that as a verbal claim?
5. **Naming for the customer:** Demo is internally framed as "Real" vs "Synthetic". For Ben's audience, do we keep that framing or rename "Real" → "Live data" / "Production" once master dataset is uploaded?

---

## Appendix — verbatim crash trace

```
fr/<.children<.children<.children</onChange/<@https://matrix-quote-web-demo.vercel.app/assets/quoteAdapter-DkGTk6kG.js:11:39741
Ui@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:39:17827
Rl@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:39:18285
useState@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:39:24665
J.useState@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:10:6364
fr@https://matrix-quote-web-demo.vercel.app/assets/quoteAdapter-DkGTk6kG.js:11:31311
Bc@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:39:17007
xu@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:41:3139
ug@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:41:44737
og@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:41:39729
q0@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:41:39657
va@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:41:39508
Ou@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:41:35875
Lf@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:41:36678
or@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:39:3274
Dr@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:41:37125
Ap@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:38:9040
Sl@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:38:33152
kc@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:38:17362
Iv@https://matrix-quote-web-demo.vercel.app/assets/index-CX1gP5DN.js:38:17144
```

Reproduced twice with the same trace. Triggering input value: `2,000` typed into the ME hours field on the Compare workspace.
