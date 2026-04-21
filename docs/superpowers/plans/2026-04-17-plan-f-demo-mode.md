# Plan F — Demo Mode & Nav Polish

> **Status: Shipped 2026-04-17** (branch `feat/scaffold-and-single-quote`).

## Post-implementation drift

Five deviations from the plan body, recorded for reference:

1. **`generate_demo_assets.py` training path corrected.** Plan called `service.train_lib.train_all_operations` — that module does not exist. Replaced with a `core.models.train_one_op` loop over `core.config.TARGETS`, matching the pattern already established in `scripts/build_test_fixtures.py`.
2. **`inside_band` column added to `calibration.parquet`.** `backend/app/insights.py::calibration_within_band_pct` requires this column to compute the KPI; plan's `write_calibration` omitted it.
3. **TARGETS codes used in `metrics_history.parquet`.** The `operation` column uses actual TARGETS codes (e.g. `me10_actual_hours`) rather than the plan's friendly labels (`mechanical_hours`), so the accuracy heatmap in `insights.py` matches what a real training run produces.
4. **`UserPill` uses `getDisplayName()` on mount, not `ensureDisplayName()`.** Using `ensureDisplayName()` would auto-prompt every user on every page load. Changed to read silently on mount and prompt only on click.
5. **`Layout.tsx` gained a minimal mobile top bar.** The plan wired chip + pill only into the desktop row; a lightweight mobile top bar (brand text + chip + pill, no hamburger) was also added so the demo chip is visible on small viewports.

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable a one-command demo (`ENABLE_DEMO=1`) that seeds `DATA_DIR` with a synthetic dataset + pretrained models so every screen is demoable without a real client dataset. Add a user pill and demo-mode chip to the global layout. Add an admin "Load demo data" button that also triggers the seed at runtime (refuses if real data is present).

**Architecture:** A committed `demo_assets/` directory contains a synthetic master parquet, pretrained joblib bundles (produced by the real training pipeline), `metrics_summary.csv`, and optionally `metrics_history.parquet` + `calibration.parquet`. A new `backend/app/demo.py` module decides whether/when to seed. Startup seeds when `ENABLE_DEMO=1` and `DATA_DIR` is empty. An admin endpoint seeds on demand. A `status.json` flag in `DATA_DIR` records the demo state so the frontend can render a chip.

**Tech Stack:** Python 3.11, pandas, joblib, FastAPI, React.

**Spec reference:** `docs/superpowers/specs/2026-04-17-estimator-cockpit-redesign-design.md` — Section 9 (Demo mode) + Section 2 (nav IA).

**Prerequisites:**
- Plans A–E merged (stable features to demo).

---

## File structure

**Modified:**
- `backend/app/main.py` — call `demo.seed_if_enabled()` at startup.
- `backend/app/routes/admin.py` — add `POST /api/admin/demo/load`.
- `backend/app/schemas_api.py` — `DemoStatus`, `DemoLoadResponse`.
- `backend/app/routes/metrics.py` — add `GET /api/demo/status`.
- `backend/app/paths.py` — `status_json_path()`, `demo_assets_dir()`.
- `frontend/src/App.tsx` — ensure Compare + Insights routes present.
- `frontend/src/components/Layout.tsx` — QUOTES + INSIGHTS nav groups (if not already from Plans C/E), user pill, demo chip.
- `frontend/src/pages/UploadTrain.tsx` — "Load demo data" button.

**Created:**
- `backend/app/demo.py` — `seed_if_enabled()`, `seed_on_demand()`, `read_status()`.
- `scripts/generate_demo_assets.py` — one-time builder for `demo_assets/`.
- `demo_assets/` — committed directory:
  - `demo_assets/data/master/projects_master.parquet`
  - `demo_assets/models/*.joblib`
  - `demo_assets/models/metrics_summary.csv`
  - `demo_assets/models/metrics_history.parquet`  (optional but generated)
  - `demo_assets/models/calibration.parquet`      (optional but generated)
- `frontend/src/components/DemoChip.tsx`.
- `frontend/src/components/UserPill.tsx`.
- `tests/test_demo_mode.py`.

**Not touched:** `core/`, `service/`, cockpit.

---

## Task 1: Paths additions

**Files:**
- Modify: `backend/app/paths.py`

- [ ] **Step 1: Append**

```python
def status_json_path() -> Path:
    return data_dir() / "status.json"

def demo_assets_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "demo_assets"
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/paths.py
git commit -m "feat(demo): status_json_path + demo_assets_dir helpers"
```

---

## Task 2: Demo status schemas

**Files:**
- Modify: `backend/app/schemas_api.py`

- [ ] **Step 1: Append**

```python
class DemoStatus(BaseModel):
    is_demo: bool = False
    enabled_env: bool = False
    has_real_data: bool = False


class DemoLoadResponse(BaseModel):
    loaded: bool
    reason: str | None = None
```

Extend `__all__` with `"DemoStatus", "DemoLoadResponse"`.

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas_api.py
git commit -m "feat(demo): response schemas"
```

---

## Task 3: `backend/app/demo.py`

**Files:**
- Create: `backend/app/demo.py`

- [ ] **Step 1: Implement**

```python
# backend/app/demo.py
"""Seed DATA_DIR with synthetic assets so the app is demoable without a real dataset.

Never seeds when real data already exists.
"""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from .paths import (
    demo_assets_dir,
    ensure_runtime_dirs,
    master_data_path,
    metrics_path,
    models_dir,
    status_json_path,
)


def _demo_enabled_env() -> bool:
    return os.environ.get("ENABLE_DEMO", "").strip() in ("1", "true", "yes")


def has_real_data() -> bool:
    return master_data_path().exists() or metrics_path().exists()


def read_status() -> dict:
    path = status_json_path()
    if not path.exists():
        return {"is_demo": False}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return {"is_demo": False}


def _write_status(is_demo: bool) -> None:
    path = status_json_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"is_demo": is_demo}))


def _copy_tree(src: Path, dst: Path) -> None:
    if not src.exists():
        return
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            _copy_tree(item, target)
        else:
            shutil.copy2(item, target)


def _seed() -> None:
    ensure_runtime_dirs()
    src = demo_assets_dir()
    if not src.exists():
        raise FileNotFoundError(
            "demo_assets/ is missing. Run scripts/generate_demo_assets.py."
        )
    # Copy data + models side of demo_assets into DATA_DIR.
    _copy_tree(src / "data", master_data_path().parent.parent)
    _copy_tree(src / "models", models_dir())
    _write_status(is_demo=True)


def seed_if_enabled() -> None:
    """Startup hook: seeds only when ENABLE_DEMO=1 and DATA_DIR has no real data."""
    if not _demo_enabled_env():
        return
    if has_real_data():
        return
    _seed()


def seed_on_demand() -> tuple[bool, str | None]:
    """Admin-button path. Refuses to clobber real data."""
    if has_real_data():
        return False, "Real data is already present; demo seed would clobber it."
    _seed()
    return True, None
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/demo.py
git commit -m "feat(demo): seed_if_enabled + seed_on_demand + status file"
```

---

## Task 4: Demo-status + admin seeding routes

**Files:**
- Modify: `backend/app/routes/metrics.py`
- Modify: `backend/app/routes/admin.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Status endpoint**

Append to `backend/app/routes/metrics.py`:

```python
from .. import demo
from ..schemas_api import DemoStatus


@router.get("/demo/status", response_model=DemoStatus)
def demo_status() -> DemoStatus:
    status = demo.read_status()
    return DemoStatus(
        is_demo=bool(status.get("is_demo", False)),
        enabled_env=demo._demo_enabled_env(),  # safe: read-only env probe
        has_real_data=demo.has_real_data(),
    )
```

- [ ] **Step 2: Admin-protected load endpoint**

Append to `backend/app/routes/admin.py`:

```python
from .. import demo
from ..schemas_api import DemoLoadResponse


@router.post("/demo/load", response_model=DemoLoadResponse)
def load_demo(...):  # keep existing admin auth dependency signature
    loaded, reason = demo.seed_on_demand()
    return DemoLoadResponse(loaded=loaded, reason=reason)
```

> Match the existing admin router's auth-dependency pattern (likely a `Depends(require_admin)` or similar). Do not bypass auth.

- [ ] **Step 3: Seed on startup**

In `backend/app/main.py`, inside `create_app()` after `ensure_runtime_dirs()`:

```python
from . import demo
demo.seed_if_enabled()
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes/metrics.py backend/app/routes/admin.py backend/app/main.py
git commit -m "feat(demo): status + load endpoints + startup seed hook"
```

---

## Task 5: `scripts/generate_demo_assets.py`

**Files:**
- Create: `scripts/generate_demo_assets.py`

- [ ] **Step 1: Implement**

This is effectively an extended version of the test-fixture script from Plan A. It produces both models and the history/calibration snapshots so Executive Overview and the accuracy dashboard populate.

```python
"""One-time builder for the committed demo_assets/ directory.

Run after any schema change to QuoteInput or after training-pipeline changes:
    python scripts/generate_demo_assets.py

Outputs (checked in):
    demo_assets/data/master/projects_master.parquet
    demo_assets/models/metrics_summary.csv
    demo_assets/models/*.joblib
    demo_assets/models/metrics_history.parquet
    demo_assets/models/calibration.parquet
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[1]
DEMO_ROOT = REPO_ROOT / "demo_assets"


def build_master(n: int = 300, seed: int = 11) -> pd.DataFrame:
    """Richer synthetic master than the test fixtures: ~300 rows, wider coverage."""
    from scripts.build_test_fixtures import build_synthetic_master  # reuse
    return build_synthetic_master(n)


def train_and_write_models(df: pd.DataFrame, out_models: Path) -> pd.DataFrame:
    out_models.mkdir(parents=True, exist_ok=True)
    os.environ["DATA_DIR"] = str(DEMO_ROOT)
    from service.train_lib import train_all_operations
    summary = train_all_operations(df)  # writes joblib files via DATA_DIR
    summary_df = pd.DataFrame(summary)
    summary_df.to_csv(out_models / "metrics_summary.csv", index=False)
    return summary_df


def write_metrics_history(out_models: Path) -> None:
    """Synthetic per-run history: 6 runs stepping down MAPE over the last 6 months."""
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
        })
    # Per-op × quarter expansion so the heatmap has data.
    ops = [
        "mechanical_hours","electrical_hours","controls_hours","robotics_hours",
        "assembly_hours","shipping_hours","install_hours","startup_hours",
        "engineering_hours","project_mgmt_hours","documentation_hours","misc_hours",
    ]
    rng = np.random.default_rng(7)
    quarters = ["2025Q3", "2025Q4", "2026Q1", "2026Q2"]
    heat_rows = []
    for op in ops:
        for q in quarters:
            heat_rows.append({
                "run_id": f"q-{q}-{op}",
                "trained_at": end.isoformat(),
                "rows": 0,
                "overall_mape": 0,
                "operation": op,
                "quarter": q,
                "mape": float(max(5.0, 12 + rng.normal(0, 3))),
            })
    pd.DataFrame(runs + heat_rows).to_parquet(out_models / "metrics_history.parquet", index=False)


def write_calibration(df: pd.DataFrame, out_models: Path) -> None:
    """Synthetic calibration points: predicted interval vs actual, ~90% inside band."""
    rng = np.random.default_rng(13)
    n = 120
    base = rng.uniform(400, 2000, n)
    width = base * rng.uniform(0.12, 0.28, n)
    low  = base - width / 2
    high = base + width / 2
    noise = rng.normal(0, width * 0.35, n)
    actual = base + noise
    pd.DataFrame({
        "predicted_low":  low,
        "predicted_high": high,
        "actual":         actual,
    }).to_parquet(out_models / "calibration.parquet", index=False)


def main() -> None:
    (DEMO_ROOT / "data" / "master").mkdir(parents=True, exist_ok=True)
    out_models = DEMO_ROOT / "models"
    out_models.mkdir(parents=True, exist_ok=True)

    sys.path.insert(0, str(REPO_ROOT))  # so `scripts.build_test_fixtures` resolves

    df = build_master()
    df.to_parquet(DEMO_ROOT / "data" / "master" / "projects_master.parquet", index=False)

    train_and_write_models(df, out_models)
    write_metrics_history(out_models)
    write_calibration(df, out_models)

    print(f"Wrote demo assets under {DEMO_ROOT}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Produce the demo assets**

Run: `python scripts/generate_demo_assets.py`
Expected: the `demo_assets/` tree is populated with parquet + joblibs + csv.

- [ ] **Step 3: Commit script + generated assets**

```bash
git add scripts/generate_demo_assets.py demo_assets/
git commit -m "feat(demo): generate_demo_assets script + committed synthetic assets"
```

---

## Task 6: Backend demo tests

**Files:**
- Create: `tests/test_demo_mode.py`

- [ ] **Step 1: Write tests**

```python
# tests/test_demo_mode.py
from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[1]
DEMO_ROOT = REPO_ROOT / "demo_assets"


@pytest.fixture()
def client_demo_env(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ENABLE_DEMO", "1")
    from importlib import reload
    from backend.app import demo, main, paths, storage
    reload(paths); reload(storage); reload(demo); reload(main)
    return TestClient(main.app)


@pytest.fixture()
def client_no_demo(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.delenv("ENABLE_DEMO", raising=False)
    from importlib import reload
    from backend.app import demo, main, paths, storage
    reload(paths); reload(storage); reload(demo); reload(main)
    return TestClient(main.app)


@pytest.mark.skipif(not DEMO_ROOT.exists(), reason="demo_assets not generated")
def test_startup_seeds_when_enabled(client_demo_env):
    r = client_demo_env.get("/api/health")
    assert r.status_code == 200
    assert r.json()["models_ready"] is True

    s = client_demo_env.get("/api/demo/status").json()
    assert s["is_demo"] is True


def test_no_seed_without_env(client_no_demo):
    r = client_no_demo.get("/api/health")
    assert r.status_code == 200
    assert r.json()["models_ready"] is False

    s = client_no_demo.get("/api/demo/status").json()
    assert s["is_demo"] is False
    assert s["enabled_env"] is False


@pytest.mark.skipif(not DEMO_ROOT.exists(), reason="demo_assets not generated")
def test_load_demo_refuses_when_real_data_present(tmp_path, monkeypatch):
    import pandas as pd
    from backend.app import paths
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from importlib import reload
    reload(paths)
    paths.master_data_path().parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({"x": [1]}).to_parquet(paths.master_data_path(), index=False)

    from backend.app import demo
    reload(demo)
    loaded, reason = demo.seed_on_demand()
    assert loaded is False
    assert reason and "clobber" in reason.lower()
```

- [ ] **Step 2: Run the tests**

Run: `pytest tests/test_demo_mode.py -v`
Expected: tests PASS (or `skipped` if `demo_assets/` isn't built locally; CI should build it before running tests).

- [ ] **Step 3: Commit**

```bash
git add tests/test_demo_mode.py
git commit -m "test(demo): startup seed, env-off safety, clobber refusal"
```

---

## Task 7: Demo chip + user pill

**Files:**
- Create: `frontend/src/components/DemoChip.tsx`
- Create: `frontend/src/components/UserPill.tsx`

- [ ] **Step 1: Demo chip**

```tsx
// frontend/src/components/DemoChip.tsx
import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

type Status = { is_demo: boolean; enabled_env: boolean; has_real_data: boolean };

export function DemoChip() {
  const { data } = useQuery<Status>({
    queryKey: ["demoStatus"],
    queryFn: async () => (await api.get<Status>("/demo/status")).data,
    refetchInterval: 60_000,
  });
  if (!data?.is_demo) return null;
  return (
    <div
      title="Demo data is loaded. Estimates and insights come from a synthetic dataset."
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-brand/30 bg-brand/10 text-brand text-[11px] font-semibold"
    >
      <Sparkles size={12} strokeWidth={1.75} />
      Demo mode
    </div>
  );
}
```

- [ ] **Step 2: User pill**

```tsx
// frontend/src/components/UserPill.tsx
import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { ensureDisplayName, setDisplayName } from "@/lib/displayName";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function UserPill() {
  const [name, setName] = useState<string>("");
  useEffect(() => { setName(ensureDisplayName()); }, []);
  return (
    <button
      type="button"
      onClick={() => {
        const next = prompt("Your display name (used to attribute quotes)", name) ?? "";
        if (next.trim()) {
          setDisplayName(next.trim());
          setName(next.trim());
        }
      }}
      className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
      aria-label="Edit display name"
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-subtle text-brand text-xs font-semibold">
        {initials(name || "Guest")}
      </span>
      <span className="hidden sm:inline">{name || "Set name"}</span>
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DemoChip.tsx frontend/src/components/UserPill.tsx
git commit -m "feat(nav): DemoChip + UserPill components"
```

---

## Task 8: Wire chip + pill into `Layout.tsx`

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Import + place in desktop top region**

Inside the `<main>` element, add a top row with demo chip + user pill:

```tsx
import { DemoChip } from "@/components/DemoChip";
import { UserPill } from "@/components/UserPill";

// at the top of <main>
<div className="flex items-center justify-end gap-3 px-4 sm:px-6 lg:px-10 pt-4">
  <DemoChip />
  <UserPill />
</div>
```

- [ ] **Step 2: Mobile top-bar — add pill next to the menu button**

```tsx
<div className="lg:hidden ... flex items-center justify-between ...">
  <BrandBlock isAdminRoute={isAdminRoute} />
  <div className="flex items-center gap-2">
    <DemoChip />
    <UserPill />
    <button aria-label="Open navigation" ...>...</button>
  </div>
</div>
```

- [ ] **Step 3: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "feat(nav): mount DemoChip + UserPill in the global layout"
```

---

## Task 9: Admin "Load demo data" button

**Files:**
- Modify: `frontend/src/pages/UploadTrain.tsx`

- [ ] **Step 1: Add the button + mutation**

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/api/client";

type Status = { is_demo: boolean; enabled_env: boolean; has_real_data: boolean };
type LoadResponse = { loaded: boolean; reason: string | null };

// inside the component:
const qc = useQueryClient();
const { data: status } = useQuery<Status>({
  queryKey: ["demoStatus"],
  queryFn: async () => (await api.get<Status>("/demo/status")).data,
});
const load = useMutation<LoadResponse, unknown, void>({
  mutationFn: async () => (await api.post<LoadResponse>("/admin/demo/load")).data,
  onSuccess: (r) => {
    if (r.loaded) {
      toast.success("Demo data loaded. Reload the app to see estimates.");
      qc.invalidateQueries();
    } else {
      toast.error(r.reason ?? "Could not load demo data.");
    }
  },
});

// render near the top of the page, before the real upload form:
<div className="card p-4 flex items-center justify-between">
  <div>
    <div className="text-[10px] tracking-widest text-muted font-semibold uppercase">Demo</div>
    <div className="text-ink text-sm">
      Load a synthetic dataset + pretrained models so every screen works.
    </div>
    {status?.has_real_data && (
      <div className="mt-1 text-xs text-warning">
        Real data is already present — demo load is disabled to avoid clobbering it.
      </div>
    )}
  </div>
  <button
    type="button"
    disabled={status?.has_real_data || load.isPending}
    onClick={() => load.mutate()}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-brand-foreground text-sm font-medium disabled:bg-steel-200 disabled:text-muted disabled:cursor-not-allowed"
  >
    <Sparkles size={16} strokeWidth={1.75} />
    Load demo data
  </button>
</div>
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/UploadTrain.tsx
git commit -m "feat(demo): admin 'Load demo data' button (disabled when real data is present)"
```

---

## Task 10: Final verification gate

- [ ] **Step 1: Tests**

Run: `pytest -v && cd frontend && npm run typecheck && npm run build && npm test`
Expected: all PASS.

- [ ] **Step 2: Local demo boot**

Run: `ENABLE_DEMO=1 DATA_DIR=$(pwd)/.tmp_demo uvicorn backend.app.main:app --port 8000`

Visit `http://localhost:8000` (or the frontend dev server proxied to it) and verify:
- **Demo mode** chip visible in the top-right of every page.
- Single Quote: submitting produces a full estimate with drivers + similar.
- Saved Quotes: save a scenario → list updates → PDF export works.
- Compare: two scenarios → headline + diff + grouped chart render.
- Estimate Accuracy: headline KPIs, MAPE-by-op, calibration scatter, training-history line all show real-looking data.
- Executive Overview: 4 KPI cards, weekly activity chart populates when saved quotes exist, accuracy heatmap shows per-op × quarter MAPE.
- Admin login → Upload & Train: "Load demo data" button disabled because real data was seeded.

- [ ] **Step 3: Production-mode sanity**

Run with `ENABLE_DEMO` unset and an empty `DATA_DIR`: app boots, `/api/health` shows `models_ready=false`, every customer-facing page shows the existing "Models not trained" empty-state, and no demo chip appears.

- [ ] **Step 4: No commit.** Plan F complete.

---

## Plan summary

- 10 tasks.
- 1 new backend module (`demo.py`), 1 new script, 1 committed `demo_assets/` tree, 3 new endpoints.
- 2 new frontend components, 1 admin button, Layout updated.
- Production behavior unchanged when `ENABLE_DEMO` is unset.
- Rollback: revert commits. Clearing `DATA_DIR` removes any previously-seeded demo state.

---

## Cross-plan close-out notes

After Plan F ships, all six plans are integrated. The **final "end-to-end verification"** (run once across the merged state):

1. `pytest -v` — all suites green.
2. `cd frontend && npm run typecheck && npm run build && npm test` — all green.
3. `uvicorn backend.app.main:app` boots, `GET /api/health` returns 200.
4. Fresh repo clone → `ENABLE_DEMO=1` → every page works end-to-end.
5. `docs/superpowers/specs/2026-04-17-estimator-cockpit-redesign-design.md` — every section has a corresponding task in plans A–F.
