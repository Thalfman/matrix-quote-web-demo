# Coding Conventions

**Analysis Date:** 2026-05-04

## Naming Patterns

**Files:**
- React components, pages, layouts: `PascalCase.tsx` (e.g. `QuoteResultPanel.tsx`, `DemoHome.tsx`, `MachineLearningQuoteTool.tsx`).
- Hooks, utilities, adapters, type modules: `camelCase.ts` (e.g. `pyodideClient.ts`, `quoteAdapter.ts`, `featureLabels.ts`, `useHotkey.ts`, `projectHours.ts`).
- Tests: co-located, named `*.test.tsx` for components and `*.test.ts` for non-React modules (e.g. `QuoteResultPanel.test.tsx`, `pyodideClient.test.ts`).
- Python modules: `snake_case.py` (e.g. `predict_lib.py`, `build_demo_static.py`, `build_test_fixtures.py`).
- Page-scoped subdirectories use lowercase singular nouns: `frontend/src/pages/single-quote/`, `frontend/src/pages/quotes/`, `frontend/src/pages/demo/compare/`, `frontend/src/pages/demo/ml/`.

**Functions:**
- TS: `camelCase` for plain functions and adapters (e.g. `toUnifiedResult`, `humanFeatureLabel`, `sumActualHours`, `transformToQuoteInput`).
- TS: `useXxx` for React hooks (e.g. `useDropdowns`, `useSingleQuote`, `useDemoManifest`, `useHotkey`, `useCountUp`).
- TS: `ensureXxx` / `predictXxx` / `getXxx` for pyodide lifecycle and predict APIs in `frontend/src/demo/pyodideClient.ts` (e.g. `ensurePyodideReady`, `ensureModelsReady`, `predictQuote`, `getFeatureImportances`).
- Python: `snake_case` for functions (`predict_quote`, `predict_quotes_df`, `prepare_quote_features`, `_compute_indices_inplace`, `train_one_op`).
- Python: leading underscore for module-private helpers (`_quote_to_df`, `_compute_confidence`, `_to_bool01`, `_records`, `_die`).

**Variables:**
- TS: `camelCase` for locals; `SCREAMING_SNAKE_CASE` for module-level constants (e.g. `PYODIDE_VERSION`, `JOBLIB_FILES`, `PY_FILES`, `TOKEN_KEY`, `DEMO_ASSETS`, `IS_DEMO`).
- Python: `SCREAMING_SNAKE_CASE` for module-level constants (`TARGETS`, `SALES_BUCKETS`, `SALES_BUCKET_MAP`, `QUOTE_NUM_FEATURES`, `QUOTE_CAT_FEATURES`, `REPO_ROOT`, `OUT`, `SYNTHETIC_POOL_CAP`).
- Internal pure-data lookups in components: capitalised camel-style record names (e.g. `CONFIDENCE_LABEL`, `MAGNITUDE_LABEL`, `NUM_LABELS`, `CAT_LABELS`, `COPY` in `frontend/src/components/quote/QuoteResultPanel.tsx` and `frontend/src/components/DataProvenanceNote.tsx`).

**Types:**
- TS: `PascalCase` for type aliases, unions, and interfaces (e.g. `QuoteInput`, `QuotePrediction`, `OpPrediction`, `UnifiedQuoteResult`, `Dataset`, `PyodideStage`, `PyodideStatus`, `ProjectRecord`, `DemoManifest`, `Chip`).
- Pydantic models: `PascalCase` (e.g. `QuoteInput`, `OpPrediction`, `SalesBucketPrediction`, `QuotePrediction` in `core/schemas.py`).
- Status / discriminator strings keep lower-case literals: `"high" | "medium" | "low"`, `"high" | "moderate" | "lower"`, `"increases" | "decreases"`, `"strong" | "moderate" | "minor"`, `"real" | "synthetic"`.

## Code Style

**Formatting:**
- No Prettier config file present; formatting is left to ESLint defaults plus `tsc --noEmit` (no `.prettierrc`, `.prettierrc.js`, `.prettierignore`, `eslint.config.json`-style format rules).
- Indentation: 2 spaces in `*.ts`/`*.tsx`, 4 spaces in `*.py`. Both styles are used consistently.
- Strings: double quotes in TS/TSX (`"foo"`); single quotes in Python (`'foo'` / `"foo"` mixed but matching surrounding module).
- Trailing commas: TS/TSX files use trailing commas in multi-line object/array literals (e.g. `frontend/src/api/quote.ts`).

**Linting:**
- TypeScript: ESLint flat config at `frontend/eslint.config.js`.
  - Extends `js.configs.recommended` and `tseslint.configs.recommended`.
  - Plugins: `react-hooks`, `react-refresh`.
  - Custom rules:
    - `react-refresh/only-export-components` (warn, `allowConstantExport: true`).
    - `@typescript-eslint/no-unused-vars` (warn, with `argsIgnorePattern: "^_"` and `varsIgnorePattern: "^_"` — i.e. prefix `_` to silence).
  - Run: `cd frontend && npm run lint` (which is `eslint . --report-unused-disable-directives --max-warnings 0`).
- TypeScript compiler: `frontend/tsconfig.json`.
  - `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`.
  - `"target": "ES2020"`, `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`, `"isolatedModules": true`, `"noEmit": true`.
  - Path alias: `"@/*"` → `"./src/*"` (used everywhere — see import section).
- Python: no `ruff`, `black`, `pyproject.toml`, `.ruff.toml`, `pytest.ini`, `setup.cfg`, or `tox.ini` is present at the repo root. Style is informal and follows PEP 8 by hand. Type hints are used selectively (`from __future__ import annotations` is enabled in `scripts/build_demo_static.py` and `scripts/build_test_fixtures.py`; `core/*.py` and `service/predict_lib.py` use hints inline without the future import).

## Import Organization

**Order (TypeScript — observed pattern, not enforced by lint):**

1. Third-party packages (React, hooks, libraries) — first block, no `@/` prefix.
2. Blank line.
3. Project imports under the `@/` alias, grouped roughly by layer (`@/api/...`, `@/components/...`, `@/lib/...`, `@/demo/...`, `@/pages/...`).
4. Blank line.
5. Local relative imports (`./...`) — sibling files in the same folder.

Example from `frontend/src/pages/demo/MachineLearningQuoteTool.tsx`:

```ts
import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import { DataProvenanceNote } from "@/components/DataProvenanceNote";
import { PageHeader } from "@/components/PageHeader";
import { PyodideLoader } from "@/components/PyodideLoader";
import { ensurePyodideReady, ensureModelsReady, predictQuote, getFeatureImportances, subscribe } from "@/demo/pyodideClient";
import { useSyntheticPool } from "@/demo/realProjects";
import { useModelMetrics } from "@/demo/modelMetrics";
import { useHotkey } from "@/lib/useHotkey";
import { QuoteForm } from "@/pages/single-quote/QuoteForm";
import { QuoteResultPanel } from "@/components/quote/QuoteResultPanel";
import { toUnifiedResult } from "@/demo/quoteAdapter";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
```

**Order (Python — observed):**

1. `from __future__ import annotations` (when used).
2. Standard library (`json`, `shutil`, `sys`, `pathlib`, `typing`, `datetime`).
3. Third-party (`numpy`, `pandas`, `pydantic`, `joblib`, `sklearn.*`).
4. Local (`from core.config import ...`, `from .features import ...`).

Example from `service/predict_lib.py`:

```python
from typing import Dict
import pandas as pd
from core.config import (TARGETS, QUOTE_NUM_FEATURES, QUOTE_CAT_FEATURES, SALES_BUCKETS, SALES_BUCKET_MAP)
from core.features import prepare_quote_features
from core.models import load_model, predict_with_interval
from core.schemas import (QuoteInput, QuotePrediction, OpPrediction, SalesBucketPrediction)
```

**Path Aliases:**
- TS: `@/*` resolves to `frontend/src/*`. Alias is configured in both `frontend/tsconfig.json` (`paths`) and `frontend/vite.config.ts` (`resolve.alias`). Always prefer `@/api/...`, `@/components/...`, `@/lib/...`, `@/demo/...`, `@/pages/...` over deep `../../` traversal.
- Python: each script that needs repo-root imports manually inserts `REPO_ROOT` into `sys.path` (see `scripts/build_demo_static.py` line 22-23, `scripts/build_test_fixtures.py`, `tests/scripts/test_build_demo_static.py`).

## Component vs Hook Conventions (React)

**Components (`*.tsx`):**
- Default to **named** exports — `export function Foo()` — never `export default`. App entry (`frontend/src/App.tsx`) is the one allowed `default` export so React's lazy loader can grab it.
- For lazy-loaded routes, use the named-import → default-shape pattern in `frontend/src/DemoApp.tsx` and `frontend/src/App.tsx`:

```ts
const ComparisonQuote = lazy(() =>
  import("@/pages/demo/compare/ComparisonQuote").then((m) => ({
    default: m.ComparisonQuote,
  })),
);
```

- Props are typed inline (no separate `*Props` interface unless reused). Example from `frontend/src/components/PageHeader.tsx`:

```tsx
export function PageHeader({
  eyebrow, title, description, chips,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  chips?: Chip[];
}) { ... }
```

- Tailwind utility classes are colocated with markup. Use `cn()` from `@/lib/utils` (defined in `frontend/src/lib/utils.ts`) to merge `tailwind-merge` + `clsx` when classes are conditional.
- Class-name lookup tables for variant colours/labels live as module-level `Record<Variant, string>` constants above the component (see `CONFIDENCE_TONE` / `CONFIDENCE_LABEL` / `MAGNITUDE_LABEL` in `frontend/src/components/quote/QuoteResultPanel.tsx`).
- Large pages with state machines, toasts, side effects: always wrap fetch state in TanStack Query (`useQuery` / `useMutation`), never raw `useEffect(() => fetch(...), [])`.
- Class components are reserved for error boundaries only — see `frontend/src/components/RootErrorBoundary.tsx`.

**Hooks (`*.ts`):**
- Files in `frontend/src/lib/` and `frontend/src/api/` (e.g. `frontend/src/api/quote.ts`, `frontend/src/lib/useHotkey.ts`, `frontend/src/lib/useCountUp.ts`).
- Always start with `use`. Always return a value — either the query/mutation object from TanStack Query, or a plain value (`useCountUp` returns the animated number).
- `useEffect` cleanup is mandatory for any subscription or rAF: see `frontend/src/lib/useHotkey.ts` and `frontend/src/lib/useCountUp.ts`.

## Pydantic Schema Patterns

**Location:** `core/schemas.py`.

**Pattern:**
- Subclass `pydantic.BaseModel`. No `BaseModel` config customization — defaults are accepted (Pydantic v2; `model_dump()` is used in `service/predict_lib.py` line 27).
- Required categorical fields: bare `str` annotation (`industry_segment: str`).
- Numeric fields use `float = 0` (or `int = 0` for true 0/1 flags). Defaults make the schema extremely tolerant: a quote can be submitted with only the six categorical fields populated.
- Optional identifier: `project_id: Optional[str] = None`.
- Output models add `Field(..., description="...")` so the OpenAPI spec exposes per-field documentation.
- Container shapes are typed with `Dict[str, OpPrediction]` and `Dict[str, SalesBucketPrediction]`. Use `default_factory=dict` for nested dict defaults (see `QuotePrediction.sales_buckets`).

Example from `core/schemas.py`:

```python
class OpPrediction(BaseModel):
    p50: float = Field(..., description="Median predicted hours")
    p10: float = Field(..., description="Lower bound (10th percentile)")
    p90: float = Field(..., description="Upper bound (90th percentile)")
    std: float = Field(..., description="Std dev across trees")
    rel_width: float = Field(..., description="(p90 - p10) / |p50|")
    confidence: str = Field(..., description="'high' | 'medium' | 'low'")
```

## FastAPI Dependency-Injection Style

**Status:** No live FastAPI app is in this repo. The Python side ships as `core/` (pure feature/model code) plus `service/predict_lib.py` (a plain library exposed for both a future FastAPI route and the build scripts). The Pyodide bundle (`scripts/build_demo_static.py`) copies `core/config.py`, `core/features.py`, and `core/models.py` into `frontend/public/demo-assets/py/` so the same Python runs in the browser.

**Implication for new endpoints (when wired in):**
- Pydantic models from `core/schemas.py` are the wire contract — reuse `QuoteInput`, `QuotePrediction`, `OpPrediction`, `SalesBucketPrediction`. Do not introduce parallel schemas.
- Library functions in `service/predict_lib.py` (`predict_quote(q: QuoteInput) -> QuotePrediction`, `predict_quotes_df(df_in: pd.DataFrame) -> pd.DataFrame`) are the call points — keep route handlers thin: validate → call lib → return.
- Frontend `frontend/src/api/types.ts` is hand-written and explicitly mirrors `core/schemas.py` (header comment lines 1-3); regenerate via `cd frontend && npm run gen:api` once a backend is running.

## Error Handling Conventions

**HTTP error codes (frontend expectations — see `frontend/src/api/client.ts` and route components):**
- `401` → axios response interceptor at `frontend/src/api/client.ts` clears `matrix-admin-token` from `sessionStorage` and redirects to `/admin/login` (avoiding redirect loops on the login page itself). All admin routes assume this implicit handler.
- `409 Conflict` is the demo's empty-state signal — when a list endpoint can't run because no data has been uploaded yet, the backend returns 409 and the frontend shows an `EmptyState` (`frontend/src/components/EmptyState.tsx`) instead of an error toast. New list/aggregation endpoints follow the same pattern: 409 = "no data yet, prompt the admin to upload".
- All other non-2xx → `toast.error(...)` from `sonner` with a short business-language message. Never surface raw HTTP messages to the user.

**Frontend toast pattern (`sonner`):**

```ts
import { toast } from "sonner";

try {
  await api.post(...);
  toast.success("Saved");
} catch (err) {
  toast.error("Could not generate PDF");
}
```

- `Toaster` is mounted once at the root (`frontend/src/main.tsx`) with `richColors position="top-right"`.
- Always catch with a `try`/`catch` that ends in a `toast.error` call. The `try` branch may end with `toast.success` if the operation deserves a confirmation.
- Pyodide failures use a `subscribe(...)` callback that pushes into local component state and renders an inline error card with a refresh button (see `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` lines 178-207) — the alert role and copy ("Couldn't warm up the in-browser runtime…") are part of the visible contract.

**Top-level fallback:**
- `frontend/src/components/RootErrorBoundary.tsx` is wrapped around the entire app in `frontend/src/main.tsx`. Any uncaught render error renders a "Something went wrong" page with the error stack and a Reload button.

**Backend error handling (where present):**
- `scripts/build_demo_static.py` uses a `_die(msg)` helper that prints to stderr and `sys.exit(1)` for build-time failures (missing CSV, malformed columns).
- Library code (`core/`, `service/`) doesn't raise custom exceptions — it returns `None` for "model not found" (`load_model`) and lets exceptions propagate from sklearn/pandas otherwise.

## Logging

**Frontend:** `console.error(...)` only inside `RootErrorBoundary`'s `componentDidCatch`. No general-purpose logger; user-visible errors go via `toast.error`.

**Backend / scripts:** `print(...)` to stdout for progress (`build_demo_static.py`, `build_test_fixtures.py`, `core/models.py`'s `train_one_op`). `print(..., file=sys.stderr)` for warnings (`_copy_model_bundle` warns when joblib bundles are missing or LFS pointers).

**Pyodide (`frontend/src/demo/pyodideClient.ts`):** Uses an in-module status broadcaster (`notify(s)`, `subscribe(fn)`, `latestStatus`). Stages emit human-readable messages — no raw error text leaks to UI; the `error` stage carries a sanitised message string.

## Comments

**When to Comment:**
- Top-of-file module docstrings explain the *role* of the module, not the implementation. Examples:
  - `core/config.py`: `"# Central place for model targets and feature lists."`
  - `service/predict_lib.py`: `"# Small library that exposes prediction functions for single and batch inputs."`
  - `frontend/src/demo/pyodideClient.ts`: `/** Manages the Pyodide runtime and lazy-loads one or both model bundles (Dataset "real" | "synthetic") on demand, caching each after first load. */`
  - `frontend/src/components/quote/QuoteResultPanel.tsx`: `/** Shared result panel used by both Real and Synthetic Quote tabs — renders estimate, likely range, top drivers, per-category H/M/L confidence, and closest matching records. */`
- Section dividers: `// ---------------------------------------------------------------------------` blocks separate logical groupings (state, helpers, public API) inside larger TS modules — see `frontend/src/demo/pyodideClient.ts` and `frontend/src/components/quote/QuoteResultPanel.tsx`.
- Inline comments explain *why* something is structured oddly, e.g. `frontend/src/test/setup.ts` lines 11-14 explain why `Element.prototype.scrollIntoView` is stubbed.

**JSDoc/TSDoc:**
- Used selectively for the most-imported public functions. Block-comment `/** ... */` style is the project's pattern (see `humanFeatureLabel` in `frontend/src/demo/featureLabels.ts`, `recordToPrediction` in `frontend/src/demo/realProjects.ts`, every public function in `frontend/src/demo/pyodideClient.ts`).
- Pydantic uses `Field(description="...")` instead of separate docstrings for output schemas.

## Function Design

**Size:** No hard cap, but most modules keep individual functions under ~50 lines and decompose with private helpers. Larger pieces (e.g. `MachineLearningQuoteTool.tsx`'s `handleSubmit`, ~50 lines) are still single-responsibility (form values → predict → adapt → set state → scroll).

**Parameters:**
- TS: prefer a single object argument once you have more than two parameters. The `AdapterArgs` type for `toUnifiedResult({ input, prediction, importances, metrics, supportingPool, supportingLabel })` in `frontend/src/demo/quoteAdapter.ts` is the canonical example.
- Python: positional with explicit type hints; keyword arguments with defaults for tunables (`train_one_op(df_master, target, models_dir="models", version="v1")`).

**Return Values:**
- Prefer real TS unions and discriminated types over `any`/`unknown`. `pyodideClient.ts` exports `Dataset = "real" | "synthetic"` and `PyodideStage = "script" | "runtime" | ...` rather than free-form strings.
- Python: prefer typed dicts and Pydantic models for "wide" payloads, plain tuples for small private intermediates (`_compute_confidence` returns `(rel_width, label)`).

## Module Design

**Exports:**
- Named exports only (TS). The single allowed `default` is `App` in `frontend/src/App.tsx` (required by React's lazy loader pattern used in tests).
- Types are exported from the same module that owns the runtime code (`Dataset`, `PyodideStatus` from `pyodideClient.ts`; `ProjectRecord`, `DemoManifest`, `FeatureStats` from `realProjects.ts`).

**Barrel Files:**
- Not used. Every consumer imports directly from the file that owns the symbol.

## Project-Specific Naming Idioms

**Real / Synthetic split (load-bearing across the entire codebase):**
- The Pyodide cache (`frontend/src/demo/pyodideClient.ts`) keeps `LOADED["real"]` and `LOADED["synthetic"]` as parallel slots. Always pass `dataset: Dataset` ("real" | "synthetic") when calling `ensureModelsReady`, `predictQuote`, `getFeatureImportances`.
- TanStack Query keys carry the dataset suffix: `["demo", "realProjects"]`, `["demo", "syntheticPool"]`, `["demo", "manifest"]` (`frontend/src/demo/realProjects.ts`).
- Asset paths under `frontend/public/demo-assets/` mirror the split: `models_real/`, `models_synthetic/`, `model_metrics_real.json`, `model_metrics_synthetic.json`, `real-projects.json`, `synthetic-pool.json`.
- URL routes mirror the split: `/compare/*` is the Real Data tool; `/ml/*` is the Synthetic Data tool. See `frontend/src/DemoApp.tsx` lines 49-73 for the route map and the legacy redirect comment.
- Page eyebrows must read `"Real Data · …"` or `"Synthetic Data · …"`. Card titles are `"Today's book"` (real) and `"At scale"` (synthetic) — see `frontend/src/pages/demo/DemoHome.tsx`.

**Customer-facing copy / jargon-guard rules:**
- Demo audience is non-technical. UI copy must avoid ML jargon. Forbidden in rendered output: `"Pyodide"`, `"P10"`, `"P50"`, `"P90"`, `"R²"`, `"P10–P90"`, `"gradient boosting"`, `"confidence intervals"` (note the literal cross-cutting jargon-guard tests in `frontend/src/pages/demo/DemoHome.test.tsx` lines 84-89, 194-211 and the assertion in `frontend/src/pages/demo/MachineLearningQuoteTool.test.tsx` line 234).
- Translate jargon to business language at the boundary:
  - `confidence: "high" | "medium" | "low"` (wire) → `"high" | "moderate" | "lower"` (UI). Translation lives in `frontend/src/demo/quoteAdapter.ts`'s `r2ToConfidence`. Display labels in `frontend/src/components/quote/QuoteResultPanel.tsx` are `"High confidence"`, `"Moderate confidence"`, `"Lower confidence"` — never `"P50"` or `"R²"`.
  - Driver magnitudes: `"strong" | "moderate" | "minor"` rendered as `"Strong driver"` / `"Moderate driver"` / `"Minor driver"`.
  - Per-category code chips show single letters `H` / `M` / `L`, with full label in the `title` attribute for accessibility.
- Counts must spell out: "Twenty-four of your real, billed projects" / "Five hundred generated training projects" — see `frontend/src/components/DataProvenanceNote.tsx` and the matching tests (`DemoHome.test.tsx` lines 60-72).
- Side-by-side framing: every demo page tells the same story in two views — "today" (real, 24 projects) vs "at scale" (synthetic, 500 rows). Keep terminology aligned across the two cards on `DemoHome` and the two `DataProvenanceNote` variants.

**Dataset label sources:**
- Frontend `frontend/src/demo/featureLabels.ts` is the single source of truth for translating raw pipeline feature names ("stations_count", "industry_segment_Aerospace") to business labels ("Number of stations", "Industry: Aerospace"). Always extend `NUM_LABELS` / `CAT_LABELS` rather than introducing parallel maps.

**State / token storage:**
- Admin auth token: `sessionStorage` keyed by `"matrix-admin-token"` (constant `TOKEN_KEY` in `frontend/src/api/client.ts`). Helpers: `getAdminToken`, `setAdminToken`, `clearAdminToken`. Don't read `sessionStorage` directly elsewhere.
- Display name: `localStorage` keyed by `"matrix.displayName"` — accessed via `getDisplayName()` in `frontend/src/lib/displayName.ts`.

---

*Convention analysis: 2026-05-04*
