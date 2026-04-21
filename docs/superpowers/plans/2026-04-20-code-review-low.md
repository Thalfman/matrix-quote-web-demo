# Code Review 2026-04-20 — Low-Severity / Nitpick Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close Low-severity and Nitpick findings. These are schedulable — each is small (single-digit minutes). Tackle them opportunistically while already in the affected file, or bundle by theme.

**Architecture:** No new modules, no new deps. Pure tidy-up. Grouped by file/area for easy batching.

**Ordering:** Tasks are fully independent. Do any subset, in any order.

---

## Backend security — Low

### Task 1: Add a `url_fetcher` guard to WeasyPrint (S-10)

**File:** `backend/app/pdf.py:90-93`

- [ ] Add a URL fetcher that only resolves paths inside `TEMPLATES_DIR`:

```python
from pathlib import Path
from weasyprint import HTML, default_url_fetcher

TEMPLATES_DIR = Path(__file__).parent / "templates"


def _scoped_url_fetcher(url: str):
    if url.startswith("file://"):
        local = Path(url[len("file://"):]).resolve()
        if TEMPLATES_DIR.resolve() not in local.parents and local != TEMPLATES_DIR.resolve():
            raise PermissionError(f"URL outside templates dir: {url}")
    elif url.startswith(("http://", "https://")):
        raise PermissionError(f"Remote URL fetch blocked: {url}")
    return default_url_fetcher(url)
```

- [ ] Pass it to `HTML(...)`:

```python
HTML(string=rendered_html, base_url=str(TEMPLATES_DIR), url_fetcher=_scoped_url_fetcher)
```

- [ ] Commit: `git commit -am "fix(pdf): scope WeasyPrint url_fetcher to templates dir only (S-10)"`

---

### Task 2: Disable `/docs` and `/openapi.json` in production (S-11)

**File:** `backend/app/main.py:28-32`

- [ ] Gate the URLs on an `ENV` flag:

```python
import os

def create_app() -> FastAPI:
    is_prod = os.environ.get("ENV", "dev").lower() == "prod"
    app = FastAPI(
        title="Matrix Quote Web",
        version="0.1.0",
        description="...",
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )
```

- [ ] Update `railway.json` to set `ENV=prod` alongside the other env vars. Document in `.env.example`:

```
# Deployment mode. Set to "prod" to hide /docs and /openapi.json.
ENV=dev
```

- [ ] Commit: `git commit -am "chore(api): hide /docs and /openapi.json when ENV=prod (S-11)"`

---

### Task 3: Add `iat`/`iss` claims to the JWT (S-12)

**File:** `backend/app/deps.py:42-48, 76`

- [ ] In `create_admin_token`:

```python
claims = {
    "sub": "admin",
    "name": display_name or "admin",
    "iat": datetime.now(UTC),
    "iss": "matrix-quote-web",
    "exp": expires_at,
}
```

- [ ] In `require_admin`, validate the issuer:

```python
claims = jwt.decode(
    token,
    settings.admin_jwt_secret,
    algorithms=[JWT_ALGORITHM],
    issuer="matrix-quote-web",
)
```

- [ ] Existing auth tests should continue to pass because the issuer matches itself.

- [ ] Commit: `git commit -am "chore(auth): add iat and iss claims to admin JWT (S-12)"`

---

## Backend quality — Low / Nitpick

### Task 4: Normalize `now()` helpers (Q-7)

**Files:** `backend/app/pdf.py:87`, `backend/app/routes/quote.py:119`, `backend/app/insights.py:22,30,40-42`

- [ ] Replace every `datetime.utcnow()` with `datetime.now(UTC).replace(tzinfo=None)` (if a naive timestamp is needed) or `datetime.now(UTC)` (if tz-aware is fine).
- [ ] In `insights.py`, pass `utc=True` to every `pd.to_datetime(...)` call so mixed-tz data doesn't raise (also closes Q-12):

```python
pd.to_datetime(df["created_at"], errors="coerce", utc=True)
```

- [ ] Commit: `git commit -am "chore: replace deprecated datetime.utcnow() and force utc=True on pd.to_datetime (Q-7, Q-12)"`

---

### Task 5: Remove the unused `Settings.data_dir` field (Q-8)

**File:** `backend/app/deps.py:19`

- [ ] Drop the field. Search first: `rg 'settings\.data_dir|\.data_dir' backend core service` — must be empty before removal. `paths.data_dir()` reads `os.environ["DATA_DIR"]` directly.
- [ ] Commit: `git commit -am "chore(deps): drop unused Settings.data_dir field (Q-8)"`

---

### Task 6: Delete vestigial `MapeRow` schema (Q-9)

**File:** `backend/app/schemas_api.py:270-273` and `__all__` entry at line 54

- [ ] Grep: `rg 'MapeRow' backend frontend tests` — should show only `schemas_api.py` and its `__all__` entry.
- [ ] Remove the class and the `__all__` string.
- [ ] Leave `paths.train_lock_path` in place (used later for S-9 filelock per the Medium plan).
- [ ] Commit: `git commit -am "chore(schemas): remove unused MapeRow (Q-9)"`

---

### Task 7: Promote `_demo_enabled_env()` to public API (Q-10)

**File:** `backend/app/demo.py`, `backend/app/routes/metrics.py:148`

- [ ] Rename `_demo_enabled_env` → `is_enabled_via_env`. Update the one caller in `metrics.py`.
- [ ] Commit: `git commit -am "chore(demo): promote _demo_enabled_env to is_enabled_via_env (Q-10)"`

---

### Task 8: Type the `batch_preview` response (Q-11)

**File:** `backend/app/routes/quote.py:73-84`

Already handled in High Task 8. Skip if that shipped; otherwise add `response_model=TrainPreviewResponse` per the High plan.

---

### Task 9: Fill test coverage gaps (Q-12)

**Files:** new tests under `tests/`

Write small tests for the untested paths noted in the review:

- [ ] `tests/test_metrics_routes.py` — empty-state of `/api/metrics/history`, `/calibration`, `/headline` when the parquets don't exist (they should return `[]` / `PerformanceHeadline()` respectively).
- [ ] `tests/test_quote_routes.py` — 413 for a >10 MB upload, pagination edges (`offset>=total` returns empty rows, `limit=1` returns exactly 1).
- [ ] `tests/test_admin_auth.py` — admin demo-load when `demo_assets/` is missing; should not 500.

Each test is ~10 lines. Commit after each logical group.

---

### Task 10: Modernize `typing.Optional` / `typing.Dict` in `core/` and `service/` (Q-13)

**Files:** `core/schemas.py`, `core/models.py`, `service/predict_lib.py`

- [ ] Swap `Optional[X]` → `X | None` and `Dict[K, V]` → `dict[K, V]`, `List[X]` → `list[X]`.
- [ ] Add `from __future__ import annotations` at the top of each file if missing.
- [ ] Run `ruff check` to confirm no regressions.
- [ ] Commit: `git commit -am "chore: modernize typing imports to PEP 604 in core/service (Q-13)"`

**Note:** The user feedback memory says unrelated changes shouldn't be bundled. Do this as a standalone PR.

---

### Task 11: Hoist the inline `quotes_parquet_path` import (Q-14)

**File:** `backend/app/routes/insights.py:65`

- [ ] Delete the inline `from ..paths import quotes_parquet_path` and add it to the top-level imports.
- [ ] Document the lazy import in `routes/quote.py:38` with a one-line reason:

```python
# Lazy import: shap TreeExplainer import is ~1s and only needed per-request.
from ..explain import compute_drivers, compute_neighbors
```

- [ ] Commit: `git commit -am "chore(insights): hoist quotes_parquet_path import to module top (Q-14)"`

---

### Task 12: Fix `require_admin(settings=None)` type/default mismatch (Q-15)

**File:** `backend/app/deps.py:57-59`

- [ ] Drop the `= None` default:

```python
def require_admin(
    authorization: Annotated[str | None, Header()] = None,
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
    ...
```

Note: FastAPI will fill `settings` via DI; no default is needed. **Positional-arg ordering matters in Python** — keyword-only args with defaults must follow non-default ones. You may need to reorder or use keyword-only syntax:

```python
def require_admin(
    *,
    authorization: Annotated[str | None, Header()] = None,
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
```

- [ ] Commit: `git commit -am "chore(deps): drop misleading = None default on require_admin.settings (Q-15)"`

---

## Frontend — Low / Nitpick

### Task 13: Replace `prompt()` / `confirm()` with real dialogs (F-5)

**Files:** `frontend/src/pages/SingleQuote.tsx:105,107,138`, `frontend/src/pages/Quotes.tsx:114`, `frontend/src/components/UserPill.tsx:24`, `frontend/src/lib/displayName.ts:22`

- [ ] Introduce a small `Dialog` primitive (or use `sonner` toast + modal lib already in deps). Consolidate the display-name prompts into one `EnsureDisplayNameDialog`.
- [ ] Swap each `confirm(...)` call with an async `confirmDialog(...)` that returns a promise.
- [ ] Remove `prompt(...)` / `confirm(...)` calls entirely. Add one vitest per replaced flow (user clicks "Delete" → modal opens → confirm → request fires).
- [ ] Scope warning: this touches five files; plan a dedicated PR.
- [ ] Commit: `git commit -am "refactor(ui): replace window.prompt/confirm with modal dialogs (F-5)"`

---

### Task 14: Safer `sessionStorage` read in `QuoteForm` (F-6)

**File:** `frontend/src/pages/single-quote/QuoteForm.tsx:40,374-379`

- [ ] Move the `sessionStorage.getItem(...)` read into a `useState(() => ...)` lazy initializer.
- [ ] Wrap `JSON.parse` in try/catch:

```ts
function readLastValues(): LastValues {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_VALUES_KEY) ?? "{}");
  } catch {
    return {};
  }
}
const [lastValues] = useState(readLastValues);
```

- [ ] Commit: `git commit -am "fix(quote-form): guard JSON.parse of cached last-values (F-6)"`

---

### Task 15: Type the `mape` column in `MetricRow` (F-7)

**Files:** `frontend/src/api/types.ts:75-82`, `frontend/src/pages/performance/MapeByOperation.tsx:11,16`

- [ ] Add `mape?: number | null` to the `MetricRow` type.
- [ ] Drop the `as unknown as ...` cast in `MapeByOperation.tsx`.
- [ ] Confirm `npm run typecheck` passes.
- [ ] Commit: `git commit -am "fix(types): add mape to MetricRow and drop escape-hatch cast (F-7)"`

---

### Task 16: Debounce `/quotes` search (F-8)

**File:** `frontend/src/pages/Quotes.tsx:22-30`

- [ ] Wrap `search` in `useDeferredValue` or a 250ms timer:

```ts
import { useDeferredValue } from "react";

const [searchInput, setSearchInput] = useState("");
const search = useDeferredValue(searchInput);
const { data } = useSavedQuotes({ search });
```

- [ ] Also add `staleTime: 30_000` to `useSavedQuotes` in `frontend/src/api/quote.ts:33-41`.
- [ ] Commit: `git commit -am "perf(quotes): debounce search input via useDeferredValue + staleTime (F-8)"`

---

### Task 17: Either wire up the BatchDropzone or hide it (F-9)

**File:** `frontend/src/pages/batch/BatchDropzone.tsx:14,21`

- [ ] If the endpoint isn't landing imminently, disable the drop target and display "Coming soon" copy. If landing soon, wire it to `POST /api/quote/batch` and show a progress spinner.
- [ ] Remove the silent toast-and-discard path.
- [ ] Commit: `git commit -am "fix(batch): disable dropzone until upload endpoint lands (F-9)"`

---

### Task 18: Stabilize `CompareInputDiff` keys (F-10)

**File:** `frontend/src/pages/quotes/CompareInputDiff.tsx:53-57`

- [ ] Replace the bare `key={i}` with `key={`${field}-${i}`}`.
- [ ] Commit: `git commit -am "fix(compare): namespace CompareInputDiff keys by field (F-10)"`

---

### Task 19: Tidy frontend nits (F-11, F-12, F-13)

**Files:** `frontend/src/pages/Quotes.tsx:47`, `frontend/vite.config.ts:8-12`, `frontend/src/api/quote.ts:79-88`

- [ ] F-11: rewrite the comma-ternary at `Quotes.tsx:47` as an if/else.
- [ ] F-12: replace `path.resolve(__dirname, "./src")` with `new URL(".", import.meta.url).pathname + "src"` (idiomatic ESM).
- [ ] F-13: drop the leading underscore on `_streamDownload` and rely on export presence.
- [ ] Commit (small batch): `git commit -am "chore(frontend): idiomatic ESM resolve + tidy two nits (F-11/12/13)"`

---

### Task 20: Route-split `recharts`-heavy pages (F-14)

**Files:** `frontend/src/App.tsx` (router), pages under `frontend/src/pages/performance/` and `frontend/src/pages/insights/`

- [ ] Convert the `ModelPerformance`, `ExecutiveOverview`, and insights widget imports to `React.lazy`:

```tsx
const ModelPerformance = lazy(() => import("./pages/ModelPerformance"));
```

- [ ] Wrap the router in a `<Suspense>` with a spinner fallback.
- [ ] Run `npm run build` and confirm `dist/` now emits at least one extra JS chunk for the heavy page.
- [ ] Commit: `git commit -am "perf(frontend): lazy-load recharts-heavy pages (F-14)"`

---

## Infra — Low / Nitpick

### Task 21: Pin apt packages (I-12)

**File:** `Dockerfile:18-26`

- [ ] Pin the two biggest rendering libs:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpango-1.0-0=1.50.12+ds-1 \
        libpangoft2-1.0-0=1.50.12+ds-1 \
        libcairo2=1.16.0-7 \
        libharfbuzz0b=6.0.0+dfsg-3 \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
```

Check the current Debian bookworm versions with `apt-cache madison libpango-1.0-0` inside the container before committing — versions above are illustrative.

- [ ] Commit: `git commit -am "chore(docker): pin system package versions for reproducibility (I-12)"`

---

### Task 22: Schedule a weekly CI run (I-13)

**File:** `.github/workflows/ci.yml`

- [ ] Add to the existing `on:` block:

```yaml
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:
```

- [ ] Commit: `git commit -am "ci: run weekly schedule and allow workflow_dispatch (I-13)"`

---

### Task 23: Use `npm ci` instead of `npm install` in Dockerfile (I-14)

**File:** `Dockerfile:6`

- [ ] Replace:

```dockerfile
RUN npm ci --no-audit --no-fund
```

Check that `frontend/package-lock.json` is committed (it is — verified).

- [ ] Build to confirm: `docker build -t matrix-quote-web:npm-ci . --progress=plain 2>&1 | grep "npm ci"`

- [ ] Commit: `git commit -am "chore(docker): use npm ci for reproducible frontend build (I-14)"`

---

### Task 24: Name test-only secrets obvious (Q-11 from backend review)

**File:** `tests/conftest.py:17`

- [ ] Prefix the test secret so it's obviously a fixture and nobody copies it into a real env:

```python
monkeypatch.setenv("ADMIN_JWT_SECRET", "TEST-ONLY-test-secret-at-least-32-chars!!")
```

- [ ] Commit: `git commit -am "chore(tests): prefix fixture JWT secret with TEST-ONLY- (Q-11)"`

---

### Task 25: Hot-cache the explain bundle (Q-7 from quality review)

**File:** `backend/app/explain.py:77-78`

- [ ] Wrap `_load_bundle` with an mtime-keyed `lru_cache`:

```python
from functools import lru_cache


@lru_cache(maxsize=1)
def _load_bundle_cached(mtime_ns: int):
    return joblib.load(_bundle_path())


def _load_bundle():
    path = _bundle_path()
    return _load_bundle_cached(path.stat().st_mtime_ns)
```

- [ ] Commit: `git commit -am "perf(explain): cache joblib bundle between requests, invalidate on mtime (Q-7)"`

---

## Done-criteria checklist

Tick the items you actually shipped. This plan is explicitly a "finish as you touch the file" backlog — don't treat it as an all-or-nothing gate.

- [ ] No `datetime.utcnow()` anywhere in `backend/`
- [ ] `rg 'MapeRow|settings\.data_dir' backend frontend` returns zero matches
- [ ] `GET /openapi.json` returns 404 with `ENV=prod`
- [ ] JWT decoded after login shows `iat` and `iss="matrix-quote-web"`
- [ ] `rg 'prompt\(|confirm\(' frontend/src` returns zero matches
- [ ] `rg 'as unknown as' frontend/src` returns zero matches (target: zero; currently 2)
- [ ] `frontend/dist` bundle no longer includes recharts in the landing chunk (check `dist/assets/index-*.js` size drop)
- [ ] Dependabot PRs arrive weekly for `github-actions`, `pip`, `npm`, `docker`
- [ ] `tests/conftest.py` fixture secret is prefixed `TEST-ONLY-`
