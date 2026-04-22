"""Build static demo assets consumed by the Vercel SPA.

Reads CSVs dropped into demo_assets/data/real/ and demo_assets/data/synthetic/,
normalizes them through the same feature prep the backend uses, and emits JSON
+ joblib bundles + a python shim under frontend/public/demo-assets/.

Run via scripts/vercel_build.sh at deploy time, or manually before
`cd frontend && VITE_DEMO_MODE=1 npm run dev` for local iteration.
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from core.config import (  # noqa: E402
    QUOTE_CAT_FEATURES,
    QUOTE_NUM_FEATURES,
    TARGETS,
)
from core.features import prepare_quote_features  # noqa: E402

REAL_CSV = REPO_ROOT / "demo_assets" / "data" / "real" / "projects_real.csv"
SYNTHETIC_CSV = REPO_ROOT / "demo_assets" / "data" / "synthetic" / "projects_synthetic.csv"
DEMO_ROOT = REPO_ROOT / "demo_assets"
OUT = REPO_ROOT / "frontend" / "public" / "demo-assets"

SYNTHETIC_POOL_CAP = 500
IDENTIFIER_COLS = ["project_id", "project_name", "year"]


def _die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def _require_csv(path: Path, label: str) -> pd.DataFrame:
    if not path.exists():
        _die(
            f"{label} CSV not found at {path.relative_to(REPO_ROOT)}. "
            "See the plan's 'Where to drop the CSVs' section for the expected schema."
        )
    try:
        return pd.read_csv(path)
    except Exception as exc:
        _die(f"Could not parse {path.relative_to(REPO_ROOT)}: {exc}")


def _validate_columns(df: pd.DataFrame, label: str, require_targets: bool) -> None:
    missing_cat = [c for c in QUOTE_CAT_FEATURES if c not in df.columns]
    if missing_cat:
        _die(f"{label} CSV is missing categorical columns: {missing_cat}")
    if require_targets:
        missing_t = [t for t in TARGETS if t not in df.columns]
        if missing_t:
            _die(f"{label} CSV is missing target columns: {missing_t}")


def _fill_categoricals(df: pd.DataFrame) -> None:
    """Backfill any blank categoricals with 'None' so JSON downstream is tidy."""
    for col in QUOTE_CAT_FEATURES:
        series = df[col].astype(object)
        blank = series.isna() | (series.astype(str).str.strip() == "")
        df.loc[blank, col] = "None"


def _prep(df: pd.DataFrame) -> pd.DataFrame:
    _fill_categoricals(df)
    df = prepare_quote_features(df)
    for col in QUOTE_NUM_FEATURES:
        if col not in df.columns:
            df[col] = 0.0
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    for col in IDENTIFIER_COLS:
        if col not in df.columns:
            df[col] = None
    for target in TARGETS:
        if target in df.columns:
            df[target] = pd.to_numeric(df[target], errors="coerce")
    return df


def _records(df: pd.DataFrame, include_targets: bool) -> list[dict]:
    keep = IDENTIFIER_COLS + QUOTE_CAT_FEATURES + list(QUOTE_NUM_FEATURES)
    if include_targets:
        keep = keep + [t for t in TARGETS if t in df.columns]
    keep = [c for c in keep if c in df.columns]
    out = df[keep].copy()
    # JSON can't serialize NaN/NaT; convert NaN numerics to null.
    records = []
    for row in out.to_dict(orient="records"):
        clean = {}
        for k, v in row.items():
            if isinstance(v, float) and np.isnan(v):
                clean[k] = None
            elif isinstance(v, (np.integer,)):
                clean[k] = int(v)
            elif isinstance(v, (np.floating,)):
                clean[k] = float(v)
            else:
                clean[k] = v
        records.append(clean)
    return records


def _feature_stats(df_real: pd.DataFrame, df_syn: pd.DataFrame) -> dict:
    combined = pd.concat(
        [df_real[QUOTE_NUM_FEATURES], df_syn[QUOTE_NUM_FEATURES]],
        ignore_index=True,
    )
    stats: dict[str, dict[str, float]] = {}
    for col in QUOTE_NUM_FEATURES:
        series = pd.to_numeric(combined[col], errors="coerce").dropna()
        if series.empty:
            stats[col] = {"min": 0.0, "max": 0.0, "mean": 0.0, "std": 1.0}
            continue
        std = float(series.std(ddof=0))
        if not np.isfinite(std) or std < 1e-6:
            std = 1.0
        stats[col] = {
            "min": float(series.min()),
            "max": float(series.max()),
            "mean": float(series.mean()),
            "std": std,
        }
    return stats


def _copy_model_bundle(src_name: str) -> int:
    """Copy one joblib bundle dir to the output dir and emit a metrics JSON.

    src_name must be one of "models_real" or "models_synthetic".

    If the source joblibs are LFS pointers (e.g. LFS not fetched in CI), warn
    and skip rather than failing the whole build — the ML tool will be broken
    in that deployment, but the demo's other pages still ship.
    """
    import csv as _csv

    src = DEMO_ROOT / src_name
    if not src.exists():
        print(
            f"WARN: joblib bundles not found at {src}. "
            "ML tool will be non-functional in this build.",
            file=sys.stderr,
        )
        return 0

    dst = OUT / src_name
    dst.mkdir(parents=True, exist_ok=True)
    count = 0
    skipped_lfs = 0
    for joblib_file in sorted(src.glob("*.joblib")):
        if joblib_file.stat().st_size < 1024:
            skipped_lfs += 1
            continue
        shutil.copy2(joblib_file, dst / joblib_file.name)
        count += 1
    if skipped_lfs:
        print(
            f"WARN: {skipped_lfs} joblib(s) in {src_name} were LFS pointers and were skipped. "
            "Enable LFS in Vercel project settings (or run `git lfs pull` locally) "
            "to restore the ML tool.",
            file=sys.stderr,
        )

    # Emit metrics JSON — pick only the columns the frontend cares about.
    metrics_csv = src / "metrics_summary.csv"
    rows: list[dict] = []
    if metrics_csv.exists():
        with metrics_csv.open(newline="", encoding="utf-8") as f:
            for r in _csv.DictReader(f):
                rows.append({
                    "target": r["target"],
                    "rows":   int(r["rows"]),
                    "mae":    round(float(r["mae"]), 2),
                    "r2":     round(float(r["r2"]), 3),
                })
    suffix = src_name.split("_", 1)[1]   # "real" or "synthetic"
    (OUT / f"model_metrics_{suffix}.json").write_text(
        json.dumps({"models": rows}, indent=2), encoding="utf-8"
    )

    return count


def _copy_py_shim() -> None:
    py_out = OUT / "py"
    py_out.mkdir(parents=True, exist_ok=True)
    for name in ("config.py", "features.py", "models.py"):
        src = REPO_ROOT / "core" / name
        # Rewrite `from .config`/`from .features` -> `from config`/`from features`
        # so the files load as top-level modules inside the pyodide FS.
        text = src.read_text(encoding="utf-8")
        text = text.replace("from .config", "from config")
        text = text.replace("from .features", "from features")
        (py_out / name).write_text(text, encoding="utf-8")
    (py_out / "predict.py").write_text(_PREDICT_SHIM, encoding="utf-8")


_PREDICT_SHIM = '''# predict.py - runs inside Pyodide. Kept free of pydantic/FastAPI deps.
import pandas as pd

from config import (
    TARGETS,
    SALES_BUCKETS,
    SALES_BUCKET_MAP,
    QUOTE_NUM_FEATURES,
    QUOTE_CAT_FEATURES,
)
from features import prepare_quote_features
from models import load_model, predict_with_interval

_BUNDLE_CACHE = {}


def _bundle(target: str):
    if target not in _BUNDLE_CACHE:
        _BUNDLE_CACHE[target] = load_model(target, models_dir="/models")
    return _BUNDLE_CACHE[target]


def _confidence(p10: float, p50: float, p90: float):
    eps = 1e-6
    rel_width = (p90 - p10) / max(abs(p50), eps)
    if rel_width < 0.3:
        label = "high"
    elif rel_width < 0.6:
        label = "medium"
    else:
        label = "low"
    return float(rel_width), label


def predict_one(input_dict):
    cols = list(set(QUOTE_NUM_FEATURES + QUOTE_CAT_FEATURES))
    row = {c: input_dict.get(c, None) for c in cols}
    df = prepare_quote_features(pd.DataFrame([row]))

    ops = {}
    buckets = {b: {"p10": 0.0, "p50": 0.0, "p90": 0.0} for b in SALES_BUCKETS}
    t50 = t10 = t90 = 0.0

    for target in TARGETS:
        bundle = _bundle(target)
        if bundle is None:
            continue
        p50_a, p10_a, p90_a, std_a = predict_with_interval(bundle, df)
        p50, p10, p90, std = float(p50_a[0]), float(p10_a[0]), float(p90_a[0]), float(std_a[0])
        rel_width, conf = _confidence(p10, p50, p90)
        op = target.replace("_actual_hours", "")
        ops[op] = {
            "p50": p50, "p10": p10, "p90": p90, "std": std,
            "rel_width": rel_width, "confidence": conf,
        }
        b = SALES_BUCKET_MAP.get(op)
        if b in buckets:
            buckets[b]["p10"] += p10
            buckets[b]["p50"] += p50
            buckets[b]["p90"] += p90
        t50 += p50; t10 += p10; t90 += p90

    sales_buckets = {}
    for b, totals in buckets.items():
        p10, p50, p90 = totals["p10"], totals["p50"], totals["p90"]
        rel_width, conf = _confidence(p10, p50, p90)
        sales_buckets[b] = {
            "p10": p10, "p50": p50, "p90": p90,
            "rel_width": rel_width, "confidence": conf,
        }

    return {
        "ops": ops,
        "total_p50": t50,
        "total_p10": t10,
        "total_p90": t90,
        "sales_buckets": sales_buckets,
    }
'''


def main() -> None:
    print("Building demo static assets...")
    df_real_raw = _require_csv(REAL_CSV, "real projects")
    df_syn_raw = _require_csv(SYNTHETIC_CSV, "synthetic projects")

    _validate_columns(df_real_raw, "real projects", require_targets=True)
    _validate_columns(df_syn_raw, "synthetic projects", require_targets=False)

    df_real = _prep(df_real_raw)
    df_syn = _prep(df_syn_raw).head(SYNTHETIC_POOL_CAP)

    # Wipe the output dir so a stale file from a prior build can't leak through.
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)

    real_records = _records(df_real, include_targets=True)
    syn_records = _records(df_syn, include_targets=True)

    (OUT / "real-projects.json").write_text(json.dumps(real_records), encoding="utf-8")
    (OUT / "synthetic-pool.json").write_text(json.dumps(syn_records), encoding="utf-8")
    print(f"  real-projects.json: {len(real_records)} rows")
    print(f"  synthetic-pool.json: {len(syn_records)} rows")

    manifest = {
        "built_at": datetime.now(timezone.utc).isoformat(),
        "real_count": len(real_records),
        "synthetic_count": len(syn_records),
        "feature_stats": _feature_stats(df_real, df_syn),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    for bundle_name in ("models_real", "models_synthetic"):
        n_models = _copy_model_bundle(bundle_name)
        suffix = bundle_name.split("_", 1)[1]
        print(f"  {bundle_name}/: {n_models} joblib bundles  (model_metrics_{suffix}.json emitted)")

    _copy_py_shim()
    print("  py/: config.py, features.py, models.py, predict.py")

    print(f"\nDone. Wrote to {OUT.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
