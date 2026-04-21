# Code Review 2026-04-20 — Critical Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the five Critical findings from the 2026-04-20 review: auth gaps on `/api/quotes/*`, empty-secret auth bypass, client-supplied `created_by`, root container, and floating GitHub Action tags.

**Architecture:** Two backend changes — a startup assertion that blocks empty auth secrets, and a gating sweep of the quotes router that derives `created_by` from the JWT claim instead of the request body. One Dockerfile change (non-root `app` user). One CI change (pin `actions/*` to 40-char SHAs and add Dependabot).

**Tech Stack:** FastAPI, pydantic-settings, python-jose, pytest, httpx TestClient, Docker, GitHub Actions.

**Ordering:** Tasks are independent except **Task 3 depends on Task 2** (the JWT claim must expose `name` before routes consume it). Tasks 4 and 5 can land in any order; they don't touch app code.

---

## Task 1: Assert non-empty auth secrets at startup (S-3)

**Files:**
- Modify: `backend/app/deps.py:15-31`
- Test: `tests/test_admin_auth.py` (append)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_admin_auth.py — append to file
def test_empty_jwt_secret_refuses_startup(monkeypatch):
    """Production startup must abort when ADMIN_JWT_SECRET is blank."""
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setenv("ADMIN_PASSWORD", "x" * 12)
    monkeypatch.setenv("ADMIN_JWT_SECRET", "")
    from backend.app.deps import get_settings
    get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="ADMIN_JWT_SECRET"):
        get_settings()
    get_settings.cache_clear()


def test_short_jwt_secret_refuses_startup(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setenv("ADMIN_PASSWORD", "x" * 12)
    monkeypatch.setenv("ADMIN_JWT_SECRET", "short")
    from backend.app.deps import get_settings
    get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="at least 32"):
        get_settings()
    get_settings.cache_clear()


def test_empty_admin_password_refuses_startup(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setenv("ADMIN_PASSWORD", "")
    monkeypatch.setenv("ADMIN_JWT_SECRET", "x" * 40)
    from backend.app.deps import get_settings
    get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="ADMIN_PASSWORD"):
        get_settings()
    get_settings.cache_clear()
```

Also ensure `import pytest` and `import os` are present at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_admin_auth.py::test_empty_jwt_secret_refuses_startup -v
```

Expected: FAIL — `Settings()` currently accepts empty strings silently.

- [ ] **Step 3: Implement the assertion in `get_settings`**

Replace the `get_settings` function (and add the validator) in `backend/app/deps.py`:

```python
import os

# ...keep existing imports...

def _in_test_env() -> bool:
    return bool(os.environ.get("PYTEST_CURRENT_TEST"))


def _assert_production_secrets(s: Settings) -> None:
    if _in_test_env():
        return
    if not s.admin_password:
        raise RuntimeError(
            "ADMIN_PASSWORD must be set (non-empty) outside the test env."
        )
    if not s.admin_jwt_secret:
        raise RuntimeError(
            "ADMIN_JWT_SECRET must be set (non-empty) outside the test env."
        )
    if len(s.admin_jwt_secret) < 32:
        raise RuntimeError(
            "ADMIN_JWT_SECRET must be at least 32 characters."
        )


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    _assert_production_secrets(s)
    return s
```

- [ ] **Step 4: Run the new tests to verify they pass**

```bash
pytest tests/test_admin_auth.py -v
```

Expected: all three new tests PASS; no existing test regresses (conftest sets both env vars).

- [ ] **Step 5: Run the full backend suite to confirm no regression**

```bash
pytest -x
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/deps.py tests/test_admin_auth.py
git commit -m "fix(auth): refuse to boot with empty/short admin secrets (S-3)"
```

---

## Task 2: Embed the logged-in admin's display name in the JWT (foundation for F-2)

**Files:**
- Modify: `backend/app/deps.py:42-48` (add `name` to claims; return claim on `require_admin`)
- Modify: `backend/app/routes/admin.py:40-48` (accept optional `name` on login)
- Modify: `backend/app/schemas_api.py:92-93` (add `name` field)
- Test: `tests/test_admin_auth.py` (append)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_admin_auth.py — append
def test_login_accepts_display_name_and_claim_round_trips(client):
    resp = client.post(
        "/api/admin/login",
        json={"password": "test-password", "name": "Alice"},
    )
    assert resp.status_code == 200
    token = resp.json()["token"]

    from jose import jwt
    claims = jwt.decode(token, "test-secret-at-least-32-chars-long!!", algorithms=["HS256"])
    assert claims["sub"] == "admin"
    assert claims["name"] == "Alice"


def test_login_without_name_falls_back_to_admin(client):
    resp = client.post("/api/admin/login", json={"password": "test-password"})
    assert resp.status_code == 200
    token = resp.json()["token"]
    from jose import jwt
    claims = jwt.decode(token, "test-secret-at-least-32-chars-long!!", algorithms=["HS256"])
    assert claims["name"] == "admin"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_admin_auth.py::test_login_accepts_display_name_and_claim_round_trips -v
```

Expected: FAIL — `LoginRequest` has no `name` field.

- [ ] **Step 3: Add `name` to `LoginRequest`**

In `backend/app/schemas_api.py`, replace the `LoginRequest` class:

```python
class LoginRequest(BaseModel):
    password: str
    name: str | None = Field(default=None, max_length=120)
```

- [ ] **Step 4: Update `create_admin_token` to accept a display name**

In `backend/app/deps.py`, replace `create_admin_token`:

```python
def create_admin_token(
    settings: Settings, display_name: str = "admin"
) -> tuple[str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(
        hours=settings.admin_token_expiry_hours
    )
    claims = {
        "sub": "admin",
        "name": display_name or "admin",
        "exp": expires_at,
    }
    token = jwt.encode(claims, settings.admin_jwt_secret, algorithm=JWT_ALGORITHM)
    return token, expires_at
```

- [ ] **Step 5: Change `require_admin` to return the claim dict (not just `"admin"`)**

In `backend/app/deps.py`, replace `require_admin`:

```python
def require_admin(
    authorization: Annotated[str | None, Header()] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> dict[str, str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1]
    try:
        claims = jwt.decode(
            token, settings.admin_jwt_secret, algorithms=[JWT_ALGORITHM]
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    if claims.get("sub") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    return {"sub": "admin", "name": str(claims.get("name") or "admin")}
```

- [ ] **Step 6: Update the login route to forward the name**

In `backend/app/routes/admin.py`, replace the `login` function body:

```python
@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> LoginResponse:
    if not verify_admin_password(settings, body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password"
        )
    token, expires_at = create_admin_token(settings, display_name=body.name or "admin")
    return LoginResponse(token=token, expires_at=expires_at)
```

Also update each admin-router handler's `_: str = Depends(require_admin)` annotation to `_: dict = Depends(require_admin)` at `admin.py:62,67,72,77,82,87,92,97,102`. The underscore means they don't read the value — only the annotation changes.

- [ ] **Step 7: Run all admin-auth tests**

```bash
pytest tests/test_admin_auth.py -v
```

Expected: all PASS. If any existing test asserted `require_admin`'s return value was `"admin"` (a string), update it to read `claim["sub"]`.

- [ ] **Step 8: Commit**

```bash
git add backend/app/deps.py backend/app/routes/admin.py backend/app/schemas_api.py tests/test_admin_auth.py
git commit -m "feat(auth): embed admin display name in JWT claim (prep for S-1/F-2)"
```

---

## Task 3: Gate `/api/quotes/*` behind `require_admin` and derive `created_by` server-side (S-1, F-2/S-13)

**Files:**
- Modify: `backend/app/routes/quotes.py` (all six handlers)
- Modify: `backend/app/schemas_api.py:227-233` (drop client-controllable `created_by`)
- Modify: `backend/app/quotes_storage.py:70-77` (accept `created_by` as separate arg)
- Test: `tests/test_quotes_routes.py` (rewrite for auth)

- [ ] **Step 1: Write failing tests for each route requiring auth**

Append to `tests/test_quotes_routes.py`:

```python
def test_list_quotes_requires_auth(client):
    resp = client.get("/api/quotes")
    assert resp.status_code == 401


def test_create_quote_requires_auth(client, saved_quote_payload):
    resp = client.post("/api/quotes", json=saved_quote_payload)
    assert resp.status_code == 401


def test_delete_quote_requires_auth(client):
    resp = client.delete("/api/quotes/any-id")
    assert resp.status_code == 401


def test_get_quote_requires_auth(client):
    resp = client.get("/api/quotes/any-id")
    assert resp.status_code == 401


def test_get_quote_pdf_requires_auth(client):
    resp = client.get("/api/quotes/any-id/pdf")
    assert resp.status_code == 401


def test_duplicate_quote_requires_auth(client):
    resp = client.post("/api/quotes/any-id/duplicate")
    assert resp.status_code == 401


def test_create_quote_sets_created_by_from_token_not_body(admin_client, saved_quote_payload):
    # Log in as "Alice"
    admin_client.headers.pop("Authorization", None)
    login = admin_client.post(
        "/api/admin/login",
        json={"password": "test-password", "name": "Alice"},
    )
    admin_client.headers["Authorization"] = f"Bearer {login.json()['token']}"

    # Attempt to forge created_by=Bob in the body
    payload = dict(saved_quote_payload)
    payload.pop("created_by", None)  # server should ignore if present anyway

    resp = admin_client.post("/api/quotes", json=payload)
    assert resp.status_code == 201
    assert resp.json()["created_by"] == "Alice"
```

You will need a `saved_quote_payload` fixture. Add to `tests/conftest.py`:

```python
@pytest.fixture
def saved_quote_payload() -> dict:
    return {
        "name": "Test quote",
        "project_name": "Test project",
        "client_name": None,
        "notes": None,
        "inputs": {
            "industry_segment": "Automotive",
            "system_category": "Assembly",
            "automation_level": "Fully automated",
            "stations": 4,
            "robot_count": 2,
            "conveyor_length_ft": 40,
            "plc_family": "Allen-Bradley",
            "hmi_family": "FactoryTalk",
            "vision_type": "None",
        },
        "prediction": {
            "total_p10": 100.0,
            "total_p50": 150.0,
            "total_p90": 200.0,
            "by_operation": {},
            "by_bucket": {},
        },
        "quoted_hours_by_bucket": None,
    }
```

(Adjust the nested shapes if `QuoteInput`/`QuotePrediction` in `core/schemas.py` differ — run the test once and let pydantic tell you what it wants.)

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_quotes_routes.py -v
```

Expected: all new `*_requires_auth` tests FAIL with 201/200/204 instead of 401.

- [ ] **Step 3: Drop `created_by` from the request body schema**

In `backend/app/schemas_api.py`, replace `SavedQuoteCreate` and add `SavedQuoteCreateBody`:

```python
class SavedQuoteCreateBody(BaseModel):
    """Public request schema — `created_by` is derived server-side from the JWT."""
    name: str = Field(min_length=1, max_length=120)
    project_name: str = Field(min_length=1, max_length=200)
    client_name: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)
    inputs: QuoteInput
    prediction: QuotePrediction
    quoted_hours_by_bucket: dict[str, float] | None = None


class SavedQuoteCreate(SavedQuoteCreateBody):
    """Internal write model — includes trusted `created_by` from the token."""
    created_by: str = Field(min_length=1, max_length=120)
```

Update `__all__` to include `SavedQuoteCreateBody`. Leave `SavedQuote` inheriting from `SavedQuoteCreate` (so responses still carry `created_by`).

- [ ] **Step 4: Update `quotes.py` routes to use `require_admin` and forward the claim**

Replace the full file `backend/app/routes/quotes.py`:

```python
# backend/app/routes/quotes.py
from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from .. import quotes_storage
from ..deps import require_admin
from ..pdf import render_quote_pdf
from ..schemas_api import (
    SavedQuote,
    SavedQuoteCreate,
    SavedQuoteCreateBody,
    SavedQuoteList,
)

router = APIRouter(prefix="/api/quotes", tags=["quotes"])

_FILENAME_SAFE = re.compile(r"[^A-Za-z0-9_.-]+")


def _safe_filename_part(value: str, max_len: int = 60) -> str:
    return _FILENAME_SAFE.sub("-", value).strip("-")[:max_len] or "quote"


@router.get("", response_model=SavedQuoteList)
def list_quotes(
    _claim: Annotated[dict, Depends(require_admin)],
    project: str | None = None,
    industry: str | None = None,
    search: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> SavedQuoteList:
    return quotes_storage.list_all(project, industry, search, limit, offset)


@router.post("", response_model=SavedQuote, status_code=status.HTTP_201_CREATED)
def create_quote(
    body: SavedQuoteCreateBody,
    claim: Annotated[dict, Depends(require_admin)],
) -> SavedQuote:
    payload = SavedQuoteCreate(**body.model_dump(), created_by=claim["name"])
    return quotes_storage.create(payload)


def _quote_number(created_at: datetime) -> str:
    return f"{created_at:%Y%m%d}-{created_at:%H%M}"


@router.get("/{quote_id}/pdf")
def get_quote_pdf(
    quote_id: str,
    _claim: Annotated[dict, Depends(require_admin)],
) -> Response:
    q = quotes_storage.get(quote_id)
    if q is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    pdf_bytes = render_quote_pdf(q, quote_number=_quote_number(q.created_at))
    fname = (
        f"Matrix-Quote-{_safe_filename_part(q.project_name)}-"
        f"{q.created_at:%Y%m%d}.pdf"
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/{quote_id}", response_model=SavedQuote)
def get_quote(
    quote_id: str,
    _claim: Annotated[dict, Depends(require_admin)],
) -> SavedQuote:
    q = quotes_storage.get(quote_id)
    if q is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    return q


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote(
    quote_id: str,
    _claim: Annotated[dict, Depends(require_admin)],
) -> Response:
    if not quotes_storage.delete(quote_id):
        raise HTTPException(status_code=404, detail="Quote not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{quote_id}/duplicate",
    response_model=SavedQuote,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_quote(
    quote_id: str,
    claim: Annotated[dict, Depends(require_admin)],
) -> SavedQuote:
    q = quotes_storage.duplicate(quote_id, created_by=claim["name"])
    if q is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    return q
```

Note: `duplicate` now takes `created_by` explicitly — update the storage function next.

- [ ] **Step 5: Update `quotes_storage.duplicate` to accept `created_by`**

In `backend/app/quotes_storage.py`, replace `duplicate`:

```python
def duplicate(id_: str, created_by: str | None = None) -> SavedQuote | None:
    src = get(id_)
    if src is None:
        return None
    copy_payload = SavedQuoteCreate(
        name=f"{src.name} (copy)",
        project_name=src.project_name,
        client_name=src.client_name,
        notes=src.notes,
        created_by=created_by or src.created_by,
        inputs=src.inputs,
        prediction=src.prediction,
        quoted_hours_by_bucket=src.quoted_hours_by_bucket,
    )
    return create(copy_payload)
```

- [ ] **Step 6: Update the frontend client to stop sending `created_by`**

In `frontend/src/pages/SingleQuote.tsx` (the only saver), drop the `created_by` field from the POST body. Grep: `rg 'created_by' frontend/src` — there are references in `SingleQuote.tsx` and in `Quotes.tsx` for display. Keep display usage; remove from the write payload only.

Update `frontend/src/api/quote.ts` (the saveQuote helper) to match `SavedQuoteCreateBody`'s shape — no `created_by` key. Example diff:

```diff
 export async function saveQuote(payload: {
   name: string;
   project_name: string;
   client_name: string | null;
   notes: string | null;
-  created_by: string;
   inputs: QuoteInput;
   prediction: QuotePrediction;
   quoted_hours_by_bucket?: Record<string, number> | null;
 }): Promise<SavedQuote> {
   const { data } = await api.post<SavedQuote>("/quotes", payload);
   return data;
 }
```

Drop the `ensureDisplayName()` call site inside `SingleQuote.tsx` wherever it was previously feeding `created_by`. The `UserPill` still shows the local display name for UX — the login payload in Task 2 is what the server trusts.

Wire the `UserPill` name into the `/api/admin/login` call instead. In `frontend/src/pages/AdminLogin.tsx` (or wherever `loginAdmin` lives), include `name: getDisplayName() || undefined` in the request body.

- [ ] **Step 7: Run the full backend + frontend suites**

```bash
pytest -x
```

```bash
cd frontend && npm run typecheck && npm test
```

Expected: all auth tests PASS; frontend typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/routes/quotes.py backend/app/schemas_api.py backend/app/quotes_storage.py \
        frontend/src/api/quote.ts frontend/src/pages/SingleQuote.tsx frontend/src/pages/AdminLogin.tsx \
        tests/conftest.py tests/test_quotes_routes.py
git commit -m "fix(quotes): gate /api/quotes/* behind require_admin and derive created_by from JWT (S-1, F-2/S-13)"
```

---

## Task 4: Run the container as non-root `app` user (I-1)

**Files:**
- Modify: `Dockerfile:10-39`

- [ ] **Step 1: Write the Dockerfile change**

Replace the runtime stage in `Dockerfile` (lines 10-39):

```dockerfile
FROM python:3.11-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/data \
    PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libcairo2 \
        libharfbuzz0b \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY core ./core
COPY service ./service
COPY backend ./backend
COPY --from=frontend /app/frontend/dist ./frontend/dist

RUN useradd --system --uid 10001 --home-dir /app --shell /usr/sbin/nologin app \
    && mkdir -p /data/data/master /data/models \
    && chown -R app:app /app /data

USER app

EXPOSE 8000
CMD ["sh", "-c", "gunicorn backend.app.main:app -k uvicorn.workers.UvicornWorker -w 2 -t 600 -b 0.0.0.0:${PORT}"]
```

- [ ] **Step 2: Build the image locally**

```bash
docker build -t matrix-quote-web:rootcheck .
```

Expected: build succeeds.

- [ ] **Step 3: Verify the runtime user**

```bash
docker run --rm --entrypoint id matrix-quote-web:rootcheck
```

Expected output: `uid=10001(app) gid=10001(app) groups=10001(app)`

- [ ] **Step 4: Smoke test that gunicorn starts as `app` and can write to /data**

```bash
docker run --rm -d --name mqw-smoke \
    -e ADMIN_PASSWORD="x$(openssl rand -hex 8)" \
    -e ADMIN_JWT_SECRET="$(openssl rand -hex 32)" \
    -p 8000:8000 matrix-quote-web:rootcheck
sleep 3
docker logs mqw-smoke | tail -20
docker exec mqw-smoke sh -c 'touch /data/data/master/.write-test && echo OK'
docker rm -f mqw-smoke
```

Expected: gunicorn logs show it bound to 0.0.0.0:8000 without permission errors, and the touch succeeds with `OK`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile
git commit -m "fix(docker): run runtime image as non-root app user (I-1)"
```

---

## Task 5: Pin GitHub Actions to SHAs and add Dependabot (I-2)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Look up the current SHAs for each action**

Run each of these and copy the SHA for the latest `v4.x` / `v5.x` tag. Paste them into the workflow in Step 2.

```bash
gh api repos/actions/checkout/git/ref/tags/v4.1.1 --jq .object.sha
gh api repos/actions/setup-python/git/ref/tags/v5.1.0 --jq .object.sha
gh api repos/actions/setup-node/git/ref/tags/v4.0.3 --jq .object.sha
```

If you don't have `gh` installed, visit each action's GitHub releases page and grab the SHA manually. Dependabot (Task 5 step 4) will keep them fresh afterwards.

- [ ] **Step 2: Replace `.github/workflows/ci.yml` with SHA-pinned actions**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1 — replace with SHA from step 1
      - uses: actions/setup-python@82c7e631bb3cdc910f68e0081d67478d79c6982d # v5.1.0 — replace with SHA from step 1
        with:
          python-version: "3.11"
          cache: pip
      - name: Install
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx ruff
      - name: Lint
        run: ruff check backend tests
      - name: Test
        run: pytest

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1 — replace with SHA
      - uses: actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b # v4.0.3 — replace with SHA
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

**Important:** the SHAs above are placeholders from 2025; replace each with the value your `gh api` call returned before committing.

- [ ] **Step 3: Verify SHAs are valid 40-char hex**

```bash
grep -oE '@[a-f0-9]{40}' .github/workflows/ci.yml | sort -u
```

Expected: three unique 40-char SHAs. If you see short SHAs or tag names, re-do step 2.

- [ ] **Step 4: Create Dependabot config to keep SHAs fresh**

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "ci"

  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "chore(deps)"

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "chore(deps)"

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
    commit-message:
      prefix: "chore(deps)"
```

- [ ] **Step 5: Open a PR and confirm CI still passes**

```bash
git checkout -b chore/pin-actions
git add .github/workflows/ci.yml .github/dependabot.yml
git commit -m "ci: pin GitHub Actions to SHAs and enable Dependabot (I-2)"
git push -u origin chore/pin-actions
gh pr create --fill
```

Wait for CI to go green on the PR before merging.

- [ ] **Step 6: After merge, confirm Dependabot picked up the configuration**

Visit the repo's "Security → Dependabot" tab in GitHub; you should see a scheduled run for each of the four ecosystems within 24 hours.

---

## Done-criteria checklist

- [ ] `pytest -x` passes
- [ ] `cd frontend && npm run typecheck && npm test && npm run build` passes
- [ ] `curl -i http://localhost:8000/api/quotes` returns 401 in a production-mode container
- [ ] `docker run --rm --entrypoint id matrix-quote-web` shows uid=10001
- [ ] `grep -oE '@[a-f0-9]{40}' .github/workflows/ci.yml` prints 3 SHAs
- [ ] JWT decoded after login shows both `sub="admin"` and a non-empty `name` claim
- [ ] Saving a quote as "Alice" persists `created_by="Alice"` regardless of the request body
