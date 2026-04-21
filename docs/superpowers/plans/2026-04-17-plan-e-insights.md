# Plan E — Insights: Executive Overview + Expanded Estimate Accuracy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/performance` into a calibration-and-trust dashboard (headline KPIs, MAPE by operation, confidence calibration scatter, training-history line). Add `/insights` Executive Overview with activity KPIs, weekly-quotes chart, latest-saved list, and an accuracy-by-op heatmap. Add three new backend endpoints that degrade gracefully when training snapshots aren't yet persisted.

**Architecture:** Backend adds `routes/insights.py` hosting `GET /api/metrics/history`, `GET /api/metrics/calibration`, and `GET /api/insights/overview`. Data sources: existing `metrics_summary.csv` (current run) + new optional `metrics_history.parquet` (per-run snapshots) + new optional `calibration.parquet` (predicted vs actual points). If the optional files are missing, endpoints return `[]` and the frontend renders muted empty-states. A follow-up plan can wire the training pipeline to persist snapshots.

**Tech Stack:** FastAPI, pandas, Recharts, Tailwind.

**Spec reference:** `docs/superpowers/specs/2026-04-17-estimator-cockpit-redesign-design.md` — Section 7 (Executive Overview & expanded Estimate Accuracy).

**Prerequisites:**
- Plan A merged (palette live).
- Plan C merged (`/api/quotes` used by Executive Overview for activity count + latest list).

---

## File structure

**Modified:**
- `backend/app/schemas_api.py` — new response models.
- `backend/app/routes/metrics.py` — add history + calibration endpoints.
- `backend/app/main.py` — include new router.
- `backend/app/paths.py` — `metrics_history_path()`, `calibration_path()`.
- `frontend/src/App.tsx` — route `/insights`.
- `frontend/src/components/Layout.tsx` — INSIGHTS group includes Executive Overview.
- `frontend/src/pages/ModelPerformance.tsx` — expanded dashboard.
- `frontend/src/api/quote.ts` — `useMetricsHistory`, `useCalibration`, `useInsightsOverview`.
- `frontend/src/api/types.ts` — new response types.

**Created:**
- `backend/app/routes/insights.py` — new router for `/api/insights/overview`.
- `backend/app/insights.py` — pure-function aggregators (testable without the route).
- `frontend/src/pages/ExecutiveOverview.tsx`.
- `frontend/src/pages/performance/HeadlineKPIs.tsx`.
- `frontend/src/pages/performance/MapeByOperation.tsx`.
- `frontend/src/pages/performance/CalibrationScatter.tsx`.
- `frontend/src/pages/performance/TrainingHistoryChart.tsx`.
- `frontend/src/pages/insights/KpiCards.tsx`.
- `frontend/src/pages/insights/QuotesActivityChart.tsx`.
- `frontend/src/pages/insights/LatestQuotesTable.tsx`.
- `frontend/src/pages/insights/AccuracyHeatmap.tsx`.
- `tests/test_insights.py`.

**Not touched:** `core/`, `service/`, admin, cockpit.

---

## Task 1: Paths for new optional files

**Files:**
- Modify: `backend/app/paths.py`

- [ ] **Step 1: Add helpers**

```python
def metrics_history_path() -> Path:
    return models_dir() / "metrics_history.parquet"

def calibration_path() -> Path:
    return models_dir() / "calibration.parquet"
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/paths.py
git commit -m "feat(api): path helpers for metrics_history.parquet and calibration.parquet"
```

---

## Task 2: Insights response schemas

**Files:**
- Modify: `backend/app/schemas_api.py`

- [ ] **Step 1: Append**

```python
class MapeRow(BaseModel):
    operation: str
    mape: float
    rows: int | None = None


class CalibrationPoint(BaseModel):
    predicted_low: float
    predicted_high: float
    actual: float
    inside_band: bool


class TrainingRunRow(BaseModel):
    run_id: str
    trained_at: datetime
    rows: int
    overall_mape: float


class PerformanceHeadline(BaseModel):
    overall_mape: float | None = None
    within_10_pct: float | None = None
    within_20_pct: float | None = None
    last_trained_at: datetime | None = None
    rows_at_train: int | None = None


class InsightsOverview(BaseModel):
    active_quotes_30d: int
    models_trained: int
    models_target: int
    overall_mape: float | None
    calibration_within_band_pct: float | None
    quotes_activity: list[tuple[str, int]]   # (iso week start, count)
    latest_quotes: list[SavedQuoteSummary]
    accuracy_heatmap: list[list[float | None]]   # rows = operations, cols = quarters
    operations: list[str]
    quarters: list[str]
```

Extend `__all__` with `"MapeRow", "CalibrationPoint", "TrainingRunRow", "PerformanceHeadline", "InsightsOverview"`.

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas_api.py
git commit -m "feat(api): insights response schemas"
```

---

## Task 3: `backend/app/insights.py` pure aggregators

**Files:**
- Create: `backend/app/insights.py`
- Create: `tests/test_insights.py`

- [ ] **Step 1: Write test**

```python
# tests/test_insights.py
from __future__ import annotations
import pandas as pd
import pytest


def test_weekly_quotes_empty_returns_zero_weeks():
    from backend.app.insights import weekly_quotes_activity
    out = weekly_quotes_activity(pd.DataFrame(columns=["created_at"]), weeks=26)
    assert len(out) == 26
    assert all(count == 0 for _, count in out)


def test_weekly_quotes_counts_rows_per_week():
    from backend.app.insights import weekly_quotes_activity
    df = pd.DataFrame({
        "created_at": [
            "2026-04-07T00:00:00", "2026-04-08T00:00:00",  # same ISO week
            "2026-04-14T00:00:00",
        ],
    })
    out = weekly_quotes_activity(df, weeks=4, end=pd.Timestamp("2026-04-17"))
    counts = dict(out)
    assert counts.get("2026-W15", 0) == 2
    assert counts.get("2026-W16", 0) == 1


def test_accuracy_heatmap_handles_missing_history():
    from backend.app.insights import accuracy_heatmap
    ops, quarters, matrix = accuracy_heatmap(None)
    assert ops == []
    assert quarters == []
    assert matrix == []
```

- [ ] **Step 2: Run to see fail**

Run: `pytest tests/test_insights.py -v`
Expected: import error for `backend.app.insights`.

- [ ] **Step 3: Implement**

```python
# backend/app/insights.py
"""Pure-function aggregators used by the insights routes.

All functions tolerate missing data (return empty/None) so the frontend
can render empty-states while training-pipeline persistence is being wired.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

import pandas as pd


def weekly_quotes_activity(
    quotes: pd.DataFrame,
    weeks: int = 26,
    end: pd.Timestamp | None = None,
) -> list[tuple[str, int]]:
    end = pd.Timestamp(end) if end is not None else pd.Timestamp.utcnow()
    end_week = end.to_period("W-SUN")
    start_week = end_week - (weeks - 1)
    all_weeks = [(start_week + i).to_timestamp().strftime("%G-W%V") for i in range(weeks)]

    if quotes.empty or "created_at" not in quotes.columns:
        return [(w, 0) for w in all_weeks]

    s = pd.to_datetime(quotes["created_at"], errors="coerce").dropna()
    labels = s.dt.strftime("%G-W%V")
    counts = labels.value_counts().to_dict()
    return [(w, int(counts.get(w, 0))) for w in all_weeks]


def active_quotes_last_n_days(quotes: pd.DataFrame, n: int = 30) -> int:
    if quotes.empty or "created_at" not in quotes.columns:
        return 0
    s = pd.to_datetime(quotes["created_at"], errors="coerce").dropna()
    cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=n)
    return int((s >= cutoff).sum())


def accuracy_heatmap(
    history: pd.DataFrame | None,
) -> tuple[list[str], list[str], list[list[float | None]]]:
    """Build a rows=operation × cols=quarter matrix of MAPE values.

    Expects history with columns `operation`, `quarter` (e.g. '2026Q1'), `mape`.
    When the history source is missing or empty, returns empty lists.
    """
    if history is None or history.empty:
        return [], [], []

    required = {"operation", "quarter", "mape"}
    if not required.issubset(history.columns):
        return [], [], []

    ops = sorted(history["operation"].dropna().unique().tolist())
    quarters = sorted(history["quarter"].dropna().unique().tolist())
    matrix: list[list[float | None]] = []
    for op in ops:
        row_vals: list[float | None] = []
        for q in quarters:
            cell = history[(history["operation"] == op) & (history["quarter"] == q)]
            row_vals.append(float(cell["mape"].mean()) if not cell.empty else None)
        matrix.append(row_vals)
    return ops, quarters, matrix


def calibration_within_band_pct(calibration: pd.DataFrame | None) -> float | None:
    if calibration is None or calibration.empty:
        return None
    inside = calibration["inside_band"].mean() if "inside_band" in calibration.columns else None
    return float(inside * 100) if inside is not None else None
```

- [ ] **Step 4: Run the tests**

Run: `pytest tests/test_insights.py -v`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/insights.py tests/test_insights.py
git commit -m "feat(api): insights pure-function aggregators (weekly activity, heatmap, calibration %)"
```

---

## Task 4: Metrics history + calibration endpoints

**Files:**
- Modify: `backend/app/routes/metrics.py`

- [ ] **Step 1: Append endpoints**

```python
import pandas as pd
from ..paths import calibration_path, metrics_history_path
from ..schemas_api import (
    CalibrationPoint,
    MapeRow,
    PerformanceHeadline,
    TrainingRunRow,
)


@router.get("/metrics/history", response_model=list[TrainingRunRow])
def metrics_history() -> list[TrainingRunRow]:
    path = metrics_history_path()
    if not path.exists():
        return []
    df = pd.read_parquet(path)
    rows: list[TrainingRunRow] = []
    for r in df.sort_values("trained_at").to_dict(orient="records"):
        rows.append(TrainingRunRow(
            run_id=str(r.get("run_id", "")),
            trained_at=pd.to_datetime(r["trained_at"]).to_pydatetime(),
            rows=int(r.get("rows", 0) or 0),
            overall_mape=float(r.get("overall_mape", 0) or 0),
        ))
    return rows


@router.get("/metrics/calibration", response_model=list[CalibrationPoint])
def metrics_calibration() -> list[CalibrationPoint]:
    path = calibration_path()
    if not path.exists():
        return []
    df = pd.read_parquet(path)
    out: list[CalibrationPoint] = []
    for r in df.to_dict(orient="records"):
        low  = float(r.get("predicted_low",  0) or 0)
        high = float(r.get("predicted_high", 0) or 0)
        actual = float(r.get("actual", 0) or 0)
        out.append(CalibrationPoint(
            predicted_low=low,
            predicted_high=high,
            actual=actual,
            inside_band=(low <= actual <= high),
        ))
    return out


@router.get("/metrics/headline", response_model=PerformanceHeadline)
def metrics_headline() -> PerformanceHeadline:
    head = PerformanceHeadline()
    cur = storage.read_metrics()
    if cur is not None and not cur.empty:
        if "mae" in cur.columns and cur["mae"].notna().any():
            # If we only have mae and not mape, leave overall_mape None.
            pass
        if "mape" in cur.columns and cur["mape"].notna().any():
            head.overall_mape = float(cur["mape"].mean())
    path = calibration_path()
    if path.exists():
        df = pd.read_parquet(path)
        if not df.empty and {"predicted_low","predicted_high","actual"}.issubset(df.columns):
            inside = ((df["predicted_low"] <= df["actual"]) & (df["actual"] <= df["predicted_high"])).mean()
            within_10 = ((df["actual"] - ((df["predicted_low"] + df["predicted_high"]) / 2)).abs()
                        / df["actual"].replace(0, pd.NA)).dropna().lt(0.10).mean()
            within_20 = ((df["actual"] - ((df["predicted_low"] + df["predicted_high"]) / 2)).abs()
                        / df["actual"].replace(0, pd.NA)).dropna().lt(0.20).mean()
            head.within_10_pct = float(within_10 * 100) if pd.notna(within_10) else None
            head.within_20_pct = float(within_20 * 100) if pd.notna(within_20) else None
    hist_path = metrics_history_path()
    if hist_path.exists():
        hdf = pd.read_parquet(hist_path)
        if not hdf.empty and "trained_at" in hdf.columns:
            last = pd.to_datetime(hdf["trained_at"]).max()
            head.last_trained_at = last.to_pydatetime()
    return head
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routes/metrics.py
git commit -m "feat(api): /api/metrics/history, /metrics/calibration, /metrics/headline endpoints (degrade gracefully)"
```

---

## Task 5: Insights overview endpoint

**Files:**
- Create: `backend/app/routes/insights.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the router**

```python
# backend/app/routes/insights.py
from __future__ import annotations

import pandas as pd
from fastapi import APIRouter

from .. import insights, quotes_storage, storage
from ..paths import calibration_path, metrics_history_path
from ..schemas_api import InsightsOverview


router = APIRouter(prefix="/api/insights", tags=["insights"])


MODELS_TARGET = 12


@router.get("/overview", response_model=InsightsOverview)
def overview() -> InsightsOverview:
    quotes_df = _quotes_as_df()

    calibration_df = pd.read_parquet(calibration_path()) if calibration_path().exists() else None
    history_df = pd.read_parquet(metrics_history_path()) if metrics_history_path().exists() else None

    cur = storage.read_metrics()
    overall_mape = None
    if cur is not None and not cur.empty and "mape" in cur.columns and cur["mape"].notna().any():
        overall_mape = float(cur["mape"].mean())

    models_trained = int(len(cur)) if cur is not None else 0

    ops, quarters, matrix = insights.accuracy_heatmap(history_df)

    latest = quotes_storage.list_all(limit=5, offset=0).rows

    return InsightsOverview(
        active_quotes_30d=insights.active_quotes_last_n_days(quotes_df, n=30),
        models_trained=models_trained,
        models_target=MODELS_TARGET,
        overall_mape=overall_mape,
        calibration_within_band_pct=insights.calibration_within_band_pct(calibration_df),
        quotes_activity=insights.weekly_quotes_activity(quotes_df, weeks=26),
        latest_quotes=latest,
        accuracy_heatmap=matrix,
        operations=ops,
        quarters=quarters,
    )


def _quotes_as_df() -> pd.DataFrame:
    from ..paths import quotes_parquet_path
    path = quotes_parquet_path()
    if not path.exists():
        return pd.DataFrame(columns=["created_at"])
    return pd.read_parquet(path)
```

- [ ] **Step 2: Include router in `main.py`**

```python
from .routes import admin, insights, metrics, quote, quotes

app.include_router(insights.router)
```

- [ ] **Step 3: Test**

Add to `tests/test_insights.py`:

```python
def test_overview_endpoint_degrades_when_nothing_exists(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from importlib import reload
    from backend.app import main, paths
    reload(paths); reload(main)
    from fastapi.testclient import TestClient
    client = TestClient(main.app)
    r = client.get("/api/insights/overview")
    assert r.status_code == 200
    body = r.json()
    assert body["active_quotes_30d"] == 0
    assert body["quotes_activity"] and len(body["quotes_activity"]) == 26
    assert body["latest_quotes"] == []
    assert body["accuracy_heatmap"] == []
```

Run: `pytest tests/test_insights.py -v`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes/insights.py backend/app/main.py tests/test_insights.py
git commit -m "feat(api): GET /api/insights/overview aggregates quotes activity + calibration + heatmap"
```

---

## Task 6: Frontend API hooks + types

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/quote.ts`

- [ ] **Step 1: Types**

Append to `frontend/src/api/types.ts`:

```ts
export type MapeRow       = { operation: string; mape: number; rows: number | null };
export type CalibrationPoint = { predicted_low: number; predicted_high: number; actual: number; inside_band: boolean };
export type TrainingRunRow = { run_id: string; trained_at: string; rows: number; overall_mape: number };
export type PerformanceHeadline = {
  overall_mape: number | null;
  within_10_pct: number | null;
  within_20_pct: number | null;
  last_trained_at: string | null;
  rows_at_train: number | null;
};
export type InsightsOverview = {
  active_quotes_30d: number;
  models_trained: number;
  models_target: number;
  overall_mape: number | null;
  calibration_within_band_pct: number | null;
  quotes_activity: [string, number][];
  latest_quotes: SavedQuoteSummary[];
  accuracy_heatmap: (number | null)[][];
  operations: string[];
  quarters: string[];
};
```

- [ ] **Step 2: Hooks**

Append to `frontend/src/api/quote.ts`:

```ts
import {
  CalibrationPoint,
  InsightsOverview,
  PerformanceHeadline,
  TrainingRunRow,
} from "@/api/types";

export function useMetricsHistory() {
  return useQuery<TrainingRunRow[]>({
    queryKey: ["metricsHistory"],
    queryFn: async () => (await api.get<TrainingRunRow[]>("/metrics/history")).data,
  });
}
export function useCalibration() {
  return useQuery<CalibrationPoint[]>({
    queryKey: ["calibration"],
    queryFn: async () => (await api.get<CalibrationPoint[]>("/metrics/calibration")).data,
  });
}
export function usePerformanceHeadline() {
  return useQuery<PerformanceHeadline>({
    queryKey: ["performanceHeadline"],
    queryFn: async () => (await api.get<PerformanceHeadline>("/metrics/headline")).data,
  });
}
export function useInsightsOverview() {
  return useQuery<InsightsOverview>({
    queryKey: ["insightsOverview"],
    queryFn: async () => (await api.get<InsightsOverview>("/insights/overview")).data,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api
git commit -m "feat(insights): frontend types + hooks for metrics history, calibration, and overview"
```

---

## Task 7: Performance page sub-components

**Files:**
- Create: `frontend/src/pages/performance/HeadlineKPIs.tsx`
- Create: `frontend/src/pages/performance/MapeByOperation.tsx`
- Create: `frontend/src/pages/performance/CalibrationScatter.tsx`
- Create: `frontend/src/pages/performance/TrainingHistoryChart.tsx`

- [ ] **Step 1: Headline KPIs**

```tsx
// frontend/src/pages/performance/HeadlineKPIs.tsx
import { PerformanceHeadline } from "@/api/types";

function KPI({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  const txt = value == null ? "—" : `${value.toFixed(1)}${suffix ?? ""}`;
  return (
    <div className="card p-4">
      <div className="text-[10px] tracking-widest text-muted font-semibold uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold numeric tabular-nums text-ink">{txt}</div>
    </div>
  );
}

export function HeadlineKPIs({ head }: { head: PerformanceHeadline | undefined }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <KPI label="Overall MAPE" value={head?.overall_mape ?? null} suffix="%" />
      <KPI label="Within ±10%"  value={head?.within_10_pct ?? null} suffix="%" />
      <KPI label="Within ±20%"  value={head?.within_20_pct ?? null} suffix="%" />
    </div>
  );
}
```

- [ ] **Step 2: MAPE by op (derived from metrics summary for now)**

```tsx
// frontend/src/pages/performance/MapeByOperation.tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricRow } from "@/api/types";

export function MapeByOperation({ rows }: { rows: MetricRow[] }) {
  // Prefer mape if present in metrics_summary.csv, else degrade to mae bars.
  const anyMape = rows.some((r) => "mape" in r && (r as unknown as { mape?: number }).mape != null);
  const data = rows.map((r) => ({
    op: r.target.replace(/_hours$/, ""),
    mape: anyMape ? (r as unknown as { mape?: number }).mape ?? 0 : (r.mae ?? 0),
  })).sort((a, b) => b.mape - a.mape);

  if (data.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        No training metrics yet. Once the models are trained, per-operation accuracy appears here.
      </div>
    );
  }

  return (
    <div className="card p-4 h-72">
      <div className="text-xs tracking-widest text-muted uppercase mb-2">
        {anyMape ? "MAPE by operation (%)" : "MAE by operation (hours)"}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="op" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="mape" fill="#2563EB" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Calibration scatter**

```tsx
// frontend/src/pages/performance/CalibrationScatter.tsx
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { CalibrationPoint } from "@/api/types";

export function CalibrationScatter({ points }: { points: CalibrationPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Calibration data isn't available yet. Persist predicted vs actual points during training to populate this chart.
      </div>
    );
  }
  const inside = points.filter((p) => p.inside_band).map((p) => ({
    mid: (p.predicted_low + p.predicted_high) / 2,
    actual: p.actual,
  }));
  const outside = points.filter((p) => !p.inside_band).map((p) => ({
    mid: (p.predicted_low + p.predicted_high) / 2,
    actual: p.actual,
  }));

  return (
    <div className="card p-4 h-80">
      <div className="text-xs tracking-widest text-muted uppercase mb-2">Confidence calibration</div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid />
          <XAxis type="number" dataKey="mid" name="Predicted (mid)" tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="actual" name="Actual"       tick={{ fontSize: 11 }} />
          <ZAxis range={[50, 50]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Inside 90% band"   data={inside}  fill="#0F766E" />
          <Scatter name="Outside 90% band"  data={outside} fill="#B45309" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Training-history line**

```tsx
// frontend/src/pages/performance/TrainingHistoryChart.tsx
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrainingRunRow } from "@/api/types";

export function TrainingHistoryChart({ rows }: { rows: TrainingRunRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Training history isn't persisted yet. Once each training run writes a snapshot, this chart shows MAPE over time.
      </div>
    );
  }
  const data = rows.map((r) => ({
    date: new Date(r.trained_at).toLocaleDateString(),
    mape: r.overall_mape,
    rows: r.rows,
  }));
  return (
    <div className="card p-4 h-72">
      <div className="text-xs tracking-widest text-muted uppercase mb-2">Training history</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line dataKey="mape" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/performance
git commit -m "feat(perf): KPI tiles, MAPE-by-op, calibration scatter, training history sub-components"
```

---

## Task 8: Expand `ModelPerformance.tsx`

**Files:**
- Modify: `frontend/src/pages/ModelPerformance.tsx`

- [ ] **Step 1: Replace body**

```tsx
import {
  useCalibration, useMetricsHistory, usePerformanceHeadline,
} from "@/api/quote";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { MetricsSummary } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

import { HeadlineKPIs } from "./performance/HeadlineKPIs";
import { MapeByOperation } from "./performance/MapeByOperation";
import { CalibrationScatter } from "./performance/CalibrationScatter";
import { TrainingHistoryChart } from "./performance/TrainingHistoryChart";


export function ModelPerformance() {
  const { data: summary }    = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => (await api.get<MetricsSummary>("/metrics")).data,
  });
  const { data: headline }   = usePerformanceHeadline();
  const { data: calibration} = useCalibration();
  const { data: history }    = useMetricsHistory();

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Estimate Accuracy"
        description="How well the model predicts actuals across operations, confidence bands, and training runs."
      />
      <div className="mt-6 space-y-6">
        <HeadlineKPIs head={headline} />
        <MapeByOperation rows={summary?.metrics ?? []} />
        <CalibrationScatter points={calibration ?? []} />
        <TrainingHistoryChart rows={history ?? []} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ModelPerformance.tsx
git commit -m "feat(perf): expanded Estimate Accuracy page with headline KPIs + scatter + history"
```

---

## Task 9: Executive Overview sub-components

**Files:**
- Create: `frontend/src/pages/insights/KpiCards.tsx`
- Create: `frontend/src/pages/insights/QuotesActivityChart.tsx`
- Create: `frontend/src/pages/insights/LatestQuotesTable.tsx`
- Create: `frontend/src/pages/insights/AccuracyHeatmap.tsx`

- [ ] **Step 1: KPI cards**

```tsx
// frontend/src/pages/insights/KpiCards.tsx
import { InsightsOverview } from "@/api/types";

function Card({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] tracking-widest text-muted font-semibold uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold numeric tabular-nums text-ink">
        {value}{suffix ? <span className="text-sm text-muted ml-1">{suffix}</span> : null}
      </div>
    </div>
  );
}

export function KpiCards({ data }: { data: InsightsOverview | undefined }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Active quotes (30d)" value={(data?.active_quotes_30d ?? 0).toString()} />
      <Card label="Models trained" value={`${data?.models_trained ?? 0}/${data?.models_target ?? 12}`} />
      <Card label="Overall MAPE" value={data?.overall_mape != null ? data.overall_mape.toFixed(1) : "—"} suffix={data?.overall_mape != null ? "%" : ""} />
      <Card label="Confidence calibration" value={data?.calibration_within_band_pct != null ? data.calibration_within_band_pct.toFixed(1) : "—"} suffix={data?.calibration_within_band_pct != null ? "%" : ""} />
    </div>
  );
}
```

- [ ] **Step 2: Activity chart**

```tsx
// frontend/src/pages/insights/QuotesActivityChart.tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function QuotesActivityChart({ rows }: { rows: [string, number][] }) {
  const data = rows.map(([week, count]) => ({ week, count }));
  return (
    <div className="card p-4 h-64">
      <div className="text-xs tracking-widest text-muted uppercase mb-2">Quotes per week (last 26)</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#2563EB" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Latest quotes**

```tsx
// frontend/src/pages/insights/LatestQuotesTable.tsx
import { Link } from "react-router-dom";
import { SavedQuoteSummary } from "@/api/types";

function fmt(n: number) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n); }

export function LatestQuotesTable({ rows }: { rows: SavedQuoteSummary[] }) {
  if (rows.length === 0) {
    return <div className="card p-6 text-sm text-muted">No saved quotes yet.</div>;
  }
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Project</th>
            <th className="px-3 py-2 text-right">Hours</th>
            <th className="px-3 py-2">Saved</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 border-border">
              <td className="px-3 py-2 text-ink">{r.name}</td>
              <td className="px-3 py-2 text-muted">{r.project_name}</td>
              <td className="px-3 py-2 text-right numeric tabular-nums text-ink">{fmt(r.hours)}</td>
              <td className="px-3 py-2 text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border p-3 text-right">
        <Link to="/quotes" className="text-sm text-brand hover:underline">See all saved quotes →</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Heatmap**

```tsx
// frontend/src/pages/insights/AccuracyHeatmap.tsx
export function AccuracyHeatmap({
  operations, quarters, matrix,
}: {
  operations: string[];
  quarters: string[];
  matrix: (number | null)[][];
}) {
  if (operations.length === 0 || quarters.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Accuracy heatmap populates once per-quarter training history is persisted.
      </div>
    );
  }

  const all = matrix.flat().filter((v): v is number => v != null);
  const max = all.length ? Math.max(...all) : 1;

  const color = (v: number | null): string => {
    if (v == null) return "#F6F8FB";
    const t = Math.min(1, v / Math.max(max, 1));
    // 0 = lightest, 1 = darkest brand
    const shades = ["#DBEAFE", "#BFDBFE", "#93C5FD", "#60A5FA", "#2563EB"];
    return shades[Math.min(shades.length - 1, Math.floor(t * shades.length))];
  };

  return (
    <div className="card p-4">
      <div className="text-xs tracking-widest text-muted uppercase mb-3">MAPE by op × quarter</div>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th />
              {quarters.map((q) => <th key={q} className="px-2 py-1 text-muted font-medium">{q}</th>)}
            </tr>
          </thead>
          <tbody>
            {operations.map((op, r) => (
              <tr key={op}>
                <td className="pr-3 py-1 text-right text-muted whitespace-nowrap">{op}</td>
                {matrix[r].map((v, c) => (
                  <td
                    key={c}
                    title={v == null ? "no data" : `${v.toFixed(1)}%`}
                    style={{ background: color(v) }}
                    className="w-12 h-7 border border-border"
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/insights
git commit -m "feat(insights): KPI cards, activity chart, latest-quotes, accuracy heatmap components"
```

---

## Task 10: Executive Overview page + route

**Files:**
- Create: `frontend/src/pages/ExecutiveOverview.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Page**

```tsx
// frontend/src/pages/ExecutiveOverview.tsx
import { useInsightsOverview } from "@/api/quote";
import { PageHeader } from "@/components/PageHeader";

import { KpiCards } from "./insights/KpiCards";
import { QuotesActivityChart } from "./insights/QuotesActivityChart";
import { LatestQuotesTable } from "./insights/LatestQuotesTable";
import { AccuracyHeatmap } from "./insights/AccuracyHeatmap";

export function ExecutiveOverview() {
  const { data } = useInsightsOverview();

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Executive Overview"
        description="Pipeline activity, model accuracy, and per-operation trends at a glance."
      />
      <div className="mt-6 space-y-6">
        <KpiCards data={data} />
        <QuotesActivityChart rows={data?.quotes_activity ?? []} />
        <LatestQuotesTable rows={data?.latest_quotes ?? []} />
        <AccuracyHeatmap
          operations={data?.operations ?? []}
          quarters={data?.quarters ?? []}
          matrix={data?.accuracy_heatmap ?? []}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Route**

In `frontend/src/App.tsx`:

```tsx
import { ExecutiveOverview } from "@/pages/ExecutiveOverview";

<Route path="insights" element={<ExecutiveOverview />} />
```

- [ ] **Step 3: Nav group update**

In `frontend/src/components/Layout.tsx`, add to the INSIGHTS group:

```tsx
{
  label: "INSIGHTS",
  items: [
    { to: "/performance", label: "Estimate Accuracy", icon: Target },
    { to: "/insights",    label: "Executive Overview", icon: LayoutDashboard },
  ],
},
```

- [ ] **Step 4: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ExecutiveOverview.tsx frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat(insights): /insights Executive Overview page wired into INSIGHTS nav"
```

---

## Task 11: Final verification gate

- [ ] **Step 1: Tests**

Run: `pytest -v && cd frontend && npm run typecheck && npm run build && npm test`
Expected: all PASS.

- [ ] **Step 2: Manual smoke**

- Navigate to `/performance`. Headline KPIs show (some values may be `—`). MAPE-by-op bars appear if metrics_summary.csv has data. Calibration scatter and training history render empty-states when optional files absent.
- Navigate to `/insights`. Four KPI cards, 26-week bar chart (zeros if no quotes), latest-quotes empty-state, heatmap empty-state.
- Save a quote via cockpit → Executive Overview reflects it in Latest Quotes and bumps Active quotes (30d).

- [ ] **Step 3: No commit.** Plan E complete.

---

## Plan summary

- 11 tasks.
- 1 backend aggregator module, 1 new route module, 4 new endpoints (`/metrics/history`, `/metrics/calibration`, `/metrics/headline`, `/insights/overview`).
- 8 new frontend sub-components, 2 new pages, 4 new hooks.
- All insights endpoints degrade gracefully — no dependency on a not-yet-persisted training history.
- Follow-up (not this plan): wire the training pipeline to persist `metrics_history.parquet` and `calibration.parquet` so these endpoints return real data.
- Rollback: revert commits; optional files are untouched.
