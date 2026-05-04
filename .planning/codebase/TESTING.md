# Testing Patterns

**Analysis Date:** 2026-05-04

## Test Framework

**Frontend (Vitest + React Testing Library):**
- Runner: `vitest@^1.4.0` with `jsdom@^24.0.0`.
- Config: `frontend/vite.config.ts` (the `test:` block, lines 22-26):
  ```ts
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  ```
- Assertion library: `@testing-library/jest-dom@^6.4.2` (matchers like `toBeInTheDocument`, `toBeDisabled`).
- Component renderer: `@testing-library/react@^14.2.1`.
- Mocks: `vi.mock`, `vi.fn`, `vi.stubGlobal`, `vi.spyOn` from Vitest itself, plus `axios-mock-adapter@^2.1.0` for direct axios stubbing.

**Backend (pytest):**
- Runner: `pytest` (no version pin; no `pyproject.toml`/`pytest.ini`/`setup.cfg` in repo root — pytest just discovers via the convention).
- Discovery is bare-defaults: tests live under `tests/`, files match `test_*.py`, functions match `test_*`.
- Fixtures use `pytest.fixture(scope="module")` (see `tests/scripts/test_build_demo_static.py` line 23).
- No `conftest.py` exists in the repo today.

**Run Commands:**

```bash
# Frontend
cd frontend && npm test                     # Single run (vitest run)
cd frontend && npm run test:watch           # Watch mode
cd frontend && npx vitest run path/to/file  # One file
cd frontend && npm run lint                 # ESLint with --max-warnings 0
cd frontend && npm run typecheck            # tsc --noEmit

# Backend
pytest                       # Run everything
pytest -k test_synthetic     # Filter by name fragment
pytest tests/scripts         # One directory

# Frontend test fixtures (joblib bundles + manifest + JSON)
python scripts/build_test_fixtures.py    # Synthesizes 64-row dataset + trains 12 models
python scripts/build_demo_static.py      # Rebuilds frontend/public/demo-assets/ from demo_assets/data/
```

## Test File Organization

**Location:**
- **Frontend tests are co-located** with their production source. `*.test.tsx` and `*.test.ts` live next to the file they exercise:
  - `frontend/src/api/client.test.ts` next to `client.ts`
  - `frontend/src/components/quote/QuoteResultPanel.test.tsx` next to `QuoteResultPanel.tsx`
  - `frontend/src/demo/pyodideClient.test.ts` next to `pyodideClient.ts`
  - `frontend/src/lib/projectHours.test.ts` next to `projectHours.ts`
- **Backend tests live under `tests/`** mirroring the source layout:
  - `tests/scripts/test_build_demo_static.py` mirrors `scripts/build_demo_static.py`
- Total frontend test files: 73 (counted via `find … -name "*.test.ts*"`).
- Total backend test files: 1 (`tests/scripts/test_build_demo_static.py`). Backend coverage is intentionally narrow because most logic lives in `core/` (pure NumPy/pandas) and is exercised through the build scripts plus the frontend Pyodide tests.

**Naming:**
- Frontend: `<source-stem>.test.<ts|tsx>`. Test file mirrors the source file 1:1 — never bundle multiple modules into one test file.
- Backend: `test_<source-stem>.py` placed under `tests/<source-dir>/`.

**Structure:**
```
frontend/src/
├── api/
│   ├── client.ts
│   └── client.test.ts
├── components/
│   ├── DemoChip.tsx
│   ├── DemoChip.test.tsx
│   ├── quote/
│   │   ├── QuoteResultPanel.tsx
│   │   └── QuoteResultPanel.test.tsx
│   └── …
├── demo/
│   ├── pyodideClient.ts
│   ├── pyodideClient.test.ts
│   ├── featureLabels.ts
│   ├── featureLabels.test.ts
│   └── …
├── lib/
│   ├── projectHours.ts
│   ├── projectHours.test.ts
│   └── …
├── pages/
│   ├── …                    (page-level integration tests)
│   └── demo/
│       ├── DemoHome.test.tsx
│       └── MachineLearningQuoteTool.test.tsx
├── test/
│   ├── render.tsx           (renderWithProviders helper)
│   └── setup.ts             (jsdom polyfills, jest-dom)
└── DemoApp.test.tsx         (route map smoke test)

tests/
├── __init__.py
└── scripts/
    ├── __init__.py
    └── test_build_demo_static.py
```

## Test Structure

**Suite Organization (Vitest + RTL — canonical pattern):**

```ts
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { renderWithProviders } from "@/test/render";
import { Quotes } from "./Quotes";

vi.mock("@/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  getAdminToken: () => null,
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { api } from "@/api/client";
const mockGet = vi.mocked(api.get);

describe("Quotes", () => {
  afterEach(() => mockGet.mockReset());

  it("lists saved quotes from /quotes mock", async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === "/quotes") return { data: { total: 0, rows: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });
    renderWithProviders(<Quotes />);
    await waitFor(() => expect(screen.getByText("Empty")).toBeInTheDocument());
  });
});
```

**Patterns:**
- One top-level `describe` per logical surface, then nested `describe` blocks for sub-behaviours (e.g. `"high confidence fixture"`, `"lower confidence fixture"`, `"empty drivers"` in `frontend/src/components/quote/QuoteResultPanel.test.tsx`).
- Each `it` asserts a single user-visible behaviour. Resist the urge to chain six assertions in one test.
- Setup: per-test `mockReset()` in `afterEach`. Per-suite shared mocks live above the `describe`. Module-state-sensitive tests (e.g. `pyodideClient.test.ts`) use `vi.resetModules()` + `await import("./module")` inside each `it`.
- Teardown: `vi.restoreAllMocks()` and `vi.unstubAllGlobals()` in suites that touch `window` / globals (`useCountUp.test.ts`, `pyodideClient.test.ts`).
- Async assertions: `await waitFor(() => expect(...))` for any state that resolves on the next tick (TanStack Query data, `vi.mock`-ed promises, route transitions). `await screen.findByText(...)` is the shorthand.
- User events: prefer `fireEvent.click(...)` / `fireEvent.change(input, { target: { value: ... } })`. The codebase doesn't use `@testing-library/user-event` — `fireEvent` is the convention.

**The shared render helper (`frontend/src/test/render.tsx`):**

```tsx
import { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
```

- Always use `renderWithProviders` for components that touch hooks or routing. The fresh `QueryClient` per render with `retry: false, gcTime: 0` keeps tests isolated and prevents cached data leaking between cases.

**The setup file (`frontend/src/test/setup.ts`):**

```ts
import "@testing-library/jest-dom";

// Recharts uses ResizeObserver which jsdom doesn't implement.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom doesn't implement Element.scrollIntoView; SingleQuote calls it inside
// a requestAnimationFrame after submit, so unhandled rejections fail the run.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
```

- Imports `@testing-library/jest-dom` matchers globally.
- Polyfills `ResizeObserver` (Recharts) and `scrollIntoView` (post-submit auto-scroll in `SingleQuote` and `MachineLearningQuoteTool`).

## Mocking

**Framework:** Vitest's built-in `vi.mock`, `vi.fn`, `vi.spyOn`, `vi.stubGlobal`, `vi.unstubAllGlobals`, `vi.resetModules`, `vi.useFakeTimers`. For axios-level mocking the project uses `axios-mock-adapter`.

**Strategy:**

1. **Mock the network at `@/api/client`**, not at axios. Every page-level test stubs `api` with `vi.fn()` per verb so individual tests can layer in `mockImplementation`s by URL:

   ```ts
   vi.mock("@/api/client", () => ({
     api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
     getAdminToken: () => null,
     setAdminToken: vi.fn(),
     clearAdminToken: vi.fn(),
   }));
   ```

   This is the canonical pattern (used in `Quotes.test.tsx`, `SingleQuote.test.tsx`, `Layout.test.tsx`, `DemoChip.test.tsx`, `UserPill.test.tsx`, `AdminLogin.test.tsx`).

2. **Mock toast (`sonner`) for any test that asserts on user-visible feedback:**

   ```ts
   vi.mock("sonner", () => ({
     toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
   }));
   ```

3. **For axios behaviour in isolation** (the response interceptor's 401 handling), use `axios-mock-adapter` directly:

   ```ts
   // frontend/src/api/client.test.ts
   import MockAdapter from "axios-mock-adapter";
   const mock = new MockAdapter(api);
   mock.onGet("/ping").reply(401);
   ```

4. **Pyodide is NEVER actually loaded in tests.** `frontend/src/demo/pyodideClient.test.ts` mocks `loadPyodide` and `fetch` via `vi.stubGlobal`, then spies on `document.querySelector` so script injection short-circuits:

   ```ts
   function makePyodideMock() {
     return {
       loadPackage: vi.fn(() => Promise.resolve()),
       runPython: vi.fn(),
       runPythonAsync: vi.fn(() => Promise.resolve()),
       FS: { mkdirTree: vi.fn(), writeFile: vi.fn() },
       toPy: vi.fn((v) => v),
       globals: {
         get: vi.fn().mockReturnValue(vi.fn(() =>
           JSON.stringify({ ops: {}, total_p50: 0, total_p10: 0, total_p90: 0, sales_buckets: {} }),
         )),
         set: vi.fn(),
       },
     };
   }
   vi.stubGlobal("loadPyodide", vi.fn(() => Promise.resolve(makePyodideMock())));
   vi.stubGlobal("fetch", makeOkFetch());
   vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("script"));
   ```

   Page-level tests (`MachineLearningQuoteTool.test.tsx`) take the simpler route: mock `@/demo/pyodideClient` directly and assert on the lifecycle calls:

   ```ts
   vi.mock("@/demo/pyodideClient", () => ({
     subscribe: vi.fn(),
     ensurePyodideReady: vi.fn(() => Promise.resolve()),
     ensureModelsReady: vi.fn(() => Promise.resolve()),
     predictQuote: vi.fn(() => Promise.resolve({ ops: { ... }, total_p50: 520, ... })),
     getFeatureImportances: vi.fn(() => Promise.resolve({ me10_actual_hours: [["station_count", 0.5]] })),
   }));
   ```

5. **Sklearn pickle (`*.joblib`) fixtures are NOT used in the test suite directly.** The fixture-builder script `scripts/build_test_fixtures.py` exists for people who want real bundles for end-to-end smoke tests, but the checked-in tests don't load joblibs:
   - `tests/scripts/test_build_demo_static.py` only reads the *source* of `_copy_model_bundle` via `inspect.getsource(...)` and asserts on string literals — it never executes the copy.
   - Frontend predict tests use mocked `globals.get` returning a JSON string — sklearn never runs.

6. **Lazy-loaded route components** are mocked to bare headings so route-map tests are deterministic regardless of page state. See `frontend/src/DemoApp.test.tsx` lines 12-34:

   ```tsx
   vi.mock("@/pages/demo/compare/ComparisonQuote", () => ({
     ComparisonQuote: () => <h1>Comparison Quote Tool</h1>,
   }));
   ```

7. **Controlled `useQuery` hooks** — when a page depends on a hook from another module, mock the hook directly:

   ```tsx
   vi.mock("@/demo/realProjects", async () => {
     const actual = await vi.importActual<typeof import("@/demo/realProjects")>("@/demo/realProjects");
     return { ...actual, useDemoManifest: () => ({ data: FAKE_MANIFEST, isLoading: false, error: null }) };
   });
   ```

   Key: use `vi.importActual` and spread `...actual` so non-hook exports (types, helper functions like `recordToPrediction`) keep working.

**What to Mock:**
- Anything network-bound (`@/api/client`, `fetch`, `axios`).
- `sonner.toast` whenever a test asserts on it.
- `loadPyodide` / `pyodideClient` lifecycle.
- `@/api/quote`'s `downloadScenarioPdf` / `downloadAdHocPdf` — these create blob URLs and trigger DOM clicks, neither of which are useful in unit tests.
- Lazy-loaded heavy dependencies (recharts pages, Pyodide).

**What NOT to Mock:**
- Pure functions in `@/lib/*`, `@/demo/quoteAdapter`, `@/demo/featureLabels`, `@/demo/realProjects` (the `recordToPrediction` family) — test the real implementation.
- `@testing-library/react` itself (use the real `render`/`screen`).
- React Router — use `MemoryRouter` from `renderWithProviders` instead of mocking the router.
- Polyfilled DOM globals (`ResizeObserver`, `scrollIntoView`) — they're handled in `setup.ts`.

## Fixtures and Factories

**Test data:**
- **Inline fixtures inside the test file** are the dominant pattern. See `frontend/src/components/quote/QuoteResultPanel.test.tsx` lines 12-85 (`HIGH_CONFIDENCE_RESULT`, `LOWER_CONFIDENCE_RESULT`).
- **Factory functions** for shapes that need many slight variants:
  ```ts
  // frontend/src/demo/quoteAdapter.test.ts
  function makeInput(over: Partial<QuoteInput> = {}): QuoteInput { … }
  function makeRecord(id: string, hours: number, over: Partial<ProjectRecord> = {}): ProjectRecord { … }
  function makeMetric(r2: number): ModelMetric { return { target: "", rows: 10, mae: 50, r2 }; }
  ```
  This is the recommended pattern for new tests when you need >3 variants of the same shape.
- **Page-scoped fixture files** under `frontend/src/pages/<page>/fixtures.ts`:
  - `frontend/src/pages/admin/fixtures.ts`
  - `frontend/src/pages/batch/fixtures.ts`
  Use these only when the same fixture is consumed by both production code (storybook-style preview) and tests; otherwise inline.

**Backend fixtures:**
- `scripts/build_test_fixtures.py` synthesizes a 64-row pandas DataFrame and trains all 12 GBR pipelines, writing to `tests/fixtures/tiny_models/`. Run it once when you need real joblib bundles to debug Pyodide locally; the directory is checked in.
- The script is the source of truth for what a "well-formed" master DataFrame looks like (columns, dtypes, value ranges).

## Coverage

**Requirements:** No coverage thresholds are enforced. There's no `--coverage` invocation in `frontend/package.json` scripts, no `vitest.config.coverage` block, and no CI gate that checks coverage.

**View Coverage:**

```bash
cd frontend && npx vitest run --coverage    # Ad-hoc; will need v8/istanbul provider installed
```

(No reporter is configured; running this for the first time will prompt to install.)

**Coverage Bar (per-route/component, from `.claude/agents/test-writer.md` lines 18-22):**
The `test-writer` specialist enforces this informal floor for every new route or component:

1. **Happy path** — the user-visible success outcome.
2. **Auth failure** (if the route is admin-only) — 401 redirect, missing token.
3. **One edge case** — empty master, missing model, malformed upload, jargon guard, etc.

Tests written by `test-writer` follow the patterns in `.claude/agents/test-writer.md` lines 23-27:
- FastAPI: `httpx.AsyncClient(app=app, base_url="http://test")` with `@pytest.mark.asyncio`.
- Filesystem: `tmp_path` fixture + `monkeypatch.setenv("DATA_DIR", str(tmp_path))`, then clear `get_settings` cache after.
- Frontend: React Testing Library + Vitest. Mock axios with `vi.mock("@/api/client")`.

## Test Types

**Unit Tests:**
- Pure-function adapters: `frontend/src/demo/quoteAdapter.test.ts` (51 cases covering hero estimate, per-category shape, r2-to-confidence thresholds, overall rollup, drivers magnitude buckets, supporting matches).
- Single-purpose helpers: `frontend/src/demo/featureLabels.test.ts`, `frontend/src/lib/projectHours.test.ts`, `frontend/src/lib/nearestNeighbor.test.ts`, `frontend/src/lib/utils.ts` consumers.
- Hooks: `frontend/src/lib/useHotkey.test.ts`, `frontend/src/lib/useCountUp.test.ts` (uses `renderHook` + `act` + fake timers for rAF).
- API client behaviour: `frontend/src/api/client.test.ts` (axios 401 interceptor with `axios-mock-adapter`).

**Integration Tests:**
- Page-level tests render a whole route under `MemoryRouter` + `QueryClientProvider`, mock the network layer, and assert on user-visible text/aria roles. Examples:
  - `frontend/src/pages/demo/MachineLearningQuoteTool.test.tsx` — mocks pyodide + synthetic pool + metrics, drives the form, asserts on hero estimate and `"Most similar training rows"` label.
  - `frontend/src/pages/Quotes.test.tsx` — drives bulk-select, compare-button enablement, PDF row action.
  - `frontend/src/pages/SingleQuote.test.tsx` — drives the full single-quote form against mocked `/health` + `/catalog/dropdowns`.
  - `frontend/src/DemoApp.test.tsx` — exhaustive route-map smoke test (legacy redirects, unknown paths, lazy-load fallback, tool state isolation documentation).

**E2E Tests:**
- None. Playwright/Cypress are not in the dev dependencies.

## Common Patterns

**Async TanStack Query data:**

```tsx
mockGet.mockImplementation(async (url: string) => {
  if (url === "/quotes") return { data: { total: 0, rows: [] } };
  throw new Error(`Unexpected GET ${url}`);
});
renderWithProviders(<Quotes />);
await waitFor(() => expect(screen.getByText("Option A")).toBeInTheDocument());
```

**Error / 409 empty-state testing:**
- The demo's "no data yet" empty state is signalled by an HTTP 409 from the backend. Drive it in tests by having the mocked endpoint return rejected promises with a 409 status, or by returning `{ data: { rows: [] } }` for query endpoints (frontend treats both as "show EmptyState").
- Example: `frontend/src/components/DemoChip.test.tsx` lines 27-43 cover the "data hides UI when missing" branch — when the query returns falsy, the component returns `null` and `container.firstChild` is `null`.
- For toast-on-failure cases: `mockRejectedValue(new Error("network"))` → assert `vi.mocked(toast.error)).toHaveBeenCalledWith("...")` (see `Quotes.test.tsx` lines 134-147).

**Form submission:**

```ts
const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
await act(async () => { fireEvent.click(submitBtn); });
await waitFor(() => expect(mockPredictQuote).toHaveBeenCalledWith(expect.any(Object), "synthetic"));
```

**Fake timers (rAF, count-up animations):**

```ts
vi.useFakeTimers({ toFake: ["requestAnimationFrame", "performance"] });
const { result } = renderHook(() => useCountUp(1000, { durationMs: 500 }));
act(() => { vi.advanceTimersByTime(500); });
expect(Math.round(result.current)).toBe(1000);
vi.useRealTimers();
```

**Module-state isolation (modules with top-level mutable state, e.g. `pyodideClient.ts`):**

```ts
beforeEach(() => {
  vi.resetModules();           // Drop cached imports
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const mod = await import("./pyodideClient");   // Fresh module, fresh state
```

**Jargon guard pattern (cross-cutting demo invariant):**

```ts
// from frontend/src/pages/demo/DemoHome.test.tsx
it("does not render 'P50' anywhere on the page", () => {
  renderWithProviders(<DemoHome />);
  const body = document.body.textContent ?? "";
  expect(body).not.toMatch(/\bP50\b/);
});

it("does not render 'R²' anywhere on the page", () => {
  renderWithProviders(<DemoHome />);
  const body = document.body.textContent ?? "";
  expect(body).not.toContain("R²");
});
```

Add equivalent assertions to any new demo-side page (`/compare/*` or `/ml/*`). The full forbidden-token set is: `Pyodide`, `P10`, `P50`, `P90`, `P10–P90`, `R²`, `gradient boosting`, `confidence intervals`.

**Dataset-aware lifecycle assertions:**

```ts
// frontend/src/pages/demo/MachineLearningQuoteTool.test.tsx
expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic");
expect(mockPredictQuote).toHaveBeenCalledWith(expect.any(Object), "synthetic");
expect(mockGetFeatureImportances).toHaveBeenCalledWith("synthetic");
```

The Comparison (Real Data) tool's tests should assert `"real"` on the same call sites.

## Recent Gap-Fill Coverage (commit `ac8be42`)

The commit `ac8be42` "test(demo): gap-fill coverage for pyodide client cache, feature labels, project hours, jargon guard" added the following frontend tests:

- **`frontend/src/demo/pyodideClient.test.ts`** — confirms the dataset cache is idempotent (`ensureModelsReady("real")` called twice returns the same promise reference; "real" and "synthetic" return distinct references) and asserts that `predictQuote(input, "real")` rejects with a descriptive error containing `ensureModelsReady('real')` when called before the dataset is loaded. Tests rely on `vi.resetModules` per `it` to reset the module-level `pyodidePromise` and `modelPromises` Record.
- **`frontend/src/demo/featureLabels.test.ts`** — covers `humanFeatureLabel` for numeric features (`stations_count` → "Number of stations"), one-hot categoricals (`industry_segment_Aerospace` → "Industry: Aerospace"), the title-case fallback for unknown raw names, and asserts `direction === "increases"` for every branch.
- **`frontend/src/lib/projectHours.test.ts`** — asserts `sumActualHours` correctly sums all 12 per-operation actual-hours fields and treats `null`/missing fields as zero.
- **`frontend/src/pages/demo/DemoHome.test.tsx`** — adds the cross-cutting jargon-guard `describe` block (lines 194-211) that scans `document.body.textContent` for `Pyodide`, `\bP50\b`, and `R²` and asserts none are rendered.

When adding new demo features, mirror these patterns:
- For any new function in `frontend/src/demo/`: write a co-located unit test that hits the success branch + at least one fallback branch.
- For any new demo page: include the jargon-guard block.
- For any new dataset-aware lifecycle code: assert that the correct `Dataset` literal is threaded through the call chain.

## CI Pipeline

**Status:** No CI configuration files exist in this repo. There is no `.github/workflows/`, no `.gitlab-ci.yml`, no `.circleci/`, no `azure-pipelines.yml`. (Search for `*.yml`/`*.yaml` returned no results outside `node_modules/` and worktrees.)

**Vercel build hook (the only automated check):**
- `vercel.json` defines `"buildCommand": "bash scripts/vercel_build.sh"` which builds the frontend bundle. This is a deploy-time build, not a test gate — `npm test` and `pytest` are not invoked.
- `frontend/package.json`'s `build` script is `tsc -b && vite build`, so type-check failures will block deploys.

**Implication for new work:** type errors and lint failures will surface in the developer's local `npm run typecheck` / `npm run lint`; test runs are run by the developer (or by the `test-writer` agent) before commit. No automatic regression net is currently in place.

## Coverage Thresholds

None enforced. There is no `coverage:` block in `frontend/vite.config.ts` and no `--coverage` flag baked into the npm scripts. The informal three-step bar in `.claude/agents/test-writer.md` (happy path / auth failure / one edge case) is the only quality gate.

## The `test-writer` Specialist Agent

The Vitest + pytest surface is owned by a dedicated sub-agent: **`test-writer`** (defined at `.claude/agents/test-writer.md`).

**Scope (from the spec):**
- **Write:** `tests/**`, `frontend/src/**/*.test.tsx`, `frontend/src/**/*.test.ts`.
- **Read-only on everything else.** If the agent thinks a production file needs editing to be testable, it must surface that to the orchestrator instead of editing it directly.

**Allowed commands:**
```
pytest
pytest -k <pattern>
cd frontend && npm test
cd frontend && npx vitest run path/to/test
```

**Coverage bar per route/component:**
1. Happy path.
2. Auth failure (if admin).
3. One edge case (empty master, missing model, malformed upload).

**Patterns the agent must follow:**
- FastAPI tests: `httpx.AsyncClient(app=app, base_url="http://test")` with `@pytest.mark.asyncio` (when a backend is wired up).
- Filesystem-touching tests: `tmp_path` fixture, `monkeypatch.setenv("DATA_DIR", str(tmp_path))`, clear `get_settings` cache afterwards.
- Frontend tests: React Testing Library + Vitest. Mock axios with `vi.mock("@/api/client")` (the canonical mock shown above).

**Skills the agent pre-loads:**
- `engineering:testing-strategy`
- `superpowers:test-driven-development`

**Dispatch trigger:** the `test-writer` agent is dispatched after every production-code change. If you're adding a hook in `@/lib/`, a component in `@/components/`, or an adapter in `@/demo/`, the orchestrator should hand off to `test-writer` to add the matching `*.test.{ts,tsx}` file before the change is considered complete.

---

*Testing analysis: 2026-05-04*
