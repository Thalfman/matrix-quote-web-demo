# REQUIREMENTS

> v1 = current milestone (Customer-trust fixes). v2 / v3 are reserved for future milestones; their REQ-IDs exist so we can refer to them in roadmap and seed/backlog discussions without re-deriving them later.

## v1 — Customer-trust fixes (current milestone)

Goal of this milestone: ship the fixes Ben asked for in the 2026-05-01 review, plus a few build-quality cleanups surfaced by the codebase map. Outcome: when Ben (or any non-technical reviewer) re-tries the demo, nothing crashes, every chart says what it claims, and the insights pack is self-explanatory.

### BUG (Critical bug fixes)

- [ ] **BUG-01**: Compare workspace ME-hours input must accept comma-formatted numbers (e.g. `2,000`, `2000`, `2,000.5`, empty string, non-numeric text) without crashing the app. Repro reported twice by Ben on the deployed demo. Stack trace points at `quoteAdapter*` `onChange` handler. Likely root cause: `Number()` / `parseFloat()` on `"2,000"` returns `NaN`, downstream code does not tolerate `NaN`. Acceptance: regression test in Vitest.
- [ ] **BUG-02**: Hours by Sales Bucket must show distinct Total and Avg values (whenever bucket has more than one project). Today the chart renders identical values for both. Acceptance: fixture-based test confirming `total ≠ avg` for the multi-project case.

### UX (User experience polish)

- [ ] **UX-01**: Quote inputs visible in the result panel — a recap of every field the user submitted, shown alongside the estimate. Quick win for U1 from feedback. Defers full quote persistence (`PERSIST-01` in v2) — this is the same-day patch that closes the most jarring information loss.
- [ ] **UX-02**: Hover on Complexity vs Hours bars reveals which projects make up that level. Drill-down tooltip listing project names + hours.
- [ ] **UX-03**: Category-name tooltips with definitions (System Category, Sales Bucket, Vision Type, etc.) shown on hover anywhere a category label appears.

### DATA (Data correctness and build hygiene)

- [ ] **DATA-01**: `vercel.json:11` cache header points at the correct model paths. Today it caches `/demo-assets/models/` which does not exist; actual paths are `/demo-assets/models_real/` and `/demo-assets/models_synthetic/`. Acceptance: cache rule covers both real and synthetic, dead rule removed.
- [ ] **DATA-02**: `scripts/build_demo_static.py:163` LFS-pointer guard fails the build loudly when joblibs ship as LFS pointers. Today the guard "silent-skips" — broken builds can deploy. Acceptance: build aborts non-zero with a clear message when a pointer is detected.
- [ ] **DATA-03**: Jargon guard extends to cover `QuoteResultPanel.tsx` and the Insights pages. Today only `DemoHome` and `DataProvenanceNote` are checked; new copy added in those uncovered surfaces could leak ML jargon to the customer audience.

### INSIGHTS (Insights pack rework)

- [ ] **INSIGHTS-01**: The downloadable insights pack does NOT include a raw `.json` artifact in the customer-facing bundle. Ben (the target persona) didn't know how to open it ("How do I open a JSON file?"). Acceptance: JSON either dropped, replaced with XLSX, or hidden behind a separate "for engineers" toggle. Default download path produces only artifacts a non-technical user can open natively.
- [ ] **INSIGHTS-02**: The insights pack CSV columns are self-explanatory. Today reviewer reported "Not sure what I'm looking at." Acceptance: columns either renamed to plain English OR a one-page README is bundled inside the download explaining each column. Notepad data is praised — keep it.

---

## v2 — Workflow fit (deferred)

Goal of this milestone: reshape the tool to match Ben's actual quoting workflow (multi-week revisions, multi-vision projects, ROM-quote-only path).

- **PERSIST-01**: Quotes are saved, listable, editable, and version-tracked across sessions. This is U1 done right per Ben's email: "we often revise quotes several times over many weeks or months."
  - **OPEN DECISION:** browser-only (localStorage / IndexedDB) vs introducing a backend for the first time. Browser-only is cheap but loses cross-device sync; backend is right but milestone-sized. Decide during v2 discuss-phase.
- **DATA-04**: The schema and ML pipeline support **multiple vision types per project**, each with its own hours contribution. Affects master Parquet generator, joblib bundle build, frontend quote form (multi-row vision picker), result-panel drivers (per-vision contribution), and Ben's data ingest format going forward.
- **ROM-01**: A **ROM-quote mode** that takes only material cost as input and outputs an hours estimate, using a simple linear/average path. Customer validated as a high-value lightweight path: "simply taking a material cost estimate and then an average labor [rate would] yield quicker rough order of magnitude (ROM) quotes."
- **BENCH-01** (optional, low priority): Benchmark our model's hours estimates against the Manager-built spreadsheet estimators Ben described as "extremely crude." Used as a marketing comparator, not as a training input. Out-of-scope decision is durable; this is just measurement.

---

## v3 — Manager out of the loop (deferred)

Goal of this milestone: complete the north-star reframe with real-data ingest and the AI Scope-Review sibling tool.

- **DATA-05**: Real-data ingest cycle is formalized. When Ben provides more real project data, there is a documented path to retrain the Real bundle and ship it without manual scripting. May or may not require a backend; will be decided after PERSIST-01's backend question.
- **AI-01**: **AI Scope-Review tool** ships as a sibling workspace to Single Quote / Batch / Compare / Business Insights. It consults a Manager-authored question library (with attribution: who said it, why) and uses an LLM to flag gotchas in customer-requested scope or in our proposed solution. Output: structured gotcha/risk report with citations to the relevant Manager questions. Major sub-decisions: where the LLM call lives (browser-only? backend?), how the question library is curated, how the output is formatted for non-technical consumption.

---

## Out of Scope (durable)

- **Manager hour-estimator spreadsheets as training inputs.** Customer deliberately excluded these. They may appear as benchmark comparators (`BENCH-01`) but never as features or labels.
- **Live retraining at runtime in this repo.** Static SPA architecture forces all model updates through build + redeploy. A v3 decision to introduce a backend may revisit this; until then, retraining is offline.
- **Synthetic company names made to look real.** Customer noted with humor; no work needed.

---

## Traceability

| REQ-ID | Phase | Status |
|---|---|---|
| BUG-01 | 1 | active |
| BUG-02 | 1 | active |
| UX-01 | 1 | active |
| UX-02 | 2 | active |
| UX-03 | 2 | active |
| INSIGHTS-01 | 3 | active |
| INSIGHTS-02 | 3 | active |
| DATA-01 | 4 | active |
| DATA-02 | 4 | active |
| DATA-03 | 4 | active |
| PERSIST-01 | (v2) | deferred |
| DATA-04 | (v2) | deferred |
| ROM-01 | (v2) | deferred |
| BENCH-01 | (v2) | deferred |
| DATA-05 | (v3) | deferred |
| AI-01 | (v3) | deferred |
