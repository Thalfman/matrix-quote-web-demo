"""Generate a tiny synthetic dataset + trained models for tests.

Run once from the repo root:
    python scripts/build_test_fixtures.py

Outputs (all checked in):
    tests/fixtures/tiny_models/data/master/projects_master.parquet
    tests/fixtures/tiny_models/models/metrics_summary.csv
    tests/fixtures/tiny_models/models/*.joblib

NOTE: service/train_lib.py does not exist in this repo.  Training is done via
core.models.train_one_op (iterating over core.config.TARGETS) which is what
the production admin train route will call.  The fixture script reproduces that
exact call so fixture models are identical in shape to production models.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from core.config import QUOTE_CAT_FEATURES, QUOTE_NUM_FEATURES, TARGETS
from core.models import train_one_op


def build_synthetic_master(n: int = 64) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    industries = ["Automotive", "Food & Beverage", "General Industry"]
    systems = [
        "Machine Tending",
        "End of Line Automation",
        "Engineered Manufacturing Systems",
    ]
    automation = ["Semi-Automatic", "Robotic", "Hard Automation"]
    plcs = ["AB Compact Logix", "AB Control Logix", "Siemens S7"]
    hmis = ["AB PanelView Plus", "Siemens Comfort Panel"]
    visions = ["None", "2D", "3D"]

    df = pd.DataFrame({
        "project_id": [f"P{i:04d}" for i in range(n)],
        "industry_segment": rng.choice(industries, n),
        "system_category":  rng.choice(systems, n),
        "automation_level": rng.choice(automation, n),
        "plc_family":       rng.choice(plcs, n),
        "hmi_family":       rng.choice(hmis, n),
        "vision_type":      rng.choice(visions, n),
        "stations_count":   rng.integers(2, 20, n).astype(float),
        "robot_count":      rng.integers(0, 6, n).astype(float),
        "fixture_sets":     rng.integers(1, 5, n).astype(float),
        "part_types":       rng.integers(1, 5, n).astype(float),
        "servo_axes":       rng.integers(0, 12, n).astype(float),
        "pneumatic_devices":rng.integers(0, 20, n).astype(float),
        "safety_doors":     rng.integers(0, 6, n).astype(float),
        "weldment_perimeter_ft": rng.uniform(0, 100, n),
        "fence_length_ft":  rng.uniform(0, 200, n),
        "conveyor_length_ft": rng.uniform(0, 300, n),
        "product_familiarity_score": rng.uniform(1, 5, n),
        "product_rigidity": rng.uniform(1, 5, n),
        "is_product_deformable": rng.integers(0, 2, n),
        "is_bulk_product":  rng.integers(0, 2, n),
        "bulk_rigidity_score": rng.uniform(0, 5, n),
        "has_tricky_packaging": rng.integers(0, 2, n),
        "process_uncertainty_score": rng.uniform(1, 5, n),
        "changeover_time_min": rng.uniform(0, 60, n),
        "safety_devices_count": rng.integers(0, 10, n).astype(float),
        "custom_pct":       rng.uniform(0, 1, n),
        "duplicate":        rng.integers(0, 2, n),
        "has_controls":     rng.integers(0, 2, n),
        "has_robotics":     rng.integers(0, 2, n),
        "Retrofit":         rng.integers(0, 2, n),
        "complexity_score_1_5": rng.uniform(1, 5, n),
        "vision_systems_count": rng.integers(0, 3, n).astype(float),
        "panel_count":      rng.integers(1, 6, n).astype(float),
        "drive_count":      rng.integers(0, 10, n).astype(float),
        "stations_robot_index":   rng.uniform(0, 1, n),
        "mech_complexity_index":  rng.uniform(0, 1, n),
        "controls_complexity_index": rng.uniform(0, 1, n),
        "physical_scale_index":   rng.uniform(0, 1, n),
        "log_quoted_materials_cost": rng.uniform(8, 14, n),
    })

    # Synthesize hours per target op: linear combo + noise so gbdt has signal.
    base = 50 + 6 * df["stations_count"] + 10 * df["robot_count"] + 0.2 * df["conveyor_length_ft"]
    noise = lambda scale: rng.normal(0, scale, n)  # noqa: E731

    # Map TARGETS (e.g. "me10_actual_hours") to synthetic values.
    hour_factors = {
        "me10":    (1.00, 20),
        "me15":    (0.90, 18),
        "me230":   (0.80, 16),
        "ee20":    (0.85, 15),
        "rb30":    (0.60, 14),
        "cp50":    (0.70, 12),
        "bld100":  (0.50, 10),
        "shp150":  (0.10,  4),
        "inst160": (0.45, 10),
        "trv180":  (0.30,  8),
        "doc190":  (0.20,  5),
        "pm200":   (0.40, 10),
    }
    for target in TARGETS:
        op = target.replace("_actual_hours", "")
        factor, noise_scale = hour_factors.get(op, (0.5, 10))
        df[target] = np.maximum(5, base * factor + noise(noise_scale))

    return df


def main() -> None:
    out = Path("tests/fixtures/tiny_models")
    models_out = str(out / "models")
    master_dir = out / "data" / "master"
    master_dir.mkdir(parents=True, exist_ok=True)
    Path(models_out).mkdir(parents=True, exist_ok=True)

    df = build_synthetic_master()
    master_parquet = master_dir / "projects_master.parquet"
    df.to_parquet(master_parquet, index=False)
    print(f"Wrote {master_parquet}")

    metrics_rows = []
    for target in TARGETS:
        result = train_one_op(df, target, models_dir=models_out, version="v1")
        if result:
            metrics_rows.append(result)
            print(f"  trained {target}")
        else:
            print(f"  skipped {target} (not enough data)")

    metrics_path = Path(models_out) / "metrics_summary.csv"
    pd.DataFrame(metrics_rows).to_csv(metrics_path, index=False)
    print(f"Wrote {metrics_path}")
    joblib_count = len(list(Path(models_out).glob("*.joblib")))
    print(f"Wrote {joblib_count} joblib files")


if __name__ == "__main__":
    main()
