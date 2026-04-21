# Code Review 2026-04-20 — Medium-Severity Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 14 Medium findings. Roughly split into four themes: (A) HTTP defense-in-depth (CORS, security headers, upload hardening, filelock); (B) frontend UX resiliency (error boundary, redirect on 401, move JWT out of sessionStorage); (C) backend observability (logger, encoding fix, pagination cap); (D) infra polish (HEALTHCHECK, tini, CORS prod assertion, LFS for model fixtures).

**Architecture:** Assumes both Critical and High plans have landed. Where Medium items build on earlier work (S-5/F-1 depends on the auth story from Critical Task 2, S-8 depends on the `_read_upload` helper from Q-2), notes call it out.

**Tech Stack:** FastAPI, slowapi (already wired), starlette middleware, filelock, httpx TestClient, React, Vitest, Docker, tini, Git LFS.

**Ordering:** Themes are independent; within a theme, tasks are listed in the recommended order. All tasks are small enough to land in one PR each, or bundled by theme.

---

## Theme A: HTTP defense-in-depth

### Task 1: Tighten CORS allow_methods/allow_headers (S-4)

**Files:** `backend/app/main.py:34-40`

- [ ] Replace the `CORSMiddleware` call so methods and headers are explicit (no `*`):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)
```

- [ ] Add a startup assertion that rejects `*` + credentials (covers I-10):

```python
def create_app() -> FastAPI:
    settings = get_settings()
    if "*" in settings.cors_origins_list and not os.environ.get("PYTEST_CURRENT_TEST"):
        raise RuntimeError(
            "CORS_ALLOW_ORIGINS=* is incompatible with allow_credentials=True. "
            "Set an explicit origin list in production."
        )
    # ...rest of setup...
```

- [ ] Run `pytest -x` and `cd frontend && npm test`. Commit:

```bash
git commit -am "fix(cors): explicit methods/headers and refuse * in prod (S-4, I-10)"
```

---

### Task 2: Add a security-headers middleware (S-6)

**Files:** create `backend/app/middleware.py`, modify `backend/app/main.py`

- [ ] **Write the failing test.** Append to `tests/test_health.py`:

```python
def test_security_headers_present(client):
    resp = client.get("/api/health")
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in resp.headers["content-security-policy"]
```

- [ ] Run — expect FAIL.

- [ ] **Create `backend/app/middleware.py`:**

```python
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


_CSP = (
    "default-src 'self'; "
    "img-src 'self' data:; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "connect-src 'self'; "
    "frame-ancestors 'none'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        response.headers.setdefault("Content-Security-Policy", _CSP)
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
        return response
```

- [ ] **Register in `main.py`** (add after the CORS middleware):

```python
from .middleware import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)
```

- [ ] Run — expect PASS. Also verify Google Fonts still load: `cd frontend && npm run build && docker compose up` and open the SPA in a browser; the CSP lets the three Google Fonts origins through per `frontend/index.html:8-13`.

- [ ] Commit:

```bash
git commit -am "feat(security): add default security-header middleware (S-6)"
```

---

### Task 3: Stream uploads + extension allowlist (S-8)

**Files:** `backend/app/routes/quote.py:55-84`

- [ ] **Write the failing tests** (`tests/test_quote_routes.py`):

```python
def test_batch_rejects_non_xlsx_extension(client):
    resp = client.post(
        "/api/quote/batch",
        files={"file": ("data.exe", b"MZ\x90\x00", "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert "extension" in resp.json()["detail"].lower()


def test_batch_preview_rejects_non_xlsx_extension(client):
    resp = client.post(
        "/api/quote/batch/preview",
        files={"file": ("data.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400
```

- [ ] Run — expect FAIL.

- [ ] **Replace `_read_upload` and `batch_preview`** in `backend/app/routes/quote.py`:

```python
from tempfile import SpooledTemporaryFile

ALLOWED_EXTENSIONS = {".xlsx", ".xlsm", ".csv"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
_CHUNK = 1024 * 64


def _validate_extension(filename: str | None) -> str:
    name = (filename or "").lower()
    for ext in ALLOWED_EXTENSIONS:
        if name.endswith(ext):
            return ext
    raise HTTPException(
        status_code=400,
        detail=f"File extension not allowed. Accepted: {sorted(ALLOWED_EXTENSIONS)}",
    )


def _stream_to_bounded_buffer(file: UploadFile) -> io.BytesIO:
    """Copy the upload to a bounded SpooledTemporaryFile; 413 on spill."""
    buf = SpooledTemporaryFile(max_size=MAX_UPLOAD_BYTES)
    total = 0
    while chunk := file.file.read(_CHUNK):
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 10 MB).")
        buf.write(chunk)
    buf.seek(0)
    mem = io.BytesIO(buf.read())
    buf.close()
    return mem


def _read_upload(file: UploadFile, sheet: str | None) -> pd.DataFrame:
    ext = _validate_extension(file.filename)
    buf = _stream_to_bounded_buffer(file)
    if ext == ".csv":
        return pd.read_csv(buf)
    try:
        xls = pd.ExcelFile(buf)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}") from exc
    target_sheet = sheet or xls.sheet_names[0]
    if target_sheet not in xls.sheet_names:
        raise HTTPException(status_code=400, detail=f"Sheet '{target_sheet}' not found")
    return pd.read_excel(xls, sheet_name=target_sheet)
```

And update `batch_preview` to validate extension + stream the same way:

```python
@router.post("/batch/preview", response_model=TrainPreviewResponse)
def batch_preview(file: UploadFile = File(...)) -> TrainPreviewResponse:  # noqa: B008
    _validate_extension(file.filename)
    buf = _stream_to_bounded_buffer(file)
    try:
        xls = pd.ExcelFile(buf)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}") from exc
    columns_per_sheet = {
        s: pd.read_excel(xls, sheet_name=s, nrows=0).columns.astype(str).tolist()
        for s in xls.sheet_names
    }
    return TrainPreviewResponse(sheets=xls.sheet_names, columns_per_sheet=columns_per_sheet)
```

- [ ] Run — expect PASS. Commit:

```bash
git commit -am "fix(upload): enforce extension allowlist and stream-in uploads with 413 cap (S-8)"
```

---

### Task 4: Serialize quote writes with `filelock` (S-9)

**Files:** `backend/app/quotes_storage.py`, `backend/app/paths.py`

- [ ] **Write the failing test.** Append to `tests/test_quotes_storage.py`:

```python
import threading


def test_concurrent_creates_all_persist(saved_quote_payload, admin_client):
    """5 concurrent POSTs must all end up in storage."""
    from backend.app import quotes_storage
    from backend.app.schemas_api import SavedQuoteCreate

    def make_one(i: int) -> None:
        payload = SavedQuoteCreate(**saved_quote_payload, created_by=f"tester-{i}")
        payload = payload.model_copy(update={"name": f"Concurrent {i}"})
        quotes_storage.create(payload)

    threads = [threading.Thread(target=make_one, args=(i,)) for i in range(5)]
    for t in threads: t.start()
    for t in threads: t.join()

    rows = quotes_storage.list_all().rows
    names = sorted(r.name for r in rows)
    assert names == [f"Concurrent {i}" for i in range(5)]
```

Note: this test may already pass on a fast machine because the race window is tiny. Forcing a reproduction means adding a synthetic delay — skip if the test is already flaky and just ship the lock.

- [ ] **Use `filelock` inside the write path.** In `backend/app/quotes_storage.py`:

```python
from contextlib import contextmanager
from filelock import FileLock, Timeout

from .paths import quotes_parquet_path


@contextmanager
def _quotes_write_lock():
    path = quotes_parquet_path()
    lock_path = path.with_suffix(path.suffix + ".lock")
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with FileLock(str(lock_path), timeout=5.0):
            yield
    except Timeout as exc:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Quotes store is busy, try again.",
        ) from exc


def create(payload: SavedQuoteCreate) -> SavedQuote:
    with _quotes_write_lock():
        df = _load()
        id_ = uuid.uuid4().hex
        created_at = datetime.now(UTC)
        row = _row_from(payload, id_, created_at)
        df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
        _atomic_write(df)
    return SavedQuote(id=id_, created_at=created_at, **payload.model_dump())


def delete(id_: str) -> bool:
    with _quotes_write_lock():
        df = _load()
        before = len(df)
        df = df[df["id"] != id_]
        if len(df) == before:
            return False
        _atomic_write(df)
    return True
```

`duplicate` composes `get` + `create`; the nested `create` already takes the lock. Leave as-is.

- [ ] Run `pytest tests/test_quotes_storage.py -v` and commit:

```bash
git commit -am "fix(quotes): serialize parquet writes with FileLock (S-9)"
```

---

## Theme B: Frontend resiliency

### Task 5: Root React error boundary (F-3)

**Files:** create `frontend/src/components/RootErrorBoundary.tsx`, modify `frontend/src/main.tsx`

- [ ] **Create `RootErrorBoundary.tsx`:**

```tsx
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send to stderr; a server-side log drain (future) can scrape it.
    console.error("RootErrorBoundary", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-white p-12 font-sans text-ink">
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="mt-4">
            A page in the Matrix Quote Web app crashed. Reload to recover, or
            copy the details below and send them to engineering.
          </p>
          <pre className="mt-6 overflow-auto rounded bg-slate-100 p-4 text-xs">
            {this.state.error.stack || this.state.error.message}
          </pre>
          <button
            className="mt-6 rounded-md bg-teal-600 px-4 py-2 text-white"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Wrap `<App />` in `frontend/src/main.tsx`:**

```tsx
import { RootErrorBoundary } from "./components/RootErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </RootErrorBoundary>
  </StrictMode>
);
```

- [ ] **Add a test.** Create `frontend/src/components/RootErrorBoundary.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { RootErrorBoundary } from "./RootErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("boom");
}

it("shows the fallback when a child throws", () => {
  const originalError = console.error;
  console.error = () => {}; // suppress React's error log
  render(
    <RootErrorBoundary>
      <Boom />
    </RootErrorBoundary>
  );
  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  expect(screen.getByText(/boom/)).toBeInTheDocument();
  console.error = originalError;
});
```

- [ ] Run `npm test` and commit:

```bash
git commit -am "feat(frontend): add root React error boundary with reload fallback (F-3)"
```

---

### Task 6: Redirect to `/admin/login` on 401 (F-4)

**Files:** `frontend/src/api/client.ts`

- [ ] **Write a failing test** at `frontend/src/api/client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api, setAdminToken } from "./client";

describe("api 401 handler", () => {
  const assignMock = vi.fn();
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: assignMock, href: "/current" },
      writable: true,
    });
    assignMock.mockClear();
    setAdminToken("old-token");
  });

  it("clears token and redirects to /admin/login on 401", async () => {
    const mock = new MockAdapter(api);
    mock.onGet("/ping").reply(401);
    await expect(api.get("/ping")).rejects.toBeTruthy();
    expect(sessionStorage.getItem("matrix-admin-token")).toBeNull();
    expect(assignMock).toHaveBeenCalledWith("/admin/login");
  });
});
```

- [ ] Run — expect FAIL.

- [ ] **Update the response interceptor** in `frontend/src/api/client.ts`:

```ts
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAdminToken();
      // Don't loop on the login endpoint itself
      if (!window.location.pathname.startsWith("/admin/login")) {
        window.location.assign("/admin/login");
      }
    }
    return Promise.reject(error);
  },
);
```

- [ ] Run `npm test` — expect PASS. Commit:

```bash
git commit -am "fix(frontend): redirect to /admin/login on 401 instead of toast-spam (F-4)"
```

---

### Task 7: Move admin JWT into an HttpOnly cookie (F-1 / S-5)

**Files:** `backend/app/routes/admin.py`, `backend/app/deps.py`, `frontend/src/api/client.ts`, `frontend/src/pages/AdminLogin.tsx`

**Scope warning:** This is the largest Medium item. Plan for one dedicated PR. It introduces CSRF considerations.

- [ ] **Flip login to set an `HttpOnly; SameSite=Strict; Secure` cookie** instead of returning the JWT in the body. Keep the body response for backwards compat during migration:

```python
# backend/app/routes/admin.py
@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    body: LoginRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    response: Response,
) -> LoginResponse:
    if not verify_admin_password(settings, body.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    token, expires_at = create_admin_token(settings, display_name=body.name or "admin")
    response.set_cookie(
        "mqw_admin",
        token,
        max_age=settings.admin_token_expiry_hours * 3600,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/api",
    )
    return LoginResponse(token=token, expires_at=expires_at)
```

Add a matching logout endpoint:

```python
@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie("mqw_admin", path="/api")
    return {"ok": True}
```

- [ ] **Teach `require_admin` to prefer the cookie** over the `Authorization` header:

```python
def require_admin(
    authorization: Annotated[str | None, Header()] = None,
    mqw_admin: Annotated[str | None, Cookie()] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> dict[str, str]:
    token: str | None = None
    if mqw_admin:
        token = mqw_admin
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(
            401, "Missing admin credentials", headers={"WWW-Authenticate": "Bearer"}
        )
    # ...rest of existing token-decode logic...
```

- [ ] **Add CSRF protection** for state-changing routes (cookie auth alone is vulnerable to CSRF). Introduce a double-submit CSRF token: a JS-readable cookie + matching header.

Add middleware `backend/app/middleware.py`:

```python
class CsrfMiddleware(BaseHTTPMiddleware):
    """Double-submit CSRF guard for cookie-authenticated state changes."""
    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method not in self.SAFE_METHODS and request.url.path.startswith("/api"):
            # Only enforce when the cookie is present (header-auth clients are CORS-scoped)
            cookie_tok = request.cookies.get("mqw_csrf")
            header_tok = request.headers.get("X-CSRF-Token")
            cookie_auth = request.cookies.get("mqw_admin") is not None
            if cookie_auth and (not cookie_tok or cookie_tok != header_tok):
                return Response(status_code=403, content="CSRF token mismatch")
        return await call_next(request)
```

And on `POST /api/admin/login`, also set `mqw_csrf` as a **JS-readable** (not HttpOnly) cookie with the same lifetime. The frontend reads it once and echoes it on every state-changing call.

- [ ] **Update `frontend/src/api/client.ts`:**

```ts
import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,  // NEW: send the HttpOnly cookie
});

function readCookie(name: string): string | null {
  return document.cookie.split("; ").find(c => c.startsWith(name + "="))?.split("=")[1] ?? null;
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toLowerCase();
  if (!["get", "head", "options"].includes(method)) {
    const csrf = readCookie("mqw_csrf");
    if (csrf) config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});
```

Drop the sessionStorage helpers or leave them for now as a compatibility layer; `setAdminToken` becomes a no-op.

- [ ] **Update `AdminLogin.tsx`** to stop calling `setAdminToken(token)` — the cookie is already set by the response. On `/admin/logout`, call `api.post("/admin/logout")` and hard-reload.

- [ ] **Write an integration test** that posts a login, confirms the `Set-Cookie` header, then hits a protected route using the cookie — no Authorization header:

```python
def test_login_sets_admin_cookie_and_protected_route_accepts_it(client):
    r = client.post("/api/admin/login", json={"password": "test-password", "name": "Alice"})
    assert r.status_code == 200
    assert "mqw_admin" in r.cookies

    # TestClient auto-forwards cookies
    r2 = client.get("/api/quotes")
    assert r2.status_code == 200
```

- [ ] Run `pytest -x` and `cd frontend && npm test`. Commit as one PR:

```bash
git commit -am "feat(auth): move admin JWT to HttpOnly cookie + CSRF double-submit (F-1/S-5)"
```

---

## Theme C: Backend observability

### Task 8: Install structured logging (Q-4)

**Files:** `backend/app/logging_config.py` (new), `backend/app/main.py`, every module that currently uses `print()` or silent `except`

- [ ] **Create `backend/app/logging_config.py`:**

```python
from __future__ import annotations

import logging
import sys


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    )
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    # Avoid duplicating gunicorn's own handlers
    if not any(isinstance(h, logging.StreamHandler) for h in root.handlers):
        root.addHandler(handler)
```

- [ ] **Call it from `create_app`:**

```python
from .logging_config import configure_logging

def create_app() -> FastAPI:
    configure_logging()
    # ...
```

- [ ] **Replace silent `except` blocks.** In `backend/app/routes/quote.py`:

```python
import logging
logger = logging.getLogger(__name__)

try:
    drivers = compute_drivers(payload, top_n=3)
except Exception:
    logger.exception("compute_drivers failed; falling back to None")
    drivers = None
try:
    neighbors = compute_neighbors(payload, k=5)
except Exception:
    logger.exception("compute_neighbors failed; falling back to None")
    neighbors = None
```

Repeat in `backend/app/explain.py:172, 203`. Also replace any `print(...)` in `core/models.py` with `logger.info(...)` after adding a module logger.

- [ ] Run `pytest -x`; the suite should pass and you can spot-check logs via `pytest -s -k drivers`.

- [ ] Commit:

```bash
git commit -am "feat(logging): install dictConfig-style logger and log explain failures (Q-4)"
```

---

### Task 9: Force UTF-8 on `demo.py` file I/O (Q-6)

**Files:** `backend/app/demo.py:37,45`

- [ ] Replace the `read_text()` and `write_text()` calls:

```python
path.read_text(encoding="utf-8")
path.write_text(json.dumps(payload), encoding="utf-8")
```

- [ ] Add a quick test in `tests/test_demo_mode.py`:

```python
def test_demo_status_round_trip_is_utf8_safe(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    from backend.app import demo
    demo.write_status({"is_demo": True, "note": "café"})  # non-ASCII
    got = demo.read_status()
    assert got.get("note") == "café"
```

- [ ] Run `pytest tests/test_demo_mode.py -v` and commit:

```bash
git commit -am "fix(demo): force utf-8 encoding on status file read/write (Q-6)"
```

---

### Task 10: Cap `/api/quotes` pagination (Q-3 route)

**Files:** `backend/app/routes/quotes.py:19-27`

- [ ] Replace the handler signature to use `Query` with bounds:

```python
from fastapi import Query

@router.get("", response_model=SavedQuoteList)
def list_quotes(
    _claim: Annotated[dict, Depends(require_admin)],
    project: str | None = None,
    industry: str | None = None,
    search: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> SavedQuoteList:
    return quotes_storage.list_all(project, industry, search, limit, offset)
```

- [ ] Add a test:

```python
def test_list_quotes_rejects_oversized_limit(admin_client):
    resp = admin_client.get("/api/quotes?limit=1000000")
    assert resp.status_code == 422
```

- [ ] Commit:

```bash
git commit -am "fix(quotes): cap list_quotes limit at 500 via Query validator (Q-3)"
```

---

## Theme D: Infra polish

### Task 11: Add HEALTHCHECK + `tini` as init process (I-7, I-8)

**Files:** `Dockerfile`

- [ ] After the `apt-get install` block, add `tini`:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libharfbuzz0b \
        fonts-liberation \
        tini \
    && rm -rf /var/lib/apt/lists/*
```

- [ ] Before `CMD`, add a HEALTHCHECK and switch to `exec` form with tini as PID 1:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD wget -qO- "http://127.0.0.1:${PORT:-8000}/api/health" >/dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["gunicorn", "backend.app.main:app", "-k", "uvicorn.workers.UvicornWorker", \
     "-w", "2", "-t", "600", "-b", "0.0.0.0:8000"]
```

(The `${PORT}` expansion now needs gunicorn flags that respect the env var. If Railway needs a literal `${PORT}` expansion, keep the `sh -c` form but wrap it in tini: `CMD ["/usr/bin/tini", "--", "sh", "-c", "gunicorn ..."]`.)

- [ ] Remove the duplicated startCommand from `railway.json` (or keep only one source). Recommended: drop `startCommand` from `railway.json` since the Dockerfile CMD wins on Docker-builder deploys.

- [ ] Build and smoke-test:

```bash
docker build -t matrix-quote-web:tini .
docker run --rm -d --name mqw -p 8000:8000 \
    -e ADMIN_PASSWORD="$(openssl rand -hex 20)" \
    -e ADMIN_JWT_SECRET="$(openssl rand -hex 32)" \
    matrix-quote-web:tini
sleep 8
docker inspect --format='{{.State.Health.Status}}' mqw
docker kill --signal=SIGTERM mqw  # tini should forward; container exits cleanly
docker rm -f mqw 2>/dev/null || true
```

Expected: Health status transitions to `healthy`, and SIGTERM exits within 2-3 seconds (not the 10s docker-stop default).

- [ ] Commit:

```bash
git commit -am "chore(docker): add tini init + HEALTHCHECK (I-7, I-8)"
```

---

### Task 12: File a tracking issue for `weasyprint` upgrade (I-9)

**Files:** none in-repo — open a GitHub issue.

- [ ] Open an issue titled "Revisit weasyprint==62.3 pin when 63.x ships" with the body linking to `reference_dep_pins.md` context and the `requirements.txt` comment. Label `tech-debt`, assign to yourself. No code change.

---

### Task 13: Migrate `demo_assets/models/*.joblib` to Git LFS (I-11)

**Files:** `.gitattributes` (create), and the `demo_assets/` tracked binaries

**Scope warning:** This rewrites history for the affected files if you use `git lfs migrate import`. If you'd rather not rewrite history, skip the migrate step and only enroll new/changed joblib files going forward.

- [ ] Install Git LFS: `git lfs install`

- [ ] Create `.gitattributes`:

```
demo_assets/models/**/*.joblib filter=lfs diff=lfs merge=lfs -text
tests/fixtures/tiny_models/**/*.joblib filter=lfs diff=lfs merge=lfs -text
```

- [ ] For new files, just add/commit and LFS handles them automatically. For existing tracked binaries, either:
  - (Low risk) Track going forward only: `git add .gitattributes && git commit -m "chore(lfs): track joblib fixtures"`.
  - (Rewrites history) `git lfs migrate import --include="demo_assets/models/*.joblib,tests/fixtures/tiny_models/**/*.joblib" --everything` — coordinate with every contributor first.

- [ ] Push and verify: `git lfs ls-files` should list the joblibs. Storage moves from the main repo to LFS, shrinking every future clone.

- [ ] Commit (for the low-risk path):

```bash
git add .gitattributes
git commit -m "chore(lfs): enroll joblib fixtures in Git LFS going forward (I-11)"
```

---

## Done-criteria checklist

- [ ] `curl -I http://localhost:8000/api/health` returns `X-Content-Type-Options`, `X-Frame-Options`, CSP, and HSTS headers
- [ ] CORS origin list cannot contain `*` in prod (startup aborts)
- [ ] Uploading a `.exe` to `/api/quote/batch` returns 400
- [ ] 5 concurrent POSTs to `/api/quotes` all persist (run the threaded test)
- [ ] Frontend root error boundary renders on any thrown render
- [ ] 401 response redirects to `/admin/login` instead of silent toast-spam
- [ ] `GET /api/quotes` with the cookie (no `Authorization` header) returns 200
- [ ] POST to `/api/quotes` without the CSRF header returns 403 when only the cookie is attached
- [ ] `docker inspect --format='{{.State.Health.Status}}' <container>` eventually reads `healthy`
- [ ] SIGTERM against the running container exits in ≤3s
- [ ] `git lfs ls-files` lists the joblib fixtures (if the full migration path was taken)
