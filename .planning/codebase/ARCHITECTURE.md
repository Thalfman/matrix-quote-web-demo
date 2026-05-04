<!-- refreshed: 2026-05-04 -->
# Architecture

**Analysis Date:** 2026-05-04

## System Overview

This repo is a **static, single-page demo** of the Matrix quoting engine, deployed to Vercel. There is **no runtime backend**: ML inference runs in the browser via Pyodide (Python compiled to WASM) against scikit-learn pickles served from the same Vercel static origin.

The Python code under `core/` is used **only at build time** by `scripts/build_demo_static.py` and `scripts/generate_demo_assets.py` to produce the bundle. The vendored `service/predict_lib.py` is parity-preserved from the parent app but is **never imported at runtime** in this repo (no FastAPI, no Parquet read/write at request time, no JWT, no admin upload route is reachable in the deployed build).

```text
                           ┌──────────────────────────────────────────────┐
                           │  Vercel build (one-off, at deploy time)      │
                           │                                              │
   demo_assets/data/*.csv ─┤  1. scripts/build_demo_static.py             │
   demo_assets/models_*/   │  2. core.features.prepare_quote_features()   │
        *.joblib (LFS)     │  3. emit frontend/public/demo-assets/        │
                           └─────────────────┬────────────────────────────┘
                                             │ static files
                                             ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                  Vercel CDN  (frontend/dist + /demo-assets)     │
   │   • index.html, JS chunks, recharts split off                   │
   │   • /demo-assets/real-projects.json (24 records)                │
   │   • /demo-assets/synthetic-pool.json (500 records)              │
   │   • /demo-assets/models_real/*.joblib (12)                      │
   │   • /demo-assets/models_synthetic/*.joblib (12)                 │
   │   • /demo-assets/model_metrics_{real,synthetic}.json            │
   │   • /demo-assets/manifest.json (counts + feature_stats)         │
   │   • /demo-assets/py/{config,features,models,predict}.py         │
   └─────────────────────────────────────────────────────────────────┘
                                             │ user opens page
                                             ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │           Browser — React SPA (`frontend/src/main.tsx`)         │
   │                                                                  │
   │  ┌─────────────────────────┐    ┌──────────────────────────┐    │
   │  │ DemoApp routes (`@/DemoApp`) │ TanStack Query + axios   │    │
   │  │  /                      │    │ react-hook-form + zod    │    │
   │  │  /compare/{quote,...}   │    │ recharts (lazy)          │    │
   │  │  /ml/{quote,compare,...}│    └──────────────────────────┘    │
   │  └────────────┬────────────┘                                     │
   │               │                                                  │
   │   ┌───────────▼────────────────────────────────────────────┐    │
   │   │ Pyodide client (`frontend/src/demo/pyodideClient.ts`)  │    │
   │   │  • injects pyodide.js v0.27.1 from cdn.jsdelivr.net    │    │
   │   │  • loadPackage(numpy, pandas, scikit-learn, joblib)    │    │
   │   │  • mounts /demo_py/* shim into the WASM FS             │    │
   │   │  • LOADED["real"|"synthetic"] dual cache               │    │
   │   │  • predict_dataset(), collect_importances()            │    │
   │   └───────────┬────────────────────────────────────────────┘    │
   │               │ JSON                                             │
   │   ┌───────────▼────────────────────────────────────────────┐    │
   │   │ QuoteResultPanel — shared UI surface for both Quote tabs│   │
   │   │  (`frontend/src/components/quote/QuoteResultPanel.tsx`)│    │
   │   └────────────────────────────────────────────────────────┘    │
   └─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `main.tsx` | React 18 root, BrowserRouter, QueryClientProvider, RootErrorBoundary, Sonner toaster | `frontend/src/main.tsx` |
| `App` | Top-level router; branches on `IS_DEMO` to mount `DemoApp` (this build) or vestigial admin/full app routes | `frontend/src/App.tsx` |
| `DemoApp` | Demo route table — Home, three Real-Data tabs, three Synthetic-Data tabs, legacy redirects | `frontend/src/DemoApp.tsx` |
| `DemoLayout` | Sectioned sidebar (Home / REAL DATA / SYNTHETIC DATA), demo controls panel, theme toggle, mobile tool switch | `frontend/src/components/DemoLayout.tsx` |
| `DemoHome` | Two-card landing — Real Data / Synthetic Data with three sub-tab chips each | `frontend/src/pages/demo/DemoHome.tsx` |
| `ComparisonQuote` | Real-Data Quote tab — boots Pyodide for `"real"` dataset, runs prediction, renders `QuoteResultPanel` | `frontend/src/pages/demo/compare/ComparisonQuote.tsx` |
| `MachineLearningQuoteTool` | Synthetic-Data Quote tab — same flow, dataset `"synthetic"` | `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` |
| `ComparisonCompare` / `MachineLearningCompare` | Browse pool side-by-side, multi-select 2–3 projects, render `CompareBrowseTab` | `frontend/src/pages/demo/compare/ComparisonCompare.tsx`, `frontend/src/pages/demo/ml/MachineLearningCompare.tsx` |
| `BusinessInsightsView` | Shared interactive insights dashboard — KPI strip, four chart sections, ranked table, cross-filter, drawer | `frontend/src/pages/demo/business/BusinessInsightsView.tsx` |
| `pyodideClient` | Pyodide bootstrap, dual `Dataset` cache (`real` / `synthetic`), prediction + importances RPC | `frontend/src/demo/pyodideClient.ts` |
| `QuoteResultPanel` | Single result UI surface used by both Quote tabs — hero estimate, drivers, per-category H/M/L, supporting matches | `frontend/src/components/quote/QuoteResultPanel.tsx` |
| `quoteAdapter` | Maps Pyodide raw output + feature importances + per-target R² into `UnifiedQuoteResult` | `frontend/src/demo/quoteAdapter.ts` |
| `realProjects.ts` | TanStack Query hooks for `real-projects.json`, `synthetic-pool.json`, `manifest.json`; record-to-prediction adapters | `frontend/src/demo/realProjects.ts` |
| `nearestNeighbor.ts` | Z-scored Euclidean distance over numeric features + categorical mismatch penalty | `frontend/src/lib/nearestNeighbor.ts` |
| `core.config` | `TARGETS`, `SALES_BUCKETS`, `SALES_BUCKET_MAP`, `QUOTE_NUM_FEATURES`, `QUOTE_CAT_FEATURES` | `core/config.py` |
| `core.features` | `prepare_quote_features()` — numeric coercion, derived indices, categorical fill | `core/features.py` |
| `core.models` | `train_one_op()`, `predict_with_interval()`, `load_model()` — sklearn `Pipeline(preprocess → GBR)` plus q10/q90 quantile GBRs | `core/models.py` |
| `build_demo_static.py` | Build-time: CSV → JSON, copy joblibs, emit `metrics.json` + `manifest.json` + `py/` shim | `scripts/build_demo_static.py` |
| `generate_demo_assets.py` | Build-time: train both 12-model bundles via identical `train_one_op` calls | `scripts/generate_demo_assets.py` |

## Pattern Overview

**Overall:** Static SPA + in-browser WASM Python runtime. **Not** a client/server app. The "training" and "inference" boundary is a **temporal** one (build vs runtime), not a network one.

**Key Characteristics:**
- React 18 SPA with TypeScript, Vite bundler, React Router v6, TanStack Query for asset fetches.
- ML inference happens client-side in Pyodide v0.27.1 (pinned to match sklearn 1.5.2 pickle format).
- Real-data and synthetic-data sides share the same code paths — only the dataset name (`"real"` | `"synthetic"`), the loaded joblib bundle, and the supporting-matches label differ.
- Dual lazy bundle load: visiting `/compare/quote` triggers `ensureModelsReady("real")`; visiting `/ml/quote` triggers `ensureModelsReady("synthetic")`. Each is cached independently in the `LOADED` Python dict so revisits are no-ops.
- All data hooks (`useRealProjects`, `useSyntheticPool`, `useDemoManifest`, `useModelMetrics`) use `staleTime: Infinity` — fetched once per session.
- `frontend/src/components/Layout.tsx`, `frontend/src/App.tsx` admin routes (`/admin/*`), `frontend/src/api/quote.ts`, and `frontend/src/components/RequireAdmin.tsx` exist for the parent app and are gated behind `IS_DEMO === false`. They never execute in the deployed build (`vercel_build.sh` always sets `VITE_DEMO_MODE=1`).

## Layers

**Build pipeline (Python, `scripts/`):**
- Purpose: Read CSVs, train sklearn models, emit static assets.
- Location: `scripts/build_demo_static.py`, `scripts/generate_demo_assets.py`, `scripts/vercel_build.sh`.
- Contains: pandas/numpy/sklearn calls; no web framework.
- Depends on: `core/config.py`, `core/features.py`, `core/models.py`.
- Used by: Vercel `buildCommand` in `vercel.json`.

**Domain core (Python, `core/`):**
- Purpose: Single source of truth for feature schema and model training.
- Location: `core/config.py`, `core/features.py`, `core/models.py`, `core/schemas.py`.
- Contains: feature lists, derived indices, sklearn pipelines, joblib bundle shape.
- Depends on: pandas, numpy, sklearn, joblib, pydantic.
- Used by: `scripts/*` at build time; copied (with rewritten imports) into `frontend/public/demo-assets/py/` to be loaded into Pyodide at runtime by `scripts/build_demo_static.py::_copy_py_shim()`.

**Vendored service layer (Python, `service/`):**
- Purpose: Parity copy of the parent app's prediction library; **not used at runtime** in this repo.
- Location: `service/predict_lib.py`.
- Note: Imports `core.schemas.QuoteInput` (pydantic). Provides `predict_quote()` and `predict_quotes_df()` server-side equivalents. Kept for parity but unreachable in the deployed demo.

**Static assets (build output):**
- Purpose: All data + ML artifacts the SPA fetches at runtime.
- Location: `frontend/public/demo-assets/` (generated; gitignored except for the input CSVs and joblibs).
- Contains: `real-projects.json`, `synthetic-pool.json`, `manifest.json`, `model_metrics_{real,synthetic}.json`, `models_real/*.joblib`, `models_synthetic/*.joblib`, `py/{config,features,models,predict}.py`.

**SPA (TypeScript/React, `frontend/src/`):**
- Purpose: Render UI, fetch static assets, drive Pyodide for inference.
- Location: `frontend/src/`.
- Contains: routes, pages, components, demo helpers, lib utilities, API types (vestigial), styles.
- Depends on: react, react-router-dom, react-hook-form, zod, @tanstack/react-query, axios (vestigial), recharts (lazy), sonner, lucide-react.
- Used by: end users via Vercel CDN.

**Pyodide runtime (browser, lazy):**
- Purpose: Run sklearn predictions on user inputs in the browser.
- Location: `frontend/src/demo/pyodideClient.ts` orchestrates; `frontend/public/demo-assets/py/` provides the shim modules.
- Contains: WASM Python runtime, numpy/pandas/sklearn/joblib packages, dual bundle cache (`LOADED["real"]`, `LOADED["synthetic"]`), feature-importance cache.
- Depends on: pyodide CDN at `https://cdn.jsdelivr.net/pyodide/v0.27.1/full/`.

## Data Flow

### Single Quote (Real or Synthetic)

The browser-only flow — there is no server hop.

```text
User opens /compare/quote (Real) or /ml/quote (Synthetic)
         │
         ▼
ComparisonQuote.tsx / MachineLearningQuoteTool.tsx mounts
         │
         ├─► useRealProjects() / useSyntheticPool()      ─► fetch /demo-assets/{real-projects,synthetic-pool}.json
         ├─► useModelMetrics(dataset)                    ─► fetch /demo-assets/model_metrics_{real,synthetic}.json
         │
         ▼
ensurePyodideReady()  (`frontend/src/demo/pyodideClient.ts:290`)
   1. injectScript("https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js")
   2. window.loadPyodide({ indexURL })
   3. pyodide.loadPackage(["numpy", "pandas", "scikit-learn", "joblib"])
   4. fetch /demo-assets/py/{config,features,models,predict}.py → pyodide.FS.writeFile("/demo_py/...")
   5. runPythonAsync(PYODIDE_RUNTIME)   // installs LOADED dict + predict_dataset + collect_importances
         │
         ▼
ensureModelsReady(dataset)  (`pyodideClient.ts:305`)
   1. for each of 12 joblib filenames:
        fetch /demo-assets/models_{dataset}/{name}_v1.joblib
        pyodide.FS.writeFile("/models_{dataset}/{name}_v1.joblib", uint8)
        notify({ stage, percent: basePercent + ((i+1)/12)*15 })
   2. runPythonAsync: for each target → joblib.load → LOADED[dataset][target] = bundle
         │
         ▼
User submits the QuoteForm (`@/pages/single-quote/QuoteForm.tsx`)
   - Validated by zod schema in `@/pages/single-quote/schema.ts`
   - transformToQuoteInput() converts booleans to 0/1 ints, log1p the materials cost
         │
         ▼
predictQuote(input, dataset)            (`pyodideClient.ts:384`)
   pyodide.globals.get("predict_dataset")(dataset, JSON.stringify(input))
         │   inside Python:
         │     • prepare_quote_features(pd.DataFrame([input]))
         │     • for tgt, bundle in LOADED[dataset]:
         │         pipe.named_steps["preprocess"].transform(df)
         │         p50 = pipe.named_steps["model"].predict(X_proc)
         │         p10 = bundle["q10"].predict(X_proc)
         │         p90 = bundle["q90"].predict(X_proc)
         │     • aggregate ops + sales_buckets totals
         │     • return JSON.dumps({ ops, total_p50, total_p10, total_p90, sales_buckets })
         │
         ▼
getFeatureImportances(dataset)          (`pyodideClient.ts:408`)
   - Cached after first call per-dataset in IMPORTANCES_CACHE
   - Returns top-5 (feature_name, importance) per target via gbr.feature_importances_
         │
         ▼
toUnifiedResult(...)                    (`frontend/src/demo/quoteAdapter.ts:25`)
   - Per-category H/M/L confidence from each target's R² (≥0.7 → high; ≥0.5 → moderate; else lower)
   - Top-3 drivers via importance × prediction-share weighting + humanFeatureLabel direction map
   - Top-3 nearest projects via nearestK() (z-scored numeric distance + categorical mismatch penalty)
         │
         ▼
QuoteResultPanel renders                (`frontend/src/components/quote/QuoteResultPanel.tsx`)
   - Hero hours, likely range, top drivers, per-category breakdown with H/M/L chips, supporting matches
   - Auto-scrolls to #quote-results
```

### Compare flow (Real or Synthetic)

```text
ComparisonCompare / MachineLearningCompare ─► CompareBrowseTab.tsx
   - records → recordToSummary() → SavedQuoteSummary[] (vestigial type, repurposed)
   - QuotesFilters + QuotesTable from `frontend/src/pages/quotes/`
   - User selects 2–3 projects → showCompare=true
   - Renders CompareHeader + CompareBucketsChart + CompareInputDiff (recharts)
   - Backed by recordToPrediction() — treats actual_hours columns as p50 with ±15% band
```

### Business Insights flow (interactive cross-filter)

```text
ComparisonInsights / MachineLearningInsights pass dataset + source prop
         │
         ▼
BusinessInsightsView                    (`frontend/src/pages/demo/business/BusinessInsightsView.tsx`)
   - Local state: filter (industries Set, categories Set, complexityMin/Max, search), drawerRow
   - applyFilter(records, filter) → filteredRecords
   - buildPortfolio(filteredRecords)   (`portfolioStats.ts`)
       • For each record: recordToPrediction → derive bucket totals, primary bucket
       • Aggregate: KPIs, BucketRow[], IndustryRow[], CategoryRow[], ScatterPoint[], RankedRow[]
   - Six stacked sections inside one scrollable column:
       01 PortfolioKpis              (KPI strip — projectCount, totalHours, avg/median, materialsCost)
       02 HoursBySalesBucket         (bar chart)
       03 HoursByIndustry            (bar chart, click to toggle industries Set)
       04 SystemCategoryMix          (donut, click to toggle categories Set)
       05 ComplexityVsHours          (scatter, click point → drawerRow)
       06 TopProjectsTable           (sortable, searchable, click row → drawerRow)
   - InsightsFilters card (sticky top-4) — search, industry chips, category chips, dual-handle complexity range
   - Cross-filter: clicking a chart segment toggles the same Set the chips render → all sections recompute
   - ProjectDetailDrawer opens on right when drawerRow is set; ESC or backdrop click closes
```

### Build pipeline (no runtime equivalent — happens once at deploy)

```text
git push to main
         │
         ▼
Vercel runs `vercel.json::buildCommand` = scripts/vercel_build.sh
   1. git lfs install --local && git lfs pull   (hydrate joblib pointer files)
   2. python3 -m pip install pandas numpy scikit-learn joblib
   3. python3 scripts/build_demo_static.py
         • Read demo_assets/data/real/projects_real.csv
         • Read demo_assets/data/synthetic/projects_synthetic.csv (cap 500 rows)
         • prepare_quote_features() on each
         • Emit frontend/public/demo-assets/{real-projects,synthetic-pool,manifest}.json
         • Copy demo_assets/models_real/*.joblib → frontend/public/demo-assets/models_real/
         • Copy demo_assets/models_synthetic/*.joblib → ... (skip LFS pointer files <1KB with WARN)
         • Read metrics_summary.csv → emit model_metrics_{real,synthetic}.json
         • Copy core/{config,features,models}.py → frontend/public/demo-assets/py/ (rewriting `from .config` → `from config`)
         • Write predict.py shim verbatim
   4. cd frontend && VITE_DEMO_MODE=1 npm run build
         • tsc -b && vite build
         • Output to frontend/dist/
         │
         ▼
Vercel publishes frontend/dist/ + frontend/public/demo-assets/
   - vercel.json rewrites: /((?!demo-assets|assets|favicon.ico|.*\..*).*) → /index.html  (SPA fallback)
   - Cache headers: /demo-assets/models/* → max-age=31536000 immutable; /demo-assets/py/* → max-age=3600
```

### Retraining (manual, optional)

```text
Operator drops new CSVs in demo_assets/data/{real,synthetic}/
         │
         ▼
python scripts/generate_demo_assets.py
   - Identical train_one_op() called per target on both bundles, default hyperparams
   - GBR(n_estimators=300, max_depth=5, learning_rate=0.1)
   - Two extra quantile GBRs (alpha=0.1, alpha=0.9) for prediction intervals
   - Writes demo_assets/models_real/*.joblib + metrics_summary.csv (12 each)
   - Writes demo_assets/models_synthetic/*.joblib + metrics_summary.csv + metrics_history.parquet + calibration.parquet
         │
         ▼
git add demo_assets/models_*/ && git commit && git push  (LFS-tracked)
```

**State Management:**
- Server state (static asset fetches): TanStack Query, `staleTime: Infinity`. See `useRealProjects`, `useSyntheticPool`, `useDemoManifest`, `useModelMetrics`.
- Form state: `react-hook-form` + `zodResolver(quoteFormSchema)`. Defaults in `frontend/src/pages/single-quote/schema.ts::quoteFormDefaults`.
- Pyodide bootstrap state: module-scoped `pyodidePromise` + `modelPromises: Record<Dataset, Promise<void> | null>` in `frontend/src/demo/pyodideClient.ts:78-86`. Status broadcast via a `Set<StatusListener>` subscribe pattern.
- UI state: local component `useState` (e.g. `BusinessInsightsView` filter, `CompareBrowseTab` selection set, `MachineLearningQuoteTool` result/error/submitting flags).
- Last-quote recall: `sessionStorage["matrix.singlequote.last"]` written by `QuoteForm` (read in `readLastValues()`).

## Key Abstractions

**`Dataset` type:**
- Purpose: Discriminator between the two parallel sides — `"real"` and `"synthetic"`.
- Examples: `frontend/src/demo/pyodideClient.ts:30` (type def), used in every public function (`ensureModelsReady`, `predictQuote`, `getFeatureImportances`).
- Pattern: Single literal type drives separate joblib bundles, separate `LOADED[dataset]` dicts, separate metrics JSONs, separate UI labels.

**`UnifiedQuoteResult`:**
- Purpose: Single canonical shape consumed by `QuoteResultPanel`. Both Real and Synthetic Quote tabs adapt their raw outputs to this shape so the UI is identical.
- Location: `frontend/src/demo/quoteResult.ts`.
- Pattern: Adapter (`quoteAdapter.ts::toUnifiedResult`) collapses prediction + importances + metrics + supporting pool into one struct with three magnitude/confidence enums (`high|moderate|lower`, `strong|moderate|minor`, `increases|decreases`).

**`ProjectRecord`:**
- Purpose: Flat row shape for both real and synthetic CSV-derived JSON.
- Location: `frontend/src/demo/realProjects.ts:23`.
- Pattern: Open-ended `Record<string, string|number|null|undefined>` over a few known identifier fields. `recordToPrediction()`, `recordToSummary()`, `recordToSavedQuote()` adapt it to legacy `QuotePrediction` / `SavedQuote` types so the parent app's compare/quotes components can be reused.

**joblib bundle shape (Python side):**
- Purpose: Persisted sklearn model artifact.
- Location: produced by `core/models.py:99` (`{"pipeline": pipe, "q10": gbr_q10, "q90": gbr_q90}`).
- Pattern: `Pipeline(("preprocess", ColumnTransformer), ("model", GBR))` for p50; two separate `GradientBoostingRegressor(loss="quantile", alpha=0.1|0.9)` fitted on preprocessed features for the 80% interval.
- `predict_with_interval()` (`core/models.py:113`) also accepts a CQR bundle shape (`{"preprocessor", "model_mid", "model_lo", "model_hi", "qhat", ...}`) — not produced in this repo but tolerated for parity.

**Sales bucket roll-up:**
- Purpose: Map the 12 operation-level predictions back to 9 Sales buckets (`ME`, `EE`, `PM`, `Docs`, `Build`, `Robot`, `Controls`, `Install`, `Travel`).
- Location: `core/config.py::SALES_BUCKET_MAP` (Python side); duplicated in TypeScript at `frontend/src/demo/realProjects.ts:34` and `frontend/src/pages/single-quote/schema.ts:164`.

## Entry Points

**Browser (deployed):**
- Location: `frontend/src/main.tsx` → renders `<App />` from `frontend/src/App.tsx` → branches to `<DemoApp />` because `IS_DEMO === true`.
- Triggers: User opens the Vercel URL.
- Responsibilities: Mount router, query client, error boundary, toaster.

**Vercel build:**
- Location: `scripts/vercel_build.sh` (declared in `vercel.json::buildCommand`).
- Triggers: `git push` to `main` (or any branch Vercel watches).
- Responsibilities: LFS pull, Python deps install, asset build, frontend build.

**Local dev:**
- Location: `cd frontend && VITE_DEMO_MODE=1 npm run dev`.
- Triggers: Manual.
- Responsibilities: Vite dev server on port 5173. (Note: `vite.config.ts:13-19` declares an `/api → http://localhost:8000` proxy that is **vestigial** — nothing serves `:8000` in this repo.)

**One-time asset regeneration:**
- Location: `python scripts/generate_demo_assets.py`.
- Triggers: Manual, after CSV changes.
- Responsibilities: Train both joblib bundles via `core.models.train_one_op` with default hyperparameters.

## Architectural Constraints

- **No backend in deployed build.** `IS_DEMO` is forced `true` by `VITE_DEMO_MODE=1` in `scripts/vercel_build.sh`. The non-demo branch of `App.tsx` (admin routes, `/api/*` calls via `frontend/src/api/client.ts`, `RequireAdmin` token gate) only activates if a build is run with `VITE_DEMO_MODE` unset. There is no FastAPI process, no Parquet I/O, no JWT verification at request time, no admin upload route — the **only** server-side execution is the Vercel build itself.
- **Pyodide version pinning is load-bearing.** `frontend/src/demo/pyodideClient.ts:5` pins `0.27.1` to match the sklearn 1.5.2 pickle format used by the joblib bundles. See commits `333060b` ("pin to 0.27.1 to match the pickle's sklearn 1.5.2") and `d24f6ff`. Bumping Pyodide without re-pickling the models breaks loading.
- **LFS is required for the joblib bundles.** `demo_assets/models_real/*.joblib` and `demo_assets/models_synthetic/*.joblib` are stored via Git LFS (`.lfsconfig`, `.gitattributes`). Vercel project settings must enable LFS or `_copy_model_bundle()` (`scripts/build_demo_static.py:138`) will detect the <1 KB pointer files and skip them with a `WARN` — the demo deploys but the ML tool is non-functional.
- **Threading model:** Single-threaded JS event loop in the browser. Pyodide runs on the main thread (no Web Worker offload). Long-running prediction calls block UI; mitigated by short prediction times for 12 small GBRs over a one-row DataFrame.
- **Module-level state:** `pyodidePromise`, `modelPromises`, `listeners`, `latestStatus` in `frontend/src/demo/pyodideClient.ts:78-86` are module singletons. Cross-tab isolation is automatic (each tab gets its own Pyodide). Within a tab they are shared across all routes.
- **Asset path coupling:** All Pyodide fetches use the absolute `${window.location.origin}${DEMO_ASSETS}/models_${dataset}/${fname}` URL (`pyodideClient.ts:324`). `DEMO_ASSETS` is hardcoded to `/demo-assets` in `frontend/src/lib/demoMode.ts:2`. Changing the static asset root requires editing both.
- **No circular imports** in the Python core or in TypeScript.
- **Dual model load is opt-in.** Visiting only `/compare/quote` loads the 12 real-side joblibs, ~1 MB each; the synthetic bundle is not fetched until the user navigates to `/ml/*`. Each side independently caches via `modelPromises[dataset]` so a second visit is a no-op.

## Anti-Patterns

### Adding HTTP calls back to a phantom backend

**What happens:** Importing `frontend/src/api/quote.ts` or `frontend/src/api/client.ts` from a demo page would route requests to `/api/...`, which 404s in production (no server) and proxies to `:8000` in local dev (also empty).
**Why it's wrong:** Creates a runtime dependency on a backend that does not exist in this repo. The vestigial `frontend/src/api/` exists only because the parent app's types (`QuoteInput`, `QuotePrediction`, `SavedQuote`, `OpPrediction`) are reused as data shapes — only the **types** should be imported from there.
**Do this instead:** Use `predictQuote` from `frontend/src/demo/pyodideClient.ts` for inference and `useRealProjects`/`useSyntheticPool`/`useDemoManifest` from `frontend/src/demo/realProjects.ts` for static asset reads.

### Bypassing the Pyodide warmup gate

**What happens:** Calling `predictQuote(input, dataset)` before `ensureModelsReady(dataset)` resolves throws `predictQuote called for '{dataset}' dataset before ensureModelsReady('{dataset}').` (`pyodideClient.ts:392`).
**Why it's wrong:** The `LOADED[dataset]` dict is empty until the bundle finishes loading; predicting against it raises `RuntimeError` in Python and surfaces as a generic toast.
**Do this instead:** Pages must call `ensurePyodideReady().then(() => ensureModelsReady(dataset))` in a mount effect (see `ComparisonQuote.tsx:97-102`) and gate the form on a `ready` flag. The `PyodideLoader` component (`frontend/src/components/PyodideLoader.tsx`) renders progress while waiting.

### Reading the joblib bundles via HTTP inside Pyodide

**What happens:** Earlier code used `urlopen()` inside the Pyodide runtime to fetch joblibs from the same origin.
**Why it's wrong:** Adds a second network request from inside WASM (slow, fragile to CORS), and produces no progress events because the fetch happens opaquely in Python.
**Do this instead:** TS-side `fetch()` per file with a progress notification, then `pyodide.FS.writeFile("/models_{dataset}/{name}", uint8)`, then a Python loop that calls `joblib.load(f"/models_{dataset}/{name}")` (see `pyodideClient.ts:336-367`). The build still keeps a `urlopen` codepath in the inline `PYODIDE_RUNTIME` `load_bundle` function but it is unused by the TS-driven loader.

### Editing `core/` for a frontend feature

**What happens:** `core/{config,features,models}.py` are copied into Pyodide at build time by `_copy_py_shim()`. Editing them changes both the build pipeline (`scripts/generate_demo_assets.py`) and the in-browser inference path simultaneously.
**Why it's wrong:** `.claude/agents/backend-specialist.md` explicitly marks `core/**` and `service/**` read-only — these are vendored from `../matrix_quote_app`. Drifting them here creates parity bugs.
**Do this instead:** Make demo-only behavior live in `frontend/src/demo/` (TypeScript) or in the predict shim at `scripts/build_demo_static.py::_PREDICT_SHIM`. If a true core change is needed, change it in the parent app and re-vendor.

### Introducing a Web Worker for Pyodide

**What happens:** Moving Pyodide off the main thread requires changing the `pyodideClient.ts` API to message-passing.
**Why it's wrong:** Pyodide's `loadPackage` uses `dynamic import()` of WASM modules — the cross-thread story is fragile and not supported in the pinned 0.27.1 line. Predictions are short enough (single-row DataFrame, 12 small GBRs) that main-thread execution is fine for this demo.
**Do this instead:** Keep Pyodide on the main thread. If responsiveness ever becomes an issue, add `requestIdleCallback`-based batching, not workers.

## Error Handling

**Strategy:** User-visible toast for transient failures (`sonner`); inline `<div role="alert">` cards for boot failures; React error boundary at root for everything else.

**Patterns:**
- `RootErrorBoundary` (`frontend/src/components/RootErrorBoundary.tsx`) wraps the entire app in `main.tsx`; catches uncaught render errors, surfaces a fallback UI with a refresh CTA.
- Pyodide bootstrap errors flow through `notify({ stage: "error", message })` → broadcast to subscribed `PyodideStatus` listeners. Quote pages render an `AlertTriangle` card with the raw error message and a refresh button (`ComparisonQuote.tsx:174-205`).
- Asset fetch errors (TanStack Query `error` field) render a "Couldn't load…" card per page (`BusinessInsightsView.tsx:215-232`, `ComparisonCompare.tsx:42-52`).
- Prediction errors caught in `handleSubmit` of each Quote tab → `toast.error(message)`.
- `axios` interceptor in `frontend/src/api/client.ts:30-42` redirects to `/admin/login` on 401 — vestigial, never fires in demo build.

## Cross-Cutting Concerns

**Logging:** Browser `console.error` only on Pyodide failures. No telemetry, no Sentry, no structured logging. Build-time `print()` statements in `scripts/*.py` go to Vercel's build log.

**Validation:** Two layers.
- TypeScript at the form boundary: `frontend/src/pages/single-quote/schema.ts::quoteFormSchema` (zod). All numerics coerced via `z.coerce.number()`, ranges enforced (e.g., `complexity_score_1_5: z.coerce.number().min(1).max(5)`).
- Python at the build boundary: `scripts/build_demo_static.py::_validate_columns` enforces the categorical and target columns match `core/config.py`. Fails fast with `ERROR: ...` if a CSV is missing required columns.
- No runtime input validation server-side (no server). The Pyodide `prepare_quote_features` will fill missing numerics with 0 and "None" for missing categoricals.

**Authentication:** None in the demo. The Vercel deployment is publicly accessible. Vestigial admin auth code (`frontend/src/api/client.ts::getAdminToken/setAdminToken/clearAdminToken`, `frontend/src/components/RequireAdmin.tsx`, `frontend/src/pages/AdminLogin.tsx`) is dead code in `IS_DEMO=true` builds.

**Theming:** `ThemeToggle` at `frontend/src/components/ThemeToggle.tsx` toggles a `dark` class on `<html>`. CSS in `frontend/src/styles/globals.css` and `frontend/src/styles/dark-mode.css`. Tailwind tokens in `frontend/tailwind.config.ts` (paper, ink, teal, amber, line, hairline, etc.).

**Feature flags:** Single boolean `VITE_DEMO_MODE` env var → `IS_DEMO` constant (`frontend/src/lib/demoMode.ts:1`). Always `1` in Vercel builds (set inline in `scripts/vercel_build.sh:24`).

---

*Architecture analysis: 2026-05-04*
