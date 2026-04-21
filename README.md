# Matrix Quote Web — Demo

Static, Vercel-hosted demo of the Matrix quoting engine. Two tools:

- **Comparison Quote Tool** — browse ~20–30 real historical projects side-by-side, or enter custom inputs and surface the three closest matches.
- **Machine Learning Quote Tool** — fill in project parameters and let 12 Gradient Boosting models (running client-side in your browser via Pyodide) predict hours with P10–P90 confidence intervals.

Everything runs in the browser. There is no backend.

## Architecture

```
Vercel (static)                         Pyodide (CDN, lazy)
├── frontend/dist/                      ├── sklearn + pandas + joblib + numpy
└── /demo-assets/                       │
    ├── real-projects.json       ───► Comparison Tool
    ├── synthetic-pool.json      ───► ML Tool dropdowns
    ├── models/*.joblib (12)     ───► Pyodide loadPackage
    └── py/{config,features,models,predict}.py
```

- `core/` — feature-engineering + model-loading (pyodide imports these via the shim).
- `service/` — `predict_lib.py`, vendored from the parent app (kept for parity).
- `frontend/` — Vite + React 18 SPA; `VITE_DEMO_MODE=1` swaps routing to demo-only pages.
- `demo_assets/models/` — 12 pre-trained joblib bundles (sklearn 1.5.2; matches Pyodide 0.26). Stored via Git LFS.
- `scripts/build_demo_static.py` — reads the two CSVs, converts to JSON, copies joblibs + the Python shim into `frontend/public/demo-assets/`.
- `scripts/vercel_build.sh` — Vercel build entrypoint.
- `docs/` — design notes + Claude Code skills.

## Dropping in data (one-time)

Before the first Vercel build succeeds, commit two CSVs:

| Path | What it is | Rows |
|------|-----------|------|
| `demo_assets/data/real/projects_real.csv` | Real historical projects (with the 12 `*_actual_hours` columns) | ~20–30 |
| `demo_assets/data/synthetic/projects_synthetic.csv` | Synthetic pool for ML-tool dropdowns / neighbor pool | hundreds to a few thousand |

Columns required: see `core/config.py` — `QUOTE_CAT_FEATURES` (6), `QUOTE_NUM_FEATURES` (33), and `TARGETS` (12 `*_actual_hours`, required in the real CSV, optional in the synthetic).

The build script fails fast with a clear error if anything is missing.

## Local preview

```bash
git lfs install && git lfs pull                  # hydrate demo_assets/models/*.joblib
python3 scripts/build_demo_static.py             # writes frontend/public/demo-assets/
cd frontend && npm install
VITE_DEMO_MODE=1 npm run build && npm run preview
```

## Vercel project setup (one-time)

1. Import this repo in Vercel.
2. **Root Directory** = repo root (not `frontend/`).
3. **Settings → Git → Git LFS** = on (joblib bundles must hydrate during checkout).
4. **Production Branch** = `main`.
5. No env vars required (build script sets `VITE_DEMO_MODE=1` inline).

The build is driven by `vercel.json` + `scripts/vercel_build.sh`.

## Retraining on new synthetic data (optional)

If you drop in a new synthetic CSV and want the models retrained against it:

```bash
python3 scripts/generate_demo_assets.py
```

This overwrites `demo_assets/models/*.joblib` with fresh bundles trained on the new data. Commit the new joblibs (LFS-tracked) and redeploy.
