# Matrix Quote Web — "Estimator Cockpit" Redesign

**Date:** 2026-04-17
**Status:** Approved design
**Scope:** Full-stack redesign of Matrix Quote Web with brand alignment to Matrix Design LLC, a reworked Single Quote workspace, saved-scenario library with compare, driver/similar-project explainability, client-ready PDF export, expanded accuracy insights, and demo mode.

---

## 1. Goals & non-goals

### Goals
- Make the app feel like a native extension of Matrix Design LLC (navy + white + charcoal, industrial-yet-approachable).
- Turn the Single Quote page into an estimator's daily workspace: fast, keyboard-friendly, explainable, trustworthy.
- Give sales a shareable artifact (branded PDF quote).
- Give leadership high-signal accuracy and activity dashboards.
- Ship with a demo mode so the product can be shown end-to-end before the real dataset is loaded.

### Non-goals
- No changes to `core/` or `service/` (vendored). All new logic is backend-only or frontend.
- No real multi-user auth beyond the existing admin password. Saved quotes attribute to a browser-captured display name only.
- No multi-scenario PDF in v1 (deferred to follow-up).
- No marketing/illustration imagery inside the app. Brand imagery lives only in the PDF export.

### Audience
Mixed — one app, three audiences:
- **Estimator / engineer** (power user, many quotes/day): speed, keyboard flow, explainability.
- **Sales / account manager**: polished output, shareable PDF, clear confidence messaging.
- **Executive / owner**: dashboards, trends, accuracy calibration, pipeline signal.

---

## 2. Architecture & navigation

Sidebar + main content stays. Groups:

```
MATRIX  Quote Estimation                         [user initials]

ESTIMATE
  • Single Quote                ← default landing (the cockpit)
  • Batch Quotes

QUOTES                          ← NEW top-level group
  • Saved Quotes                ← list of scenarios
  • Compare                     ← opens only when 2+ selected

INSIGHTS
  • Estimate Accuracy           ← expanded (path: /performance, preserved from today)
  • Executive Overview          ← NEW (path: /insights)

ADMIN (visible only when logged-in)
  • Overview
  • Upload & Train
  • Data Explorer
  • Drivers & Similar
```

Top-right: compact user/role pill. On first run, the browser prompts for a display name (stored in localStorage). This name is echoed in save-quote POST bodies as `created_by`. Admin-login flow is unchanged.

Mobile: existing drawer pattern preserved. Single Quote cockpit collapses to a tabbed single column (Form → Result → Drivers → Similar).

---

## 3. Visual system (Matrix brand alignment)

### Palette (CSS tokens, light + dark)
- **Navy** `#0B1F3A` primary, `#15305B` hover, `#0A1729` pressed — matches Matrix marketing navy.
- **Ink** `#0F172A` charcoal text; **muted** `#475569`.
- **Surface** `#FFFFFF` / **bg** `#F6F8FB` (cool off-white).
- **Border** `#E2E8F0` hairline.
- **Signature accent — electric-blue** `#2563EB` for primary CTAs, active states, focus rings. Replaces amber across the app.
- **Semantic:** success `#0F766E`, warning `#B45309`, danger `#B91C1C`. Confidence bands use success teal.
- **Dark mode:** bg `#0A1220`, surface `#0F1B30`, ink `#E2E8F0`, same electric-blue accent.

### Typography
- Display/UI: **Inter** (already wired via `font-feature-settings`).
- Numeric hero (estimates, ranges, tables): Inter tabular-nums, 56–64px weight 600 with negative tracking for the hero number.
- Headings: h1 32 / h2 24 / h3 18. Body 14/1.6.

### Depth & motion
- Cards: 1px border + `shadow-xs`, elevate to `shadow-sm` on hover.
- Result hero: subtle navy-gradient wash (`from-navy-900/3 to-transparent`).
- Page enter: 180ms (existing).
- Hero number: count-up 0 → target over 500ms ease-out. Disabled under `prefers-reduced-motion`.
- Micro-transitions on buttons/inputs: 150ms. Toast slide+fade: 250ms.

### Icons
Lucide, stroke 1.75, nav size 18 / chip size 16.

### Imagery
None in-app. Matrix logo + photo strip appear only in the PDF export.

---

## 4. Single Quote Cockpit

Two-column workspace on `≥lg`, single-column on mobile. Result panel is sticky on desktop.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Single Quote                                        [● Models ready]│
│  Generate an hour estimate with confidence per sales bucket.         │
├───────────────────────────────┬─────────────────────────────────────┤
│  FORM (left, ~60%)            │  RESULT (right, sticky, ~40%)       │
│                               │                                     │
│  Project                      │  ESTIMATED HOURS                    │
│    Industry segment   [▾]     │    1,248    (count-up)              │
│    System category    [▾]     │    Range 1,050 – 1,470 · 90% CI     │
│    Automation level   [▾]     │    Confidence ●●●●○  Strong         │
│                               │                                     │
│  Scope                        │  Tabs: Estimate · Drivers ·         │
│    Stations       [##]        │        Similar · Scenarios          │
│    Conveyor length[##]        │                                     │
│    Vision? [toggle]           │  (default = Estimate)               │
│    Palletizing? [toggle]      │  Per-bucket breakdown bars          │
│                               │                                     │
│  Sales buckets (expandable)   │  [ Save scenario ]  [ Export PDF ]  │
│                               │                                     │
│  [ Generate estimate ]        │                                     │
│   ⌘⏎ also submits             │                                     │
└───────────────────────────────┴─────────────────────────────────────┘
```

### Behaviors
- **Smart defaults**: dropdown catalog preselect (existing); new "Populate with last quote" link reads the most recent saved scenario by `created_by`.
- **Live validation**: zod on blur (existing), inline red errors under each field.
- **Keyboard**: `⌘/Ctrl+Enter` submits; `Esc` collapses an expanded section.
- **Submit states**: result panel shows a skeleton shimmer matching final layout during the mutation (no full-screen spinner).
- **Empty state** (pre-first-submit): muted card — "Fill the form and generate an estimate. You'll see confidence intervals, drivers, and similar past projects here."
- **Not-trained state** (models_ready=false): existing full-page empty state unchanged.
- **Hero count-up**: 500ms ease-out, skipped under reduced motion.
- **Confidence dots**: 5-dot scale derived from the existing `confidence` field (Weak / Moderate / Strong / Very Strong).

### Result tabs
1. **Estimate** — per-bucket bars + numbers (refinement of today's layout).
2. **Drivers** — top feature contributions per operation (Section 6).
3. **Similar** — nearest historical projects (Section 6).
4. **Scenarios** — this session's saved scenarios + "Compare selected" CTA.

---

## 5. Saved Quotes library & Compare

### `/quotes` — Saved Quotes list
Sortable, filterable table of every saved scenario.

- Columns: checkbox, name, project_name, client_name (optional), industry_segment, hours, range, saved-at, created_by, overflow.
- Filters: project dropdown, industry dropdown, date range, free-text search.
- Row actions: Duplicate (opens Single Quote prefilled), Export PDF, Delete (confirm modal).
- Bulk actions enabled when 2–3 rows checked: "Compare selected".

### `/quotes/compare?ids=a,b,c` — Compare (2–3 scenarios)
Side-by-side columns, one per scenario.

- Row 1: headline hours, range, confidence, Δ vs first column (absolute + %).
- Row 2: grouped bar chart — 12 operations across the selected scenarios.
- Row 3: **input diff table** — only fields that differ across scenarios, differences highlighted.
- Row 4: each column's top 3 drivers, stacked.
- Export PDF on Compare is deferred to a follow-up.

### Saved scenario schema
`id, name, project_name, client_name?, industry_segment, inputs (full QuoteInput JSON), prediction (full QuotePrediction JSON), quoted_hours_by_bucket?, created_at, created_by, notes?`

### Storage
- `data/quotes.parquet`. `inputs` and `prediction` stored as JSON strings so schema evolution of `QuoteInput` doesn't churn the parquet.
- Atomic writes: read → append → write `quotes.parquet.tmp` → `os.replace`. Single-worker uvicorn is sufficient; `filelock` is the follow-up if we ever scale to multi-worker.

### Endpoints
- `GET /api/quotes` — list with simple filters/pagination.
- `POST /api/quotes` — create.
- `GET /api/quotes/{id}` — detail.
- `DELETE /api/quotes/{id}`.
- `POST /api/quotes/{id}/duplicate` — returns new id.
- `GET /api/quotes/{id}/pdf` — PDF for a saved scenario.
- `POST /api/quote/pdf` — ad-hoc PDF (pre-save).

No auth gate; `created_by` is the browser-captured display name sent with each save.

---

## 6. Drivers & Similar Projects

### Drivers tab
For each of the 12 operations, surface the top 3 features pushing hours up or down for this specific quote.

- Bars show signed contribution, centered on zero. Humanized feature labels (`snake_case` → Title Case) via a label map.
- Operation dropdown filter; default "All" sums/averages across operations.

**Implementation — per-request contributions.**
- Prefer native `predict(..., pred_contrib=True)` on the trained gbdt models (LightGBM / XGB / CatBoost all support this).
- Fallback to `shap.TreeExplainer` only if the native path is unavailable (detected at startup).
- Wrapped in try/except per operation: if one model's contribution call fails, that operation shows "Not available for this operation" and the rest still render.
- Bundled into the existing `POST /api/quote` response (not a separate endpoint).

### Similar tab
3–5 nearest historical projects with real project names, dates, and actual total hours.

- Nearest-neighbors over the encoded feature vector used by the model (cosine on standardized features, k=5).
- Uses the service's existing preprocessor to transform the live input identically to training data.
- Admin toggle "show anonymized names" redacts real names to `Project #YYYY-NNN`. Default: show real names.
- Each neighbor row: name · year · industry · automation · stations · actual hours · Δ vs today's estimate · similarity rating.

### Schemas
```python
class DriverContribution(BaseModel):
    feature: str
    contribution: float
    value: str

class OperationDrivers(BaseModel):
    operation: str
    drivers: list[DriverContribution]

class NeighborProject(BaseModel):
    project_name: str
    year: int | None
    industry_segment: str
    automation_level: str
    stations: int | None
    actual_hours: float
    similarity: float
```

`QuotePrediction` gains optional `drivers: list[OperationDrivers] | None` and `neighbors: list[NeighborProject] | None`.

---

## 7. Executive Overview & expanded Estimate Accuracy

### `/performance` — Estimate Accuracy (public, expanded)
- Headline KPIs: Overall MAPE, Within ±10%, Within ±20%.
- MAPE by operation — 12 bars, sorted.
- Confidence calibration scatter: predicted range vs actual, points inside the 90% band colored green, outside amber. Target: ~90% inside.
- Training history line chart: overall MAPE across training runs, dots annotated with run date + row count.
- "Last trained" pill + CSV download.

### `/insights` — Executive Overview (new)
- KPI cards: Active quotes (30d), Models trained N/12, Overall MAPE, Confidence calibration %.
- Quotes activity bar chart, last 26 weeks (from `quotes.parquet`).
- Latest saved quotes — compact table, 5 rows, click-through to `/quotes`.
- Accuracy by operation heatmap — 12 ops × 4 quarters, MAPE colored. Degrades to single-quarter if per-run history isn't persisted.

### Endpoints
- `GET /api/metrics/history` — list of past training run summaries.
- `GET /api/metrics/calibration` — scatter points `(predicted_low, predicted_high, actual)`.

### Prerequisite
If training-run history and calibration points aren't currently persisted per run, the spec flags this as a precondition. Options: regenerate from master + retrain, or add a one-time persistence hook in the training pipeline. Endpoints degrade gracefully (empty array) while the data source is being built out.

---

## 8. PDF export

Server-side render via **WeasyPrint** (BSD-3, pure-Python frontend, renders HTML+CSS to paginated PDF). No paid tier; free forever.

### Template — ~2–3 pages
- **Page 1 (Cover/summary)**: Matrix logo, quote number, project name, prepared-for, prepared-on, prepared-by; hero number ESTIMATED HOURS; range + confidence.
- **Page 2 (Breakdown)**: per-bucket hours table + stacked bar chart (CSS-drawn bars — no Python chart dep), input summary table.
- **Page 3 (Assumptions)**: static disclaimer copy, footer on every page (Matrix address/phone/URL, page N of M).

### Implementation
- Jinja2 HTML: `backend/app/templates/quote_pdf.html` + `quote_pdf.css` (palette from Section 3).
- Charts: CSS-drawn bars within the template — no new Python chart dep.
- Endpoints:
  - `GET /api/quotes/{id}/pdf` streams `application/pdf` with `Content-Disposition: attachment; filename="Matrix-Quote-{project}-{date}.pdf"`.
  - `POST /api/quote/pdf` — ad-hoc export without persisting.

### Dependencies
- `weasyprint` (new Python dep).
- Dockerfile: `apt-get install libpango-1.0-0 libpangoft2-1.0-0` (standard WeasyPrint prereqs).
- No new frontend deps.

### Export points
- Single Quote cockpit — "Export PDF" next to "Save scenario" (uses ad-hoc endpoint if not yet saved).
- Saved Quotes list — per-row action.
- Compare page — deferred to follow-up.

---

## 9. Demo mode

> **Status: Shipped 2026-04-17** (branch `feat/scaffold-and-single-quote`, Plan F).

Lets the app boot with a working Single Quote flow, saved-quotes list, PDFs, and dashboards, with no real dataset.

### Mechanism
- Commit `demo_assets/` in the repo: `demo_assets/master.parquet` (~200–400 synthetic rows exercising every dropdown value and all 12 operations) + `demo_assets/models/*.joblib` + `demo_assets/metrics_history.parquet`.
- On startup: if `DATA_DIR` is empty **and** `ENABLE_DEMO=1`, copy `demo_assets/*` into `DATA_DIR` so the app comes up as if trained. Off by default in production.
- Admin button on `/admin/train`: **"Load demo data"** does the same copy manually. Disabled if real data is already present (prevents clobber).
- Demo status flag written into the app's status file; when true, a **"Demo mode"** chip appears in the top-right of every page so nobody confuses demo output with real output.
- Saved quotes in demo mode write to `quotes.parquet` normally → save/compare/PDF all demoable end-to-end.

### Build-time generation (one-time, committed)
- Script `scripts/generate_demo_assets.py` — produces synthetic parquet + trains the 12 models using the real `service/` training pipeline so demo models are structurally identical to production.
- Re-run only when the `QuoteInput` schema changes.

### Deployment
- Local dev: `ENABLE_DEMO=1 uvicorn ...` → instant.
- Railway staging / client demo URL: same env var.
- Railway production: `ENABLE_DEMO` unset; behavior unchanged.

### As-shipped implementation details

- **Endpoints:** `GET /api/demo/status` (public, mounted on the metrics router); `POST /api/admin/demo/load` (admin-guarded, on the admin router).
- **Status file:** `DATA_DIR/status.json` — written by `demo._write_status()`; read by `demo.read_status()`.
- **Committed assets tree:** `demo_assets/` — `data/master/projects_master.parquet` (300 rows), `models/*.joblib` (12 ops), `models/metrics_summary.csv`, `models/metrics_history.parquet` (54 rows: 6 run-level + 12 ops × 4 quarters), `models/calibration.parquet` (120 rows with `inside_band` column).
- **Startup hook:** `demo.seed_if_enabled()` called inside `create_app()` after `ensure_runtime_dirs()` in `backend/app/main.py`.
- **Training in `generate_demo_assets.py`:** uses `core.models.train_one_op` loop over `core.config.TARGETS` (plan originally referenced nonexistent `service.train_lib.train_all_operations`).

---

## 10. Backend shape (summary)

### Files touched
- `backend/app/schemas_api.py` — extended schemas (Section 5, 6).
- `backend/app/storage.py` — `quotes.parquet` read/write, demo-asset copy helper.
- `backend/app/routes/quote.py` — extend `POST /api/quote` to include drivers + neighbors.
- `backend/app/routes/quotes.py` — **new** CRUD + PDF endpoints.
- `backend/app/routes/metrics.py` — add history + calibration endpoints.
- `backend/app/explain.py` — **new** driver & neighbor computation module.
- `backend/app/pdf.py` — **new** WeasyPrint render helper.
- `backend/app/templates/quote_pdf.html` / `.css` — **new** PDF template.
- `backend/app/main.py` — demo-mode startup hook.
- `Dockerfile` — WeasyPrint system libs.
- `requirements.txt` — `weasyprint` (+ `shap` only if native `pred_contrib` unavailable).

### Layer boundaries
- **Zero edits to `core/` or `service/`.**
- Driver computation reaches into the joblib bundle from a new **backend-only** accessor (`backend/app/explain.py`).
- Neighbor search loads the training parquet + service preprocessor; it does not modify them.
- No `CC_ALLOW_CORE_EDIT` required for any step.

---

## 11. Frontend shape (summary)

### Files touched
- `frontend/tailwind.config.ts` / `src/styles/globals.css` — palette swap (amber → navy + electric-blue), token updates.
- `frontend/src/components/Layout.tsx` — new nav groups (QUOTES, INSIGHTS), user pill, demo-mode chip.
- `frontend/src/pages/SingleQuote.tsx` + `single-quote/*` — cockpit rewrite (form / sticky result / tabs).
- `frontend/src/pages/Quotes.tsx` — **new** saved-quotes list.
- `frontend/src/pages/Compare.tsx` — **new** compare view.
- `frontend/src/pages/ModelPerformance.tsx` — expanded accuracy dashboard.
- `frontend/src/pages/ExecutiveOverview.tsx` — **new** exec dashboard (route `/insights`).
- `frontend/src/pages/UploadTrain.tsx` — add "Load demo data" button.
- `frontend/src/api/*` — regenerate via `npm run gen:api` after schema extension.
- `frontend/src/App.tsx` — new routes.

### Dependencies
No new packages. Recharts, TanStack Query, React Hook Form, Zod, Lucide, sonner, tailwind — all already present.

### Gates
- `npm run typecheck` must pass before any cross-layer task is considered complete (existing orchestrate rule).
- `npm run build` must pass.

---

## 12. Testing strategy

### Backend (pytest + httpx)
- `test_quote_endpoint.py` — drivers/neighbors populate when models present; 409 preserved when not trained; graceful degrade if driver compute throws for one operation.
- `test_quotes_crud.py` — POST/GET/DELETE round-trip against isolated tmp `DATA_DIR`; atomic write doesn't corrupt on partial failure; list pagination; 404 on bad id.
- `test_pdf_export.py` — ad-hoc + by-id endpoints return `application/pdf` with non-trivial body; Jinja renders without error for a fixture prediction.
- `test_metrics_history.py` — empty when file absent; returns rows when present.
- `test_demo_mode.py` — `ENABLE_DEMO=1` with empty `DATA_DIR` seeds from `demo_assets/`; load-demo endpoint refuses when real data present.
- Fixtures: tiny trained-model bundle under `tests/fixtures/` so tests don't require the master dataset.

### Frontend (Vitest + React Testing Library + MSW)
- `SingleQuote.test.tsx` — result panel tabs render; Drivers lazy content; count-up disabled under reduced motion.
- `Quotes.test.tsx` — list renders, filters work, compare button enables only when 2–3 selected.
- `Compare.test.tsx` — diff table shows only differing fields, Δ column correct.
- `Performance.test.tsx` — calibration scatter renders; graceful when endpoint empty.
- `ExecutiveOverview.test.tsx` — KPIs render from mocked data.
- MSW handlers for all new `/api/quotes/*` + extended `/api/quote`.

### Contract
- Snapshot `/openapi.json` paths to catch accidental schema drift (if a pattern already exists; otherwise simple diff check).

### Manual verification checklist
- `uvicorn backend.app.main:app` → `GET /api/health` 200.
- `ENABLE_DEMO=1` with empty `DATA_DIR` → app boots with `models_ready=true` and Demo-mode chip visible.
- Single Quote submit → result panel populates, Drivers + Similar render.
- Save scenario → appears in Saved Quotes list.
- Compare 2 → diff + grouped bar chart correct.
- Export PDF → downloads a well-formatted file with Matrix branding.
- Dark mode toggle → every page legible, no stray amber.

---

## 13. Implementation sequencing

Each phase ends with tests green + `typecheck + build` passing. Ships incrementally if needed.

1. **Visual system** — palette swap (amber → navy + electric-blue), Inter tuning, card/motion tokens. Frontend-only. Immediate "new look" before features land.
2. **Backend foundation** — extend `QuotePrediction` with drivers + neighbors, add `explain.py`, regenerate OpenAPI types on frontend.
3. **Single Quote cockpit** — two-column layout, sticky result panel, tabs, count-up.
4. **Saved quotes** — parquet storage, CRUD endpoints, `/quotes` list, duplicate flow.
5. **Compare** — `/quotes/compare` page, diff table, grouped bar chart.
6. **PDF export** — WeasyPrint template, per-scenario endpoint, Dockerfile system libs, button wiring.
7. **Executive Overview + expanded Estimate Accuracy** — new insights surfaces, metrics_history endpoint.
8. **Nav IA + user pill + demo chip** — QUOTES and INSIGHTS groups, top-right pill, demo-mode chip.
9. **Demo mode** — `demo_assets/`, `scripts/generate_demo_assets.py`, startup seeding, "Load demo data" admin button.

---

## 14. Open items / follow-ups

- **Compare-PDF** (multi-scenario template) — deferred to v2.
- **filelock on quotes.parquet** — only needed if we move to multi-worker uvicorn.
- **Training-history persistence** — if the current pipeline doesn't already snapshot per-run metrics + calibration points, add a small persistence hook. Until then, the new `/api/metrics/history` and `/api/metrics/calibration` endpoints return `[]` and the UI degrades.
- **Authenticated per-user quote lists** — out of scope for this redesign; revisit if Matrix wants multi-estimator separation beyond the `created_by` attribution.

---

## 15. Out of scope (explicit)

- No changes to `core/` or `service/`.
- No real authentication beyond the existing admin password.
- No marketing-site content or illustrations inside the app.
- No mobile-native app; responsive web only.
- No integrations with CRM/ERP.
