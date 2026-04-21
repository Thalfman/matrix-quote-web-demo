# Plan C — Saved Scenarios + Compare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist scenarios server-side in `data/quotes.parquet`, add a `/quotes` list page with filter/sort/search/bulk actions, and add `/quotes/compare?ids=a,b,c` with per-bucket grouped chart, input-diff table, and top-drivers strip.

**Architecture:** New backend module `quotes_storage.py` wraps parquet read/append/replace. New route group `routes/quotes.py` hosts CRUD. Frontend adds two pages, a new API client module, and wires the cockpit's "Save scenario" button to the real endpoint. PDF buttons still stub until Plan D.

**Tech Stack:** FastAPI, pandas, Pydantic v2, React Router v6, TanStack Query, Recharts, Tailwind.

**Spec reference:** `docs/superpowers/specs/2026-04-17-estimator-cockpit-redesign-design.md` — Section 5 (Saved Quotes & Compare).

**Prerequisites:**
- Plan A merged (palette + `ExplainedQuoteResponse`).
- Plan B merged (Save-scenario button exists in cockpit).

---

## File structure

**Modified:**
- `backend/app/schemas_api.py` — add `SavedQuoteCreate`, `SavedQuote`, `SavedQuoteSummary`, `SavedQuoteList`, `QuoteComparePayload`.
- `backend/app/main.py` — include the new `quotes` router.
- `backend/app/paths.py` — `quotes_parquet_path()`.
- `frontend/src/App.tsx` — routes `/quotes` and `/quotes/compare`.
- `frontend/src/api/quote.ts` — `useSaveScenario`, `useSavedQuotes`, `useDeleteScenario`, `useDuplicateScenario`.
- `frontend/src/components/Layout.tsx` — add QUOTES nav group.
- `frontend/src/pages/SingleQuote.tsx` — replace session-only save with the real mutation; wire `onCompare` to navigate.
- `frontend/src/pages/single-quote/tabs/ScenariosTab.tsx` — consume saved quotes filtered to the current session.

**Created:**
- `backend/app/quotes_storage.py` — parquet CRUD, atomic replace.
- `backend/app/routes/quotes.py` — route module.
- `tests/test_quotes_crud.py`.
- `frontend/src/pages/Quotes.tsx` — list page.
- `frontend/src/pages/Compare.tsx` — compare view.
- `frontend/src/pages/quotes/QuotesTable.tsx`.
- `frontend/src/pages/quotes/QuotesFilters.tsx`.
- `frontend/src/pages/quotes/CompareHeader.tsx`.
- `frontend/src/pages/quotes/CompareInputDiff.tsx`.
- `frontend/src/pages/quotes/CompareBucketsChart.tsx`.
- `frontend/src/pages/quotes/CompareDriversStrip.tsx`.
- `frontend/src/lib/displayName.ts` — get/set a browser display name for `created_by`.

**Not touched:** `core/`, `service/`, admin routes, `/api/quote/single`.

---

## Task 1: Add schemas for saved quotes

**Files:**
- Modify: `backend/app/schemas_api.py`

- [ ] **Step 1: Append schemas**

Add to `backend/app/schemas_api.py`:

```python
class SavedQuoteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    project_name: str = Field(min_length=1, max_length=200)
    client_name: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)
    created_by: str = Field(min_length=1, max_length=120)
    inputs: QuoteInput
    prediction: QuotePrediction
    quoted_hours_by_bucket: dict[str, float] | None = None


class SavedQuote(SavedQuoteCreate):
    id: str                  # uuid4 hex
    created_at: datetime


class SavedQuoteSummary(BaseModel):
    id: str
    name: str
    project_name: str
    client_name: str | None = None
    industry_segment: str
    hours: float              # prediction.total_p50
    range_low: float
    range_high: float
    created_at: datetime
    created_by: str


class SavedQuoteList(BaseModel):
    total: int
    rows: list[SavedQuoteSummary]
```

And append to `__all__`: `"SavedQuoteCreate", "SavedQuote", "SavedQuoteSummary", "SavedQuoteList"`.

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas_api.py
git commit -m "feat(api): SavedQuote schemas (create, detail, summary, list)"
```

---

## Task 2: Path helper for the quotes parquet

**Files:**
- Modify: `backend/app/paths.py`

- [ ] **Step 1: Add the helper**

Append to `backend/app/paths.py`:

```python
def quotes_parquet_path() -> Path:
    return data_dir() / "data" / "master" / "quotes.parquet"
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/paths.py
git commit -m "feat(api): quotes_parquet_path() helper"
```

---

## Task 3: Build `quotes_storage.py` (CRUD with atomic replace)

**Files:**
- Create: `backend/app/quotes_storage.py`
- Create: `tests/test_quotes_storage.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_quotes_storage.py
from __future__ import annotations
from datetime import datetime

import pytest


@pytest.fixture(autouse=True)
def _isolated_data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from backend.app import paths, quotes_storage
    paths.ensure_runtime_dirs()
    yield


def _make_create():
    from backend.app.schemas_api import SavedQuoteCreate, QuoteInput, QuotePrediction
    from core.schemas import OpPrediction, SalesBucketPrediction
    return SavedQuoteCreate(
        name="Draft A",
        project_name="Acme Line 3",
        client_name=None,
        created_by="T. Halfman",
        inputs=QuoteInput(
            industry_segment="Automotive",
            system_category="Machine Tending",
            automation_level="Robotic",
            plc_family="AB Compact Logix",
            hmi_family="AB PanelView Plus",
            vision_type="2D",
            stations_count=8,
        ),
        prediction=QuotePrediction(
            ops={"mechanical_hours": OpPrediction(p50=100, p10=80, p90=120, std=10, rel_width=0.4, confidence="medium")},
            total_p50=100.0, total_p10=80.0, total_p90=120.0,
            sales_buckets={"mechanical": SalesBucketPrediction(p50=100, p10=80, p90=120, rel_width=0.4, confidence="medium")},
        ),
    )


def test_create_then_list_then_get_then_delete():
    from backend.app import quotes_storage

    created = quotes_storage.create(_make_create())
    assert created.id
    assert isinstance(created.created_at, datetime)

    listing = quotes_storage.list_all()
    assert listing.total == 1
    assert listing.rows[0].id == created.id
    assert listing.rows[0].hours == 100.0

    full = quotes_storage.get(created.id)
    assert full is not None
    assert full.name == "Draft A"

    deleted = quotes_storage.delete(created.id)
    assert deleted is True
    assert quotes_storage.get(created.id) is None


def test_delete_returns_false_when_missing():
    from backend.app import quotes_storage
    assert quotes_storage.delete("does-not-exist") is False


def test_atomic_replace_leaves_no_tmp_files(tmp_path):
    from backend.app import quotes_storage
    quotes_storage.create(_make_create())
    parents = list(tmp_path.rglob("quotes.parquet.tmp"))
    assert parents == []
```

- [ ] **Step 2: Run the test to see it fail**

Run: `pytest tests/test_quotes_storage.py -v`
Expected: `ModuleNotFoundError: No module named 'backend.app.quotes_storage'`.

- [ ] **Step 3: Implement `quotes_storage.py`**

```python
# backend/app/quotes_storage.py
"""CRUD for saved quotes persisted as data/master/quotes.parquet.

Inputs and predictions are stored as JSON strings so evolving QuoteInput
doesn't churn the parquet schema.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from .paths import ensure_runtime_dirs, quotes_parquet_path
from .schemas_api import (
    QuoteInput,
    QuotePrediction,
    SavedQuote,
    SavedQuoteCreate,
    SavedQuoteList,
    SavedQuoteSummary,
)


COLUMNS = [
    "id", "name", "project_name", "client_name", "notes",
    "created_by", "created_at",
    "industry_segment", "hours", "range_low", "range_high",
    "inputs_json", "prediction_json", "quoted_hours_by_bucket_json",
]


def _load() -> pd.DataFrame:
    path = quotes_parquet_path()
    if not path.exists():
        return pd.DataFrame(columns=COLUMNS)
    return pd.read_parquet(path)


def _atomic_write(df: pd.DataFrame) -> None:
    ensure_runtime_dirs()
    path = quotes_parquet_path()
    tmp = path.with_suffix(path.suffix + ".tmp")
    df.to_parquet(tmp, index=False)
    os.replace(tmp, path)


def _row_from(create: SavedQuoteCreate, id_: str, created_at: datetime) -> dict[str, Any]:
    return {
        "id": id_,
        "name": create.name,
        "project_name": create.project_name,
        "client_name": create.client_name,
        "notes": create.notes,
        "created_by": create.created_by,
        "created_at": created_at.isoformat(),
        "industry_segment": create.inputs.industry_segment,
        "hours": float(create.prediction.total_p50),
        "range_low": float(create.prediction.total_p10),
        "range_high": float(create.prediction.total_p90),
        "inputs_json": create.inputs.model_dump_json(),
        "prediction_json": create.prediction.model_dump_json(),
        "quoted_hours_by_bucket_json": json.dumps(create.quoted_hours_by_bucket or {}),
    }


def create(payload: SavedQuoteCreate) -> SavedQuote:
    df = _load()
    id_ = uuid.uuid4().hex
    created_at = datetime.now(timezone.utc)
    row = _row_from(payload, id_, created_at)
    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    _atomic_write(df)
    return SavedQuote(id=id_, created_at=created_at, **payload.model_dump())


def list_all(
    project: str | None = None,
    industry: str | None = None,
    search: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> SavedQuoteList:
    df = _load()
    if project:
        df = df[df["project_name"] == project]
    if industry:
        df = df[df["industry_segment"] == industry]
    if search:
        needle = search.lower()
        df = df[df["name"].str.lower().str.contains(needle, na=False)
                | df["project_name"].str.lower().str.contains(needle, na=False)
                | df["client_name"].fillna("").str.lower().str.contains(needle, na=False)]
    df = df.sort_values("created_at", ascending=False)
    total = int(len(df))
    df = df.iloc[offset:offset + limit]
    rows = [
        SavedQuoteSummary(
            id=r["id"],
            name=r["name"],
            project_name=r["project_name"],
            client_name=r["client_name"],
            industry_segment=r["industry_segment"],
            hours=float(r["hours"]),
            range_low=float(r["range_low"]),
            range_high=float(r["range_high"]),
            created_at=datetime.fromisoformat(r["created_at"]),
            created_by=r["created_by"],
        )
        for r in df.to_dict(orient="records")
    ]
    return SavedQuoteList(total=total, rows=rows)


def get(id_: str) -> SavedQuote | None:
    df = _load()
    match = df[df["id"] == id_]
    if match.empty:
        return None
    r = match.iloc[0].to_dict()
    return SavedQuote(
        id=r["id"],
        name=r["name"],
        project_name=r["project_name"],
        client_name=r["client_name"],
        notes=r.get("notes"),
        created_by=r["created_by"],
        created_at=datetime.fromisoformat(r["created_at"]),
        inputs=QuoteInput.model_validate_json(r["inputs_json"]),
        prediction=QuotePrediction.model_validate_json(r["prediction_json"]),
        quoted_hours_by_bucket=json.loads(r["quoted_hours_by_bucket_json"] or "{}") or None,
    )


def delete(id_: str) -> bool:
    df = _load()
    before = len(df)
    df = df[df["id"] != id_]
    if len(df) == before:
        return False
    _atomic_write(df)
    return True


def duplicate(id_: str) -> SavedQuote | None:
    src = get(id_)
    if src is None:
        return None
    copy_payload = SavedQuoteCreate(
        name=f"{src.name} (copy)",
        project_name=src.project_name,
        client_name=src.client_name,
        notes=src.notes,
        created_by=src.created_by,
        inputs=src.inputs,
        prediction=src.prediction,
        quoted_hours_by_bucket=src.quoted_hours_by_bucket,
    )
    return create(copy_payload)
```

- [ ] **Step 4: Run the tests**

Run: `pytest tests/test_quotes_storage.py -v`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/quotes_storage.py tests/test_quotes_storage.py
git commit -m "feat(api): quotes_storage module with atomic-replace parquet CRUD"
```

---

## Task 4: Routes for saved quotes

**Files:**
- Create: `backend/app/routes/quotes.py`
- Modify: `backend/app/main.py`
- Create: `tests/test_quotes_routes.py`

- [ ] **Step 1: Write the route tests**

```python
# tests/test_quotes_routes.py
from __future__ import annotations
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from importlib import reload
    from backend.app import main, paths
    reload(paths); reload(main)
    return TestClient(main.app)


def _create_body():
    return {
        "name": "Draft A",
        "project_name": "Acme Line 3",
        "client_name": None,
        "notes": None,
        "created_by": "Tester",
        "inputs": {
            "industry_segment": "Automotive",
            "system_category": "Machine Tending",
            "automation_level": "Robotic",
            "plc_family": "AB Compact Logix",
            "hmi_family": "AB PanelView Plus",
            "vision_type": "2D",
            "stations_count": 8,
        },
        "prediction": {
            "ops": {"mechanical_hours": {"p50":100,"p10":80,"p90":120,"std":10,"rel_width":0.4,"confidence":"medium"}},
            "total_p50": 100, "total_p10": 80, "total_p90": 120,
            "sales_buckets": {"mechanical": {"p50":100,"p10":80,"p90":120,"rel_width":0.4,"confidence":"medium"}},
        },
    }


def test_create_list_get_delete(client):
    r = client.post("/api/quotes", json=_create_body())
    assert r.status_code == 201
    id_ = r.json()["id"]

    r = client.get("/api/quotes")
    assert r.status_code == 200
    assert r.json()["total"] == 1

    r = client.get(f"/api/quotes/{id_}")
    assert r.status_code == 200
    assert r.json()["name"] == "Draft A"

    r = client.delete(f"/api/quotes/{id_}")
    assert r.status_code == 204

    r = client.get(f"/api/quotes/{id_}")
    assert r.status_code == 404


def test_duplicate(client):
    r = client.post("/api/quotes", json=_create_body())
    id_ = r.json()["id"]
    r = client.post(f"/api/quotes/{id_}/duplicate")
    assert r.status_code == 201
    assert r.json()["name"].endswith("(copy)")
```

- [ ] **Step 2: Run to see it fail**

Run: `pytest tests/test_quotes_routes.py -v`
Expected: 404 on POST `/api/quotes` or a `ModuleNotFoundError`.

- [ ] **Step 3: Implement `routes/quotes.py`**

```python
# backend/app/routes/quotes.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from .. import quotes_storage
from ..schemas_api import (
    SavedQuote,
    SavedQuoteCreate,
    SavedQuoteList,
)


router = APIRouter(prefix="/api/quotes", tags=["quotes"])


@router.get("", response_model=SavedQuoteList)
def list_quotes(
    project: str | None = None,
    industry: str | None = None,
    search: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> SavedQuoteList:
    return quotes_storage.list_all(project, industry, search, limit, offset)


@router.post("", response_model=SavedQuote, status_code=status.HTTP_201_CREATED)
def create_quote(payload: SavedQuoteCreate) -> SavedQuote:
    return quotes_storage.create(payload)


@router.get("/{quote_id}", response_model=SavedQuote)
def get_quote(quote_id: str) -> SavedQuote:
    q = quotes_storage.get(quote_id)
    if q is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    return q


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote(quote_id: str) -> Response:
    if not quotes_storage.delete(quote_id):
        raise HTTPException(status_code=404, detail="Quote not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{quote_id}/duplicate", response_model=SavedQuote, status_code=status.HTTP_201_CREATED)
def duplicate_quote(quote_id: str) -> SavedQuote:
    q = quotes_storage.duplicate(quote_id)
    if q is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    return q
```

- [ ] **Step 4: Include the router in `main.py`**

In `backend/app/main.py`, import the new router and include it:

```python
from .routes import admin, metrics, quote, quotes

...
app.include_router(quotes.router)
```

- [ ] **Step 5: Run route tests**

Run: `pytest tests/test_quotes_routes.py -v`
Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routes/quotes.py backend/app/main.py tests/test_quotes_routes.py
git commit -m "feat(api): /api/quotes CRUD + duplicate endpoints"
```

---

## Task 5: Frontend API client additions

**Files:**
- Modify: `frontend/src/api/quote.ts`
- Modify: `frontend/src/api/types.ts`

- [ ] **Step 1: Append types**

```ts
// frontend/src/api/types.ts — append
export type SavedQuoteCreate = {
  name: string;
  project_name: string;
  client_name?: string | null;
  notes?: string | null;
  created_by: string;
  inputs: QuoteInput;
  prediction: QuotePrediction;
  quoted_hours_by_bucket?: Record<string, number> | null;
};

export type SavedQuote = SavedQuoteCreate & {
  id: string;
  created_at: string;
};

export type SavedQuoteSummary = {
  id: string;
  name: string;
  project_name: string;
  client_name: string | null;
  industry_segment: string;
  hours: number;
  range_low: number;
  range_high: number;
  created_at: string;
  created_by: string;
};

export type SavedQuoteList = {
  total: number;
  rows: SavedQuoteSummary[];
};
```

- [ ] **Step 2: Append API hooks**

```ts
// frontend/src/api/quote.ts — append
import {
  SavedQuote,
  SavedQuoteCreate,
  SavedQuoteList,
} from "@/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSavedQuotes(params: {
  project?: string; industry?: string; search?: string;
} = {}) {
  return useQuery<SavedQuoteList>({
    queryKey: ["savedQuotes", params],
    queryFn: async () => (await api.get<SavedQuoteList>("/quotes", { params })).data,
  });
}

export function useSavedQuote(id: string | undefined) {
  return useQuery<SavedQuote>({
    queryKey: ["savedQuote", id],
    enabled: !!id,
    queryFn: async () => (await api.get<SavedQuote>(`/quotes/${id}`)).data,
  });
}

export function useSaveScenario() {
  const qc = useQueryClient();
  return useMutation<SavedQuote, unknown, SavedQuoteCreate>({
    mutationFn: async (body) =>
      (await api.post<SavedQuote>("/quotes", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedQuotes"] }),
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: async (id) => { await api.delete(`/quotes/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedQuotes"] }),
  });
}

export function useDuplicateScenario() {
  const qc = useQueryClient();
  return useMutation<SavedQuote, unknown, string>({
    mutationFn: async (id) =>
      (await api.post<SavedQuote>(`/quotes/${id}/duplicate`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedQuotes"] }),
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api
git commit -m "feat(api): frontend hooks for saved-quotes CRUD"
```

---

## Task 6: Browser display-name helper

**Files:**
- Create: `frontend/src/lib/displayName.ts`

- [ ] **Step 1: Implement**

```ts
// frontend/src/lib/displayName.ts
const KEY = "matrix.displayName";

export function getDisplayName(): string {
  try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; }
}

export function setDisplayName(name: string): void {
  try { localStorage.setItem(KEY, name.trim()); } catch { /* ignore */ }
}

export function ensureDisplayName(): string {
  let name = getDisplayName();
  if (!name) {
    name = (prompt("Your name (used to attribute saved quotes):") ?? "").trim();
    if (name) setDisplayName(name);
  }
  return name || "Unknown";
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/displayName.ts
git commit -m "feat(ux): browser display-name capture for saved-quote attribution"
```

---

## Task 7: Wire cockpit "Save scenario" to the real mutation

**Files:**
- Modify: `frontend/src/pages/SingleQuote.tsx`

- [ ] **Step 1: Replace the `onSaveScenario` handler**

```tsx
import { useNavigate } from "react-router-dom";
import { useSaveScenario } from "@/api/quote";
import { ensureDisplayName } from "@/lib/displayName";

// inside component
const save = useSaveScenario();
const navigate = useNavigate();

const onSaveScenario = async () => {
  if (!result) return;
  const name = prompt("Name this scenario", `Scenario ${scenarios.length + 1}`);
  if (!name) return;
  const projectName = prompt("Project name", "") ?? "";
  if (!projectName) return;
  try {
    await save.mutateAsync({
      name,
      project_name: projectName,
      created_by: ensureDisplayName(),
      inputs: transformToQuoteInput(form.getValues()),
      prediction: result.prediction,
      quoted_hours_by_bucket: quotedHoursByBucket,
    });
    toast.success(`Saved "${name}"`);
  } catch {
    toast.error("Could not save scenario");
  }
};

const onCompare = () => {
  // Compare uses the real saved-quotes list; cockpit send the user there.
  navigate("/quotes");
};
```

- [ ] **Step 2: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SingleQuote.tsx
git commit -m "feat(cockpit): wire Save scenario + Compare to /api/quotes and /quotes"
```

---

## Task 8: `/quotes` list page — filters, table, bulk actions

**Files:**
- Create: `frontend/src/pages/Quotes.tsx`
- Create: `frontend/src/pages/quotes/QuotesFilters.tsx`
- Create: `frontend/src/pages/quotes/QuotesTable.tsx`

- [ ] **Step 1: Filters component**

```tsx
// frontend/src/pages/quotes/QuotesFilters.tsx
import { Search } from "lucide-react";

type Props = {
  projects: string[];
  industries: string[];
  project: string | null;
  industry: string | null;
  search: string;
  onChange: (next: { project: string | null; industry: string | null; search: string }) => void;
};

export function QuotesFilters({ projects, industries, project, industry, search, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={project ?? ""}
        onChange={(e) => onChange({ project: e.target.value || null, industry, search })}
        className="bg-surface border border-border rounded-md px-2 py-1.5 text-sm"
      >
        <option value="">All projects</option>
        {projects.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select
        value={industry ?? ""}
        onChange={(e) => onChange({ project, industry: e.target.value || null, search })}
        className="bg-surface border border-border rounded-md px-2 py-1.5 text-sm"
      >
        <option value="">All industries</option>
        {industries.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <div className="relative">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => onChange({ project, industry, search: e.target.value })}
          placeholder="Search name, project, client"
          className="bg-surface border border-border rounded-md pl-7 pr-2 py-1.5 text-sm w-64"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Table component**

```tsx
// frontend/src/pages/quotes/QuotesTable.tsx
import { SavedQuoteSummary } from "@/api/types";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

type Props = {
  rows: SavedQuoteSummary[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onRowAction: (id: string, action: "duplicate" | "delete" | "pdf" | "open") => void;
};

export function QuotesTable({ rows, selected, onToggle, onRowAction }: Props) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 w-8" />
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Project</th>
            <th className="px-3 py-2">Industry</th>
            <th className="px-3 py-2 text-right">Hours</th>
            <th className="px-3 py-2">Range</th>
            <th className="px-3 py-2">Saved</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 border-border hover:bg-steel-100/60">
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => onToggle(r.id)}
                  aria-label={`Select ${r.name}`}
                />
              </td>
              <td className="px-3 py-2 font-medium text-ink">
                <button onClick={() => onRowAction(r.id, "open")} className="hover:underline">
                  {r.name}
                </button>
              </td>
              <td className="px-3 py-2 text-muted">{r.project_name}</td>
              <td className="px-3 py-2 text-muted">{r.industry_segment}</td>
              <td className="px-3 py-2 text-right numeric tabular-nums text-ink">{formatHours(r.hours)}</td>
              <td className="px-3 py-2 text-muted numeric tabular-nums">
                {formatHours(r.range_low)}–{formatHours(r.range_high)}
              </td>
              <td className="px-3 py-2 text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-2 text-xs">
                  <button className="text-brand hover:underline" onClick={() => onRowAction(r.id, "duplicate")}>Duplicate</button>
                  <button className="text-brand hover:underline" onClick={() => onRowAction(r.id, "pdf")}>PDF</button>
                  <button className="text-danger hover:underline" onClick={() => onRowAction(r.id, "delete")}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-muted">No saved quotes yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Page component**

```tsx
// frontend/src/pages/Quotes.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useDeleteScenario,
  useDuplicateScenario,
  useSavedQuotes,
} from "@/api/quote";
import { PageHeader } from "@/components/PageHeader";

import { QuotesFilters } from "./quotes/QuotesFilters";
import { QuotesTable } from "./quotes/QuotesTable";

export function Quotes() {
  const [project, setProject] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const query = useSavedQuotes({
    project: project ?? undefined,
    industry: industry ?? undefined,
    search: search || undefined,
  });
  const rows = query.data?.rows ?? [];

  const projects   = useMemo(() => Array.from(new Set(rows.map((r) => r.project_name))).sort(), [rows]);
  const industries = useMemo(() => Array.from(new Set(rows.map((r) => r.industry_segment))).sort(), [rows]);

  const del = useDeleteScenario();
  const dup = useDuplicateScenario();

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const compareSelected = () => {
    if (selected.size < 2 || selected.size > 3) return;
    navigate(`/quotes/compare?ids=${[...selected].join(",")}`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Saved Quotes"
        description="Every saved scenario, filterable and comparable."
      />
      <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
        <QuotesFilters
          projects={projects}
          industries={industries}
          project={project}
          industry={industry}
          search={search}
          onChange={({ project: p, industry: i, search: s }) => { setProject(p); setIndustry(i); setSearch(s); }}
        />
        <button
          type="button"
          onClick={compareSelected}
          disabled={selected.size < 2 || selected.size > 3}
          className="px-3 py-1.5 rounded-md bg-brand text-brand-foreground text-sm disabled:bg-steel-200 disabled:text-muted disabled:cursor-not-allowed"
        >
          Compare {selected.size > 0 ? selected.size : ""} selected
        </button>
      </div>
      <div className="mt-4">
        <QuotesTable
          rows={rows}
          selected={selected}
          onToggle={toggle}
          onRowAction={async (id, action) => {
            if (action === "duplicate") {
              const copy = await dup.mutateAsync(id); toast.success(`Duplicated as "${copy.name}"`);
            } else if (action === "delete") {
              if (!confirm("Delete this scenario?")) return;
              await del.mutateAsync(id); toast.success("Deleted");
            } else if (action === "pdf") {
              toast.info("PDF export lands in Plan D");
            } else if (action === "open") {
              // Duplicate and open in cockpit lands in Plan D/E; for Plan C just toast.
              toast.info("Opening saved quotes in the cockpit lands in a follow-up");
            }
          }}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Quotes.tsx frontend/src/pages/quotes/QuotesFilters.tsx frontend/src/pages/quotes/QuotesTable.tsx
git commit -m "feat(quotes): /quotes list page with filters, search, and bulk compare"
```

---

## Task 9: `/quotes/compare` — three sub-components + page

**Files:**
- Create: `frontend/src/pages/quotes/CompareHeader.tsx`
- Create: `frontend/src/pages/quotes/CompareInputDiff.tsx`
- Create: `frontend/src/pages/quotes/CompareBucketsChart.tsx`
- Create: `frontend/src/pages/quotes/CompareDriversStrip.tsx`
- Create: `frontend/src/pages/Compare.tsx`

- [ ] **Step 1: Compare header**

```tsx
// frontend/src/pages/quotes/CompareHeader.tsx
import { SavedQuote } from "@/api/types";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function CompareHeader({ quotes }: { quotes: SavedQuote[] }) {
  const base = quotes[0];
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `160px repeat(${quotes.length}, minmax(0, 1fr))` }}>
      <div />
      {quotes.map((q) => (
        <div key={q.id} className="text-sm">
          <div className="font-semibold text-ink truncate">{q.name}</div>
          <div className="text-muted">{q.project_name}</div>
        </div>
      ))}

      <div className="text-xs tracking-widest text-muted uppercase">Hours</div>
      {quotes.map((q) => (
        <div key={q.id} className="text-xl font-semibold numeric tabular-nums text-ink">
          {fmt(q.prediction.total_p50)}
        </div>
      ))}

      <div className="text-xs tracking-widest text-muted uppercase">Range</div>
      {quotes.map((q) => (
        <div key={q.id} className="text-sm text-muted numeric tabular-nums">
          {fmt(q.prediction.total_p10)}–{fmt(q.prediction.total_p90)}
        </div>
      ))}

      <div className="text-xs tracking-widest text-muted uppercase">Δ vs {base.name}</div>
      {quotes.map((q, i) => {
        const d = q.prediction.total_p50 - base.prediction.total_p50;
        const pct = base.prediction.total_p50 > 0 ? (d / base.prediction.total_p50) * 100 : 0;
        return (
          <div key={q.id} className="text-sm numeric tabular-nums">
            {i === 0 ? "—" : `${d >= 0 ? "+" : ""}${fmt(d)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Input diff**

```tsx
// frontend/src/pages/quotes/CompareInputDiff.tsx
import { SavedQuote } from "@/api/types";

export function CompareInputDiff({ quotes }: { quotes: SavedQuote[] }) {
  const keys = new Set<string>();
  for (const q of quotes) Object.keys(q.inputs).forEach((k) => keys.add(k));

  const diffRows: { field: string; values: string[] }[] = [];
  for (const k of keys) {
    const values = quotes.map((q) => String((q.inputs as Record<string, unknown>)[k] ?? ""));
    if (new Set(values).size > 1) diffRows.push({ field: k, values });
  }

  if (diffRows.length === 0) {
    return <div className="text-sm text-muted">These scenarios have identical inputs.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-muted">
          <th className="px-3 py-2">Field</th>
          {quotes.map((q) => <th key={q.id} className="px-3 py-2">{q.name}</th>)}
        </tr>
      </thead>
      <tbody>
        {diffRows.map(({ field, values }) => (
          <tr key={field} className="border-b last:border-0 border-border">
            <td className="px-3 py-2 text-muted">{field}</td>
            {values.map((v, i) => (
              <td key={i} className="px-3 py-2 text-ink">{v || "—"}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Grouped bucket chart**

```tsx
// frontend/src/pages/quotes/CompareBucketsChart.tsx
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { SavedQuote } from "@/api/types";

const BAR_COLORS = ["#2563EB", "#0F766E", "#B45309"];

export function CompareBucketsChart({ quotes }: { quotes: SavedQuote[] }) {
  const allBuckets = new Set<string>();
  quotes.forEach((q) => Object.keys(q.prediction.sales_buckets ?? {}).forEach((k) => allBuckets.add(k)));
  const data = Array.from(allBuckets).map((bucket) => {
    const row: Record<string, number | string> = { bucket };
    quotes.forEach((q, i) => {
      row[q.name || `Q${i + 1}`] = q.prediction.sales_buckets?.[bucket]?.p50 ?? 0;
    });
    return row;
  });

  return (
    <div className="card p-4 h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {quotes.map((q, i) => (
            <Bar key={q.id} dataKey={q.name || `Q${i + 1}`} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Drivers strip**

```tsx
// frontend/src/pages/quotes/CompareDriversStrip.tsx
import { SavedQuote } from "@/api/types";

export function CompareDriversStrip({ quotes }: { quotes: SavedQuote[] }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${quotes.length}, minmax(0,1fr))` }}>
      {quotes.map((q) => (
        <div key={q.id} className="card p-4">
          <div className="text-xs tracking-widest text-muted uppercase">{q.name}</div>
          <div className="mt-2 text-sm text-muted">
            Top drivers were recorded at quote time and are not re-computed here.
          </div>
        </div>
      ))}
    </div>
  );
}
```

> Note: saved quotes do not currently persist their drivers payload. A follow-up can extend `SavedQuoteCreate` to include the ExplainedQuoteResponse's drivers; for Plan C this strip is a placeholder.

- [ ] **Step 5: Page**

```tsx
// frontend/src/pages/Compare.tsx
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";

import { api } from "@/api/client";
import { SavedQuote } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

import { CompareHeader } from "./quotes/CompareHeader";
import { CompareInputDiff } from "./quotes/CompareInputDiff";
import { CompareBucketsChart } from "./quotes/CompareBucketsChart";
import { CompareDriversStrip } from "./quotes/CompareDriversStrip";

export function Compare() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["savedQuote", id],
      queryFn: async () => (await api.get<SavedQuote>(`/quotes/${id}`)).data,
    })),
  });
  const loaded = queries.every((q) => q.data);
  const quotes = loaded ? queries.map((q) => q.data!) : [];

  if (ids.length < 2 || ids.length > 3) {
    return (
      <>
        <PageHeader eyebrow="Quotes" title="Compare" />
        <EmptyState title="Select 2–3 scenarios to compare" body="Open the Saved Quotes list and tick 2 or 3 rows before pressing Compare." />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Quotes" title="Compare" description={`Comparing ${ids.length} scenarios.`} />
      {!loaded ? (
        <div className="mt-6 card p-6 text-sm text-muted">Loading scenarios…</div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="card p-5">
            <CompareHeader quotes={quotes} />
          </div>
          <div>
            <div className="text-xs tracking-widest text-muted uppercase mb-2">Per-bucket hours</div>
            <CompareBucketsChart quotes={quotes} />
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="p-4 text-xs tracking-widest text-muted uppercase border-b border-border">Input differences</div>
            <CompareInputDiff quotes={quotes} />
          </div>
          <div>
            <div className="text-xs tracking-widest text-muted uppercase mb-2">Drivers</div>
            <CompareDriversStrip quotes={quotes} />
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Compare.tsx frontend/src/pages/quotes
git commit -m "feat(quotes): /quotes/compare page with header, diff, grouped chart, drivers strip"
```

---

## Task 10: Routes + nav wiring

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Add `/quotes` and `/quotes/compare` routes**

In `frontend/src/App.tsx`, after the `<Route path="batch" ...>` line:

```tsx
import { Quotes } from "@/pages/Quotes";
import { Compare } from "@/pages/Compare";

// inside <Routes>
<Route path="quotes" element={<Quotes />} />
<Route path="quotes/compare" element={<Compare />} />
```

- [ ] **Step 2: Add QUOTES nav group**

In `frontend/src/components/Layout.tsx`, after the ESTIMATE group:

```tsx
{
  label: "QUOTES",
  items: [
    { to: "/quotes", label: "Saved Quotes", icon: FileSpreadsheet },
  ],
},
```

(Use a distinct icon — `FolderOpen` from lucide-react — if you prefer not to repeat `FileSpreadsheet`.)

- [ ] **Step 3: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat(nav): QUOTES nav group and routes for Saved Quotes + Compare"
```

---

## Task 11: Frontend tests for Quotes + Compare

**Files:**
- Create: `frontend/src/pages/Quotes.test.tsx`
- Create: `frontend/src/pages/Compare.test.tsx`

- [ ] **Step 1: Quotes list test**

```tsx
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

import { Quotes } from "./Quotes";

const rows = [
  { id: "a", name: "Option A", project_name: "Line 3", client_name: null, industry_segment: "Automotive", hours: 1200, range_low: 1000, range_high: 1400, created_at: "2026-04-01T00:00:00Z", created_by: "Tester" },
  { id: "b", name: "Option B", project_name: "Line 3", client_name: null, industry_segment: "Automotive", hours:  980, range_low:  800, range_high: 1150, created_at: "2026-04-02T00:00:00Z", created_by: "Tester" },
];
const server = setupServer(
  http.get("*/api/quotes", () => HttpResponse.json({ total: rows.length, rows })),
);
beforeAll(() => server.listen());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Quotes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Quotes", () => {
  it("lists saved quotes", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Option A")).toBeInTheDocument());
    expect(screen.getByText("Option B")).toBeInTheDocument();
  });

  it("enables the Compare button only when 2–3 rows are selected", async () => {
    renderPage();
    await screen.findByText("Option A");
    const checks = screen.getAllByRole("checkbox");
    const compareBtn = screen.getByRole("button", { name: /Compare/ });
    expect(compareBtn).toBeDisabled();
    fireEvent.click(checks[0]);
    expect(compareBtn).toBeDisabled();
    fireEvent.click(checks[1]);
    expect(compareBtn).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Compare test**

```tsx
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

import { Compare } from "./Compare";

const one = {
  id: "a", name: "A", project_name: "P", client_name: null, notes: null,
  created_by: "T", created_at: "2026-04-01T00:00:00Z",
  inputs: { industry_segment: "Automotive", system_category: "X", automation_level: "Robotic",
            plc_family: "", hmi_family: "", vision_type: "", stations_count: 4 },
  prediction: { ops: {}, total_p50: 1000, total_p10: 800, total_p90: 1200,
                sales_buckets: { mechanical: { p50: 500, p10: 400, p90: 600, rel_width: 0.2, confidence: "medium" }}},
};
const two = { ...one, id: "b", name: "B", inputs: { ...one.inputs, stations_count: 8 } };
const server = setupServer(
  http.get("*/api/quotes/a", () => HttpResponse.json(one)),
  http.get("*/api/quotes/b", () => HttpResponse.json(two)),
);
beforeAll(() => server.listen());
afterAll(() => server.close());

describe("Compare", () => {
  it("renders headline numbers and input diff", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/quotes/compare?ids=a,b"]}>
          <Routes>
            <Route path="/quotes/compare" element={<Compare />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("Hours")).toBeInTheDocument());
    expect(screen.getByText("stations_count")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run frontend tests**

Run: `cd frontend && npm test`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Quotes.test.tsx frontend/src/pages/Compare.test.tsx
git commit -m "test(quotes): Quotes list + Compare page coverage"
```

---

## Task 12: Final verification gate

- [ ] **Step 1: Full test suite**

Run: `pytest -v && cd frontend && npm run typecheck && npm run build && npm test`
Expected: all PASS.

- [ ] **Step 2: Manual smoke**

Boot backend + frontend. With fixture data loaded:
- Submit a quote in cockpit, click Save scenario, enter a name + project. Toast "Saved".
- Navigate to `/quotes`. Row appears.
- Save a second; check both; click Compare. `/quotes/compare?ids=…` renders with headline numbers, diff table, grouped chart.
- Delete one from the list; confirm; it disappears.

- [ ] **Step 3: No commit.** Plan C complete.

---

## Plan summary

- 12 tasks.
- 1 backend storage module, 1 new route module, 4 new schemas, 1 new paths helper.
- 2 new frontend pages, 6 new sub-components, 4 new hooks, 1 display-name helper.
- Saved-quote row shape: `(id, name, project_name, client_name, notes, created_by, created_at, industry_segment, hours, range_low, range_high, inputs_json, prediction_json, quoted_hours_by_bucket_json)`.
- Rollback: revert commits; delete `data/master/quotes.parquet` if you want the persisted rows gone.
