# Phase 5: Quote Persistence — Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 25 (18 new + 7 modified)
**Analogs found:** 24 / 25

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/lib/quoteStorage.ts` | data layer (IndexedDB wrapper) | CRUD + pub-sub | `frontend/src/demo/pyodideClient.ts` (module-singleton pattern) | partial (no IDB analog) |
| `frontend/src/lib/savedQuoteSchema.ts` | type + zod schema | request-response | `frontend/src/pages/single-quote/schema.ts` | exact |
| `frontend/src/hooks/useSavedQuotes.ts` | TanStack Query hook + BroadcastChannel | CRUD | `frontend/src/demo/realProjects.ts` (`useRealProjects`/`useSyntheticPool`/`useDemoManifest`) | exact |
| `frontend/src/pages/quotes/MyQuotesPage.tsx` | route page (list view) | request-response | `frontend/src/pages/demo/business/BusinessInsightsView.tsx` (loading/error/empty switch) + `frontend/src/pages/demo/CompareBrowseTab.tsx` (filtered list shape) | role-match |
| `frontend/src/pages/quotes/SavedQuotePage.tsx` | route page (detail/edit) | request-response | `frontend/src/pages/demo/compare/ComparisonQuote.tsx` (form + result two-column) | role-match |
| `frontend/src/pages/quotes/components/QuoteRow.tsx` | list row component | event-driven (click navigate) | `frontend/src/pages/demo/business/ProjectDetailDrawer.tsx::Field` (row-with-label-and-value) + `frontend/src/pages/quotes/QuotesTable.tsx` (full-row button) | role-match |
| `frontend/src/pages/quotes/components/MyQuotesEmptyState.tsx` | empty-state component | request-response (display only) | `frontend/src/components/EmptyState.tsx` | exact |
| `frontend/src/pages/quotes/components/SaveQuoteDialog.tsx` | modal dialog | event-driven (form submit) | `frontend/src/pages/demo/business/ProjectDetailDrawer.tsx` (modal scaffold w/ ESC + backdrop) | role-match (drawer → centered modal) |
| `frontend/src/pages/quotes/components/StatusChip.tsx` | display + interactive component | event-driven (click cycle) | `frontend/src/components/PageHeader.tsx` (chip variant table) + `frontend/src/components/quote/QuoteResultPanel.tsx` (CONFIDENCE_TONE Record map) | exact |
| `frontend/src/pages/quotes/components/WorkspacePill.tsx` | display component | n/a | `frontend/src/components/PageHeader.tsx` (chip styling) + `frontend/src/components/DemoChip.tsx` | exact |
| `frontend/src/pages/quotes/components/VersionHistoryList.tsx` | list component | event-driven (restore click) | `frontend/src/components/quote/QuoteResultPanel.tsx` (drivers `<ul>` + per-row map) | role-match |
| `frontend/src/pages/quotes/components/DeleteQuoteModal.tsx` | confirmation modal | event-driven | `frontend/src/pages/demo/business/ProjectDetailDrawer.tsx` (same modal scaffold) | role-match |
| `frontend/tests/quoteStorage.test.ts` | unit test (module state) | n/a | `frontend/src/demo/pyodideClient.test.ts` (module-state isolation pattern) | exact |
| `frontend/tests/useSavedQuotes.test.tsx` | hook test | n/a | `frontend/src/demo/modelMetrics.test.ts` (`renderHook` + `QueryClient` wrapper) | exact |
| `frontend/tests/MyQuotesPage.test.tsx` | page test | n/a | `frontend/src/pages/demo/MachineLearningQuoteTool.test.tsx` | exact |
| `frontend/tests/SaveQuoteDialog.test.tsx` | component test | n/a | `frontend/src/components/quote/QuoteResultPanel.test.tsx` (fixture-driven describe blocks) | exact |
| `frontend/tests/StatusChip.test.tsx` | component test | n/a | `frontend/src/components/quote/QuoteResultPanel.test.tsx` (variant-driven describe blocks) | exact |
| `frontend/tests/VersionHistoryList.test.tsx` | component test | n/a | `frontend/src/components/quote/QuoteResultPanel.test.tsx` (list-rendering assertions) | exact |
| **MODIFIED:** `frontend/src/components/quote/QuoteResultPanel.tsx` | (add Save button) | event-driven | self (existing `Export PDF` button at lines 159-166 is the slot pattern) | exact |
| **MODIFIED:** `frontend/src/components/DemoLayout.tsx` | (add `My Quotes` sidebar entry) | n/a | self (existing `<SidebarLink>` at lines 23-50 + sidebar block at lines 180-223) | exact |
| **MODIFIED:** `frontend/src/DemoApp.tsx` | (add `/quotes` and `/quotes/:id` routes) | n/a | self (existing `lazy()` + `<Route>` block at lines 7-65) | exact |
| **MODIFIED:** `frontend/src/pages/single-quote/QuoteForm.tsx` | (remove `readLastValues`; add `?fromQuote=` rehydration) | n/a | self (lines 29, 48-58, 399-407 are the surgical removal points) | exact |
| **MODIFIED:** `frontend/src/pages/demo/CompareBrowseTab.tsx` | (add Save button on Compare side) | event-driven | self + sibling `QuoteResultPanel` save trigger | exact |
| **MODIFIED:** `frontend/src/test/jargon-guard.test.tsx` + `frontend/src/test/jargon.ts` | (extend coverage) | n/a | self (existing pattern lines 110-180 of `jargon-guard.test.tsx`) | exact |
| **MODIFIED:** `frontend/src/main.tsx` | (verify sonner wired — already is) | n/a | self (line 24 confirmed) | exact |

---

## Pattern Assignments

### `frontend/src/lib/quoteStorage.ts` (data layer, CRUD + pub-sub)

**Analog:** `frontend/src/demo/pyodideClient.ts` (module-singleton + status broadcaster pattern)

**Module-singleton pattern** (lines 78-106 of `pyodideClient.ts`):
```ts
// State
let pyodidePromise: Promise<PyodideInterface> | null = null;
const listeners = new Set<StatusListener>();
let latestStatus: PyodideStatus = { stage: "script", message: "Not started" };

// Notification
function notify(s: PyodideStatus) {
  latestStatus = s;
  for (const fn of listeners) fn(s);
}

export function subscribe(fn: StatusListener): () => void {
  listeners.add(fn);
  fn(latestStatus);
  return () => listeners.delete(fn);
}
```

Apply this exact shape for `quoteStorage.ts`:
- module-level `let dbPromise: Promise<IDBDatabase> | null = null;` cached singleton
- module-level `const channel = new BroadcastChannel("matrix-quotes");` opened once on import
- `subscribe(fn)` / `unsubscribe()` API for cross-tab listeners (mirrors pyodideClient's `subscribe`)

**File-section dividers** (line 26, 50, 74, 88, 107, 130, 252, 286 of `pyodideClient.ts`):
```ts
// ---------------------------------------------------------------------------
// Stage types
// ---------------------------------------------------------------------------
```
Use the same `// ---` divider style for: Constants, Types, State, Public API, Helpers.

**JSDoc top-of-file** (line 1 of `pyodideClient.ts`):
```ts
/** Manages the Pyodide runtime and lazy-loads one or both model bundles (Dataset "real" | "synthetic") on demand, caching each after first load. */
```
Mirror with: `/** Owns the IndexedDB connection for "matrix-quotes" — one DB per tab. Exposes save/list/get/delete/getVersions plus a BroadcastChannel for cross-tab sync. */`

**Lazy bootstrap pattern** (`ensurePyodideReady`, lines 290-299):
```ts
export function ensurePyodideReady(): Promise<void> {
  if (!pyodidePromise) {
    pyodidePromise = bootstrap().catch((err: Error) => {
      notify({ stage: "error", message: err.message });
      pyodidePromise = null;
      throw err;
    });
  }
  return pyodidePromise.then(() => undefined);
}
```
Apply to `openDb()`: cache the promise, null it on rejection so retries can run.

**Notes / gotchas:**
- IndexedDB has no exact analog in repo. Researcher's discretion on `idb` package vs hand-rolled `indexedDB.open()` (per D-02 / Claude's Discretion). If hand-rolled, follow the dual-pattern of pyodideClient: idiomatic browser API + a thin TS wrapper exposing typed promises.
- `BroadcastChannel('matrix-quotes')` should emit `{ type: "save" | "delete" | "restore", id, updatedAt }` events; the hook subscribes and triggers TanStack Query invalidate.
- `onupgradeneeded` for schema bump is canonical IndexedDB; comment with `D-18` reference: `// schemaVersion bump: see CONTEXT.md D-18 — Phase 6/7 forward compat`.

---

### `frontend/src/lib/savedQuoteSchema.ts` (type + zod schema)

**Analog:** `frontend/src/pages/single-quote/schema.ts`

**Zod schema declaration pattern** (lines 1-65):
```ts
import { z } from "zod";

import { QuoteInput } from "@/api/types";

const requiredString = z.string().trim().min(1, "Required");

export const quoteFormSchema = z.object({
  industry_segment: requiredString,
  // ...
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
```

Apply identically for `SavedQuote` and `QuoteVersion`:
```ts
export const savedQuoteSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.literal(1),
  name: z.string().trim().min(1).max(80),
  workspace: z.enum(["real", "synthetic"]),
  status: z.enum(["draft", "sent", "won", "lost", "revised"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  versions: z.array(quoteVersionSchema), // declared above
});
export type SavedQuote = z.infer<typeof savedQuoteSchema>;
```

**Defaults export pattern** (lines 67-112 of `schema.ts`):
```ts
export const quoteFormDefaults: QuoteFormValues = {
  industry_segment: "",
  // ... per-field
};
```
Mirror with `savedQuoteDefaults` if planner determines a "blank saved quote" stub is useful (likely not — saves always come from a real quote result).

**Transform pair** (`transformToQuoteInput`, lines 114-162):
```ts
export function transformToQuoteInput(v: QuoteFormValues): QuoteInput {
  return {
    // ...
    has_controls: v.has_controls ? 1 : 0,
    log_quoted_materials_cost: Math.log1p(Math.max(v.estimated_materials_cost, 0)),
  };
}
```
**GOTCHA — boolean coercion (D-16 inverse):** When restoring a saved quote into the form, the inverse transform must run: `has_controls: input.has_controls === 1` (back to boolean). Define `transformToFormValues(input: QuoteInput): QuoteFormValues` paired with the existing forward transform. The `log1p` inverse is `Math.expm1`.

---

### `frontend/src/hooks/useSavedQuotes.ts` (TanStack Query hook + BroadcastChannel)

**Analog:** `frontend/src/demo/realProjects.ts` (lines 173-207)

**Hook signature pattern** (lines 173-207):
```ts
export function useRealProjects() {
  return useQuery<ProjectRecord[]>({
    queryKey: ["demo", "realProjects"],
    queryFn: async () => {
      const res = await fetch(`${DEMO_ASSETS}/real-projects.json`);
      if (!res.ok) throw new Error(`real-projects.json ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
  });
}
```

Apply with IndexedDB-backed `queryFn`:
```ts
export function useSavedQuotes() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = new BroadcastChannel("matrix-quotes");
    ch.onmessage = () => qc.invalidateQueries({ queryKey: ["quotes", "all"] });
    return () => ch.close();
  }, [qc]);

  return useQuery<SavedQuote[]>({
    queryKey: ["quotes", "all"],
    queryFn: () => listSavedQuotes(), // from quoteStorage.ts
    staleTime: Infinity,
  });
}
```

**Query-key prefix discipline:** existing demo hooks use `["demo", ...]`. Saved quotes use `["quotes", ...]` (separate namespace, no collision risk). Sub-keys: `["quotes", "all"]`, `["quotes", id]`, `["quotes", id, "versions"]`.

**Notes:**
- `staleTime: Infinity` matches existing demo pattern — invalidation drives refetches, not staleness.
- `BroadcastChannel.onmessage` cleanup in the `useEffect` return is mandatory (prevents listener leak on hook unmount).

---

### `frontend/src/pages/quotes/MyQuotesPage.tsx` (route page, list view)

**Analogs:** `frontend/src/pages/demo/business/BusinessInsightsView.tsx` (loading/error/empty switch), `frontend/src/pages/demo/CompareBrowseTab.tsx` (filtered list)

**Imports pattern** (lines 1-29 of `BusinessInsightsView.tsx`):
```ts
import { useMemo, useState, useCallback } from "react";
import { AlertTriangle, Download } from "lucide-react";

import { DataProvenanceNote } from "@/components/DataProvenanceNote";
import { PageHeader } from "@/components/PageHeader";
import { ProjectRecord } from "@/demo/realProjects";
import { cn } from "@/lib/utils";

import { buildPortfolio, computeIndustryDetail } from "./portfolioStats";
```

Apply identically:
```ts
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { useSavedQuotes } from "@/hooks/useSavedQuotes";
import { cn } from "@/lib/utils";

import { QuoteRow } from "./components/QuoteRow";
import { MyQuotesEmptyState } from "./components/MyQuotesEmptyState";
import { SortControls } from "./components/SortControls";
```

**Loading/error/empty/data switch pattern** (UI-SPEC §`MyQuotesList`):
```tsx
<div className="space-y-6">
  <header className="flex items-baseline justify-between">
    <div>
      <h1 className="text-lg font-medium">My Quotes</h1>
      <p className="text-sm text-muted mt-1">{subhead copy}</p>
    </div>
    <SortControls value={sortKey} onChange={setSortKey} />
  </header>
  {isLoading && <LoadingState />}
  {error && <ErrorState />}
  {!isLoading && !error && data.length === 0 && <MyQuotesEmptyState />}
  {!isLoading && !error && data.length > 0 && (
    <div className="card">
      {sortedRows.map((q) => <QuoteRow key={q.id} quote={q} />)}
    </div>
  )}
</div>
```

**PageHeader use-pattern** (`ComparisonQuote.tsx` lines 164-169):
```tsx
<PageHeader
  eyebrow="Real Data · Quote"
  title="Real Data Quote"
  description="..."
  chips={chips}
/>
```
For `/quotes`, omit `eyebrow` (it's not workspace-scoped) — title is `"My Quotes"`, description per UI-SPEC.

---

### `frontend/src/pages/quotes/SavedQuotePage.tsx` (route page, detail/edit)

**Analog:** `frontend/src/pages/demo/compare/ComparisonQuote.tsx` (lines 162-235)

**Two-column grid pattern** (lines 211-233 of `ComparisonQuote.tsx`):
```tsx
<div className="mt-6 fade-in grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
  <div>
    <QuoteForm formRef={formRef} form={form} dropdowns={dropdowns}
               onSubmit={() => { void handleSubmit(); }} submitting={submitting} />
  </div>
  <aside className="lg:sticky lg:top-6 self-start">
    {result && <QuoteResultPanel result={result.unified} input={result.formValues} />}
  </aside>
</div>
```

Apply with `VersionHistoryList` in the right column (per UI-SPEC §"Responsive Behaviour" `lg+`: 320px wide sidebar):
```tsx
<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
  <div className="space-y-6">
    {/* Detail header w/ status chip + Open in Quote tool button + Delete quote */}
    {/* Inputs recap (read-only, like QuoteResultPanel's recap block) */}
    {result && <QuoteResultPanel result={result.unified} input={result.formValues} />}
  </div>
  <aside className="lg:sticky lg:top-6 self-start">
    <VersionHistoryList versions={quote.versions} onRestore={handleRestore} />
  </aside>
</div>
```

**Back-link pattern** (lines 73-84 of `CompareBrowseTab.tsx`):
```tsx
<button
  type="button"
  onClick={() => setShowCompare(false)}
  className={
    "inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink" +
    " transition-colors duration-150 ease-out" +
    " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
  }
>
  <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
  Back to project list
</button>
```
Substitute: `<Link to="/quotes">← Back to My Quotes</Link>`.

**`?fromQuote=` query-param read** — open via the existing Quote tabs. The mod to `QuoteForm.tsx` reads `useSearchParams()`, finds the saved quote, calls the new `transformToFormValues` from `savedQuoteSchema.ts`, and resets the form.

---

### `frontend/src/pages/quotes/components/QuoteRow.tsx` (list row)

**Analogs:** `frontend/src/pages/demo/business/ProjectDetailDrawer.tsx::Field` (label-value field row), UI-SPEC §`QuoteRow`

**Full-row button pattern** (UI-SPEC §`QuoteRow` and the existing `border-b hairline last:border-b-0` discipline):
```tsx
<button
  className="w-full text-left flex items-center gap-4 px-5 py-4
             border-b hairline last:border-b-0
             hover:bg-paper/60 focus-visible:bg-paper/60
             focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-teal focus-visible:ring-inset
             min-h-[56px]"
  onClick={() => navigate(`/quotes/${q.id}`)}
>
  <div className="min-w-0 flex-1">
    <div className="text-sm font-medium text-ink truncate">{q.name}</div>
    <div className="text-xs text-muted mt-0.5">Saved {q.updatedAt}</div>
  </div>
  <StatusChip status={q.status} onAdvance={(s) => updateStatus(q.id, s)} />
  {/* ... */}
</button>
```

**Existing analog for `border-b hairline last:border-b-0`** (`ProjectDetailDrawer.tsx` line 23):
```tsx
<div className="flex items-baseline justify-between gap-4 py-2 border-b hairline last:border-b-0">
```

**`e.stopPropagation()` on inner action buttons** — analog: `QuotesTable.tsx::RowMenu` (lines 64-95) opens a `<details>` for row actions. For the per-row Delete icon and StatusChip click, use `e.stopPropagation()` so the row's `onClick` doesn't fire.

**Icon usage — `lucide-react` `Trash2` 16px** (matches `QuotesTable.tsx` line 1 `Download, Copy, Trash2, MoreVertical`).

---

### `frontend/src/pages/quotes/components/MyQuotesEmptyState.tsx`

**Analog:** `frontend/src/components/EmptyState.tsx`

**Full body of analog (8 lines)** — use as scaffold but extend for two CTAs and the Sparkles icon:
```tsx
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="display-hero text-xl text-ink">{title}</div>
      {body && <div className="muted text-sm mt-2 max-w-md mx-auto">{body}</div>}
    </div>
  );
}
```

UI-SPEC §`MyQuotesEmptyState` provides the exact JSX scaffold; copy it verbatim with the strings from UI-SPEC §"Empty list".

---

### `frontend/src/pages/quotes/components/SaveQuoteDialog.tsx` (modal)

**Analog:** `frontend/src/pages/demo/business/ProjectDetailDrawer.tsx`

**Modal scaffold — backdrop + ESC handler** (lines 38-73):
```tsx
const handleEsc = useCallback(
  (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  },
  [onClose],
);

useEffect(() => {
  if (!row) return;
  document.addEventListener("keydown", handleEsc);
  return () => document.removeEventListener("keydown", handleEsc);
}, [row, handleEsc]);

// Backdrop
<div
  className={cn(
    "fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity duration-200",
    row ? "opacity-100" : "opacity-0 pointer-events-none",
  )}
  aria-hidden="true"
  onClick={onClose}
/>

// Panel
<div role="dialog" aria-modal="true" aria-label="..."
     className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] ...">
```

**Adaptation for centered modal** (per UI-SPEC §`SaveQuoteDialog`):
- Replace `right-0 top-0 bottom-0 ... translate-x-full` with `inset-0 flex items-center justify-center p-4`.
- Inner panel: `card max-w-md w-full p-6 space-y-4`.
- Form submit handler must validate via zod (`savedQuoteSchema.shape.name`) before calling save.

**Focus trap** — UI-SPEC §`SaveQuoteDialog`/Behaviour mandates a trap. ProjectDetailDrawer does NOT have one (drawer scenario tolerates outside focus). For the centered modal, use either `react-aria` focus-trap or a 12-line custom implementation (per UI-SPEC, researcher's discretion).

**Imports pattern** (lines 1-5):
```ts
import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
```

Add: `useState` (for name field), `useRef` (focus return), zod (validation), `toast` from sonner.

**Toast on success** (sonner pattern — `frontend/src/pages/demo/compare/ComparisonQuote.tsx` line 150):
```ts
toast.error(err instanceof Error ? err.message : "Estimate failed");
```
Mirror: `toast.success("Quote saved.")` (UI-SPEC). For "Mark as revised?" assist (D-10), use sonner's action-button API:
```ts
toast.success("Quote saved.", { action: { label: "Mark as revised?", onClick: () => setStatus("revised") } });
```

---

### `frontend/src/pages/quotes/components/StatusChip.tsx`

**Analogs:** `frontend/src/components/quote/QuoteResultPanel.tsx` (CONFIDENCE_TONE Record map, lines 13-29), `frontend/src/components/PageHeader.tsx` (Chip variant table, lines 7-12)

**Variant-table pattern** (lines 13-29 of `QuoteResultPanel.tsx`):
```ts
const CONFIDENCE_TONE: Record<UnifiedQuoteResult["overallConfidence"], string> = {
  high: "bg-tealSoft text-tealDark",
  moderate: "bg-amberSoft text-ink",
  lower: "bg-amber/10 text-danger",
};

const CONFIDENCE_LABEL: Record<UnifiedQuoteResult["overallConfidence"], string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  lower: "Lower confidence",
};
```

Apply identically with the five status states (per UI-SPEC §"Status-pill palette"):
```ts
type WorkflowStatus = "draft" | "sent" | "won" | "lost" | "revised";

const STATUS_CLASSES: Record<WorkflowStatus, string> = {
  draft: "bg-line text-muted",
  sent: "bg-tealSoft text-tealDark",
  won: "bg-success/15 text-success",
  lost: "bg-danger/10 text-danger",
  revised: "bg-amberSoft text-ink",
};
```

**Chip render usage** (line 72-75 of `QuoteResultPanel.tsx`):
```tsx
<span className={`text-xs eyebrow px-2 py-0.5 rounded-sm ${CONFIDENCE_TONE[result.overallConfidence]}`}>
  {CONFIDENCE_LABEL[result.overallConfidence]}
</span>
```

**Adapt to clickable button** per UI-SPEC §`StatusChip`:
```tsx
<button type="button" onClick={onAdvance}
        onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') advance(); }}
        className={cn(
          "inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-sm",
          "text-xs eyebrow",
          "hover:opacity-90 transition-opacity",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2",
          STATUS_CLASSES[status]
        )}
        aria-label={`Status: ${status}. Click to advance.`}>
  {status}
</button>
```

**Cycle order** (D-09, UI-SPEC): `draft → sent → won → lost → revised → draft`. Implement as a const array `STATUS_CYCLE: readonly WorkflowStatus[]` with `(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length`.

---

### `frontend/src/pages/quotes/components/WorkspacePill.tsx`

**Analog:** `frontend/src/components/PageHeader.tsx` (Chip toneClasses, lines 7-12), inline chips in `QuoteResultPanel.tsx`

**ToneClasses pattern** (lines 1-12 of `PageHeader.tsx`):
```ts
type ChipTone = "success" | "warning" | "accent" | "muted";
export type Chip = { label: string; tone?: ChipTone };

const toneClasses: Record<ChipTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-amberSoft text-ink",
  accent:  "bg-tealSoft text-tealDark",
  muted:   "bg-line text-muted",
};
```

Apply with two-variant table (UI-SPEC §"Workspace-pill palette"):
```ts
const WORKSPACE_CLASSES: Record<"real" | "synthetic", string> = {
  real: "bg-ink/5 text-ink",
  synthetic: "bg-amber/15 text-ink",
};
```

Render as a non-clickable `<span>` with `text-xs eyebrow px-2 py-0.5 rounded-sm`.

---

### `frontend/src/pages/quotes/components/VersionHistoryList.tsx`

**Analog:** `frontend/src/components/quote/QuoteResultPanel.tsx` drivers list (lines 86-110)

**Card + eyebrow + ul pattern** (lines 86-110):
```tsx
<div className="card p-5">
  <div className="eyebrow text-xs text-muted mb-3">What drives this estimate</div>
  <ul className="space-y-2">
    {result.topDrivers.map((d, i) => (
      <li key={i} className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-ink">
          {d.direction === "increases" ? (
            <TrendingUp size={14} className="text-amber" aria-hidden="true" />
          ) : (
            <TrendingDown size={14} className="text-teal" aria-hidden="true" />
          )}
          {d.label}
        </span>
        <span className="text-sm eyebrow text-muted shrink-0">
          {MAGNITUDE_LABEL[d.magnitude]}
        </span>
      </li>
    ))}
    {result.topDrivers.length === 0 && (
      <li className="text-sm text-muted">No clear drivers. Inputs are similar to typical projects.</li>
    )}
  </ul>
</div>
```

Apply per UI-SPEC §`VersionHistoryList`:
```tsx
<aside aria-labelledby="version-history-title" className="card p-5 space-y-3">
  <h3 id="version-history-title" className="eyebrow text-xs text-muted">Version history</h3>
  {versions.length <= 1 && (
    <p className="text-sm text-muted">Only one version saved so far. Edit and re-save to add a version.</p>
  )}
  <ul className="space-y-2" role="list">
    {versions.map((v) => (
      <li key={v.version} className="flex items-center justify-between gap-3 py-2 border-b hairline last:border-b-0">
        <span className="text-sm text-ink mono">v{v.version} · {v.savedAt} ·</span>
        <StatusChip status={v.statusAtTime} readOnly />
        <button type="button" onClick={() => onRestore(v.version)}
                className="text-sm text-teal hover:underline">Restore</button>
      </li>
    ))}
  </ul>
</aside>
```

---

### `frontend/src/pages/quotes/components/DeleteQuoteModal.tsx`

**Analog:** Same as `SaveQuoteDialog` — `ProjectDetailDrawer.tsx` modal scaffold.

**Body verbatim** (UI-SPEC §"Delete confirmation modal"):
```tsx
<p className="text-sm text-ink">
  Delete '<strong>{quoteName}</strong>' permanently? This removes its full version history.
</p>
```

**Destructive button placement reversal** — UI-SPEC mandates `Keep it` (left) / `Delete permanently` (right). Use `bg-danger text-white hover:bg-danger/90` for the danger button.

---

## Test Pattern Assignments

### `frontend/tests/quoteStorage.test.ts`

**Analog:** `frontend/src/demo/pyodideClient.test.ts`

**Module-state isolation pattern** (lines 57-100):
```ts
describe("pyodideClient - ensureModelsReady idempotency", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calling ensureModelsReady('real') twice returns the same promise object", async () => {
    vi.stubGlobal("loadPyodide", vi.fn(() => Promise.resolve(makePyodideMock())));
    vi.stubGlobal("fetch", makeOkFetch());
    vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("script"));

    const mod = await import("./pyodideClient");

    const p1 = mod.ensureModelsReady("real");
    const p2 = mod.ensureModelsReady("real");
    expect(p1).toBe(p2);
    await Promise.allSettled([p1]);
  });
});
```

Apply identically: stub `indexedDB` global with a mock that returns deterministic objectStore-like behaviour, `vi.resetModules()` per test, `await import("./quoteStorage")` for fresh state.

**Mock IndexedDB** — researcher's discretion: either `fake-indexeddb` (npm package, ~1KB) or hand-roll a minimal mock (`open`, `transaction`, `objectStore`, `put`, `get`, `getAll`, `delete`). Both fit the existing `vi.stubGlobal("loadPyodide", ...)` pattern.

---

### `frontend/tests/useSavedQuotes.test.tsx`

**Analog:** `frontend/src/demo/modelMetrics.test.ts`

**`renderHook` + `QueryClientProvider` wrapper** (lines 13-19):
```ts
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}
```

**Fetch-stub pattern** (lines 31-42):
```ts
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ models: FAKE_METRICS }) })));
});
afterEach(() => { vi.unstubAllGlobals(); });
```

Apply: stub `quoteStorage` module functions instead of fetch (mock `listSavedQuotes`, `saveSavedQuote`, etc. via `vi.mock("@/lib/quoteStorage", () => ({ ... }))`).

---

### `frontend/tests/MyQuotesPage.test.tsx`

**Analog:** `frontend/src/pages/demo/MachineLearningQuoteTool.test.tsx`

**Mock-then-import pattern** (lines 36-42, 66-72, 78-87, 93):
```ts
vi.mock("@/demo/pyodideClient", () => ({
  subscribe: mockSubscribe,
  ensurePyodideReady: mockEnsurePyodideReady,
  // ...
}));

const { MachineLearningQuoteTool } = await import("./MachineLearningQuoteTool");
```

Apply: mock `@/hooks/useSavedQuotes`, mock `@/lib/quoteStorage`, then dynamic import the page component.

**Page-header marker assertion + jargon scan combined** — see `jargon-guard.test.tsx` lines 116-125 for the canonical pattern.

---

### `frontend/tests/SaveQuoteDialog.test.tsx`, `frontend/tests/StatusChip.test.tsx`, `frontend/tests/VersionHistoryList.test.tsx`

**Analog:** `frontend/src/components/quote/QuoteResultPanel.test.tsx`

**Fixture-driven describe blocks** (lines 99-165):
```ts
describe("QuoteResultPanel - high confidence fixture", () => {
  it("renders hero estimate as formatted number", () => {
    renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
    expect(screen.getByText(/1,500 hrs/i)).toBeInTheDocument();
  });
  // ... 8 more it() blocks, single assertion each
});
```

Apply for each new component:
- One top-level `describe` per component variant (e.g. `describe("StatusChip - draft")`, `describe("StatusChip - cycle")`, `describe("StatusChip - readOnly")`).
- Each `it` asserts ONE user-visible behaviour.
- Inline fixtures at top of file (factory function pattern from `quoteAdapter.test.ts` lines 13-48 if many variants).

**fireEvent over user-event** — TESTING.md confirms `fireEvent.click(...)` is the convention. No `@testing-library/user-event` in this codebase.

---

## Shared Patterns

### Authentication
**N/A — no auth in this repo.** `IS_DEMO === true` always; no `RequireAdmin` for demo routes.

### Error Handling

**Source:** `frontend/src/pages/demo/compare/ComparisonQuote.tsx` lines 178-209 (inline error card with refresh) + `frontend/src/components/quote/QuoteResultPanel.tsx` (toast for transient errors)

**Apply to:** `MyQuotesPage`, `SavedQuotePage`, `SaveQuoteDialog`, `DeleteQuoteModal`

```tsx
{error && (
  <div className="card p-5 mt-6 flex items-start gap-3 text-sm text-danger" role="alert">
    <AlertTriangle size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <div className="font-medium">Couldn't open your saved quotes</div>
      <div className="text-muted mt-1">{UI-SPEC error body}</div>
    </div>
  </div>
)}
```

For transient failures (save/delete), use sonner toast — pattern from `ComparisonQuote.tsx` line 150:
```ts
toast.error(err instanceof Error ? err.message : "Couldn't save this quote.");
```

### Toast Wiring (already exists)

**Source:** `frontend/src/main.tsx` line 24: `<Toaster richColors position="top-right" />`. **Already wired**. Phase 5 must NOT add a second `<Toaster />`. Use `import { toast } from "sonner";` directly.

### Validation

**Source:** `frontend/src/pages/single-quote/schema.ts` (zod patterns)

**Apply to:** `SaveQuoteDialog` (name field validation)

```ts
const savedQuoteNameSchema = z.string().trim().min(1, "Please give this quote a name before saving.").max(80, "That name is too long — keep it under 80 characters.");
```
Validation error strings come verbatim from UI-SPEC §"Save quote dialog" / Validation error rows.

### Lucide-react icons

**Used in Phase 5:** `Sparkles` (empty state), `Trash2` (delete icons), `X` (modal close), `ArrowLeft` (back link), `Check` (Save button), `RotateCcw` (Restore button — discretionary).

All `lucide-react` icons in this codebase use `size={N} strokeWidth={1.75} aria-hidden="true"`. See `DemoLayout.tsx` line 7 (`const ICON_STROKE = 1.75`), `ProjectDetailDrawer.tsx` line 98.

### `cn()` from `@/lib/utils`

**Source:** `frontend/src/lib/utils.ts` lines 1-6:
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

Always use `cn(...)` for conditional class composition — never inline ternary string concatenation. See `DemoLayout.tsx` lines 36-44, `ProjectDetailDrawer.tsx` lines 26-30.

### Jargon-guard test extension

**Source:** `frontend/src/test/jargon-guard.test.tsx` lines 110-180 + `frontend/src/test/jargon.ts`

**Existing BANNED_TOKENS list (16 patterns)** — UI-SPEC §"Jargon-Guard Scope Addition" confirms NO additions to `jargon.ts`. The current set covers all Phase 5 risks.

**Test-extension pattern** (jargon-guard.test.tsx lines 111-125):
```ts
it("QuoteResultPanel renders no banned ML-jargon tokens", () => {
  renderWithProviders(<QuoteResultPanel result={HIGH_CONFIDENCE_RESULT} input={makeFormValues()} />);
  const body = document.body.textContent ?? "";
  expect(body, "expected QuoteResultPanel chrome to render").toMatch(/estimated hours/i);
  assertNoBannedTokens("QuoteResultPanel", body);
});
```

Apply for each new surface listed in UI-SPEC §"Jargon-Guard Scope Addition" table (9 surfaces). Each adds one `it("...")` block to `describe("jargon-guard (DATA-03 — Phase 4)")`. Marker assertion strings come from each surface's stable copy (e.g. for `MyQuotesList`: `expect(body).toMatch(/my quotes/i);`).

---

## Imports + Path Alias Conventions (durable)

All TS imports follow the order in `CONVENTIONS.md` §"Import Organization":

1. Third-party (React, hooks, libs) — first block
2. Blank line
3. `@/` alias imports grouped by layer
4. Blank line
5. Local relative `./...` imports

**Example template for Phase 5 page** (mirroring `ComparisonQuote.tsx` lines 1-29):
```ts
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { useSavedQuotes } from "@/hooks/useSavedQuotes";
import { saveQuote, deleteQuote } from "@/lib/quoteStorage";
import { cn } from "@/lib/utils";

import { QuoteRow } from "./components/QuoteRow";
import { MyQuotesEmptyState } from "./components/MyQuotesEmptyState";
```

**No barrel files** (CONVENTIONS.md confirmed) — every consumer imports directly from the symbol-owning file.

---

## Naming Idioms (Phase 5 specifics)

**TypeScript constants** — `SCREAMING_SNAKE_CASE` for module-level lookups:
```ts
const STATUS_CLASSES: Record<WorkflowStatus, string> = { ... };
const STATUS_CYCLE: readonly WorkflowStatus[] = ["draft", "sent", "won", "lost", "revised"] as const;
const WORKSPACE_CLASSES: Record<Workspace, string> = { ... };
const QUOTE_DB_NAME = "matrix-quotes";
const QUOTE_STORE_NAME = "quotes";
```

**Hooks** — `useXxx` (TanStack Query: `useSavedQuotes`, `useSavedQuote(id)`).

**Storage module functions** — verb-first per pyodideClient pattern (`ensureXxx`, `loadXxx`):
- `openDb()` — singleton connection
- `listSavedQuotes()`, `getSavedQuote(id)`, `saveSavedQuote(quote)`, `deleteSavedQuote(id)`
- `getVersions(id)`, `restoreVersion(id, versionN)`

**Type names** — `PascalCase`: `SavedQuote`, `QuoteVersion`, `WorkflowStatus`, `Workspace`.

---

## Gotchas / Carry-Forward Constraints

1. **`sessionStorage["matrix.singlequote.last"]` removal (D-16):** Touch only `frontend/src/pages/single-quote/QuoteForm.tsx` lines 29 (`const [lastValues] = useState(readLastValues);`), 48-58 (the conditional `Populate with last quote` button), and 399-407 (the `LAST_KEY` const + `readLastValues` function). DO NOT remove the form-reset button outright — replace its behaviour with `?fromQuote=` rehydration.

2. **Boolean coercion at the form boundary:** `transformToQuoteInput` (lines 114-162 of `schema.ts`) maps booleans to 0/1. The new `transformToFormValues` (inverse) must restore booleans. Test fixture for both directions to prevent re-save corruption.

3. **`log_quoted_materials_cost` round-trip:** `Math.log1p(Math.max(v.estimated_materials_cost, 0))` forward, `Math.expm1(input.log_quoted_materials_cost)` inverse. Off-by-one bug source if reversed wrong way.

4. **No HTTP calls** (ARCHITECTURE.md anti-pattern): `frontend/src/lib/quoteStorage.ts` MUST NOT import from `frontend/src/api/`. Types only (e.g. `QuoteInput` from `@/api/types`) are fine. **Do not introduce `frontend/src/api/quoteStorage.ts`** — pure browser storage.

5. **Pyodide dual-bundle cache (line 78-86 `pyodideClient.ts`):** restoring a saved quote in the same workspace is a no-op-warmup. Rehydration is fast. But IF the saved quote is `workspace: "real"` and the user is currently on `/ml/quote`, opening the saved quote routes to `/compare/quote?fromQuote=...` and triggers `ensureModelsReady("real")` afresh — design the loader UX to expect this.

6. **`?fromQuote=` query-param rehydration timing:** `useSearchParams()` returns the param synchronously, but the saved quote loads from IndexedDB asynchronously. Form reset must wait for the IDB read. Pattern: gate the form render on a local `hydrated` flag, similar to `ready` flag in `ComparisonQuote.tsx` line 69, 211.

7. **`BroadcastChannel` does NOT fire in the same tab.** A save in tab A broadcasts to tab B but not back to tab A. The save mutation in tab A must directly invalidate the TanStack Query cache; the broadcast handles tab B and beyond.

8. **`crypto.randomUUID()` browser support:** All evergreen browsers since 2022. No polyfill needed in this static SPA. Use directly.

9. **IndexedDB versioning with schemaVersion in record:** D-18 requires both. The IndexedDB DB version (in `indexedDB.open(name, version)`) handles structural migrations (object store creation/index changes). The per-record `schemaVersion: 1` field handles per-record content migrations Phase 6/7 will need. Both must be set up correctly in Phase 5 even if only `1` is used.

10. **Compare-tool save (D-13):** the comparator number lives in `CompareBrowseTab.tsx`'s `quotedHours` state, not in the form. Schema must accommodate `compareInputs?: { humanQuotedByBucket: Record<string, number> }`.

11. **The existing `frontend/src/pages/quotes/` folder** is the **Compare-tool** components (not "saved quotes"). Per CONTEXT.md, the new code must NOT collide. **NEW pages go in `frontend/src/pages/quotes/MyQuotesPage.tsx` and `frontend/src/pages/quotes/SavedQuotePage.tsx`** — same folder is fine; existing files (`QuotesTable.tsx`, etc.) stay untouched. Optional cleanup: rename existing files later if confusion grows. Out of scope for Phase 5.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/lib/quoteStorage.ts` (the IDB primitives themselves) | data layer | CRUD | This codebase has zero IndexedDB usage. The `pyodideClient.ts` module-singleton SHAPE is the closest pattern to copy, but the IDB API itself is greenfield. Researcher must implement against the standard `IDBDatabase` / `IDBTransaction` / `IDBObjectStore` API directly, or via the `idb` npm package (D-02 / Claude's Discretion). |

All other files have at least a role-match analog above.

---

## Metadata

**Analog search scope:**
- `frontend/src/components/**`
- `frontend/src/pages/**`
- `frontend/src/demo/**`
- `frontend/src/lib/**`
- `frontend/src/test/**`
- `frontend/tests/**` (does not yet exist as a directory; all current tests are co-located via `*.test.{ts,tsx}` next to source)

**Files scanned:** ~30 (limited to the closest 3-5 analogs per new file per the agent's stop criteria)

**Pattern extraction date:** 2026-05-05

**Test-file location convention** — TESTING.md confirms tests are **co-located** with their production source. The `<files_to_read>` block lists tests under `frontend/tests/` but the established pattern is co-location:
- `frontend/src/lib/quoteStorage.test.ts` (next to `quoteStorage.ts`)
- `frontend/src/hooks/useSavedQuotes.test.tsx` (next to `useSavedQuotes.ts`)
- `frontend/src/pages/quotes/MyQuotesPage.test.tsx` (next to the page)
- `frontend/src/pages/quotes/components/SaveQuoteDialog.test.tsx` (next to the component)

Planner should confirm with the executor whether to follow the established co-location convention or honour the explicit `frontend/tests/` placement in the planning context. **Recommendation: co-locate** (matches every existing test in the repo).
