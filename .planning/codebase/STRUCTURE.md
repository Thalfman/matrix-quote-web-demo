# Codebase Structure

**Analysis Date:** 2026-05-04

## Directory Layout

```
matrix-quote-web-demo/
├── README.md                      # Source of truth for the architecture story
├── vercel.json                    # Build command, output dir, SPA rewrites, cache headers
├── .lfsconfig                     # Git LFS endpoint pin
├── .gitattributes                 # LFS patterns for joblib bundles
├── .gitignore                     # Standard ignores plus frontend/public/demo-assets/
├── commands/                      # Slash-command specs (planning input)
├── core/                          # Python domain core — feature engineering + sklearn pipeline
├── service/                       # Python service-layer parity copy (NOT executed in demo build)
├── frontend/                      # Vite + React 18 SPA (the deployed app)
├── scripts/                       # Build-time Python: train models + emit static assets
├── tests/                         # Python pytest suite (build-time scripts only)
├── demo_assets/                   # Committed inputs to the build pipeline
├── docs/                          # Plans, specs, design notes (not consumed at runtime)
└── .planning/codebase/            # This directory — agent-authored architecture maps
```

## Directory Purposes

### `core/` — Python domain core
- **Specialist owner:** `.claude/agents/backend-specialist.md` marks this **read-only**. It is vendored from the parent `matrix_quote_app` repo. Edits here drift parity.
- **Purpose:** Single source of truth for feature columns, sklearn model definitions, and pydantic schemas.
- **Contains:** Feature lists, derived index calculation, training pipeline, joblib persistence.
- **Key files:**
  - `core/config.py` — `TARGETS` (12 ops), `SALES_BUCKETS` (9), `SALES_BUCKET_MAP`, `QUOTE_NUM_FEATURES` (33), `QUOTE_CAT_FEATURES` (6), `REQUIRED_TRAINING_COLS`.
  - `core/features.py` — `prepare_quote_features()`: numeric coercion, derived indices (`stations_robot_index`, `mech_complexity_index`, `controls_complexity_index`, `physical_scale_index`), boolean string normalization (`yes/no/true/false → 0/1`).
  - `core/models.py` — `train_one_op()` (default GBR + two quantile GBRs), `predict_with_interval()` (handles both legacy and CQR bundle shapes), `load_model()`, `build_preprocessor()`.
  - `core/schemas.py` — pydantic `QuoteInput`, `QuotePrediction`, `OpPrediction`, `SalesBucketPrediction` (also imported by `service/predict_lib.py` for parity).
  - `core/__init__.py` — empty package marker.
- **Used by:** `scripts/generate_demo_assets.py` (training), `scripts/build_demo_static.py` (asset prep + shim copy). At runtime in the browser, **rewritten copies** of `config.py`, `features.py`, `models.py` are mounted into Pyodide's WASM filesystem at `/demo_py/` (the `from .config` → `from config` rewrite happens in `_copy_py_shim()`).

### `service/` — Python service-layer parity copy
- **Specialist owner:** Effectively the same as `core/` — read-only, vendored.
- **Purpose:** Hold the parent app's `predict_lib.py` so this repo can be cross-checked against the parent without divergence.
- **Contains:** `service/predict_lib.py` exposing `predict_quote(QuoteInput) -> QuotePrediction` and `predict_quotes_df(DataFrame) -> DataFrame`.
- **NOT executed at runtime in the deployed demo.** No FastAPI route invokes it. It exists for code review and potential resurrection if the demo ever grows a backend.

### `frontend/` — React SPA
- **Specialist owner:** `.claude/agents/frontend-specialist.md` (writes), `.claude/agents/ui-ux-specialist.md` (visual polish), `.claude/agents/auth-admin-specialist.md` (vestigial admin code only).
- **Purpose:** The deployed app. Vite + React 18 + TypeScript. All UI, all routing, all (in-browser) ML inference orchestration.
- **Top-level files:**
  - `frontend/package.json` — deps include `react@18`, `react-router-dom@6`, `@tanstack/react-query@5`, `react-hook-form@7`, `zod@3`, `recharts@2`, `axios@1`, `sonner`, `lucide-react`, `tailwind-merge`, `class-variance-authority`. Dev: `vite@5`, `typescript@5`, `vitest@1`, `@testing-library/*`, `eslint@9`, `tailwindcss@3`.
  - `frontend/vite.config.ts` — `@` alias to `./src`, port 5173, `/api` proxy to `localhost:8000` (vestigial), vitest jsdom config.
  - `frontend/tsconfig.json`, `frontend/tsconfig.node.json` — TS project refs.
  - `frontend/tailwind.config.ts` (+ `.js`, `.d.ts`) — design tokens.
  - `frontend/eslint.config.js` — flat-config ESLint.
  - `frontend/index.html` — Vite entry.
  - `frontend/postcss.config.js` — Tailwind/Autoprefixer.

#### `frontend/src/` — application source
```
frontend/src/
├── main.tsx                          # ReactDOM.createRoot, providers, router
├── App.tsx                           # Top router; if IS_DEMO → DemoApp, else admin/full app
├── DemoApp.tsx                       # Demo route table (Home + Real-Data + Synthetic-Data + redirects)
├── DemoApp.test.tsx                  # Smoke test for the demo router
├── api/                              # Vestigial axios client + types (TYPES are reused as data shapes)
│   ├── client.ts                     # axios instance, getAdminToken/setAdminToken, 401 redirect
│   ├── client.test.ts
│   ├── quote.ts                      # TanStack Query hooks for backend routes (NOT called in demo)
│   └── types.ts                      # QuoteInput, QuotePrediction, etc. — imported as data shapes
├── components/                       # Shared UI primitives
│   ├── Layout.tsx                    # Vestigial full-app layout
│   ├── DemoLayout.tsx                # The actual layout used in production
│   ├── PyodideLoader.tsx             # 7-stage progress UI for the WASM warmup
│   ├── RequireAdmin.tsx              # Vestigial gate — bypasses when IS_DEMO
│   ├── DataProvenanceNote.tsx        # "What this is trained on" disclosure (real|synthetic variants)
│   ├── PageHeader.tsx                # Eyebrow + title + chips header
│   ├── RootErrorBoundary.tsx         # Catches render errors, fallback UI
│   ├── ThemeToggle.tsx               # Dark-mode toggle
│   ├── DemoChip.tsx, UserPill.tsx    # Header chips (UserPill is vestigial)
│   ├── ConfidenceDot.tsx, EmptyState.tsx, ResultHero.tsx
│   ├── Field.tsx, Input.tsx, Select.tsx, Slider.tsx, Switch.tsx  # Form atoms
│   ├── Section.tsx, Tabs.tsx                                      # Layout atoms
│   └── quote/
│       ├── QuoteResultPanel.tsx      # SHARED result UI for both Quote tabs
│       └── QuoteResultPanel.test.tsx
├── pages/                            # Route-level components
│   ├── (full-app vestigial pages)    # AdminLogin, BatchQuotes, Compare, DataExplorer, Drivers,
│   │                                 # ExecutiveOverview, ModelPerformance, Overview, Quotes,
│   │                                 # SingleQuote, UploadTrain — gated behind !IS_DEMO
│   ├── admin/fixtures.ts
│   ├── batch/
│   │   ├── Batch.test.tsx, BatchDropzone.tsx, BatchRecentList.tsx
│   │   ├── BatchSchemaRef.tsx, fixtures.ts
│   ├── quotes/                       # Reused by the demo's Compare tabs
│   │   ├── QuotesTable.tsx, QuotesFilters.tsx, QuotesBulkBar.tsx, QuotesKpiStrip.tsx
│   │   ├── CompareHeader.tsx, CompareInputDiff.tsx, CompareBucketsChart.tsx
│   │   └── CompareDriversStrip.tsx
│   ├── insights/                     # Vestigial — full-app exec overview
│   │   ├── KpiCards.tsx, AccuracyHeatmap.tsx, LatestQuotesTable.tsx
│   │   ├── QuotesActivityChart.tsx, chartTheme.ts
│   ├── performance/                  # Vestigial — full-app perf page
│   │   ├── HeadlineKPIs.tsx, MapeByOperation.tsx, CalibrationScatter.tsx, TrainingHistoryChart.tsx
│   ├── single-quote/                 # Reused by demo Quote tabs
│   │   ├── QuoteForm.tsx             # The 6-section form (classification / scale / controls / product / complexity / cost)
│   │   ├── HeroEstimate.tsx, ResultPanel.tsx, ResultSkeleton.tsx, ResultTabs.tsx
│   │   ├── schema.ts                 # zod quoteFormSchema, quoteFormDefaults, transformToQuoteInput, SALES_BUCKETS, OPERATION_ORDER
│   │   ├── Scenario.ts
│   │   └── tabs/
│   │       ├── EstimateTab.tsx, DriversTab.tsx, ScenariosTab.tsx, SimilarTab.tsx
│   └── demo/                         # Demo-specific routes — what users actually see
│       ├── DemoHome.tsx              # Two-card landing
│       ├── ComparisonQuoteTool.tsx   # Vestigial wrapper (legacy /compare-tool)
│       ├── MachineLearningQuoteTool.tsx  # The actual ML-tab page
│       ├── BusinessInsights.tsx      # Vestigial wrapper
│       ├── CompareBrowseTab.tsx      # Multi-select 2–3 projects → side-by-side
│       ├── CompareFindSimilarTab.tsx # Form + nearestK supporting matches
│       ├── compare/
│       │   ├── ComparisonQuote.tsx   # /compare/quote — Real-Data Quote tab
│       │   ├── ComparisonCompare.tsx # /compare/compare — Real-Data browse
│       │   ├── ComparisonInsights.tsx# /compare/insights — Real-Data insights wrapper
│       │   └── CompareBrowseTab.tsx
│       ├── ml/
│       │   ├── MachineLearningQuote.tsx     # Thin re-export of MachineLearningQuoteTool
│       │   ├── MachineLearningCompare.tsx   # /ml/compare — Synthetic browse
│       │   └── MachineLearningInsights.tsx  # /ml/insights — Synthetic insights wrapper
│       └── business/                 # SHARED Business Insights subsystem
│           ├── BusinessInsightsView.tsx          # Top-level dashboard (used by both insights wrappers)
│           ├── PortfolioKpis.tsx                 # 01 KPI strip
│           ├── HoursBySalesBucket.tsx            # 02 bar chart
│           ├── HoursByIndustry.tsx               # 03 bar chart with click-to-filter
│           ├── SystemCategoryMix.tsx             # 04 donut with click-to-filter
│           ├── ComplexityVsHours.tsx             # 05 scatter with click-to-drawer
│           ├── TopProjectsTable.tsx              # 06 sortable/searchable table
│           ├── InsightsFilters.tsx               # Sticky filter card
│           ├── ProjectDetailDrawer.tsx           # Right-side drawer
│           ├── insightsFilterDefaults.ts         # DEFAULT_FILTER + isDefaultFilter()
│           ├── portfolioStats.ts                 # buildPortfolio() pure aggregation
│           ├── csv.ts                            # CSV export helpers
│           └── *.test.tsx, *.test.ts             # Vitest specs
├── demo/                             # Demo-only logic separated from generic UI
│   ├── pyodideClient.ts              # ALL Pyodide orchestration + dual-dataset cache
│   ├── pyodideClient.test.ts
│   ├── realProjects.ts               # useRealProjects, useSyntheticPool, useDemoManifest, recordTo* adapters
│   ├── modelMetrics.ts               # useModelMetrics(dataset)
│   ├── modelMetrics.test.ts
│   ├── quoteResult.ts                # UnifiedQuoteResult interface
│   ├── quoteAdapter.ts               # toUnifiedResult() — Pyodide output → UI shape
│   ├── quoteAdapter.test.ts
│   ├── categoryLabels.ts             # CATEGORY_LABEL map (target → human label)
│   ├── featureLabels.ts              # humanFeatureLabel(rawName, input) — driver direction logic
│   └── featureLabels.test.ts
├── lib/                              # Generic, app-agnostic helpers
│   ├── demoMode.ts                   # IS_DEMO + DEMO_ASSETS constants
│   ├── nearestNeighbor.ts            # distance() + nearestK() — z-scored Euclidean + cat penalty
│   ├── projectHours.ts               # sumActualHours() helper
│   ├── displayName.ts                # Project name fallback chain
│   ├── useCountUp.ts                 # Animated number hook
│   ├── useHotkey.ts                  # ⌘+Enter / Ctrl+Enter binding hook
│   ├── utils.ts                      # cn() classname helper (clsx + tailwind-merge)
│   └── *.test.ts                     # Vitest specs
├── styles/
│   ├── globals.css                   # Tailwind base + project tokens
│   └── dark-mode.css                 # Dark-mode overrides
└── test/
    ├── render.tsx                    # renderWithProviders test util
    └── setup.ts                      # Vitest global setup (jest-dom matchers, jsdom polyfills)
```

#### `frontend/public/` — static assets
- `frontend/public/demo-assets/` — generated by `scripts/build_demo_static.py`; gitignored. Contains JSON pools, joblibs, metrics JSONs, manifest, and the `py/` shim. Served at `/demo-assets/*` by Vercel with cache headers per `vercel.json`.

#### `frontend/dist/` — build output
- Generated by `vite build`. Never committed.

### `scripts/` — Build-time Python
- **Specialist owner:** None directly; touched during plan-execution by the orchestrator. Treat as build infra.
- **Purpose:** Convert committed CSVs and joblib bundles into the static assets the SPA fetches.
- **Key files:**
  - `scripts/build_demo_static.py` — Main asset builder. Reads `demo_assets/data/{real,synthetic}/*.csv`, calls `core.features.prepare_quote_features`, emits `frontend/public/demo-assets/{real-projects,synthetic-pool,manifest}.json`, copies joblibs, emits `model_metrics_{real,synthetic}.json`, copies `core/{config,features,models}.py` into `py/` (rewriting relative imports), writes the inline `predict.py` shim. Wipes the output dir on each run to prevent stale leakage.
  - `scripts/generate_demo_assets.py` — One-time training. For each of 12 `TARGETS`, calls `core.models.train_one_op` once on the real CSV (output → `demo_assets/models_real/`), once on the synthetic CSV (→ `demo_assets/models_synthetic/`). Writes `metrics_summary.csv` per bundle. Synthesizes `metrics_history.parquet` and `calibration.parquet` for the synthetic bundle (used by vestigial perf pages).
  - `scripts/build_test_fixtures.py` — Test fixture generator.
  - `scripts/vercel_build.sh` — `set -euo pipefail` Bash entrypoint declared in `vercel.json::buildCommand`. Steps: LFS pull → pip install → `build_demo_static.py` → `VITE_DEMO_MODE=1 npm run build`.
  - `scripts/demo.bat`, `scripts/demo.sh` — Local convenience wrappers.
  - `scripts/Business Insights.docx` — Stakeholder doc; not consumed by code.

### `tests/` — Python pytest suite
- **Specialist owner:** `.claude/agents/test-writer.md` (in scope for test changes).
- **Purpose:** Cover the build scripts. There are no tests of `core/` or `service/` here — those are tested upstream in the parent app.
- **Key files:**
  - `tests/__init__.py`
  - `tests/scripts/__init__.py`
  - `tests/scripts/test_build_demo_static.py` — Validates `build_demo_static.py` end-to-end against fixture CSVs.

### `demo_assets/` — Committed pipeline inputs
- **Specialist owner:** `.claude/agents/storage-specialist.md` (LFS / artifact handling).
- **Purpose:** All hand-curated or pre-trained artifacts the build pipeline consumes.
- **Sub-structure:**
  - `demo_assets/data/real/projects_real.csv` — 24 real historical projects, with the 12 `*_actual_hours` columns required by `core.config.TARGETS`.
  - `demo_assets/data/synthetic/projects_synthetic.csv` — 500 generated training rows; targets optional.
  - `demo_assets/models_real/*.joblib` (12) + `metrics_summary.csv` — trained on the real CSV. **LFS-tracked.**
  - `demo_assets/models_synthetic/*.joblib` (12) + `metrics_summary.csv` + `metrics_history.parquet` + `calibration.parquet` — trained on the synthetic CSV. **LFS-tracked.**

### `docs/` — Plans, specs, design notes
- Read-only documentation; not consumed by build or tests.
- **Sub-structure:**
  - `docs/business-insights-plan.md` — Pre-implementation plan for the Business Insights surface.
  - `docs/design/claude-design-20260417/` — Design package.
  - `docs/superpowers/plans/` — Phase plans (`plan-a-foundation`, `plan-c-scenarios`, `plan-d-pdf`, `plan-e-insights`, `plan-f-demo-mode`, four `code-review-{critical,high,medium,low}`).
  - `docs/superpowers/specs/` — Feature specs (e.g. `2026-04-17-estimator-cockpit-redesign-design.md`).

### `commands/` — Slash-command specs
- `commands/business-insights-interactivity.md`, `commands/parallel-ml-real-vs-synthetic.md` — Inputs to GSD planning commands.

### `.planning/` — Agent working dir
- `.planning/codebase/` — This directory: `ARCHITECTURE.md`, `STRUCTURE.md`, etc. Consumed by `/gsd-plan-phase` and `/gsd-execute-phase`.

### `.claude/` — Claude Code config
- `.claude/agents/*.md` — Specialist agent definitions: `frontend-specialist`, `backend-specialist`, `auth-admin-specialist`, `storage-specialist`, `ui-ux-specialist`, `documentation-agent`, `test-writer`. **These define ownership boundaries: `frontend/` ↔ frontend-specialist, `core/` and `service/` ↔ backend-specialist (read-only here), `frontend/src/components/RequireAdmin.tsx` + `frontend/src/api/client.ts` token handling ↔ auth-admin-specialist, joblib paths ↔ storage-specialist, visual passes ↔ ui-ux-specialist.**
- `.claude/commands/`, `.claude/hooks/`, `.claude/settings.json`, `.claude/settings.local.json` — Tooling config.
- `.claude/worktrees/` — Out-of-band branch worktrees (e.g. `fix-code-review-high-2026-04-20/`); ignore when surveying this repo.

## Key File Locations

**Entry Points:**
- `frontend/src/main.tsx` — React root, providers (QueryClient, BrowserRouter, RootErrorBoundary, Toaster).
- `frontend/src/App.tsx` — Top router; demo vs full-app branch on `IS_DEMO`.
- `frontend/src/DemoApp.tsx` — Demo route table.
- `scripts/vercel_build.sh` — Build-time entrypoint declared in `vercel.json`.
- `scripts/build_demo_static.py:main()` — Asset build entrypoint.
- `scripts/generate_demo_assets.py:main()` — Training entrypoint.

**Configuration:**
- `vercel.json` — Vercel build, output dir, SPA rewrites, asset cache headers.
- `frontend/vite.config.ts` — Vite + Vitest config.
- `frontend/tsconfig.json`, `frontend/tsconfig.node.json` — TS configuration.
- `frontend/tailwind.config.ts` — Tailwind tokens (paper, ink, teal, amber, hairline, line, etc.).
- `frontend/eslint.config.js` — ESLint flat config.
- `frontend/package.json` — Frontend deps + scripts (`dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:watch`, `gen:api`).
- `.lfsconfig`, `.gitattributes` — Git LFS for joblib artifacts.

**Core Logic (Python):**
- `core/config.py` — Targets and feature lists.
- `core/features.py:prepare_quote_features` — Single transform applied at both build time and inside Pyodide.
- `core/models.py:train_one_op` — sklearn pipeline factory.
- `core/models.py:predict_with_interval` — Inference with p10/p50/p90 quantile bands.
- `service/predict_lib.py:predict_quote` — Vendored parity copy (not used at runtime here).

**Core Logic (Frontend):**
- `frontend/src/demo/pyodideClient.ts` — Pyodide orchestration, dual-dataset bundle cache, `predictQuote`, `getFeatureImportances`.
- `frontend/src/demo/quoteAdapter.ts:toUnifiedResult` — Output shape adapter.
- `frontend/src/demo/realProjects.ts` — Static asset hooks + record adapters.
- `frontend/src/lib/nearestNeighbor.ts:nearestK` — Supporting-matches algorithm.
- `frontend/src/pages/single-quote/schema.ts` — Form schema and the canonical `transformToQuoteInput` adapter (handles `log1p` of materials cost and bool→0/1).
- `frontend/src/pages/demo/business/portfolioStats.ts:buildPortfolio` — Pure insights aggregation.

**UI Surfaces:**
- `frontend/src/components/quote/QuoteResultPanel.tsx` — Shared Quote result panel.
- `frontend/src/components/DemoLayout.tsx` — Sectioned sidebar + mobile tool switch + demo controls.
- `frontend/src/pages/demo/business/BusinessInsightsView.tsx` — Shared interactive insights dashboard.
- `frontend/src/pages/single-quote/QuoteForm.tsx` — The 6-section form used by both Quote tabs.
- `frontend/src/components/PyodideLoader.tsx` — 7-stage warmup progress UI.
- `frontend/src/components/DataProvenanceNote.tsx` — "What this is trained on" disclosure (real | synthetic copy).

**Testing:**
- `frontend/src/test/setup.ts` — Vitest global setup (jest-dom matchers, jsdom polyfills).
- `frontend/src/test/render.tsx` — `renderWithProviders` test helper.
- `frontend/src/**/*.test.{ts,tsx}` — Co-located test files (run via `npm run test`).
- `tests/scripts/test_build_demo_static.py` — Build-script integration test.

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g. `BusinessInsightsView.tsx`, `CompareBrowseTab.tsx`).
- Hook / utility modules: `camelCase.ts` (e.g. `pyodideClient.ts`, `useHotkey.ts`, `quoteAdapter.ts`).
- Test files: co-located, mirror the unit they test with a `.test.ts` / `.test.tsx` suffix (e.g. `pyodideClient.test.ts` next to `pyodideClient.ts`).
- Python modules: `snake_case.py` (e.g. `build_demo_static.py`, `predict_lib.py`).
- Joblib artifacts: `{target}_{version}.joblib` (e.g. `me10_actual_hours_v1.joblib`).
- JSON assets: `{kebab-or-snake}.json` (e.g. `real-projects.json`, `synthetic-pool.json`, `model_metrics_real.json`, `manifest.json`).

**Directories:**
- Frontend folders: `kebab-case` for routes (`single-quote/`, `demo/business/`) and feature buckets, `lowercase` short names for cross-cutting buckets (`api/`, `lib/`, `demo/`, `pages/`, `components/`, `styles/`, `test/`).
- Python packages: `lowercase` single-word (`core/`, `service/`, `scripts/`).

**Functions & types:**
- TypeScript: `camelCase` functions, `PascalCase` types, `SCREAMING_SNAKE` for module constants (e.g. `OPERATION_ORDER`, `SALES_BUCKETS`, `IS_DEMO`, `DEMO_ASSETS`).
- Python: `snake_case` functions, `PascalCase` classes (pydantic models), `SCREAMING_SNAKE` constants (`TARGETS`, `QUOTE_NUM_FEATURES`, `SALES_BUCKETS`).

**React patterns:**
- Hooks named `use*` (`useRealProjects`, `useDemoManifest`, `useModelMetrics`, `useHotkey`, `useCountUp`).
- TanStack Query keys: tuple `["demo", "realProjects"]`, `["demo", "modelMetrics", dataset]`, `["demo", "syntheticPool"]`, `["demo", "manifest"]`. Always prefixed `"demo"` to avoid collision with vestigial admin queries.

**CSS:**
- Tailwind utility-first; design tokens via Tailwind config (`bg-paper`, `text-ink`, `bg-teal`, `bg-amber`, `border-hairline`, `bg-line`, `text-muted`, `eyebrow` semantic class).
- `cn(...)` from `frontend/src/lib/utils.ts` for class composition.

## Where to Add New Code

**New demo page (e.g. a third tab on either side):**
- Route entry: add to `frontend/src/DemoApp.tsx` route table.
- Page component: `frontend/src/pages/demo/{compare,ml}/NewTabName.tsx`.
- If it uses Pyodide: import `ensurePyodideReady`, `ensureModelsReady`, `predictQuote`, `getFeatureImportances` from `@/demo/pyodideClient`; gate UI on a local `ready` flag and render `<PyodideLoader />` while waiting.
- Sidebar entry: edit `frontend/src/components/DemoLayout.tsx` (the section blocks at lines 137-168).
- Tests: co-locate `NewTabName.test.tsx`.

**New Pyodide-side logic:**
- If TS-only: extend `frontend/src/demo/pyodideClient.ts` with a new exported function that calls `pyodide.globals.get("...")` for an existing Python helper.
- If Python-side too: add the function to `scripts/build_demo_static.py::_PREDICT_SHIM` (not to `core/` — `core/` is read-only). Rebuild assets to deploy.

**New Insights chart section:**
- Component: `frontend/src/pages/demo/business/NewChart.tsx`.
- Aggregation: extend `frontend/src/pages/demo/business/portfolioStats.ts::buildPortfolio` with a new `PortfolioStats` field.
- Wire into `BusinessInsightsView.tsx` as a new `<section>` with `aria-labelledby="insights-NN-heading"`.
- For interactivity: thread click handlers through `BusinessInsightsView` so they update the same `filter` state the chips drive (mirror `handleIndustryClick` / `handleCategoryClick` patterns at lines 167-184).

**New shared UI primitive:**
- `frontend/src/components/{Name}.tsx` (and `.test.tsx`).
- Avoid demo-specific logic here — keep `frontend/src/components/` reusable across the demo and the vestigial full app.

**New form field on the Quote form:**
- Schema: `frontend/src/pages/single-quote/schema.ts` — add to `quoteFormSchema`, `quoteFormDefaults`, and `transformToQuoteInput`.
- Render: `frontend/src/pages/single-quote/QuoteForm.tsx` — add a `<Field>` in the appropriate `<Section>`.
- If it's a new feature column the model needs: also add to `core/config.py::QUOTE_NUM_FEATURES` (or `QUOTE_CAT_FEATURES`) AND retrain via `python scripts/generate_demo_assets.py`. Without retraining, the new field will be ignored by the existing joblibs.

**New build-time asset:**
- `scripts/build_demo_static.py::main()` — emit it under `OUT = repo_root / frontend / public / demo-assets`.
- Frontend hook: add a `useQuery` in `frontend/src/demo/realProjects.ts` (or a new module) that fetches `${DEMO_ASSETS}/<filename>`.

**New Python helper used inside Pyodide:**
- Add to `scripts/build_demo_static.py::_PREDICT_SHIM` (the inline string that becomes `predict.py`).
- Or extend the inline `PYODIDE_RUNTIME` constant in `frontend/src/demo/pyodideClient.ts` if the helper is truly demo-runtime-only and shouldn't ship as a `.py` file.

**New TS-side data adapter:**
- `frontend/src/demo/{name}.ts` plus `{name}.test.ts`. Don't pollute `lib/` with demo-specific logic — `lib/` is for app-agnostic utilities.

**New test:**
- Frontend: co-located `*.test.{ts,tsx}` next to the unit; runs with `cd frontend && npm test`.
- Python: `tests/scripts/test_*.py`; runs with `pytest`.

**New environment variable:**
- Defined in `scripts/vercel_build.sh` (set inline, e.g. `VITE_DEMO_MODE=1 npm run build`).
- Read in TS via `import.meta.env.VITE_*`.
- For local dev: `cd frontend && VITE_FOO=bar npm run dev`.

## Special Directories

**`frontend/public/demo-assets/`:**
- Purpose: Static asset output of `scripts/build_demo_static.py`.
- Generated: Yes (by the build pipeline).
- Committed: No (gitignored). Vercel rebuilds it on every deploy.

**`frontend/dist/`:**
- Purpose: Vite build output.
- Generated: Yes.
- Committed: No.

**`frontend/node_modules/`:**
- Purpose: npm packages.
- Generated: Yes (by `npm ci`).
- Committed: No.

**`demo_assets/models_real/`, `demo_assets/models_synthetic/`:**
- Purpose: Pre-trained joblib bundles consumed by `scripts/build_demo_static.py`.
- Generated: Yes (by `scripts/generate_demo_assets.py`).
- Committed: Yes — **via Git LFS**. `.gitattributes` routes `*.joblib` through LFS. Vercel must have LFS enabled in project settings or these files arrive as <1 KB pointer files and the build emits a `WARN` while skipping them.

**`__pycache__/`, `.pytest_cache/`, `.ruff_cache/`:**
- Purpose: Python bytecode + tool caches.
- Generated: Yes.
- Committed: No.

**`.claude/worktrees/`:**
- Purpose: Out-of-band branch worktrees from prior agent runs (visible in this repo: `fix-code-review-high-2026-04-20/` containing a partial `backend/` skeleton from a different branch).
- Generated: Yes (by git worktree).
- Committed: No.
- **Important:** Do not analyse or import from `.claude/worktrees/` when mapping the repo — it is not part of the working tree's logical structure.

---

*Structure analysis: 2026-05-04*
