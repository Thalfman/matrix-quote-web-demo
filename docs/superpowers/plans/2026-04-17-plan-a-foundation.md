# Plan A — Foundation: Matrix Brand Alignment + Explain API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap the amber/steel palette to Matrix Design LLC's navy + white + electric-blue, swap the typeface to Inter, and extend `POST /api/quote/single` to return per-quote driver contributions and nearest-neighbor projects alongside the prediction.

**Architecture:** Frontend token-level change only (Tailwind config + `globals.css` + component audit for stray hex colors). Backend adds a new `explain.py` module that reaches read-only into the trained joblib bundles and the master parquet — zero edits to `core/` or `service/`. Quote response is nested into a new `ExplainedQuoteResponse` wrapper so the vendored `QuotePrediction` stays untouched.

**Tech Stack:** Tailwind, React 18, Pydantic v2, FastAPI, pandas, scikit-learn (via service/), numpy. Adds optional `shap` only if native `pred_contrib` is unavailable at startup.

**Spec reference:** `docs/superpowers/specs/2026-04-17-estimator-cockpit-redesign-design.md` — Sections 3 (Visual system), 6 (Drivers & Similar), 10 (Backend shape).

**Prerequisites:** None. This is the first plan.

---

## File structure

**Modified:**
- `frontend/tailwind.config.ts` — palette swap (amber → electric-blue, navy/steel tuned to Matrix brand).
- `frontend/src/styles/globals.css` — focus-ring color, any stray amber hex.
- `frontend/src/components/Layout.tsx` — replace `amber`/`amber-subtle` utility classes.
- `frontend/src/components/ConfidenceDot.tsx` — replace amber references.
- `frontend/src/components/PageHeader.tsx` — replace amber tone in chips.
- `frontend/index.html` — add Inter `<link>` from Google Fonts.
- `backend/app/schemas_api.py` — add `DriverContribution`, `OperationDrivers`, `NeighborProject`, `ExplainedQuoteResponse`.
- `backend/app/routes/quote.py` — change `single_quote` response model to `ExplainedQuoteResponse`.
- `frontend/src/api/types.ts` — add new response type fields (hand-rolled until `gen:api` is wired).
- `frontend/src/api/quote.ts` — `useSingleQuote` mutation result type.
- `frontend/src/pages/SingleQuote.tsx` — access `result.prediction.*` instead of `result.*`.
- `frontend/src/pages/single-quote/QuoteResults.tsx` — same.
- `requirements.txt` — add `shap` (fallback path).

**Created:**
- `backend/app/explain.py` — `compute_drivers(inputs, k=3)` and `compute_neighbors(inputs, k=5)`.
- `tests/test_explain.py` — unit tests for drivers & neighbors.
- `tests/test_quote_endpoint_explain.py` — end-to-end test for extended response.
- `tests/fixtures/__init__.py` + `tests/fixtures/tiny_models/` — fixture bundle of one trained model per op so tests don't need the real dataset.
- `scripts/build_test_fixtures.py` — one-time script to produce the fixture bundle.

**Not touched:** `core/`, `service/`, admin routes, batch endpoint.

---

## Task 1: Install Inter font in the SPA

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Read current head**

Run: `cat frontend/index.html`
Expected: an existing `<head>` with `<link rel="stylesheet">` entries or none.

- [ ] **Step 2: Add Inter preconnect + stylesheet**

Replace the existing `<head>` block with:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Matrix Quote Estimation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</head>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat(style): load Inter from Google Fonts"
```

---

## Task 2: Rewire Tailwind palette

**Files:**
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Write the palette swap**

Replace the entire `theme.extend.colors` block and `fontFamily` block in `tailwind.config.ts` with:

```ts
colors: {
  navy: {
    DEFAULT: "#0B1F3A",
    600: "#15305B",
    700: "#0E2238",
    800: "#091729",
    900: "#0A1729",
  },
  steel: {
    100: "#E8ECF0",
    200: "#CDD4DC",
    300: "#A9B6C3",
    400: "#7D91A2",
    500: "#546D82",
    600: "#3A5166",
    700: "#263D50",
  },
  // Signature electric-blue — the single brand accent (replaces amber).
  brand: {
    DEFAULT: "#2563EB",
    hover:   "#1D4ED8",
    pressed: "#1E40AF",
    subtle:  "#DBEAFE",
    foreground: "#FFFFFF",
  },
  // Semantic tokens (light + dark aware via `dark:` variants).
  bg: {
    DEFAULT: "#F6F8FB",
    dark:    "#0A1220",
  },
  surface: {
    DEFAULT: "#FFFFFF",
    dark:    "#0F1B30",
  },
  ink: {
    DEFAULT: "#0F172A",
    dark:    "#E2E8F0",
  },
  muted: {
    DEFAULT: "#475569",
    dark:    "#94A3B8",
  },
  border: {
    DEFAULT: "#E2E8F0",
    dark:    "#1E293B",
  },
  accent: {
    DEFAULT: "#2563EB",
    foreground: "#FFFFFF",
  },
  success: "#0F766E",
  warning: "#B45309",
  danger:  "#B91C1C",
},
fontFamily: {
  sans: [
    "Inter",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "sans-serif",
  ],
  mono: ["ui-monospace", "SFMono-Regular", "monospace"],
},
fontSize: {
  display: ["56px", { lineHeight: "60px", fontWeight: "600", letterSpacing: "-0.02em" }],
},
maxWidth: {
  content: "1200px",
},
```

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.ts
git commit -m "feat(style): swap Tailwind palette to Matrix navy + electric-blue brand"
```

---

## Task 3: Update globals.css focus ring & body font

**Files:**
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Replace amber focus color with electric-blue**

Find the `:focus-visible` block at the top of `globals.css` and replace with:

```css
:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
  border-radius: 4px;
}
```

- [ ] **Step 2: Ensure body font references the Inter-enabled sans stack**

In the `@layer base` block, replace the body rule with:

```css
body {
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  font-weight: 400;
  line-height: 1.6;
  @apply bg-bg text-ink;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/globals.css
git commit -m "feat(style): electric-blue focus ring + Inter body font"
```

---

## Task 4: Replace amber utility classes in components

**Files:**
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/ConfidenceDot.tsx`
- Modify: `frontend/src/components/PageHeader.tsx`
- Modify: `frontend/src/pages/single-quote/QuoteForm.tsx` (if present)
- Modify: `frontend/src/pages/single-quote/QuoteResults.tsx` (if present)

- [ ] **Step 1: Grep the codebase for all amber references**

Run: `cd frontend && grep -rn "amber" src/`
Expected: a list of files and line numbers using `text-amber`, `bg-amber`, `border-amber`, `amber-subtle`, etc.

- [ ] **Step 2: Find-replace amber utility classes**

For every match, substitute according to this map:

| Old class | New class |
|---|---|
| `text-amber` | `text-brand` |
| `bg-amber` | `bg-brand` |
| `border-amber` | `border-brand` |
| `bg-amber-subtle` | `bg-brand-subtle` |
| `bg-amber/10` | `bg-brand/10` |
| `bg-amber/60` | `bg-brand/60` |
| `bg-amber-subtle/60` | `bg-brand-subtle/60` |
| `dark:bg-amber/10` | `dark:bg-brand/10` |

Apply each substitution in every file returned by the grep in Step 1.

- [ ] **Step 3: Re-grep to confirm no `amber` references remain**

Run: `cd frontend && grep -rn "amber" src/`
Expected: empty (no matches).

- [ ] **Step 4: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(style): replace amber utility classes with brand (electric-blue)"
```

---

## Task 5: Visually smoke-test the palette swap

**Files:**
- No file changes in this task.

- [ ] **Step 1: Start the dev server in one terminal**

Run: `cd frontend && npm run dev`
Expected: Vite prints `Local: http://localhost:5173`.

- [ ] **Step 2: Start the backend in another terminal**

Run: `uvicorn backend.app.main:app --reload --port 8000`
Expected: `Application startup complete` with no import errors.

- [ ] **Step 3: Manual check**

Open `http://localhost:5173/`. Verify:
- Sidebar background and brand label look navy, not amber.
- Active nav item has an electric-blue accent bar, not amber.
- "MATRIX" eyebrow letters are blue, not amber.
- Focus a nav link or input — outline is electric-blue.
- Toggle dark mode via devtools (add `class="dark"` to `<html>`) — text + backgrounds still legible, no stray amber.

- [ ] **Step 4: No commit** (visual check only).

---

## Task 6: Add Pydantic schemas for the explain payload

**Files:**
- Modify: `backend/app/schemas_api.py`

- [ ] **Step 1: Add new classes at the bottom of `schemas_api.py`**

Append to `backend/app/schemas_api.py` (before the existing `__all__` export list — or append and extend `__all__`):

```python
class DriverContribution(BaseModel):
    """One feature's signed contribution to a single operation's hours."""

    feature: str           # humanized label ("Stations", "Industry: Automotive")
    contribution: float    # signed hours (+62.0, -22.0)
    value: str             # displayed input value ("12", "Automotive", "180 ft")


class OperationDrivers(BaseModel):
    """Top-N drivers for one operation model."""

    operation: str         # e.g. "mechanical_hours"
    drivers: list[DriverContribution] = Field(default_factory=list)
    available: bool = True
    reason: str | None = None   # populated only when available=False


class NeighborProject(BaseModel):
    """A historical project similar to the current quote input."""

    project_name: str
    year: int | None = None
    industry_segment: str
    automation_level: str
    stations: int | None = None
    actual_hours: float
    similarity: float      # 0..1 (1 = identical after preprocessing)


class ExplainedQuoteResponse(BaseModel):
    """Wrapper returned by POST /api/quote/single.

    Nests the vendored QuotePrediction so we don't edit core/schemas.py.
    """

    prediction: QuotePrediction
    drivers: list[OperationDrivers] | None = None
    neighbors: list[NeighborProject] | None = None
```

Then extend `__all__` to include the four new names:

```python
__all__ = [
    ...existing entries...,
    "DriverContribution",
    "OperationDrivers",
    "NeighborProject",
    "ExplainedQuoteResponse",
]
```

- [ ] **Step 2: Verify import**

Run: `python -c "from backend.app.schemas_api import DriverContribution, OperationDrivers, NeighborProject, ExplainedQuoteResponse; print('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas_api.py
git commit -m "feat(api): add explain payload schemas (DriverContribution, OperationDrivers, NeighborProject, ExplainedQuoteResponse)"
```

---

## Task 7: Build test fixtures (tiny trained bundle)

**Files:**
- Create: `scripts/build_test_fixtures.py`
- Create: `tests/fixtures/__init__.py`
- Create: `tests/fixtures/tiny_models/` (populated by running the script)

This script generates a synthetic master parquet of ~50 rows and trains the service pipeline to produce joblib bundles, so the downstream tests do not require the real client dataset.

- [ ] **Step 1: Write `scripts/build_test_fixtures.py`**

```python
"""Generate a tiny synthetic dataset + trained models for tests.

Run once:
    python scripts/build_test_fixtures.py

Outputs (all checked in):
    tests/fixtures/tiny_models/projects_master.parquet
    tests/fixtures/tiny_models/metrics_summary.csv
    tests/fixtures/tiny_models/models/*.joblib
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

import numpy as np
import pandas as pd


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
        "stations_count":   rng.integers(2, 20, n),
        "robot_count":      rng.integers(0, 6, n),
        "fixture_sets":     rng.integers(1, 5, n),
        "part_types":       rng.integers(1, 5, n),
        "servo_axes":       rng.integers(0, 12, n),
        "pneumatic_devices":rng.integers(0, 20, n),
        "safety_doors":     rng.integers(0, 6, n),
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
        "safety_devices_count": rng.integers(0, 10, n),
        "custom_pct":       rng.uniform(0, 1, n),
        "duplicate":        rng.integers(0, 2, n),
        "has_controls":     rng.integers(0, 2, n),
        "has_robotics":     rng.integers(0, 2, n),
        "Retrofit":         rng.integers(0, 2, n),
        "complexity_score_1_5": rng.uniform(1, 5, n),
        "vision_systems_count": rng.integers(0, 3, n),
        "panel_count":      rng.integers(1, 6, n),
        "drive_count":      rng.integers(0, 10, n),
        "stations_robot_index":   rng.uniform(0, 1, n),
        "mech_complexity_index":  rng.uniform(0, 1, n),
        "controls_complexity_index": rng.uniform(0, 1, n),
        "physical_scale_index":   rng.uniform(0, 1, n),
        "log_quoted_materials_cost": rng.uniform(8, 14, n),
    })
    # Synthesize hours per op: linear combo + noise so gbdt has signal.
    base = 50 + 6 * df["stations_count"] + 10 * df["robot_count"] + 0.2 * df["conveyor_length_ft"]
    noise = lambda scale: rng.normal(0, scale, n)  # noqa: E731
    df["mechanical_hours"]      = np.maximum(10, base * 1.00 + noise(20))
    df["electrical_hours"]      = np.maximum(10, base * 0.85 + noise(15))
    df["controls_hours"]        = np.maximum(10, base * 0.70 + noise(12))
    df["robotics_hours"]        = np.maximum(10, base * 0.60 + noise(14))
    df["assembly_hours"]        = np.maximum(10, base * 0.50 + noise(10))
    df["shipping_hours"]        = np.maximum( 5, base * 0.10 + noise( 4))
    df["install_hours"]         = np.maximum(10, base * 0.45 + noise(10))
    df["startup_hours"]         = np.maximum(10, base * 0.30 + noise( 8))
    df["engineering_hours"]     = np.maximum(20, base * 1.10 + noise(25))
    df["project_mgmt_hours"]    = np.maximum(10, base * 0.40 + noise(10))
    df["documentation_hours"]   = np.maximum( 5, base * 0.20 + noise( 5))
    df["misc_hours"]            = np.maximum( 5, base * 0.15 + noise( 5))
    return df


def main() -> None:
    out = Path("tests/fixtures/tiny_models")
    data_dir = out.resolve()
    models_dir = data_dir / "models"
    master_dir = data_dir / "data" / "master"
    models_dir.mkdir(parents=True, exist_ok=True)
    master_dir.mkdir(parents=True, exist_ok=True)

    df = build_synthetic_master()
    master_parquet = master_dir / "projects_master.parquet"
    df.to_parquet(master_parquet, index=False)

    os.environ["DATA_DIR"] = str(data_dir)
    # Use the real training entrypoint so fixture models are identical in
    # shape to production models.
    from service.train_lib import train_all_operations
    summary = train_all_operations(df)
    pd.DataFrame(summary).to_csv(models_dir / "metrics_summary.csv", index=False)
    print(f"Wrote {master_parquet}")
    print(f"Wrote {models_dir}/metrics_summary.csv")
    print(f"Wrote {len(list(models_dir.glob('*.joblib')))} joblib files")


if __name__ == "__main__":
    main()
```

> If `service.train_lib.train_all_operations` is not the exact entrypoint name, read `service/train_lib.py` and use whichever top-level function runs training over all ops. Do not edit `service/`.

- [ ] **Step 2: Create the fixtures package init**

Create `tests/fixtures/__init__.py`:

```python
"""Pytest fixtures directory (checked-in, built via scripts/build_test_fixtures.py)."""
```

- [ ] **Step 3: Run the fixture build**

Run: `python scripts/build_test_fixtures.py`
Expected: prints `Wrote .../tests/fixtures/tiny_models/...` for parquet, metrics_summary.csv, and some number of joblib files.

- [ ] **Step 4: Commit the script + generated fixtures**

```bash
git add scripts/build_test_fixtures.py tests/fixtures/
git commit -m "test(fixtures): tiny synthetic dataset + trained models for explain tests"
```

---

## Task 8: Build `explain.compute_drivers`

**Files:**
- Create: `backend/app/explain.py`
- Create: `tests/test_explain.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_explain.py`:

```python
"""Unit tests for backend/app/explain.py."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

FIXTURE_DIR = Path(__file__).parent / "fixtures" / "tiny_models"


@pytest.fixture(autouse=True)
def _fixture_data_dir(monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(FIXTURE_DIR))
    yield


def _sample_input():
    from backend.app.schemas_api import QuoteInput
    return QuoteInput(
        industry_segment="Automotive",
        system_category="Machine Tending",
        automation_level="Robotic",
        plc_family="AB Compact Logix",
        hmi_family="AB PanelView Plus",
        vision_type="2D",
        stations_count=8,
        robot_count=2,
        conveyor_length_ft=120.0,
    )


def test_compute_drivers_returns_one_entry_per_trained_op():
    from backend.app.explain import compute_drivers

    result = compute_drivers(_sample_input(), top_n=3)

    assert isinstance(result, list)
    assert len(result) >= 1, "at least one operation should produce drivers"
    for op in result:
        assert op.operation
        if op.available:
            assert 1 <= len(op.drivers) <= 3
            for d in op.drivers:
                assert d.feature
                assert isinstance(d.contribution, float)
                assert d.value


def test_compute_drivers_graceful_when_one_model_errors(monkeypatch):
    from backend.app import explain

    calls = {"n": 0}
    original = explain._contributions_for_op

    def flaky(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("simulated bad model")
        return original(*args, **kwargs)

    monkeypatch.setattr(explain, "_contributions_for_op", flaky)

    result = explain.compute_drivers(_sample_input(), top_n=3)

    unavailable = [op for op in result if not op.available]
    available   = [op for op in result if op.available]
    assert unavailable, "the flaky op should be marked unavailable"
    assert available,   "other ops should still return data"
```

- [ ] **Step 2: Run the test to see it fail**

Run: `pytest tests/test_explain.py -v`
Expected: `ModuleNotFoundError: No module named 'backend.app.explain'`.

- [ ] **Step 3: Write `backend/app/explain.py`**

```python
"""Per-quote explainability: driver contributions and nearest neighbors.

Read-only over the service-trained model bundles and the master parquet.
Does NOT modify any vendored module.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from core.config import QUOTE_CAT_FEATURES, QUOTE_NUM_FEATURES

from . import storage
from .paths import models_dir
from .schemas_api import (
    DriverContribution,
    NeighborProject,
    OperationDrivers,
    QuoteInput,
)

# Human-readable labels for raw feature names.
FEATURE_LABELS: dict[str, str] = {
    "stations_count":           "Stations",
    "robot_count":              "Robots",
    "fixture_sets":             "Fixture sets",
    "part_types":               "Part types",
    "servo_axes":               "Servo axes",
    "pneumatic_devices":        "Pneumatic devices",
    "safety_doors":             "Safety doors",
    "weldment_perimeter_ft":    "Weldment perimeter (ft)",
    "fence_length_ft":          "Fence length (ft)",
    "conveyor_length_ft":       "Conveyor length (ft)",
    "product_familiarity_score":"Product familiarity",
    "product_rigidity":         "Product rigidity",
    "is_product_deformable":    "Deformable product",
    "is_bulk_product":          "Bulk product",
    "bulk_rigidity_score":      "Bulk rigidity",
    "has_tricky_packaging":     "Tricky packaging",
    "process_uncertainty_score":"Process uncertainty",
    "changeover_time_min":      "Changeover time (min)",
    "safety_devices_count":     "Safety devices",
    "custom_pct":               "Custom scope %",
    "duplicate":                "Duplicate",
    "has_controls":             "Has controls",
    "has_robotics":             "Has robotics",
    "Retrofit":                 "Retrofit",
    "complexity_score_1_5":     "Complexity",
    "vision_systems_count":     "Vision systems",
    "panel_count":              "Panels",
    "drive_count":              "Drives",
    "stations_robot_index":     "Stations/robot index",
    "mech_complexity_index":    "Mech complexity index",
    "controls_complexity_index":"Controls complexity index",
    "physical_scale_index":     "Physical scale index",
    "log_quoted_materials_cost":"Log(materials cost)",
    "industry_segment":         "Industry",
    "system_category":          "System category",
    "automation_level":         "Automation level",
    "plc_family":               "PLC family",
    "hmi_family":               "HMI family",
    "vision_type":               "Vision type",
}


def _humanize(feature: str) -> str:
    return FEATURE_LABELS.get(feature, feature.replace("_", " ").title())


def _load_bundle(op_path: Path) -> dict[str, Any]:
    return joblib.load(op_path)


def _discover_bundles() -> list[tuple[str, Path]]:
    md = models_dir()
    if not md.exists():
        return []
    bundles: list[tuple[str, Path]] = []
    for p in sorted(md.glob("*.joblib")):
        op = p.stem  # e.g. "mechanical_hours"
        bundles.append((op, p))
    return bundles


def _input_row(inputs: QuoteInput) -> pd.DataFrame:
    """Convert a QuoteInput into a 1-row DataFrame with all model features."""
    row = inputs.model_dump()
    # Fill missing optional numerics with 0.0 — identical to training default.
    for col in QUOTE_NUM_FEATURES:
        row.setdefault(col, 0.0)
        if row.get(col) is None:
            row[col] = 0.0
    for col in QUOTE_CAT_FEATURES:
        row.setdefault(col, "")
    return pd.DataFrame([row])


def _contributions_for_op(
    bundle: dict[str, Any], row: pd.DataFrame, top_n: int
) -> list[DriverContribution]:
    """Return the top-N signed contributions for a single op model."""
    pipeline = bundle["pipeline"]  # sklearn Pipeline of (preprocessor, estimator)
    X = pipeline[:-1].transform(row)
    est = pipeline[-1]

    try:
        # LightGBM / XGB / CatBoost native.
        contribs = est.predict(X, pred_contrib=True)
        contrib_vec = np.asarray(contribs).ravel()[:-1]  # drop bias term
    except TypeError:
        import shap
        explainer = shap.TreeExplainer(est)
        vals = explainer.shap_values(X)
        contrib_vec = np.asarray(vals).ravel()

    feature_names = _output_feature_names(pipeline[:-1])
    if len(feature_names) != len(contrib_vec):
        # Safety: if the preprocessor produced a different width than we
        # can name, bail so callers mark op unavailable.
        raise ValueError(
            f"feature name/contribution length mismatch "
            f"({len(feature_names)} vs {len(contrib_vec)})"
        )

    pairs = sorted(
        zip(feature_names, contrib_vec),
        key=lambda p: abs(p[1]),
        reverse=True,
    )[:top_n]

    displayed = row.iloc[0].to_dict()
    drivers: list[DriverContribution] = []
    for feat, contrib in pairs:
        # Feature names from ColumnTransformer look like "num__stations_count"
        # or "cat__industry_segment_Automotive".
        raw, value_label = _split_feature_name(feat, displayed)
        drivers.append(
            DriverContribution(
                feature=_humanize(raw),
                contribution=float(contrib),
                value=value_label,
            )
        )
    return drivers


def _output_feature_names(preprocessor) -> list[str]:
    try:
        return list(preprocessor.get_feature_names_out())
    except Exception:
        # Fall back to best-effort: numerics then categoricals by config.
        return QUOTE_NUM_FEATURES + QUOTE_CAT_FEATURES


def _split_feature_name(name: str, row_values: dict[str, Any]) -> tuple[str, str]:
    """From 'num__stations_count' -> ('stations_count', '8')
       From 'cat__industry_segment_Automotive' -> ('industry_segment', 'Automotive')."""
    if "__" in name:
        _, rest = name.split("__", 1)
    else:
        rest = name
    # Try matching against known cat features first.
    for cat in QUOTE_CAT_FEATURES:
        if rest.startswith(cat + "_"):
            return cat, rest[len(cat) + 1:]
    if rest in QUOTE_NUM_FEATURES:
        val = row_values.get(rest)
        return rest, str(val) if val is not None else ""
    return rest, ""


def compute_drivers(inputs: QuoteInput, top_n: int = 3) -> list[OperationDrivers]:
    bundles = _discover_bundles()
    row = _input_row(inputs)
    out: list[OperationDrivers] = []
    for op, path in bundles:
        try:
            bundle = _load_bundle(path)
            drivers = _contributions_for_op(bundle, row, top_n)
            out.append(OperationDrivers(operation=op, drivers=drivers, available=True))
        except Exception as exc:  # noqa: BLE001 — graceful degrade, reason captured
            out.append(
                OperationDrivers(
                    operation=op,
                    drivers=[],
                    available=False,
                    reason=str(exc)[:200],
                )
            )
    return out


def compute_neighbors(inputs: QuoteInput, k: int = 5) -> list[NeighborProject]:
    df = storage.read_master()
    if df is None or df.empty:
        return []

    bundles = _discover_bundles()
    if not bundles:
        return []

    # Use any bundle's preprocessor to map both the live input and the
    # master dataset into the same encoded vector space.
    _op, first_path = bundles[0]
    preproc = _load_bundle(first_path)["pipeline"][:-1]
    X_master = preproc.transform(df)
    X_live = preproc.transform(_input_row(inputs))

    # Cosine similarity. Normalize, multiply.
    def _normalize(a):
        n = np.linalg.norm(a, axis=1, keepdims=True)
        n[n == 0] = 1.0
        return a / n

    X_master_n = _normalize(np.asarray(X_master))
    X_live_n = _normalize(np.asarray(X_live))
    sims = (X_master_n @ X_live_n.T).ravel()

    idx = np.argsort(-sims)[:k]
    out: list[NeighborProject] = []
    for i in idx:
        row = df.iloc[int(i)]
        actual = _row_total_hours(row)
        out.append(
            NeighborProject(
                project_name=str(row.get("project_id") or f"Project #{int(i)}"),
                year=_maybe_year(row),
                industry_segment=str(row.get("industry_segment", "")),
                automation_level=str(row.get("automation_level", "")),
                stations=_maybe_int(row.get("stations_count")),
                actual_hours=float(actual),
                similarity=float(sims[int(i)]),
            )
        )
    return out


def _row_total_hours(row) -> float:
    cols = [c for c in row.index if c.endswith("_hours")]
    vals = [row[c] for c in cols if pd.notna(row[c])]
    return float(sum(vals)) if vals else 0.0


def _maybe_year(row) -> int | None:
    for col in ("year", "quote_year", "project_year"):
        if col in row.index and pd.notna(row[col]):
            try:
                return int(row[col])
            except (TypeError, ValueError):
                return None
    return None


def _maybe_int(v) -> int | None:
    if v is None or pd.isna(v):
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None
```

- [ ] **Step 4: Run the drivers tests**

Run: `pytest tests/test_explain.py::test_compute_drivers_returns_one_entry_per_trained_op -v`
Expected: PASS.

Run: `pytest tests/test_explain.py::test_compute_drivers_graceful_when_one_model_errors -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/explain.py tests/test_explain.py
git commit -m "feat(api): per-quote driver contributions via native pred_contrib (+shap fallback)"
```

---

## Task 9: Add neighbor-search test coverage

**Files:**
- Modify: `tests/test_explain.py`

- [ ] **Step 1: Append neighbor tests**

Append to `tests/test_explain.py`:

```python
def test_compute_neighbors_returns_up_to_k():
    from backend.app.explain import compute_neighbors

    result = compute_neighbors(_sample_input(), k=5)

    assert len(result) <= 5
    for n in result:
        assert n.project_name
        assert n.industry_segment
        assert n.automation_level
        assert 0.0 <= n.similarity <= 1.0 + 1e-9  # cosine
        assert n.actual_hours >= 0


def test_compute_neighbors_empty_when_master_missing(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))  # no master parquet here
    from importlib import reload

    from backend.app import explain, storage
    reload(storage); reload(explain)

    result = explain.compute_neighbors(_sample_input(), k=5)
    assert result == []
```

- [ ] **Step 2: Run the neighbor tests**

Run: `pytest tests/test_explain.py -v`
Expected: all four tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/test_explain.py
git commit -m "test(explain): neighbor-search coverage (happy path + empty master)"
```

---

## Task 10: Wire drivers & neighbors into `/api/quote/single`

**Files:**
- Modify: `backend/app/routes/quote.py`

- [ ] **Step 1: Replace `single_quote` with the explain-aware version**

Replace the existing `single_quote` function (around line 22) with:

```python
from ..schemas_api import ExplainedQuoteResponse, QuoteInput


@router.post("/single", response_model=ExplainedQuoteResponse)
def single_quote(payload: QuoteInput) -> ExplainedQuoteResponse:
    if not storage.models_ready():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Models are not trained. Please upload a dataset and train first.",
        )
    pred = predict_quote(payload)
    if not pred.ops:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No operation models produced a prediction.",
        )

    # Best-effort explainability. Never fail the quote because of it.
    from ..explain import compute_drivers, compute_neighbors
    try:
        drivers = compute_drivers(payload, top_n=3)
    except Exception:
        drivers = None
    try:
        neighbors = compute_neighbors(payload, k=5)
    except Exception:
        neighbors = None

    return ExplainedQuoteResponse(
        prediction=pred,
        drivers=drivers,
        neighbors=neighbors,
    )
```

Delete the old `from ..schemas_api import QuoteInput, QuotePrediction` line — it no longer imports what we need (replace with the line above).

- [ ] **Step 2: Write the endpoint test**

Create `tests/test_quote_endpoint_explain.py`:

```python
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


FIXTURE_DIR = Path(__file__).parent / "fixtures" / "tiny_models"


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(FIXTURE_DIR))
    from backend.app import main
    from importlib import reload
    reload(main)
    return TestClient(main.app)


def test_single_quote_returns_explain_fields(client):
    resp = client.post(
        "/api/quote/single",
        json={
            "industry_segment": "Automotive",
            "system_category": "Machine Tending",
            "automation_level": "Robotic",
            "plc_family": "AB Compact Logix",
            "hmi_family": "AB PanelView Plus",
            "vision_type": "2D",
            "stations_count": 8,
            "robot_count": 2,
            "conveyor_length_ft": 120.0,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "prediction" in body
    assert "ops" in body["prediction"]
    assert "drivers" in body
    assert "neighbors" in body
    assert body["drivers"] is not None
    assert body["neighbors"] is not None
```

- [ ] **Step 3: Run the endpoint test**

Run: `pytest tests/test_quote_endpoint_explain.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes/quote.py tests/test_quote_endpoint_explain.py
git commit -m "feat(api): POST /api/quote/single returns ExplainedQuoteResponse (prediction + drivers + neighbors)"
```

---

## Task 11: Update frontend types to match the new response

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/quote.ts`
- Modify: `frontend/src/pages/SingleQuote.tsx`
- Modify: `frontend/src/pages/single-quote/QuoteResults.tsx`

- [ ] **Step 1: Append the new response types to `types.ts`**

Append to `frontend/src/api/types.ts`:

```ts
export type DriverContribution = {
  feature: string;
  contribution: number;
  value: string;
};

export type OperationDrivers = {
  operation: string;
  drivers: DriverContribution[];
  available: boolean;
  reason?: string | null;
};

export type NeighborProject = {
  project_name: string;
  year?: number | null;
  industry_segment: string;
  automation_level: string;
  stations?: number | null;
  actual_hours: number;
  similarity: number;
};

export type ExplainedQuoteResponse = {
  prediction: QuotePrediction;
  drivers?: OperationDrivers[] | null;
  neighbors?: NeighborProject[] | null;
};
```

- [ ] **Step 2: Update `useSingleQuote` mutation to return the new type**

In `frontend/src/api/quote.ts`, find the `useSingleQuote` hook. Change its result type from `QuotePrediction` to `ExplainedQuoteResponse`:

```ts
import { ExplainedQuoteResponse, QuoteInput } from "@/api/types";

export function useSingleQuote() {
  return useMutation<ExplainedQuoteResponse, unknown, QuoteInput>({
    mutationFn: async (input) =>
      (await api.post<ExplainedQuoteResponse>("/quote/single", input)).data,
  });
}
```

- [ ] **Step 3: Update `SingleQuote.tsx` to store the new shape**

In `frontend/src/pages/SingleQuote.tsx`:

- Change `const [prediction, setPrediction] = useState<QuotePrediction | null>(null);`
  to `const [result, setResult] = useState<ExplainedQuoteResponse | null>(null);`
- Change `setPrediction(result);` to `setResult(result);`
- Replace the rendered `<QuoteResults prediction={prediction} ... />` with `<QuoteResults result={result} ... />`.

- [ ] **Step 4: Update `QuoteResults.tsx` prop type**

In `frontend/src/pages/single-quote/QuoteResults.tsx`:

- Change the prop signature from `{ prediction: QuotePrediction | null, ... }` to `{ result: ExplainedQuoteResponse | null, ... }`.
- Replace every `prediction?.ops`, `prediction?.total_p50`, etc. with `result?.prediction.ops`, `result?.prediction.total_p50`, etc.

- [ ] **Step 5: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat(api): frontend consumes ExplainedQuoteResponse (prediction nested; drivers/neighbors present)"
```

---

## Task 12: End-to-end smoke check

**Files:**
- No file changes.

- [ ] **Step 1: Start backend with fixture data**

Run: `DATA_DIR=tests/fixtures/tiny_models uvicorn backend.app.main:app --reload --port 8000`
Expected: `models_ready=true` from `GET /api/health`.

- [ ] **Step 2: Start frontend**

Run (new terminal): `cd frontend && npm run dev`

- [ ] **Step 3: Submit a quote**

Open `http://localhost:5173/`, fill out required fields, click "Generate estimate". Open devtools network tab, inspect the `POST /api/quote/single` response body:
- `body.prediction.total_p50` is a number.
- `body.drivers` is a non-empty array, each entry has `operation` and either populated `drivers` or `available=false`.
- `body.neighbors` is an array of up to 5 items with `project_name`, `actual_hours`, `similarity`.

- [ ] **Step 4: No commit** (manual verification).

---

## Task 13: Final verification gate

**Files:**
- No file changes.

- [ ] **Step 1: Backend tests**

Run: `pytest -v`
Expected: all tests PASS. No regressions outside new tests.

- [ ] **Step 2: Frontend typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 3: Server boot + health**

Run: `DATA_DIR=tests/fixtures/tiny_models uvicorn backend.app.main:app --port 8001 &` (background) then `curl -s http://localhost:8001/api/health`
Expected: `{"status":"ok","models_ready":true}`. Kill the background server afterward.

- [ ] **Step 4: No commit.** Plan A complete.

---

## Post-plan follow-ups (not part of Plan A)

- The frontend UI still renders the old single-column Single Quote layout — consuming the new `drivers` and `neighbors` fields is Plan B's job.
- Train-time calibration points and per-run history are not yet persisted — Plan E flags this as a prerequisite and degrades gracefully until wired.

---

## Plan summary

- 13 tasks total.
- Net new Python file: `backend/app/explain.py` (~300 LOC).
- Net new frontend types: 4.
- Net new tests: 2 files, ~6 tests.
- All amber utility classes removed from the app.
- Core/service untouched; no `CC_ALLOW_CORE_EDIT` needed.
- Rollback: revert the commits. No data migrations, no schema drops.
