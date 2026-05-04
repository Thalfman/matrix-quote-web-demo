# External Integrations

**Analysis Date:** 2026-05-04

This is a static, single-page demo. The deployed app talks to **two** external origins at runtime: jsDelivr (Pyodide) and Google Fonts. Everything else (data, models, Python shim) is served as same-origin static assets under `/demo-assets/`. There is no backend in production; admin/JWT/upload code paths exist in source but are not reachable when `VITE_DEMO_MODE=1`.

## APIs & External Services

**Browser ML runtime (Pyodide on jsDelivr):**
- jsDelivr CDN — delivers the Pyodide WebAssembly runtime and the bundled scientific Python stack consumed at runtime by `frontend/src/demo/pyodideClient.ts`.
  - Version pin: `0.27.1` — `const PYODIDE_VERSION = "0.27.1"` (`frontend/src/demo/pyodideClient.ts:5`). Chosen to match the `sklearn 1.5.2` pickle format used by the committed joblib bundles. Commit `333060b` (`fix(pyodide): pin to 0.27.1 to match the pickle's sklearn 1.5.2`) made this contract explicit.
  - Index URL: `https://cdn.jsdelivr.net/pyodide/v0.27.1/full/` (`frontend/src/demo/pyodideClient.ts:6`)
  - Loader script: `https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js` (`frontend/src/demo/pyodideClient.ts:7`); injected at runtime by `injectScript()` (`frontend/src/demo/pyodideClient.ts:111-122`) the first time `ensurePyodideReady()` runs.
  - Packages loaded after runtime init: `["numpy", "pandas", "scikit-learn", "joblib"]` (`frontend/src/demo/pyodideClient.ts:265`), fetched by Pyodide from the same `indexURL`.
  - Auth: none (public CDN).
  - Fallback: **none**. If jsDelivr or the user's network is offline, `injectScript()` rejects with `Failed to load <url>` and the loader emits a `stage: "error"` status (`frontend/src/demo/pyodideClient.ts:118-119`, `292-296`). The UI surfaces this through `frontend/src/components/PyodideLoader.tsx` (red progress bar + `Runtime failed to load` heading at `PyodideLoader.tsx:37-43`).
  - Caching: jsDelivr serves long-lived caches by version path; no service worker in this app.
- Pyodide-loaded packages — `numpy`, `pandas`, `scikit-learn` (`1.5.2` per the pickle pin), `joblib`. These are packaged inside the Pyodide distribution under `https://cdn.jsdelivr.net/pyodide/v0.27.1/full/`.

**Web fonts (Google Fonts):**
- `fonts.googleapis.com` + `fonts.gstatic.com` — `<link rel="preconnect">` + `<link rel="stylesheet">` in `frontend/index.html:8-13`.
  - Families: `Inter` (400/500/600/700), `Barlow Condensed` (500/600/700), `JetBrains Mono` (400/500/600).
  - Auth: none.
  - Fallback: Tailwind's `fontFamily` declarations include system fallbacks (`ui-sans-serif`, `system-ui`, `-apple-system`, `Segoe UI`, `sans-serif`, `ui-monospace`, `SFMono-Regular`, `monospace`) — see `frontend/tailwind.config.js:29-33`. Site stays usable if Google Fonts is blocked.

**No other external services are called at runtime.** Confirmed by grepping `frontend/src` for `cdn.jsdelivr|googleapis|aws|s3.|azure|sentry|mixpanel|posthog|segment.com|datadog|gtag|firebase|supabase|stripe`: only the Pyodide URL matches.

## Data Storage

**Databases:**
- None. Demo is fully static.

**File Storage:**
- Static, same-origin: `frontend/public/demo-assets/` (regenerated each build by `scripts/build_demo_static.py`; gitignored — see `.gitignore:43`). Served from Vercel under `/demo-assets/*`. Contents:
  - `real-projects.json`, `synthetic-pool.json` — full dataset payloads (loaded directly by `frontend/src/demo/realProjects.ts` and the Compare/Insights pages)
  - `model_metrics_real.json`, `model_metrics_synthetic.json` — per-target R²/MAE for the confidence chips (loaded by `frontend/src/demo/modelMetrics.ts`)
  - `models_real/*.joblib` (12 files) — per-target GBR bundles fetched via `fetch()` by `pyodideClient.ts:339`, written into the Pyodide virtual FS at `/models_real/*` (`frontend/src/demo/pyodideClient.ts:333-348`)
  - `models_synthetic/*.joblib` (12 files) — same wiring under `/models_synthetic/*`
  - `py/{config,features,models,predict}.py` — Python shim (mirrors `core/`) loaded into Pyodide FS at `/demo_py/*.py` and put on `sys.path` (`frontend/src/demo/pyodideClient.ts:267-274`)
  - `manifest.json` — build metadata
  - Cache headers: `Cache-Control: public, max-age=31536000, immutable` for `/demo-assets/models/(.*)` and `max-age=3600` for `/demo-assets/py/(.*)` (`vercel.json:9-21`)
- Source-of-truth model artifacts (LFS-tracked, committed): `demo_assets/models_real/*.joblib`, `demo_assets/models_synthetic/*.joblib`. Tracked by `.gitattributes`:
  ```
  demo_assets/models/**/*.joblib filter=lfs diff=lfs merge=lfs -text
  demo_assets/models_real/**/*.joblib filter=lfs diff=lfs merge=lfs -text
  demo_assets/models_synthetic/**/*.joblib filter=lfs diff=lfs merge=lfs -text
  ```
- Source CSVs: `demo_assets/data/real/projects_real.csv`, `demo_assets/data/synthetic/projects_synthetic.csv`. Required at build time; `scripts/build_demo_static.py:46-55` aborts with a clear error if missing.
- Build-time Parquet (synthetic side only): `demo_assets/models_synthetic/metrics_history.parquet`, `calibration.parquet` produced by `scripts/generate_demo_assets.py:96,115`. **Not** consumed by the demo SPA at runtime — they are precursors to the JSON metrics files emitted by `build_demo_static.py`.
- Browser storage: `sessionStorage["matrix-admin-token"]` (`frontend/src/api/client.ts:3-15`); used only by the admin/non-demo flow. The demo build never writes to it.

**Caching:**
- Vercel static-asset cache + browser HTTP cache. No application-layer cache. Pyodide's `loadPackage()` re-uses Pyodide's own internal cache; the joblib `fetch()` calls in `ensureModelsReady()` rely solely on browser HTTP caching plus the once-per-page guard `modelPromises[dataset]` (`frontend/src/demo/pyodideClient.ts:83-86,306`).

**Model artifact storage:**
- Git LFS, public GitHub repo. Endpoint: `https://github.com/Thalfman/matrix-quote-web-demo.git/info/lfs` (`.lfsconfig:1-2`). No private blob store; no signed URLs.
- Vercel build hydrates the LFS pointers via `git lfs install --local && git lfs pull` (`scripts/vercel_build.sh:11-13`) before `python3 scripts/build_demo_static.py` runs. If LFS is misconfigured, `scripts/build_demo_static.py:163` detects pointer-sized files (< 1 KB) and skips them with a warning, producing an incomplete `frontend/public/demo-assets/models_*/` and an empty Quote experience.

## Authentication & Identity

**Auth Provider:**
- None in the production demo. `frontend/src/components/RequireAdmin.tsx:8` short-circuits all admin gates when `IS_DEMO === true`:
  ```ts
  if (IS_DEMO) return <>{children}</>;
  ```
- Source code retains a JWT-style admin login that targets a FastAPI backend at `POST /api/admin/login` (`frontend/src/pages/AdminLogin.tsx:24`). Token storage and request injection live in `frontend/src/api/client.ts`:
  - Session key: `"matrix-admin-token"` in `sessionStorage`
  - `axios` request interceptor adds `Authorization: Bearer <token>` (`frontend/src/api/client.ts:22-28`)
  - `axios` response interceptor on 401 clears the token and redirects to `/admin/login` (`frontend/src/api/client.ts:30-42`)
- This admin path is **unreachable in the deployed demo**: `App.tsx:35` returns `<DemoApp />` when `IS_DEMO`, and `DemoApp.tsx` registers no admin routes. Treat the admin code as build-time dead code in production; it remains for the broader (non-demo) app this repo was forked from.

**Display name:**
- `frontend/src/lib/displayName.ts` — local-only handle prompted by the (unreachable) admin login flow.

## Monitoring & Observability

**Error Tracking:**
- None wired. `frontend/src/components/RootErrorBoundary.tsx` exists for top-level error UI but does not report errors to a third party. No Sentry / Rollbar / Datadog / Bugsnag client present (confirmed by repo-wide grep).

**Logs:**
- Browser `console` output only. Pyodide stage transitions are surfaced through the in-app `subscribe()` listener pattern (`frontend/src/demo/pyodideClient.ts:78-105`), rendered by `frontend/src/components/PyodideLoader.tsx`.
- Server-side logs: not applicable (no server).

**Analytics:**
- None.

## CI/CD & Deployment

**Hosting:**
- Vercel — `vercel.json:1-23`. Root directory = repo root. `framework: null` (custom build). Build output served from `frontend/dist/`.

**CI Pipeline:**
- None committed (no `.github/`, `.gitlab-ci.yml`, or similar at repo root). Vercel runs `bash scripts/vercel_build.sh` directly on every push to the production branch (`main`).
- Vercel build steps (in order, `scripts/vercel_build.sh:9-25`):
  1. `git lfs install --local && git lfs pull`
  2. `python3 -m pip install --quiet --disable-pip-version-check --break-system-packages pandas numpy scikit-learn joblib`
  3. `python3 scripts/build_demo_static.py`
  4. `cd frontend && VITE_DEMO_MODE=1 npm run build`

## Environment Configuration

**Required env vars:**
- Build: `VITE_DEMO_MODE=1` — set inline by `scripts/vercel_build.sh:25`. Toggles `frontend/src/lib/demoMode.ts:1` so `App.tsx` mounts `DemoApp.tsx` instead of the admin app.
- Runtime: none. The README states `No env vars required (build script sets VITE_DEMO_MODE=1 inline).` (`README.md:90`).

**Secrets location:**
- None. `.gitignore` blocks `.env*` files, but no such files are required for the demo. Repo contains no API keys, tokens, or service-account JSON.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None. (The deployed app makes only `GET` requests to same-origin static assets and to the two third-party origins called out above.)

## Upload log / model artifact pipeline

The demo has **no live upload pipeline**. The deployed app cannot ingest user data:
- `frontend/src/pages/UploadTrain.tsx` references `POST /api/admin/demo/load` (`UploadTrain.tsx:27`) and `GET /api/demo/status` (`UploadTrain.tsx:23`), but those are admin (non-demo) routes. `RequireAdmin` would normally gate them; in demo mode `RequireAdmin` is a no-op but the `/admin/*` URLs are not registered in `DemoApp.tsx`.
- New training data flows through this pipeline instead:
  1. Drop CSVs into `demo_assets/data/real/projects_real.csv` and `demo_assets/data/synthetic/projects_synthetic.csv` (`README.md:64-72`).
  2. Optionally re-train: `python3 scripts/generate_demo_assets.py` (`README.md:99-101`) — calls `core.models.train_one_op` 12 times on each dataset, writes `demo_assets/models_real/*.joblib`, `demo_assets/models_synthetic/*.joblib`, `metrics_summary.csv`, and the synthetic-side `metrics_history.parquet` + `calibration.parquet`.
  3. Commit the LFS-tracked joblibs.
  4. Push to `main` — Vercel re-runs `scripts/vercel_build.sh`, which calls `scripts/build_demo_static.py` to materialize the JSON + joblib + Python shim under `frontend/public/demo-assets/`.

Until step 1 happens, `scripts/build_demo_static.py` aborts during the Vercel build with `ERROR: Real CSV not found at ...` (`scripts/build_demo_static.py:48-51`) and the deploy fails. Once the CSVs are present and joblibs are committed, the SPA serves a complete Quote/Compare/Insights experience for both Real and Synthetic. There is no `409` admin-status response in the deployed demo — that endpoint exists only in the dormant admin app code.

---

*Integration audit: 2026-05-04*
