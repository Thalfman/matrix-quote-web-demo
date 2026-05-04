# Codebase Concerns

**Analysis Date:** 2026-05-04

## Tech Debt

**Pyodide ↔ joblib pickle version coupling (highest-priority):**
- Issue: `frontend/src/demo/pyodideClient.ts:5` hardcodes `const PYODIDE_VERSION = "0.27.1"` because Pyodide 0.27.1 ships scikit-learn 1.5.2 — the exact version `scripts/generate_demo_assets.py` produced the joblib pickles under. Any retraining must yield pickles whose internal `_sklearn_version` field is byte-compatible with whatever sklearn the pinned Pyodide bundles. Two recent ping-pong commits document the brittleness:
  - `d24f6ff` "fix(pyodide): bump to 0.27.7 to match sklearn 1.6 pickle format" — bumped to 0.27.7 expecting sklearn 1.6.1 because joblib.load tripped on `AttributeError: Can't get attribute '_RemainderColsList' on sklearn.compose._column_transformer`.
  - `333060b` "fix(pyodide): pin to 0.27.1 to match the pickle's sklearn 1.5.2" — rolled back when 0.27.7 hit a *different* unpickling failure: `AttributeError: Can't get attribute '__pyx_unpickle_CyHalfSquaredError' on sklearn._loss._loss`. The committed bundles' metadata says `_sklearn_version: 1.5.2`, so 0.27.1 is the only Pyodide version that can deserialize them today.
- Files: `frontend/src/demo/pyodideClient.ts:5-7`, `scripts/generate_demo_assets.py:39-57`, `scripts/vercel_build.sh:17` (Vercel installs the *latest* sklearn — `pip install --break-system-packages pandas numpy scikit-learn joblib`, no version pin), `core/models.py:99-100` (writes the joblib bundle), `frontend/public/demo-assets/models_real/` and `frontend/public/demo-assets/models_synthetic/`.
- Impact: Silent inference failure surface — if the Vercel build image's sklearn drifts, `generate_demo_assets.py` produces pickles whose Cython-loss class layout differs from Pyodide 0.27.1's sklearn 1.5.2, and `joblib.load(io.BytesIO(...))` in `frontend/src/demo/pyodideClient.ts:154` (and the `runPythonAsync` block at lines 360-367) raises mid-warmup. The user sees the warmup banner with the verbatim Python traceback (added in `d24f6ff`). No automated check today catches a drift before deploy.
- Fix approach:
  1. Pin sklearn explicitly in `scripts/vercel_build.sh:17` to the version that ships with the pinned Pyodide (today: `scikit-learn==1.5.2`). Mirror the version in a top-level `requirements.txt` so local retraining can't drift.
  2. Add a build-time assertion in `scripts/build_demo_static.py` that opens one joblib, reads its embedded `_sklearn_version`, and fails the build if it does not match a known compatibility table for `PYODIDE_VERSION`.
  3. Document the contract once in code (a `# COMPAT:` comment block above `PYODIDE_VERSION`) so a future bump considers both sides.

**Dead "predict_one" Python shim:**
- Issue: `frontend/public/demo-assets/py/predict.py` (templated by `scripts/build_demo_static.py:210-288` as `_PREDICT_SHIM`) defines `predict_one(...)` that reads bundles from `/models` via `load_model`. The active runtime in `frontend/src/demo/pyodideClient.ts:138-249` defines its own inline `predict_dataset(...)` and never calls `predict_one`. Commit `d24f6ff` removed `from predict import predict_one` from the bootstrap because "nothing has called predict_one since Commit 4". The shim still ships in every build.
- Files: `scripts/build_demo_static.py:210-288`, `frontend/public/demo-assets/py/predict.py`.
- Impact: Dead code on the wire (~90 lines of Python text per page load — small, but a maintenance trap; future contributors will assume `predict_one` is the entry point).
- Fix approach: Delete the `_PREDICT_SHIM` constant and the `(py_out / "predict.py").write_text(...)` call in `scripts/build_demo_static.py:207`. Also drop `"predict.py"` from `PY_FILES = ["config.py", "features.py", "models.py", "predict.py"]` in `frontend/src/demo/pyodideClient.ts:24`.

**Vercel cache header doesn't match the actual asset paths:**
- Issue: `vercel.json:11` declares an `immutable` cache header for `/demo-assets/models/(.*)`, but `scripts/build_demo_static.py:323` and `frontend/src/demo/pyodideClient.ts:324` both serve from `/demo-assets/models_real/...` and `/demo-assets/models_synthetic/...`. The header is a no-op.
- Files: `vercel.json:11-15`.
- Impact: The 32 MB of joblib bundles are NOT served `Cache-Control: public, max-age=31536000, immutable`. They get whatever Vercel's default header is (typically a short `s-maxage`), so repeat visitors re-download the bundles more often than intended. The README claims "~30 MB one-time download. Cached by the browser for subsequent loads" (`frontend/src/components/PyodideLoader.tsx:81`) — this is only partially true.
- Fix approach: Add two header blocks for `/demo-assets/models_real/(.*)` and `/demo-assets/models_synthetic/(.*)` (or change the existing source pattern to a regex that matches both, e.g. `/demo-assets/models_(real|synthetic)/(.*)`). Drop the obsolete `/demo-assets/models/` block.

**LFS-pointer silent skip can ship a broken demo:**
- Issue: `scripts/build_demo_static.py:163` treats any joblib smaller than 1 KB as an LFS pointer and silently skips it: `if joblib_file.stat().st_size < 1024: skipped_lfs += 1; continue`. A `WARN:` is printed, but the script does not fail the build. The earliest commits show this was added on purpose (`398a698` "fix(build): skip LFS-pointer joblibs instead of failing the build"), but the trade-off is real: a Vercel deploy that lost LFS hydration ships a frontend whose Pyodide warmup will fail at the *user*'s session, not at build time.
- Files: `scripts/build_demo_static.py:160-174`, `scripts/vercel_build.sh:9-14` (LFS pull is best-effort: `git lfs install --local; git lfs env | grep -E '^\s*Endpoint' || true; git lfs pull` — no failure check).
- Impact: A misconfigured Vercel project (LFS off, LFS quota exceeded, network blip during clone) produces a green deploy whose two Quote tabs are broken at runtime. The error surfaces only when a user clicks Quote and the Pyodide bundle fails to load.
- Fix approach: After the LFS check, exit with a non-zero status if `count == 0` AND `skipped_lfs > 0`. Or add a sentinel test in `tests/scripts/` that opens one joblib through pickle and confirms a known feature name.

**Demo backend exists only in a worktree, not on `main`:**
- Issue: `frontend/src/api/client.ts`, `frontend/src/pages/AdminLogin.tsx`, `frontend/src/pages/UploadTrain.tsx`, `frontend/src/pages/SingleQuote.tsx` etc. all call `api.get("/api/...")` — but the deployed demo has no backend. The full FastAPI backend (`backend/app/routes/admin.py`, `backend/app/deps.py`) lives at `.claude/worktrees/fix-code-review-high-2026-04-20/backend/`. In demo mode (`VITE_DEMO_MODE=1`, set unconditionally in `scripts/vercel_build.sh:24`), `frontend/src/App.tsx:35` short-circuits to `<DemoApp />` and the non-demo pages above are never reached — but the code still ships in the bundle.
- Files: `frontend/src/App.tsx`, `frontend/src/DemoApp.tsx`, `frontend/src/api/client.ts`, `frontend/src/pages/SingleQuote.tsx`, `frontend/src/pages/UploadTrain.tsx`, `frontend/src/pages/AdminLogin.tsx`, `vercel.json` (no `/api` rewrite — calls would 404 against the static host), `.claude/worktrees/fix-code-review-high-2026-04-20/backend/`.
- Impact: ~30% of the frontend bundle is dead code in the deployed artifact. Worse, the dead code includes admin-flow UI that *appears* functional but cannot reach a backend — if `IS_DEMO` ever flips to false on the Vercel deploy (e.g. someone removes the inline `VITE_DEMO_MODE=1` from `vercel_build.sh`), users land on `/admin/login` and every API call 404s.
- Fix approach: Either (a) gate the non-demo routes behind a Vite tree-shake (`if (import.meta.env.VITE_DEMO_MODE) { ... }` at the route table level so non-demo pages don't compile in), or (b) split the SPA into two Vite entry points — `demo.html` and `app.html` — and have Vercel serve only the demo bundle.

## Known Bugs

**Recently-fixed deadlock in `ensureModelsReady` (just-fixed; flag for regression-test gap):**
- Symptoms: When a user navigated `/compare/quote` → `/ml/quote` after the first dataset's models had loaded, the loader UI parked at "synthetic — done" forever. `setReady(true)` never fired because the ensureModelsReady IIFE never returned.
- Files: `frontend/src/demo/pyodideClient.ts:305-378` (current healthy code), historical broken code shown in commit `bf29426`.
- Trigger: Cross-tool navigation. The IIFE at `ensureModelsReady` ended with `await Promise.allSettled([modelPromises.real, modelPromises.synthetic])` — but `modelPromises[dataset]` had already been assigned the IIFE's *own* promise synchronously at line 313 before the IIFE awaited anything, so the `Promise.allSettled` was awaiting itself.
- Workaround: Now fixed in `bf29426` by dropping the gate entirely and notifying `"ready"` per dataset (line 370). Loading a second dataset later just re-emits `"ready"` (idempotent and harmless because the loader UI just re-renders the final stage).
- **Cache-invalidation contract today** (post-fix, `frontend/src/demo/pyodideClient.ts`):
  - `pyodidePromise` (line 78): single global, cached forever once resolved. Reset to `null` only on bootstrap failure (line 294).
  - `modelPromises[dataset]` (lines 83-86): per-dataset, cached forever once resolved. Reset to `null` only on per-dataset failure (line 372).
  - `LOADED["real"]` / `LOADED["synthetic"]` (Python state, lines 144, 148-154): cached forever in the Pyodide FS. There is **no path** to invalidate either cache short of a full page reload — the React app does not export a `reset()` function. Acceptable today (models are immutable per deploy), but worth flagging if hot-swap-on-retrain is ever a requirement.
- Regression-test gap: `frontend/src/demo/pyodideClient.test.ts:64-99` covers ensureModelsReady idempotency on the same dataset and that `real`/`synthetic` produce distinct promises, but does NOT exercise the second-dataset ready notification path. If someone reintroduces a `bothLoaded` gate, today's tests would not catch it.

**`models_synthetic` ships extra parquet files that nothing reads:**
- Symptoms: Bundle weight is higher than necessary.
- Files: `demo_assets/models_synthetic/calibration.parquet` (5.6 KB), `demo_assets/models_synthetic/metrics_history.parquet` (5.6 KB) — copied verbatim by `scripts/build_demo_static.py:166` to `frontend/public/demo-assets/models_synthetic/`. The current demo (`DemoApp.tsx`) never reads these files; they were used by the older `ExecutiveOverview` / `ModelPerformance` pages on the non-demo side.
- Trigger: Every cold deploy reships them.
- Workaround: None today.
- Fix: Filter the `*.joblib` glob in `_copy_model_bundle` to exclude `*.parquet` (already filters by `*.joblib`, but `shutil.copy2` happens for joblib files only — actually the parquet files are NOT copied by this loop; verify by re-reading line 162). On second look, the copy loop at line 162 only globs `*.joblib`, so parquet files are NOT shipped. Re-reading `frontend/public/demo-assets/models_synthetic/` confirms only `.joblib` files. Strike from concerns — but the parquet files DO sit in the source tree taking ~11 KB of committed-LFS-adjacent space.

## Security Considerations

**Pickle deserialization of `*.joblib` bundles in the browser:**
- Risk: `frontend/src/demo/pyodideClient.ts:154` calls `joblib.load(io.BytesIO(data))` on bytes fetched from the same origin. Python's pickle/joblib deserialization is Turing-complete by design — a malicious pickle can execute arbitrary Python (and via Pyodide, can call back into JS). The bundles are first-party (committed, LFS-stored, produced by `scripts/generate_demo_assets.py`), so the threat surface is "an attacker who can already write to the repo" — which means they could already do worse. Lower-risk in practice, but worth documenting because the assumption is non-obvious.
- Files: `frontend/src/demo/pyodideClient.ts:147-154`, `frontend/src/demo/pyodideClient.ts:360-367` (FS-backed path), `core/models.py:155` (server-side mirror, only reachable in non-demo deployments), `service/predict_lib.py:69` (also calls `load_model` → `joblib.load`).
- Current mitigation: Same-origin fetch, LFS storage prevents casual tampering, asset URL is built from `window.location.origin + DEMO_ASSETS` (no user-controlled path), CSP not deployed but browser sandbox limits Pyodide to its own WebAssembly heap. No CDN intermediary — the joblibs are served by Vercel directly.
- Recommendations:
  1. Add Subresource Integrity for the Pyodide CDN script (`frontend/src/demo/pyodideClient.ts:7-8`'s `https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js`); today the script tag is injected without `integrity=` (`pyodideClient.ts:111-122`), so a JSDelivr compromise yields RCE in the browser.
  2. Document in code that joblib bundles are first-party and never user-uploaded — if ever a feature lands that loads user-uploaded pickles client-side, the threat model changes hard.
  3. Add a CSP header in `vercel.json` allowing `script-src 'self' https://cdn.jsdelivr.net` and disallowing inline-eval; today there is no `Content-Security-Policy` header.

**Admin auth (`auth-admin-specialist` agent scope) — not in deployed demo, but documented for the wider app:**
- The deployed demo has no auth. `frontend/src/components/RequireAdmin.tsx:8` short-circuits — `if (IS_DEMO) return <>{children}</>` — so any RequireAdmin-wrapped route in the bundled-but-unreachable non-demo SPA renders without a token.
- The wider app's auth (in the worktree at `.claude/worktrees/fix-code-review-high-2026-04-20/backend/app/deps.py`) has the right shape:
  - `admin_password` compared via `hmac.compare_digest` (`backend/app/deps.py:89`) — constant-time, good.
  - `ADMIN_JWT_SECRET` enforced ≥32 chars at boot (`backend/app/deps.py:55-58`), required non-empty outside test env (`_assert_production_secrets`, lines 40-65).
  - JWT `HS256` signing, `exp` claim, default 12-hour expiry (`backend/app/deps.py:74-83`).
  - Login rate-limited 5/minute by IP (`backend/app/routes/admin.py:42`).
  - Frontend stores the token in `sessionStorage` (`frontend/src/api/client.ts:6-15`) — dies with the tab, harder to steal cross-site than `localStorage`.
- Weaknesses to flag for the future:
  1. **No refresh-token flow.** A 12-hour JWT means a tab open longer than 12 hours will silently 401 and bounce to `/admin/login` (handled at `frontend/src/api/client.ts:33-39`). Acceptable for an internal admin tool; insufficient if exposed to long-running browser sessions.
  2. **No token rotation on use.** A leaked JWT remains valid for the full 12 hours; revocation requires changing `ADMIN_JWT_SECRET` (which would invalidate every active session).
  3. **No CSRF defense.** Bearer-token-in-Authorization-header is not vulnerable to traditional form-CSRF, but if the frontend ever switches to cookie-based auth, the codebase has no CSRF-token middleware in `backend/app/`.
  4. **Single shared admin password.** No per-user accounts, no audit-logging of *which* admin acted. The `display_name` in the JWT comes from the user-supplied `LoginRequest.name` field (`backend/app/routes/admin.py:52`) — clients can claim any identity, so it's useful for UX but **not** an authentication signal.
  5. **No login attempt lockout beyond rate limit.** 5/minute means 7,200 attempts/day per IP (≈ 25 minutes for a 6-digit numeric password). Recommend hardening: cap absolute attempts before a forced cooldown.
  6. **`get_remote_address` trusts whatever the deployment fronting layer presents.** No `X-Forwarded-For` parsing config — works for direct exposure but understates rate limits behind a proxy that doesn't strip IPs.

**Frontend toast-only error handling for prediction failures:**
- Risk: `frontend/src/pages/SingleQuote.tsx:97-100` and `frontend/src/pages/demo/compare/ComparisonQuote.tsx:145-149` `catch (err) { toast.error(...) }` and don't surface the error to monitoring. With no Sentry / observability, real production errors disappear after 5 seconds.
- Files: every `try/catch` in `frontend/src/pages/`.
- Mitigation today: None.
- Recommendation: Wire up an error reporter (Sentry, Datadog RUM) gated by `IS_DEMO`. Even for the demo, a counter on warmup failures would tell us how often the Pyodide path breaks in the wild.

## Performance Bottlenecks

**Cold-start latency (Pyodide warmup):**
- Problem: First visit to `/compare/quote` or `/ml/quote` synchronously walks through:
  1. Inject `https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js` (`frontend/src/demo/pyodideClient.ts:111-122`).
  2. `loadPyodide({ indexURL: ... })` — fetches the WASM blob (~5-10 MB).
  3. `pyodide.loadPackage(["numpy", "pandas", "scikit-learn", "joblib"])` (`frontend/src/demo/pyodideClient.ts:265`) — fetches each package (~10-20 MB total).
  4. Fetch + write 4 Python shim files (`PY_FILES`, `pyodideClient.ts:24`).
  5. Run the inline `PYODIDE_RUNTIME` Python (lines 138-249).
  6. Then for each dataset: download 12 joblib files (11 MB real, 21 MB synthetic) one-at-a-time (`pyodideClient.ts:336-348` — sequential fetch in a `for` loop, not parallel).
- Files: `frontend/src/demo/pyodideClient.ts:256-377`.
- Cause: The total cold-load is ~30 MB of CDN packages + ~32 MB of joblib bundles when both datasets are warmed (or ~11-21 MB if only one is warmed). The README claims "~30 MB one-time download" (`frontend/src/components/PyodideLoader.tsx:81`); reality is ~50-65 MB for the average two-dataset session.
- Improvement path:
  1. Parallelize the joblib `for` loop at `pyodideClient.ts:336-348` — `Promise.all` the fetches, sequentialize only the FS writes.
  2. Quantize / re-train smaller models (synthetic models are ~1.7 MB each because GBR with 300 estimators × 12 targets × 3 quantile heads). Halving `n_estimators` would roughly halve bundle size with marginal R² loss.
  3. Pre-extract the constants Pyodide needs (sklearn 1.5.2, joblib, numpy, pandas) into a single bundled artifact under `frontend/public/demo-assets/pyodide-prepacked/` and load from same-origin instead of JSDelivr — saves CDN round trips and removes the `script integrity` gap.
  4. Lazy-load the synthetic bundle truly on demand: today both datasets get warmed proactively because `DemoApp.tsx:7-36` lazy-loads the *components*, but each component's `useEffect` calls `ensureModelsReady("real")` or `ensureModelsReady("synthetic")` synchronously on mount (`pyodideClient.ts` plus e.g. `compare/ComparisonQuote.tsx:97-99`). A user who only uses the Real tab still pays for the synthetic warmup the moment they navigate to `/ml/quote` even briefly. Fine today; consider a "click to warm up" primer if usage analytics show one tool dominates.

**Each navigation between Quote tabs re-runs `ensureModelsReady` (cheap, but bears noting):**
- Problem: `frontend/src/pages/demo/compare/ComparisonQuote.tsx:97-101` and `frontend/src/pages/demo/ml/MachineLearningQuote.tsx` both call `ensurePyodideReady().then(() => ensureModelsReady("real"|"synthetic"))` from a `useEffect` on mount.
- Files: `frontend/src/pages/demo/compare/ComparisonQuote.tsx:93-102`, `frontend/src/demo/pyodideClient.ts:305-378`.
- Cause: The cache works (line 306: `if (modelPromises[dataset]) return modelPromises[dataset]!`), but each route re-runs the `subscribe` listener and waits on the cached promise. Trivially cheap second-time, but wires up extra subscribers each visit; the `unsub` cleanup at line 102 keeps the listener Set tidy.
- Improvement path: Lift `ensurePyodideReady()` to `DemoApp.tsx` or an upper provider so it runs once per session, before either Quote tab mounts. Today the warmup races against the route mount.

**CSV→JSON build-time conversion is single-threaded and re-runs on every Vercel deploy:**
- Problem: `scripts/build_demo_static.py:299-300` reads both CSVs into pandas, runs `prepare_quote_features` over them (`build_demo_static.py:76-89`), and writes JSON. Negligible (sub-second), but it's the Vercel critical path so any pandas import slowdown shows up.
- Files: `scripts/build_demo_static.py`.
- Cause: Build script is re-run unconditionally on every commit.
- Improvement path: Fingerprint the CSV inputs and skip rebuild if unchanged.

## Fragile Areas

**`frontend/src/demo/pyodideClient.ts` global mutable state:**
- Files: `frontend/src/demo/pyodideClient.ts:78-86` — `let pyodidePromise`, `const listeners = new Set`, `let latestStatus`, `const modelPromises = { real: null, synthetic: null }`.
- Why fragile: Module-level mutable singletons mean the test suite can only get fresh state via `vi.resetModules()` (`frontend/src/demo/pyodideClient.test.ts:59-62`). Any future feature that wants to "reset and reload" (e.g. retrain, re-warm) needs an explicit reset API that does not exist today. Two state stores must agree: TS-side `modelPromises[dataset]` and Python-side `LOADED[dataset]` (`pyodideClient.ts:144`). They are kept consistent by convention only — if one resets while the other doesn't, predictions blow up with `RuntimeError: Models for dataset 'X' have not been loaded`.
- Safe modification: Add a `reset(dataset)` exported function that nulls `modelPromises[dataset]` AND runs `pyodide.runPython("LOADED[dataset] = {}; IMPORTANCES_CACHE.pop(dataset, None)")`.
- Test coverage: `frontend/src/demo/pyodideClient.test.ts` covers idempotency and pre-warmup guards. No test exercises the listener-Set lifecycle on hot route changes, the error-recovery branch (`pyodideClient.ts:371-374`), or the cache-coherence between TS and Python state.

**`scripts/build_demo_static.py` rewrites Python imports by string replacement:**
- Files: `scripts/build_demo_static.py:202-205` — `text = text.replace("from .config", "from config")` and same for `.features`. Used because Pyodide's filesystem mounts files as top-level modules under `/demo_py/`.
- Why fragile: Any new relative import inside `core/` (e.g. `from .schemas import ...`) silently fails to be rewritten and Pyodide raises `ModuleNotFoundError` at warmup. There is no whitelist or allow-list — only those two specific strings are rewritten.
- Safe modification: Add new relative-import rewrites here when adding files to `PY_FILES` (`pyodideClient.ts:24`). Or switch to AST-based rewrite using `libcst` / `ast` so any `from .` becomes `from `.
- Test coverage: None. `tests/scripts/` has fixture-build coverage but no integration test that diffs `core/*.py` against the rewritten output.

**Inline Python runtime is a string literal in TypeScript (`PYODIDE_RUNTIME`):**
- Files: `frontend/src/demo/pyodideClient.ts:138-250`.
- Why fragile: ~110 lines of Python embedded as a JavaScript template literal. No syntax highlighting in editors that don't recognize the `python` tag, no linting, no type checks against `core/config.py` constants. `SALES_BUCKETS` and `SALES_BUCKET_MAP` are imported from `config` at line 165 — a rename in `core/config.py` would break warmup at the first prediction call, with no build-time check.
- Safe modification: Move the runtime to a real `.py` file in `frontend/public/demo-assets/py/` and add it to `PY_FILES`. The inline form was probably chosen for "one file, all the runtime logic" cohesion, but the maintenance cost compounds.
- Test coverage: Pyodide tests in `pyodideClient.test.ts` mock `runPythonAsync` so they never execute this code at all. A jargon-guard test indirectly catches `P50` / `pyodide` strings in the *UI* but not in the runtime.

**`f-string` URL injection in `runPythonAsync`:**
- Files: `frontend/src/demo/pyodideClient.ts:360-367` — the Python block is built via JS template literal interpolation of `dataset`, `dirPath`, and a JSON-stringified file map.
- Why fragile: `_ds = "${dataset}"` and `_dir = "${dirPath}"` interpolate user-untrusted strings into Python source. Today `dataset` is restricted to `"real" | "synthetic"` by the TypeScript type and `dirPath` is built deterministically — but the pattern is exactly what creates injection bugs when the inputs aren't audited. A future contributor adding a "custom" dataset that takes a string from a URL parameter would create a Python-eval RCE in the browser.
- Safe modification: Pass the strings via `pyodide.globals.set("__ds", dataset)` and have the Python read them, never via interpolation.

## Scaling Limits

**Single-tenant browser-only architecture:**
- Current capacity: One user's browser tab; ~50-65 MB cold-start, sub-second warm predictions.
- Limit: A user with a slow connection or limited memory (mobile devices) may not be able to load Pyodide at all. There is no fallback — if WASM is disabled or the device runs out of memory, `frontend/src/components/PyodideLoader.tsx:38-42` shows "Runtime failed to load" with a Refresh button.
- Scaling path: Add a server-side fallback prediction endpoint and detect WASM availability before warming Pyodide. Below mobile thresholds, route the user to a static preview ("Quote will run on our servers — please contact us") rather than failing silently mid-warmup.

**Dataset / model lifecycle:**
- Files: `demo_assets/data/master/projects_master.parquet` (110 KB committed verbatim — no version column), `demo_assets/models_real/*.joblib`, `demo_assets/models_synthetic/*.joblib`.
- Current capacity: One master parquet, two model bundles per deploy. `scripts/generate_demo_assets.py` overwrites both bundles in place when re-run (`generate_demo_assets.py:131, 134` — `train_bundle(df, MODELS_REAL)`).
- Limits:
  1. **No master dataset versioning.** `projects_master.parquet` is a single committed file. Retraining writes new joblibs in place; no rollback path beyond `git revert`. There is no `built_at` or schema-hash column inside the parquet.
  2. **No model artifact versioning beyond filename.** Joblibs are named `<target>_v1.joblib` (`generate_demo_assets.py:49`'s `version="v1"` is hardcoded). Every retrain produces another `v1` and overwrites the prior. Old joblibs do NOT survive — they're gone the moment `git push` lands.
  3. **No upload audit trail.** The deployed demo has no upload path at all. The non-demo `UploadTrain.tsx:106-115` is a placeholder ("Awaiting an XLSX or CSV from the admin endpoint" — `frontend/src/pages/UploadTrain.tsx:108-115`); the actual upload logic in `backend/app/routes/admin.py:67-77` is a `501 Not Implemented` stub.
  4. **No metric-history retention.** `demo_assets/models_synthetic/metrics_history.parquet` is *fabricated* by `generate_demo_assets.py:60-96` (synthetic per-run history, not real training-run history) — `mape = float(max(5.0, 12 + rng.normal(0, 3)))`. The real-side has no `metrics_history.parquet` at all (`generate_demo_assets.py:65` — "real-side metrics are too noisy for a history chart").
- Scaling path:
  1. Add a manifest `demo_assets/manifest.json` recording `{master_parquet_sha256, model_bundle_sha256, trained_at, sklearn_version, pyodide_version}` and refuse to deploy if model `sklearn_version != pyodide_sklearn_version`.
  2. Version filenames with a content hash (`me10_actual_hours_<sha8>.joblib`) and let the manifest map target → filename.
  3. Add a real `model_runs/` log table (Parquet append) for production deployments.

## Dependencies at Risk

**Pyodide CDN dependency (single point of failure):**
- Risk: `frontend/src/demo/pyodideClient.ts:7-8` loads `https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js` and the runtime in turn fetches additional packages from the same CDN.
- Impact: JSDelivr outage → demo fully unavailable. JSDelivr account compromise → arbitrary script execution on the demo origin (no SRI today; see Security).
- Migration plan: Self-host the Pyodide distribution under `frontend/public/pyodide/v0.27.1/` (about 80 MB of WASM + packages — well within Vercel's static asset budget). Update `PYODIDE_INDEX_URL` to a same-origin path.

**`sklearn` floating in `vercel_build.sh`:**
- Risk: `scripts/vercel_build.sh:17` installs `pip install --quiet --disable-pip-version-check --break-system-packages pandas numpy scikit-learn joblib` with NO version pins. The Vercel image's pip resolver picks whatever latest scikit-learn the cache has at build time. The committed joblibs are versioned to a specific sklearn (1.5.2) — but the build env is not.
- Impact: Today `generate_demo_assets.py` is only run *locally* by the developer (`scripts/build_demo_static.py` only copies pre-built joblibs). But if a future contributor wires `generate_demo_assets.py` into the Vercel build, the in-CI sklearn drifts from the in-browser sklearn and pickles fail to load.
- Migration plan: Pin in `vercel_build.sh` and add a top-level `requirements.txt` mirroring those pins.

## Missing Critical Features

**Empty-state path is dead in the demo:**
- Problem: `frontend/src/pages/SingleQuote.tsx:67-82` renders an `EmptyState` ("Models are not trained — An admin needs to upload a project-hours dataset and train…") when `health?.models_ready === false`. In demo mode this branch is unreachable because `<DemoApp />` short-circuits at `App.tsx:35` before SingleQuote mounts. **In demo mode, Single Quote and Batch Quotes do not exist as routes.**
- The path users *do* take in the demo is: land on `/`, click into one of two cards on `DemoHome` (Real Data or Synthetic Data) → land on `/compare/quote` or `/ml/quote` → see the `PyodideLoader` warmup card (`PyodideLoader.tsx`) → see the form. There is no "no data" state because the data is shipped at build time. The 409 "until an admin uploads a master dataset and trains" comment in the runtime hook applies only to the wider non-demo app.
- Files: demo path: `frontend/src/pages/demo/DemoHome.tsx`, `frontend/src/pages/demo/compare/ComparisonQuote.tsx`, `frontend/src/pages/demo/ml/MachineLearningQuote.tsx`. Non-demo (unreachable in deploy): `frontend/src/pages/SingleQuote.tsx:67-82`, `frontend/src/pages/BatchQuotes.tsx:13` (description: "Batch inference lands in a later slice — this page previews the upload flow"), `frontend/src/pages/batch/BatchDropzone.tsx:17-23` ("Batch CSV/XLSX inference is not yet available. Check back once the upload endpoint ships").
- Blocks: Productionizing the demo requires implementing the upload pipeline and the empty-state-to-trained transition. Today the demo sidesteps the problem by shipping pre-trained bundles at build time.

**Batch quotes UI is a stub:**
- Problem: `frontend/src/pages/batch/BatchDropzone.tsx` renders a disabled drop zone ("Batch upload — coming soon"). `frontend/src/pages/batch/BatchRecentList.tsx`, `frontend/src/pages/batch/BatchSchemaRef.tsx` are layout chrome without functionality. The non-demo backend route `/api/batch` does not exist in `.claude/worktrees/.../backend/app/routes/`.
- Files: `frontend/src/pages/batch/BatchDropzone.tsx`, `frontend/src/pages/BatchQuotes.tsx`.
- Blocks: Sales/buyer scenario where the customer uploads a 50-row CSV and gets back 50 estimates.

**No-cloud production gaps (what would change for non-demo deploy):**
- Secrets: `backend/app/deps.py:21-25` settings load from `.env`. Production needs Vault/AWS Secrets Manager/SOPS. Today the only secret is `ADMIN_JWT_SECRET` and `ADMIN_PASSWORD` — both go straight into the FastAPI process env.
- Observability: No metrics, logs, traces, error reporting. Add Sentry / Datadog / OpenTelemetry. Today every error path either toasts (`frontend/src/pages/demo/compare/ComparisonQuote.tsx:146`) or `console.error`s and disappears.
- Persistent storage: Demo uses Pyodide's in-memory filesystem (`frontend/src/demo/pyodideClient.ts:268, 334` — `pyodide.FS.mkdirTree`). Production needs S3-or-similar for joblibs, RDS for SavedQuote rows (today the SavedQuote endpoints in `frontend/src/api/quote.ts:33-78` mock against the worktree backend's stub at `.claude/worktrees/.../backend/app/routes/quotes.py`).
- Model registry: No MLflow / W&B integration. Today retraining overwrites bundles in place; production needs an immutable registry with rollback (covered above under "Dataset/model lifecycle").
- LFS hosting: Vercel's free tier does not include unlimited LFS bandwidth. The 32 MB of joblib bundles per deploy will eat LFS quota fast in heavy redeploy workflows. Migrating joblibs to S3 + a build-time download script removes Vercel's LFS dependency entirely.
- HTTPS & CDN: Already covered by Vercel.
- Data residency / GDPR: SavedQuote rows persist user-typed inputs (project name, client name in `frontend/src/api/types.ts`'s `SavedQuote`). Production needs a data-deletion endpoint and a retention policy.

**No "jargon guard" beyond two pages:**
- Problem: Tests in `frontend/src/pages/demo/DemoHome.test.tsx:194-212` and `frontend/src/components/DataProvenanceNote.test.tsx:73-87` assert that `Pyodide`, `P50`, `P10`, `P90`, `gradient`, `R²` do not appear in rendered output. Per the project memory (demo audience is non-technical, no ML jargon), this is the customer-facing copy guard.
- Files: `frontend/src/pages/demo/DemoHome.test.tsx:194-212`, `frontend/src/pages/demo/MachineLearningQuoteTool.test.tsx:119-124`, `frontend/src/components/DataProvenanceNote.test.tsx:73-88`.
- What it enforces: Specifically, that the words `Pyodide` (the runtime brand), `P50` / `P10` / `P90` (statistical quantiles), `gradient boosting` / `gradient` (model family), and `R²` (regression metric) do not appear in `<DemoHome>` and `<DataProvenanceNote variant>` rendered output. The check uses `screen.queryByText` and `document.body.textContent.match(/\bP50\b/)` style assertions.
- Failure mode if bypassed:
  1. **Coverage hole:** The guard runs on `<DemoHome>` and `<DataProvenanceNote>` only. The pages under `frontend/src/pages/demo/compare/`, `frontend/src/pages/demo/ml/`, and `frontend/src/components/quote/QuoteResultPanel.tsx` are NOT guarded. A new heading like "Estimated P50 hours" added to `QuoteResultPanel.tsx` would not fail any test.
  2. **Word-list drift:** The list (`Pyodide`, `P50`, `P10`, `P90`, `gradient`, `R²`) is hard-coded twice (DemoHome and DataProvenanceNote). A new term like "MAE" or "quantile" would slip through both. The list should be one shared `JARGON_BLOCKLIST` constant in `frontend/src/test/jargon.ts` and asserted across every demo-page test.
  3. **Description-only enforcement:** The check is on rendered DOM text, not on chart axis labels, tooltip content, or aria-labels. Recharts components in `BusinessInsightsView.tsx` could ship `R²` in axis tooltips and the test would not see it (jsdom does not render Recharts SVGs the same as browsers).
- Recommendations:
  1. Extract a shared `JARGON_BLOCKLIST` and a test helper `expectNoJargon(container)` and call it from every `*.test.tsx` under `frontend/src/pages/demo/`.
  2. Add a build-time grep against the production HTML output of `frontend/dist/` for the same blocklist after `vite build`.

## Test Coverage Gaps

**Pyodide cache-invalidation contract has no test:**
- What's not tested: The "load second dataset after first is loaded" flow — the exact scenario commit `bf29426` fixed. `pyodideClient.test.ts` tests idempotency on the same dataset but not the second-dataset case end-to-end.
- Files: `frontend/src/demo/pyodideClient.test.ts`.
- Risk: A regression that reintroduces a `bothLoaded`-style gate would not be caught until manual QA.
- Priority: High.

**No test for the `error` recovery path in `ensureModelsReady`:**
- What's not tested: `pyodideClient.ts:371-374` — if a fetch fails mid-bundle-load, `modelPromises[dataset] = null` is set so a retry can re-trigger the load. No test verifies that retry actually works.
- Files: `frontend/src/demo/pyodideClient.test.ts`.
- Risk: A regression where the error path leaks a half-populated `LOADED[dataset]` would silently corrupt predictions.
- Priority: Medium.

**No build-time integrity check for the joblib pickles:**
- What's not tested: Whether the committed joblibs are actually loadable by Pyodide 0.27.1. `tests/scripts/` has fixture builders but no test that does `joblib.load(open(joblib_path))` against the same sklearn version Pyodide ships.
- Files: `tests/scripts/`, none.
- Risk: A retrained bundle with a drifted sklearn version slips through CI and lands as a runtime warmup failure.
- Priority: High (this is the same coupling described in Tech Debt #1).

**No e2e / integration test for the `/compare/quote` → `/ml/quote` cross-tool navigation:**
- What's not tested: The exact user flow that exposed the deadlock in `bf29426`. There are unit tests for the components and for `pyodideClient` separately but no Playwright / Cypress test that drives the SPA navigation.
- Files: none — there is no e2e harness in this repo.
- Risk: Deadlock-class regressions in cross-route state.
- Priority: Medium-High. Add a minimal Playwright config running against `npm run preview`.

**No test that confirms sidebar copy / chart labels stay jargon-free:**
- What's not tested: Pages other than `DemoHome` and `DataProvenanceNote`. See "Missing Critical Features → No 'jargon guard' beyond two pages."
- Files: every `*.test.tsx` under `frontend/src/pages/demo/` and `frontend/src/components/quote/`.
- Risk: Customer-facing copy violations slip through.
- Priority: Medium.

**No CSP / security-header regression test:**
- What's not tested: That `vercel.json` headers do what they claim, that no XSS sink (`innerHTML`, `dangerouslySetInnerHTML`, `eval`) is introduced. A grep at test-time would suffice.
- Files: `vercel.json`, `frontend/src/`.
- Risk: A future `dangerouslySetInnerHTML` for "rendering user-supplied notes in saved quotes" lands without anyone noticing.
- Priority: Low (no current sinks; preventive).

---

*Concerns audit: 2026-05-04*
