"""One-time builder for the committed demo_assets/ directory.

Run after any schema change to QuoteInput or after training-pipeline changes:
    python scripts/generate_demo_assets.py

Outputs (checked in):
    demo_assets/models_real/*.joblib          (n=24 real projects)
    demo_assets/models_real/metrics_summary.csv
    demo_assets/models_synthetic/*.joblib     (n=500 synthetic projects)
    demo_assets/models_synthetic/metrics_summary.csv
    demo_assets/models_synthetic/metrics_history.parquet
    demo_assets/models_synthetic/calibration.parquet

Both bundles are trained through the IDENTICAL train_one_op call with default
hyperparameters.  No hyperparameter overrides on either side.  The real-side
overfit (low R²) is intentional — it drives the "today vs at-scale" demo story.
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[1]
DEMO_ROOT = REPO_ROOT / "demo_assets"

REAL_CSV      = DEMO_ROOT / "data" / "real" / "projects_real.csv"
SYNTHETIC_CSV = DEMO_ROOT / "data" / "synthetic" / "projects_synthetic.csv"

MODELS_REAL      = DEMO_ROOT / "models_real"
MODELS_SYNTHETIC = DEMO_ROOT / "models_synthetic"


def train_bundle(df: pd.DataFrame, out_dir: Path) -> pd.DataFrame:
    """Train 12 GBR models with default hyperparameters; write joblibs + metrics."""
    sys.path.insert(0, str(REPO_ROOT))
    from core.config import TARGETS
    from core.models import train_one_op

    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for target in TARGETS:
        # NOTE: identical call on both sides. No hyperparameter override.
        result = train_one_op(df, target, models_dir=str(out_dir), version="v1")
        if result:
            rows.append(result)
            print(f"  trained {target}")
        else:
            print(f"  skipped {target} (not enough data)")
    summary = pd.DataFrame(rows)
    summary.to_csv(out_dir / "metrics_summary.csv", index=False)
    return summary


def write_metrics_history(out_dir: Path) -> None:
    """Synthetic per-run history for the Insights accuracy heatmap.

    Preserved on the synthetic side only — real-side metrics are too noisy for
    a history chart to be meaningful.
    """
    sys.path.insert(0, str(REPO_ROOT))
    from core.config import TARGETS

    end = datetime.utcnow()
    runs = []
    for i, mape in enumerate([15.1, 14.2, 13.5, 12.9, 12.1, 11.3][::-1]):
        runs.append({
            "run_id": f"demo-{i}",
            "trained_at": (end - timedelta(days=30 * i)).isoformat(),
            "rows": 250 + 10 * i,
            "overall_mape": mape,
            "operation": None,
            "quarter": None,
            "mape": None,
        })

    rng = np.random.default_rng(7)
    quarters = ["2025Q3", "2025Q4", "2026Q1", "2026Q2"]
    heat_rows = []
    for op in TARGETS:
        for q in quarters:
            heat_rows.append({
                "run_id": f"q-{q}-{op}",
                "trained_at": end.isoformat(),
                "rows": 0,
                "overall_mape": 0.0,
                "operation": op,
                "quarter": q,
                "mape": float(max(5.0, 12 + rng.normal(0, 3))),
            })
    pd.DataFrame(runs + heat_rows).to_parquet(out_dir / "metrics_history.parquet", index=False)


def write_calibration(df: pd.DataFrame, out_dir: Path) -> None:
    """Synthetic calibration: predicted low/high/actual points, ~90% inside band."""
    rng = np.random.default_rng(13)
    n = 120
    base = rng.uniform(400, 2000, n)
    width = base * rng.uniform(0.12, 0.28, n)
    low = base - width / 2
    high = base + width / 2
    noise = rng.normal(0, width * 0.35, n)
    actual = base + noise
    inside_band = ((actual >= low) & (actual <= high)).astype(float)
    pd.DataFrame({
        "predicted_low": low,
        "predicted_high": high,
        "actual": actual,
        "inside_band": inside_band,
    }).to_parquet(out_dir / "calibration.parquet", index=False)


def main() -> None:
    # --- Validate inputs ---
    if not REAL_CSV.exists():
        print(f"ERROR: {REAL_CSV} not found", file=sys.stderr)
        sys.exit(1)
    if not SYNTHETIC_CSV.exists():
        print(f"ERROR: {SYNTHETIC_CSV} not found", file=sys.stderr)
        sys.exit(1)

    real_df = pd.read_csv(REAL_CSV)
    syn_df  = pd.read_csv(SYNTHETIC_CSV)

    print(f"Training real bundle   (n={len(real_df)}) -> {MODELS_REAL.name}/")
    train_bundle(real_df, MODELS_REAL)

    print(f"\nTraining synthetic bundle (n={len(syn_df)}) -> {MODELS_SYNTHETIC.name}/")
    train_bundle(syn_df, MODELS_SYNTHETIC)

    # Preserve metrics_history and calibration on synthetic side only.
    print("\nWriting metrics_history.parquet (synthetic)...")
    write_metrics_history(MODELS_SYNTHETIC)

    print("Writing calibration.parquet (synthetic)...")
    write_calibration(syn_df, MODELS_SYNTHETIC)

    real_jl = len(list(MODELS_REAL.glob("*.joblib")))
    syn_jl  = len(list(MODELS_SYNTHETIC.glob("*.joblib")))
    print(
        f"\nDone.\n"
        f"  {MODELS_REAL.name}/  : {real_jl} joblibs + metrics_summary.csv\n"
        f"  {MODELS_SYNTHETIC.name}/: {syn_jl} joblibs + metrics_summary.csv"
        f" + metrics_history.parquet + calibration.parquet"
    )


if __name__ == "__main__":
    main()
