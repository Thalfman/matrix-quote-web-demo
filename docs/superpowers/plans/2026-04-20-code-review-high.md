# Code Review 2026-04-20 — High-Severity Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close nine High-severity findings: missing rate limit, leaky telemetry endpoints, missing CI scanners, unmaintained JWT library, tag-pinned Docker images, thin `.dockerignore`, and three live quality bugs (NaN round-trip, non-xlsx 500, Content-Disposition header injection).

**Architecture:** This plan assumes the **Critical plan has already landed** — in particular the `require_admin` dep is in place and the JWT carries a `name` claim. Work splits into three themes: (A) backend auth/quality fixes, (B) backend DI/infra swaps (jose→PyJWT), (C) CI and Docker hardening.

**Tech Stack:** FastAPI, slowapi, PyJWT, pytest, Docker, GitHub Actions, pip-audit, npm audit.

**Ordering:** Tasks are mostly independent except **Task 4 (PyJWT swap) depends on Critical Task 2** (which touches `deps.py`). Run Q-1/Q-2/Q-3 in any order as they touch different files.

---

## Task 1: Wire `slowapi` into `/api/admin/login` (S-2)

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/routes/admin.py`
- Test: `tests/test_admin_auth.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_admin_auth.py`:

```python
def test_admin_login_rate_limit_kicks_in(client):
    """6th wrong-password attempt in a minute returns 429, not 401."""
    for _ in range(5):
        r = client.post("/api/admin/login", json={"password": "wrong"})
        assert r.status_code == 401
    r = client.post("/api/admin/login", json={"password": "wrong"})
    assert r.status_code == 429
```

- [ ] **Step 2: Run test — expect FAIL (429 never reached)**

```bash
pytest tests/test_admin_auth.py::test_admin_login_rate_limit_kicks_in -v
```

- [ ] **Step 3: Register slowapi in `main.py`**

Insert into `backend/app/main.py` imports and inside `create_app()` before router registration:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])

def create_app() -> FastAPI:
    # ...existing code...
    app = FastAPI(...)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(CORSMiddleware, ...)  # keep existing CORS block
    # ...
```

- [ ] **Step 4: Decorate the login handler**

In `backend/app/routes/admin.py`, import `request: Request` into `login` (required by slowapi's decorator) and apply the limiter:

```python
from fastapi import APIRouter, Depends, HTTPException, Request, status
from ..main import limiter  # or relocate limiter to deps.py to avoid a cycle

@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    body: LoginRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> LoginResponse:
    # ...existing body...
```

**Note on the import cycle:** `routes/admin.py` importing `limiter` from `main.py` creates a cycle because `main.py` imports `routes/admin`. Fix by moving the `Limiter(...)` instance into `backend/app/deps.py`:

```python
# backend/app/deps.py — add near the top
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
```

and importing `from ..deps import limiter` in both `main.py` and `routes/admin.py`.

- [ ] **Step 5: Run the test — expect PASS**

```bash
pytest tests/test_admin_auth.py -v
```

- [ ] **Step 6: Also rate-limit the future `/api/admin/train` slot**

In `routes/admin.py`, decorate the existing 501 stub for `train` so the limit is in place before the real implementation lands:

```python
@router.post("/train", response_model=TrainResponse)
@limiter.limit("3/hour")
def train(request: Request, _: dict = Depends(require_admin)) -> TrainResponse:
    raise _not_implemented()
```

- [ ] **Step 7: Run all backend tests**

```bash
pytest -x
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/main.py backend/app/deps.py backend/app/routes/admin.py tests/test_admin_auth.py
git commit -m "fix(auth): throttle /api/admin/login at 5/min and /api/admin/train at 3/hour (S-2)"
```

---

## Task 2: Gate telemetry endpoints behind `require_admin` (S-7)

**Files:**
- Modify: `backend/app/routes/metrics.py` (all routes except `/health`)
- Modify: `backend/app/routes/insights.py:25`
- Test: `tests/test_insights.py`, new file `tests/test_metrics_routes.py`

**Decision:** Keep `/api/health` unauthenticated (Railway health check). Gate every other route in `metrics.py` and `insights.py`.

- [ ] **Step 1: Write failing tests**

Create `tests/test_metrics_routes.py`:

```python
import pytest


@pytest.mark.parametrize("path", [
    "/api/metrics",
    "/api/metrics/history",
    "/api/metrics/calibration",
    "/api/metrics/headline",
    "/api/catalog/dropdowns",
    "/api/demo/status",
])
def test_telemetry_requires_auth(client, path):
    assert client.get(path).status_code == 401


def test_health_stays_public(client):
    assert client.get("/api/health").status_code == 200


def test_insights_overview_requires_auth(client):
    assert client.get("/api/insights/overview").status_code == 401
```

- [ ] **Step 2: Run — expect all 401 tests to FAIL**

```bash
pytest tests/test_metrics_routes.py -v
```

- [ ] **Step 3: Add `require_admin` to every metrics route except `/health`**

In `backend/app/routes/metrics.py`, add the dep to each handler:

```python
from typing import Annotated
from fastapi import APIRouter, Depends
from ..deps import require_admin

@router.get("/metrics", response_model=MetricsSummary)
def metrics(_: Annotated[dict, Depends(require_admin)]) -> MetricsSummary:
    # ...

@router.get("/catalog/dropdowns", response_model=DropdownOptions)
def dropdowns(_: Annotated[dict, Depends(require_admin)]) -> DropdownOptions:
    # ...

@router.get("/metrics/history", response_model=list[TrainingRunRow])
def metrics_history(_: Annotated[dict, Depends(require_admin)]) -> list[TrainingRunRow]:
    # ...

@router.get("/metrics/calibration", response_model=list[CalibrationPoint])
def metrics_calibration(_: Annotated[dict, Depends(require_admin)]) -> list[CalibrationPoint]:
    # ...

@router.get("/metrics/headline", response_model=PerformanceHeadline)
def metrics_headline(_: Annotated[dict, Depends(require_admin)]) -> PerformanceHeadline:
    # ...

@router.get("/demo/status", response_model=DemoStatus)
def demo_status(_: Annotated[dict, Depends(require_admin)]) -> DemoStatus:
    # ...
```

Leave `health()` alone.

- [ ] **Step 4: Gate `/api/insights/overview`**

In `backend/app/routes/insights.py`, add `require_admin`:

```python
from typing import Annotated
from fastapi import APIRouter, Depends
from ..deps import require_admin

@router.get("/overview", response_model=InsightsOverview)
def overview(_: Annotated[dict, Depends(require_admin)]) -> InsightsOverview:
    # ...existing body...
```

- [ ] **Step 5: Update frontend callers that hit the now-gated endpoints without a token**

All frontend callers already route through `frontend/src/api/client.ts` which attaches the token from `sessionStorage`. Verify anonymous dashboards aren't expected:

```bash
rg -n 'catalog/dropdowns|insights/overview|metrics/(history|calibration|headline)|demo/status' frontend/src
```

Every match should be inside an admin-protected page (already behind `RequireAdmin`). The pre-login landing page uses `/api/health` only.

If you find a public (pre-login) page hitting a now-gated endpoint, either leave the page blank until login or introduce a separate `require_viewer` dep in a follow-up PR (out of scope here).

- [ ] **Step 6: Run the full suite**

```bash
pytest -x
```

```bash
cd frontend && npm run typecheck && npm test
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/routes/metrics.py backend/app/routes/insights.py tests/test_metrics_routes.py
git commit -m "fix(auth): gate telemetry endpoints behind require_admin (S-7)"
```

---

## Task 3: Add security scanners to CI (I-3)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create (optional): `.github/workflows/security.yml`

- [ ] **Step 1: Add a `security` job to the existing CI workflow**

Append to `.github/workflows/ci.yml` (remember SHAs pinned per Critical Task 5):

```yaml
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA-from-critical-task-5>
      - uses: actions/setup-python@<SHA-from-critical-task-5>
        with:
          python-version: "3.11"
      - name: Install pip-audit
        run: pip install pip-audit
      - name: Python vulnerability scan
        run: pip-audit -r requirements.txt --strict --ignore-vuln GHSA-xxxx-xxxx-xxxx  # remove ignores once PRs land
      - uses: actions/setup-node@<SHA-from-critical-task-5>
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - name: Node vulnerability scan
        working-directory: frontend
        run: npm audit --omit=dev --audit-level=high
      - name: Bandit (Python SAST)
        run: |
          pip install bandit
          bandit -r backend -ll  # fail only on Medium/High severity
```

- [ ] **Step 2: Run the scans locally once to confirm they pass**

```bash
pip install pip-audit bandit
pip-audit -r requirements.txt
bandit -r backend -ll
(cd frontend && npm audit --omit=dev --audit-level=high)
```

Resolve any failures — this is where `python-jose` shows up; Task 4 replaces it. For anything else, either bump the version or add a documented `--ignore-vuln <GHSA-id>` with an issue link.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add pip-audit, npm audit, and bandit security scans (I-3)"
```

---

## Task 4: Replace `python-jose` with `PyJWT` (I-4)

**Files:**
- Modify: `requirements.txt:17`
- Modify: `backend/app/deps.py:11,47,69`
- Tests: no new tests; existing auth tests validate

**Decision:** `PyJWT>=2.8` is the actively maintained equivalent. The API is almost identical: `jwt.encode/decode` exist in both but differ in return type (`bytes` in old jose, `str` in PyJWT) and exception names.

- [ ] **Step 1: Swap the requirement**

In `requirements.txt`, replace line 17:

```
python-jose[cryptography]>=3.3
```

with:

```
PyJWT>=2.8,<3
```

- [ ] **Step 2: Update imports in `deps.py`**

Replace `from jose import JWTError, jwt` with:

```python
import jwt
from jwt import PyJWTError
```

Replace the `except JWTError as exc:` in `require_admin` with `except PyJWTError as exc:`.

PyJWT's `jwt.encode(...)` returns `str` directly (no `.decode()` needed — the old jose pattern also returned `str` after 3.x, so no change). `jwt.decode(...)` signatures match.

- [ ] **Step 3: Install and run the auth tests**

```bash
pip install -r requirements.txt
pytest tests/test_admin_auth.py -v
```

Expected: all auth tests PASS on the new library.

- [ ] **Step 4: Check the lockfile is consistent**

If the repo uses a lockfile (`requirements.lock` or similar — check `ls *.lock`), regenerate it. This repo uses a plain `requirements.txt`; the CI cache will pick up the swap on the next run.

- [ ] **Step 5: Confirm pip-audit is clean**

```bash
pip-audit -r requirements.txt
```

Expected: no findings attributed to the JWT library.

- [ ] **Step 6: Commit**

```bash
git add requirements.txt backend/app/deps.py
git commit -m "chore(deps): replace python-jose with PyJWT (I-4)"
```

---

## Task 5: Pin Docker base images by SHA digest (I-5)

**Files:**
- Modify: `Dockerfile:3,10`

- [ ] **Step 1: Look up the current digests**

```bash
docker pull python:3.11-slim-bookworm
docker inspect python:3.11-slim-bookworm --format='{{index .RepoDigests 0}}'
docker pull node:20-bookworm-slim
docker inspect node:20-bookworm-slim --format='{{index .RepoDigests 0}}'
```

Copy the two `@sha256:...` digests.

- [ ] **Step 2: Pin the images**

In `Dockerfile`, replace the two `FROM` lines:

```dockerfile
FROM node:20-bookworm-slim@sha256:<digest-from-step-1> AS frontend
# ...
FROM python:3.11-slim-bookworm@sha256:<digest-from-step-1> AS runtime
```

Keep the tag comment in each line so humans can still see which tag the digest corresponds to.

- [ ] **Step 3: Build to confirm the digests are valid**

```bash
docker build -t matrix-quote-web:digest-pinned .
```

Expected: build succeeds and pulls the exact digests.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile
git commit -m "chore(docker): pin base images by SHA digest (I-5)"
```

Dependabot (configured in Critical Task 5) will open PRs whenever the upstream images are rebuilt.

---

## Task 6: Expand `.dockerignore` (I-6)

**Files:**
- Modify: `.dockerignore`

- [ ] **Step 1: Read current contents**

```bash
cat .dockerignore
```

- [ ] **Step 2: Extend the file**

Append (or integrate, preserving existing exclusions):

```
# Demo and scratch directories
.demo/
.tmp_noseed/
demo_assets/

# Local docs + planning files
docs/
scripts/
*.md
CLAUDE.md

# Claude agent cache
.claude/

# Coverage reports (if ever generated locally)
coverage/
htmlcov/
.coverage
.coverage.*
```

Leave existing entries (`.env`, `.git`, `__pycache__/`, `frontend/node_modules`, `frontend/dist`, `tests/`) untouched.

- [ ] **Step 3: Verify the build context shrinks**

```bash
docker build --no-cache -t matrix-quote-web:ignore-test . 2>&1 | grep "Sending build context"
```

Before the change, the "Sending build context" line will include the ~23 MB `demo_assets/`; after, it should be significantly smaller.

- [ ] **Step 4: Commit**

```bash
git add .dockerignore
git commit -m "chore(docker): exclude docs/scripts/demo_assets from build context (I-6)"
```

---

## Task 7: Fix NaN round-trip in `quotes_storage.get()` (Q-1)

**Files:**
- Modify: `backend/app/quotes_storage.py:118-135`
- Test: `tests/test_quotes_storage.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_quotes_storage.py`:

```python
def test_get_round_trips_null_nullable_fields(monkeypatch, tmp_path):
    from backend.app import quotes_storage
    from backend.app.schemas_api import SavedQuoteCreate
    from core.schemas import QuoteInput, QuotePrediction

    payload = SavedQuoteCreate(
        name="nulls",
        project_name="X",
        client_name=None,  # explicitly null
        notes=None,
        created_by="tester",
        inputs=QuoteInput(
            industry_segment="Automotive",
            system_category="Assembly",
            automation_level="Fully automated",
            stations=1, robot_count=1, conveyor_length_ft=0,
            plc_family="Allen-Bradley", hmi_family="FactoryTalk",
            vision_type="None",
        ),
        prediction=QuotePrediction(
            total_p10=1, total_p50=2, total_p90=3,
            by_operation={}, by_bucket={},
        ),
    )
    created = quotes_storage.create(payload)
    fetched = quotes_storage.get(created.id)
    assert fetched is not None
    assert fetched.client_name is None
    assert fetched.notes is None
```

(Adjust `QuoteInput`/`QuotePrediction` kwargs if your schemas differ — let pydantic tell you.)

- [ ] **Step 2: Run — expect FAIL with pydantic rejecting `float('nan')`**

```bash
pytest tests/test_quotes_storage.py::test_get_round_trips_null_nullable_fields -v
```

- [ ] **Step 3: Normalize NaN → None inside `get`**

In `backend/app/quotes_storage.py`, replace `get`:

```python
def _nan_to_none(row: dict[str, Any]) -> dict[str, Any]:
    return {
        k: (None if isinstance(v, float) and pd.isna(v) else v)
        for k, v in row.items()
    }


def get(id_: str) -> SavedQuote | None:
    df = _load()
    match = df[df["id"] == id_]
    if match.empty:
        return None
    r = _nan_to_none(match.iloc[0].to_dict())
    return SavedQuote(
        id=r["id"],
        name=r["name"],
        project_name=r["project_name"],
        client_name=r.get("client_name"),
        notes=r.get("notes"),
        created_by=r["created_by"],
        created_at=datetime.fromisoformat(r["created_at"]),
        inputs=QuoteInput.model_validate_json(r["inputs_json"]),
        prediction=QuotePrediction.model_validate_json(r["prediction_json"]),
        quoted_hours_by_bucket=json.loads(r["quoted_hours_by_bucket_json"] or "{}") or None,
    )
```

- [ ] **Step 4: Run — expect PASS**

```bash
pytest tests/test_quotes_storage.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/quotes_storage.py tests/test_quotes_storage.py
git commit -m "fix(quotes): normalize NaN→None on parquet round-trip (Q-1)"
```

---

## Task 8: Wrap `batch_preview` in try/except for non-xlsx uploads (Q-2)

**Files:**
- Modify: `backend/app/routes/quote.py:73-84`
- Test: `tests/test_quote_routes.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_quote_routes.py`:

```python
def test_batch_preview_rejects_non_xlsx_with_400(client):
    resp = client.post(
        "/api/quote/batch/preview",
        files={"file": ("garbage.xlsx", b"not an excel file", "application/vnd.ms-excel")},
    )
    assert resp.status_code == 400
    assert "Could not parse" in resp.json()["detail"]
```

- [ ] **Step 2: Run — expect 500**

```bash
pytest tests/test_quote_routes.py::test_batch_preview_rejects_non_xlsx_with_400 -v
```

- [ ] **Step 3: Wrap `pd.ExcelFile(buf)` in the same try/except pattern as `_read_upload`**

In `backend/app/routes/quote.py`, replace `batch_preview`:

```python
@router.post("/batch/preview", response_model=TrainPreviewResponse)
def batch_preview(file: UploadFile = File(...)) -> TrainPreviewResponse:  # noqa: B008
    raw = file.file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB).")
    buf = io.BytesIO(raw)
    try:
        xls = pd.ExcelFile(buf)
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail=f"Could not parse file: {exc}"
        ) from exc
    columns_per_sheet: dict[str, list[str]] = {}
    for s in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=s, nrows=0)
        columns_per_sheet[s] = df.columns.astype(str).tolist()
    return TrainPreviewResponse(
        sheets=xls.sheet_names, columns_per_sheet=columns_per_sheet
    )
```

And import `TrainPreviewResponse` at the top of the file (it's in `schemas_api.py`).

- [ ] **Step 4: Run — expect PASS**

```bash
pytest tests/test_quote_routes.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/quote.py tests/test_quote_routes.py
git commit -m "fix(quote): batch/preview returns 400 (not 500) for non-xlsx uploads (Q-2)"
```

---

## Task 9: Sanitize `Content-Disposition` filename from `project_name` (Q-3)

**Files:**
- Modify: `backend/app/routes/quote.py:126` (adhoc PDF)
- Modify: `backend/app/routes/quotes.py:45` (saved quote PDF — already touched in Critical Task 3)
- Test: `tests/test_pdf_export.py`

**Note:** Critical Task 3 already adds `_safe_filename_part` to `routes/quotes.py`. This task applies the same helper to `routes/quote.py`.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_pdf_export.py`:

```python
def test_adhoc_pdf_filename_is_header_safe(admin_client, adhoc_pdf_payload):
    # Inject quote + CRLF + semicolon into project_name
    payload = dict(adhoc_pdf_payload)
    payload["project_name"] = 'Bad"Name;\r\nX-Injected: 1'
    resp = admin_client.post("/api/quote/pdf", json=payload)
    assert resp.status_code == 200
    cd = resp.headers["content-disposition"]
    # Must not contain raw quote/CRLF/semicolon in filename segment
    assert '"' not in cd.split("filename=")[1].rstrip(";")[1:-1]
    assert "\r" not in cd and "\n" not in cd
```

(Add a fixture `adhoc_pdf_payload` mirroring `AdHocPdfRequest` shape if one doesn't exist.)

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest tests/test_pdf_export.py::test_adhoc_pdf_filename_is_header_safe -v
```

- [ ] **Step 3: Reuse `_safe_filename_part` in `routes/quote.py`**

Move `_safe_filename_part` to a shared module `backend/app/quote_ids.py`:

```python
# backend/app/quote_ids.py
from __future__ import annotations

import re

_FILENAME_SAFE = re.compile(r"[^A-Za-z0-9_.-]+")


def safe_filename_part(value: str, max_len: int = 60) -> str:
    return _FILENAME_SAFE.sub("-", value).strip("-")[:max_len] or "quote"
```

Update `routes/quotes.py` (removing the local copy from Critical Task 3) to import from there:

```python
from ..quote_ids import safe_filename_part
```

In `backend/app/routes/quote.py`, update `adhoc_pdf`:

```python
from ..quote_ids import safe_filename_part

@router.post("/pdf")
def adhoc_pdf(payload: AdHocPdfRequest) -> Response:
    now = datetime.now(UTC).replace(tzinfo=None)  # also closes Q-7 for this file
    transient = SavedQuote(
        id="adhoc",
        created_at=now,
        **payload.model_dump(),
    )
    pdf_bytes = render_quote_pdf(transient, quote_number=f"{now:%Y%m%d}-{now:%H%M}")
    fname = (
        f"Matrix-Quote-{safe_filename_part(payload.project_name)}-"
        f"{now:%Y%m%d}.pdf"
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
```

Add `from datetime import UTC` at the top of the file if not present.

- [ ] **Step 4: Run — expect PASS**

```bash
pytest tests/test_pdf_export.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/quote.py backend/app/routes/quotes.py backend/app/quote_ids.py tests/test_pdf_export.py
git commit -m "fix(pdf): sanitize project_name before interpolating into Content-Disposition (Q-3)"
```

---

## Done-criteria checklist

- [ ] `pytest -x` passes; new test files (`test_metrics_routes.py`, expanded `test_admin_auth.py`) are green
- [ ] `curl -i http://localhost:8000/api/metrics` returns 401; `/api/health` still returns 200
- [ ] 6th login attempt within 60s returns 429
- [ ] `pip-audit -r requirements.txt` returns zero findings for `jose`/`jwt`
- [ ] `.github/workflows/ci.yml` includes the `security` job and it passes on a dummy PR
- [ ] `docker build` produces an image built on the pinned digest (check with `docker inspect <img> --format='{{.Config.Image}}'`)
- [ ] `docker build` log shows a smaller build context after `.dockerignore` expansion
- [ ] `POST /api/quote/batch/preview` with `application/octet-stream` garbage returns 400, not 500
- [ ] Creating a saved quote with `project_name='Bad";\r\nX:1'` and downloading its PDF produces a header with no raw quotes/CRLF in the filename
