"""One-time builder for the committed demo_assets/ directory.

Run after any schema change to QuoteInput or after training-pipeline changes:
    python scripts/generate_demo_assets.py

Outputs (checked in):
    demo_assets/data/master/projects_master.parquet
    demo_assets/models/metrics_summary.csv
    demo_assets/models/*.joblib
    demo_assets/models/metrics_history.parquet
    demo_assets/models/calibration.parquet

Training uses core.models.train_one_op in a loop over core.config.TARGETS — the
same pattern as scripts/build_test_fixtures.py. The original plan referenced
service.train_lib.train_all_operations which does not exist; train_one_op is the
correct entry point into the vendored ML library.
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[1]
DEMO_ROOT = REPO_ROOT / "demo_assets"


def build_master(n: int = 300) -> pd.DataFrame:
    sys.path.insert(0, str(REPO_ROOT))
    from scripts.build_test_fixtures import build_synthetic_master
    return build_synthetic_master(n)


def train_and_write_models(df: pd.DataFrame, out_models: Path) -> pd.DataFrame:
    sys.path.insert(0, str(REPO_ROOT))
    from core.config import TARGETS
    from core.models import train_one_op

    out_models.mkdir(parents=True, exist_ok=True)
    metrics_rows = []
    for target in TARGETS:
        result = train_one_op(df, target, models_dir=str(out_models), version="v1")
        if result:
            metrics_rows.append(result)
            print(f"  trained {target}")
        else:
            print(f"  skipped {target} (not enough data)")
    summary_df = pd.DataFrame(metrics_rows)
    summary_df.to_csv(out_models / "metrics_summary.csv", index=False)
    return summary_df


def write_metrics_history(out_models: Path) -> None:
    """Synthetic per-run history: 6 runs stepping down MAPE over the last 6 months,
    plus per-op x quarter rows so the MAPE heatmap has data.

    The `operation` column uses the actual TARGETS codes (e.g. 'me10_actual_hours')
    so the values match what a real training-pipeline run would write and the
    accuracy_heatmap aggregator in backend/app/insights.py can display them directly.
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
    pd.DataFrame(runs + heat_rows).to_parquet(out_models / "metrics_history.parquet", index=False)


def write_calibration(df: pd.DataFrame, out_models: Path) -> None:
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
    }).to_parquet(out_models / "calibration.parquet", index=False)


def main() -> None:
    (DEMO_ROOT / "data" / "master").mkdir(parents=True, exist_ok=True)
    out_models = DEMO_ROOT / "models"
    out_models.mkdir(parents=True, exist_ok=True)

    print("Building synthetic master dataset (n=300)...")
    df = build_master()
    df.to_parquet(DEMO_ROOT / "data" / "master" / "projects_master.parquet", index=False)
    print(f"  Wrote projects_master.parquet ({len(df)} rows)")

    print("Training models...")
    train_and_write_models(df, out_models)
    joblib_count = len(list(out_models.glob("*.joblib")))
    print(f"  Wrote metrics_summary.csv + {joblib_count} joblib files")

    print("Writing metrics_history.parquet...")
    write_metrics_history(out_models)

    print("Writing calibration.parquet...")
    write_calibration(df, out_models)

    print(f"\nWrote demo assets under {DEMO_ROOT}")


if __name__ == "__main__":
    main()
