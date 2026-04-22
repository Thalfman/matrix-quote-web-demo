# Matrix Quote Web — Demo

Static, Vercel-hosted demo of the Matrix quoting engine. Two sections — **Real Data** and **Synthetic Data** — each with three tabs: Quote, Compare, and Business Insights.

- **Real Data** — backed by `real-projects.json` (twenty-four real historical projects). Quote tab: enter project parameters and get a full estimate — estimated hours, likely range, top drivers, per-category confidence, and the three most similar past projects. Compare tab: browse all projects side-by-side with filters. Business Insights tab: interactive portfolio dashboard — KPI strip, hours-by-bucket/industry charts, system-category donut, complexity-vs-hours scatter, sortable/searchable ranked table, cross-filter, detail drawer, and CSV export.
- **Synthetic Data** — backed by `synthetic-pool.json` (five hundred generated training rows). Quote tab: same full estimate experience — the prediction engine runs in the browser against models trained on the wider pool, so confidence ratings skew higher and ranges are tighter. The closest matches section shows the most similar training rows. Compare tab: browse the generated pool with the same interface. Business Insights tab: same interactive dashboard over the generated pool.

Both Quote tabs run the same prediction engine (`QuoteResultPanel`). The only difference is which set of models is loaded and whether the closest-matches section labels them "Most similar past projects" (Real) or "Most similar training rows" (Synthetic).

Everything runs in the browser. There is no backend.

## Architecture

```
Vercel (static)                                   Pyodide (CDN, lazy)
├── frontend/dist/                                ├── sklearn + pandas + joblib + numpy
└── /demo-assets/                                 │
    ├── real-projects.json           ───► Real Data section (Quote + Compare + Insights)
    ├── synthetic-pool.json          ───► Synthetic Data section (Quote + Compare + Insights)
    ├── models_real/*.joblib (12)    ───► loaded on demand by pyodideClient ("real")
    ├── models_synthetic/*.joblib (12) ─► loaded on demand by pyodideClient ("synthetic")
    ├── model_metrics_real.json      ───► per-category R²/MAE; drives confidence chips
    ├── model_metrics_synthetic.json ───► same, for the generated-data side
    └── py/{config,features,models,predict}.py
```

Both sets of 12 models are trained through the identical `train_one_op` pipeline with default hyperparameters — once on the 24 real projects, once on the 500 generated rows. The real-side models intentionally overfit (small n), which produces lower confidence ratings and makes the "today vs at-scale" comparison legible to the buyer.

Demo routes:

```
/                    DemoHome          (two-card layout: Real Data / Synthetic Data)
/compare             → redirect to /compare/quote
/compare/quote       ComparisonQuote       (Full ML prediction; Real Data)
/compare/compare     ComparisonCompare     (Browse; Real Data)
/compare/browse      → redirect to /compare/compare  (legacy)
/compare/insights    ComparisonInsights    (Business Insights; real-projects.json)
/ml                  → redirect to /ml/quote
/ml/quote            MachineLearningQuote  (Full ML prediction; Synthetic Data)
/ml/compare          MachineLearningCompare (Browse generated pool)
/ml/insights         MachineLearningInsights (Business Insights; synthetic-pool.json)
/compare-tool        → redirect to /compare/quote    (legacy)
/business            → redirect to /compare/insights (legacy)
/ml-tool             → redirect to /ml/quote         (legacy)
```

The sidebar is sectioned: Home, divider, REAL DATA section (Quote, Compare, Business Insights), divider, SYNTHETIC DATA section (Quote, Compare, Business Insights), Demo Controls panel, ThemeToggle. `src/pages/demo/business/BusinessInsightsView.tsx` is the shared component powering both Insights views — the dataset and a `source` prop (`"real"` | `"synthetic"`) are the only differences; the `source` prop drives the KPI card's source label.

`src/components/quote/QuoteResultPanel.tsx` is the shared result component used by both Quote tabs — it renders the hero estimate, likely range, top drivers, per-category breakdown with H/M/L confidence chips, and the closest matching records. `src/components/DataProvenanceNote.tsx` is a small "What this is trained on" disclosure popover that mounts below the page header on every demo page.

- `core/` — feature-engineering + model-loading (Pyodide imports these via the shim).
- `service/` — `predict_lib.py`, vendored from the parent app (kept for parity).
- `frontend/` — Vite + React 18 SPA; `VITE_DEMO_MODE=1` swaps routing to demo-only pages.
- `demo_assets/models_real/` — 12 pre-trained joblib bundles trained on 24 real projects (sklearn 1.5.2; matches Pyodide 0.26). Stored via Git LFS.
- `demo_assets/models_synthetic/` — 12 pre-trained joblib bundles trained on 500 generated rows. Stored via Git LFS.
- `scripts/generate_demo_assets.py` — trains both bundles through the identical `train_one_op` call; writes `demo_assets/models_real/` and `demo_assets/models_synthetic/`.
- `scripts/build_demo_static.py` — reads the two CSVs, converts to JSON, copies both joblib bundles + metrics JSONs + the Python shim into `frontend/public/demo-assets/`.
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
git lfs install && git lfs pull                  # hydrate demo_assets/models_real/ + models_synthetic/
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

## Retraining on new data (optional)

If you drop in new CSVs and want both model bundles retrained:

```bash
python3 scripts/generate_demo_assets.py
```

This trains both bundles through the identical `train_one_op` pipeline and overwrites `demo_assets/models_real/*.joblib` and `demo_assets/models_synthetic/*.joblib`. Commit the new joblibs (LFS-tracked) and redeploy.
