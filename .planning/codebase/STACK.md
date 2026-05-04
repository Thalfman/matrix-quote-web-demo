# Technology Stack

**Analysis Date:** 2026-05-04

## Languages

**Primary:**
- TypeScript 5.9.3 — frontend SPA in `frontend/src/` (`frontend/tsconfig.json` `target: ES2020`, `strict: true`)
- Python 3 — model training + feature engineering in `core/`, `service/`, and `scripts/` (build-time only; not deployed)

**Secondary:**
- JavaScript (ESM) — Vite/Tailwind/PostCSS/ESLint config files (`frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/eslint.config.js`)
- HTML — single SPA shell at `frontend/index.html`
- CSS — Tailwind utilities authored in `frontend/src/styles/` (compiled by PostCSS)
- Bash — `scripts/vercel_build.sh` (Vercel build entrypoint), `scripts/demo.sh`
- CSV — input fixtures dropped under `demo_assets/data/real/projects_real.csv`, `demo_assets/data/synthetic/projects_synthetic.csv`
- JSON / Parquet — generated demo data (`demo_assets/models_*/metrics_summary.csv`, `metrics_history.parquet`, `calibration.parquet`; `frontend/public/demo-assets/*.json`)

## Runtime

**Environment:**
- Browser — primary deployment target (production runs as a static SPA on Vercel; no server)
- Pyodide 0.27.1 — Python-on-WebAssembly runtime injected at runtime in the browser (`PYODIDE_VERSION = "0.27.1"` in `frontend/src/demo/pyodideClient.ts:5`); pinned to match `sklearn 1.5.2` joblib pickle format
- Node.js — build only; required version implied by `@types/node ^20.11.28` resolved to `20.19.39` in `frontend/package-lock.json`. No `.nvmrc` committed.
- Python 3 — build only; resolved by `python3` on the Vercel build image (`scripts/vercel_build.sh:17`). No `pyproject.toml`, `requirements.txt`, or `.python-version` at repo root.

**Package Manager:**
- npm — frontend
  - Lockfile: `frontend/package-lock.json` (present, 7,251 lines)
  - Install command on Vercel: `cd frontend && npm ci` (`vercel.json:4`)
- pip (transient install on the build machine) — Python deps installed inline by `scripts/vercel_build.sh:17`:
  ```bash
  python3 -m pip install --quiet --disable-pip-version-check --break-system-packages \
      pandas numpy scikit-learn joblib
  ```
  No version pins in the install command — the build relies on whatever the Vercel image resolves. Reproducibility for in-browser inference comes from the committed joblibs being trained against `sklearn 1.5.2` (matching the Pyodide-bundled sklearn).

## Frameworks

**Core (frontend):**
- React 18.3.1 + React DOM 18.3.1 (declared `^18.2.0`) — UI framework
- React Router DOM 6.30.3 (declared `^6.22.3`) — routing; routes split between `App.tsx` (admin app, gated by `RequireAdmin`) and `DemoApp.tsx` (demo SPA, mounted when `IS_DEMO === true` in `frontend/src/lib/demoMode.ts:1`)
- TanStack Query 5.99.2 (declared `^5.28.0`) — server-state cache (`frontend/src/api/quote.ts`); used by admin pages, not exercised by the demo build
- TanStack Table 8.21.3 (declared `^8.13.0`) — sortable/filterable Compare and Insights tables
- React Hook Form 7.73.1 + `@hookform/resolvers` 3.10.0 — form state in `SingleQuote.tsx`, demo Quote pages
- Zod 3.25.76 (declared `^3.22.4`) — schema-side validation for forms
- Recharts 2.15.4 (declared `^2.12.3`) — charting on Insights/Performance pages; dynamically imported via `React.lazy` to keep main bundle smaller (`frontend/src/App.tsx:19-23`)
- Sonner 1.7.4 — toast notifications
- Lucide React 0.363.0 — icon set
- Axios 1.15.1 (declared `^1.6.8`) — admin API HTTP client (`frontend/src/api/client.ts`); attaches a Bearer token from `sessionStorage`

**Frontend ML runtime (loaded at runtime, not bundled):**
- Pyodide 0.27.1 — fetched from `https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js` (`frontend/src/demo/pyodideClient.ts:6-7`)
- Pyodide-bundled scientific stack (loaded via `pyodide.loadPackage([...])` in `frontend/src/demo/pyodideClient.ts:265`):
  - `scikit-learn` 1.5.2 (matches the joblib pickle format the bundles were trained with)
  - `pandas`
  - `numpy`
  - `joblib`

**ML training (build-time, Python):**
- scikit-learn — `GradientBoostingRegressor` (median + p10 quantile + p90 quantile), `ColumnTransformer`, `OneHotEncoder`, `SimpleImputer`, `Pipeline`, `train_test_split`, `mean_absolute_error`, `r2_score` (`core/models.py:11-17`)
- joblib — bundle persistence (`joblib.dump`/`joblib.load` in `core/models.py:100,155`)
- pandas, numpy — DataFrame manipulation (`core/features.py`, `core/models.py`)
- pydantic — `BaseModel`/`Field` for `QuoteInput`, `OpPrediction`, `SalesBucketPrediction`, `QuotePrediction` (`core/schemas.py`)

**Styling:**
- Tailwind CSS 3.4.19 (declared `^3.4.1`) — `frontend/tailwind.config.js` defines a custom palette (`ink`, `paper`, `teal`, `amber`, …) and font families (`Inter`, `Barlow Condensed`, `JetBrains Mono`)
- PostCSS 8.5.10 + Autoprefixer 10.5.0 — `frontend/postcss.config.js`
- `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 2.6.1 — utility helpers wrapped by `frontend/src/lib/utils.ts`

**Testing:**
- Vitest 1.6.1 (declared `^1.4.0`) — unit/component runner (`frontend/vite.config.ts:22-26`)
- jsdom 24.1.3 — DOM environment for component tests
- `@testing-library/react` 14.3.1 + `@testing-library/jest-dom` 6.9.1 — component assertions
- `axios-mock-adapter` 2.1.0 — mocks for axios-backed admin API tests
- pytest — Python smoke tests (`tests/scripts/test_build_demo_static.py`); no `pytest.ini`/`pyproject.toml` declares config; `.pytest_cache/` exists

**Build / Dev:**
- Vite 5.4.21 (declared `^5.1.6`) — bundler + dev server; React plugin `@vitejs/plugin-react` 4.7.0
- TypeScript 5.9.3 — type-check via `tsc -b` before `vite build` (`frontend/package.json:8`)
- ESLint 9.39.4 (flat config) — `frontend/eslint.config.js`; `typescript-eslint` 8.59.0, `eslint-plugin-react-hooks` 5.2.0, `eslint-plugin-react-refresh` 0.4.26
- `openapi-typescript` 6.7.6 — generator for `src/types/api.ts` from a running FastAPI's `/openapi.json` (admin script `npm run gen:api`); not run during the demo build

## Key Dependencies

**Critical (frontend runtime):**
- `react` ^18.2.0 / `react-dom` ^18.2.0 — UI framework; React 18 features (Suspense for code-split routes) used in `App.tsx:38` and `DemoApp.tsx:48`
- `react-router-dom` ^6.22.3 — routing
- Pyodide CDN (no npm package) — Pyodide is **not** in `package.json`; it is injected as a `<script>` tag at runtime by `frontend/src/demo/pyodideClient.ts:111-122`
- `axios` ^1.6.8 — only used by the admin (`/api`) flow; the demo never hits a backend
- `@tanstack/react-query` ^5.28.0 — same: admin only

**ML (Python, build-time):**
- `scikit-learn` (no version pin in pip install) — must produce joblibs that the Pyodide-bundled `sklearn 1.5.2` can deserialize. The fix in commit `333060b` (`fix(pyodide): pin to 0.27.1 to match the pickle's sklearn 1.5.2`) makes this contract explicit.
- `joblib`, `pandas`, `numpy` — same install line (`scripts/vercel_build.sh:17`)

**Storage formats:**
- `*.joblib` — model bundles `{ "pipeline": Pipeline, "q10": GBR, "q90": GBR }` (`core/models.py:99`); 12 per dataset × 2 datasets = 24 bundles total
- `*.parquet` — synthetic-side metrics history and calibration only (`demo_assets/models_synthetic/metrics_history.parquet`, `calibration.parquet`); written by `scripts/generate_demo_assets.py:96,115`. Not consumed by the demo SPA at runtime.
- `*.json` — emitted under `frontend/public/demo-assets/` by `scripts/build_demo_static.py` (real-projects.json, synthetic-pool.json, model_metrics_real.json, model_metrics_synthetic.json, manifest.json)
- `*.csv` — input fixtures committed under `demo_assets/data/`

**Infrastructure:**
- Vercel — static-site host (`vercel.json:1-23`); `framework: null`, `outputDirectory: frontend/dist`
- Git LFS — joblib bundles stored as LFS objects per `.gitattributes`:
  - `demo_assets/models/**/*.joblib`
  - `demo_assets/models_real/**/*.joblib`
  - `demo_assets/models_synthetic/**/*.joblib`
  - `tests/fixtures/tiny_models/**/*.joblib`
  - LFS endpoint pinned in `.lfsconfig` to `https://github.com/Thalfman/matrix-quote-web-demo.git/info/lfs`
- jsDelivr CDN — Pyodide runtime delivery (see INTEGRATIONS.md)
- Google Fonts — Inter / Barlow Condensed / JetBrains Mono via `<link>` tags (`frontend/index.html:8-13`)

## Configuration

**Environment:**
- `VITE_DEMO_MODE` — set to `"1"` by `scripts/vercel_build.sh:23` and read by `frontend/src/lib/demoMode.ts:1`. `IS_DEMO === true` swaps `App.tsx` for `DemoApp.tsx`, bypasses `RequireAdmin`, and all data calls go to local static assets.
- `DEMO_ASSETS` — fixed path constant `"/demo-assets"` (`frontend/src/lib/demoMode.ts:2`)
- No `.env*` files committed; `.gitignore` blocks `.env`, `.env.local`, `.env.*.local`. The demo build does not require any secrets.

**Build:**
- `frontend/vite.config.ts` — Vite + React plugin, `@/*` alias to `frontend/src/*`, dev proxy `/api → http://localhost:8000`, Vitest config (`environment: "jsdom"`, setup `./src/test/setup.ts`)
- `frontend/tsconfig.json` — strict mode, ES2020, bundler module resolution, `paths` alias `@/* → ./src/*`
- `frontend/eslint.config.js` — flat config; React Hooks + Refresh + typescript-eslint recommended
- `frontend/tailwind.config.js` — content globs `./index.html` and `./src/**/*.{ts,tsx}`; custom theme tokens
- `frontend/postcss.config.js` — Tailwind + Autoprefixer
- `frontend/src/test/setup.ts` — polyfills `ResizeObserver` (Recharts) and `Element.prototype.scrollIntoView` (jsdom gaps) for component tests
- `vercel.json` — `buildCommand: bash scripts/vercel_build.sh`, SPA rewrite `/((?!demo-assets|assets|favicon.ico|.*\..*).*) → /index.html`, immutable `Cache-Control` for `/demo-assets/models/*` and 1-hour cache for `/demo-assets/py/*`
- `scripts/vercel_build.sh` — `git lfs pull` → `pip install pandas numpy scikit-learn joblib` → `python3 scripts/build_demo_static.py` → `cd frontend && VITE_DEMO_MODE=1 npm run build`

## Platform Requirements

**Development:**
- Node.js (compatible with `@types/node` 20 / `vite` 5)
- Python 3 with `pandas`, `numpy`, `scikit-learn`, `joblib`
- `git lfs` to hydrate the 24 committed joblib bundles
- Modern browser with `WebAssembly` and `fetch` (Pyodide requirement); a working internet connection for the first load (Pyodide pulls from jsDelivr)

**Production:**
- Vercel static hosting (`outputDirectory: frontend/dist`)
- Production branch: `main`
- Git LFS must be enabled in the Vercel project's Git settings; otherwise `git lfs pull` in the build script aborts and the joblib bundles ship as 134-byte LFS pointers, which `scripts/build_demo_static.py:163` skips with a warning.

---

*Stack analysis: 2026-05-04*
