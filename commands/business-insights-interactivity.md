# Business Insights — Interactivity & Demo Restructure

## Context

The demo is being pitched as "what we have today" (real historical projects, small N) vs. "what you can do at scale" (synthetic training pool, large N). Three things are weakening that pitch:

1. **Wrong label in Synthetic KPIs.** `frontend/src/pages/demo/business/PortfolioKpis.tsx:48` hardcodes `meta="real historical"` on the `Projects` card. That string renders on both `/compare/insights` and `/ml/insights`, so the Synthetic pool's KPI card lies about its own source.
2. **No browse for the Synthetic tool.** The Comparison tool has a `Browse` tab (`CompareBrowseTab`) that lets you filter + compare-side-by-side. The ML tool has no equivalent — you can't see what's in the synthetic pool, only run a quote against it.
3. **Business Insights is read-only.** Six sections render static charts with no filters, no drill-in, no cross-filtering, no sort/search on the ranked table. Nothing the viewer can *do* — which is the whole point of "interactive" in a pitch.

Also, per the pitch frame, the sidebar/home should read as **Real Data** and **Synthetic Data** rather than "Comparison tool" / "Machine learning tool".

Deliverable: a plan document saved at `commands/business-insights-interactivity.md`, and an implementation that (a) restructures each tool into a 3-tab shell — Quote · Compare · Business Insights — with matching sidebar sections, (b) fixes the mis-labeled KPI, (c) makes the Insights page genuinely interactive (filters + cross-filter + detail drawer + sort/search + CSV).

## Shape of the change

```
BEFORE                                   AFTER
──────                                   ─────
Sidebar                                  Sidebar
├─ Home                                  ├─ Home
├─ Comparison tool                       ├─ Real Data
│  ├─ Quote  (Browse + FindSimilar)      │  ├─ Quote            (= FindSimilar only)
│  └─ Business Insights                  │  ├─ Compare          (= Browse only)
└─ Machine learning tool                 │  └─ Business Insights (interactive)
   ├─ Quote                              └─ Synthetic Data
   └─ Business Insights                     ├─ Quote            (ML form)
                                            ├─ Compare          (NEW: browse synthetic)
                                            └─ Business Insights (interactive)

Data flow into Business Insights
────────────────────────────────
  records ──► buildPortfolio() ──► { kpis, buckets, industries,
                                     categories, scatter, ranked }
                                                 │
                                                 ▼
  NEW: InsightsFilters (industry, system, complexity range, search)
          │      ▲
          │      │  cross-filter events (click bar/slice → setFilter)
          ▼      │
  filter(records) ──► buildPortfolio(filtered) ──► charts + table
                                                 │
                                                 ▼
  NEW: ProjectDetailDrawer (click row/dot → show all fields)
```

## Files to change

### 1. Fix the mis-labeled KPI (one-line bug, do this first)

- `frontend/src/pages/demo/business/PortfolioKpis.tsx`
  - Add a `datasetLabel` or `kpiMeta` prop (e.g. `"real historical"` | `"synthetic pool"`). Default to something honest. Thread it through from `BusinessInsightsView.tsx` which already receives `datasetLabel`.
  - Replace `meta="real historical"` on the `Projects` card with the prop.
- `frontend/src/pages/demo/business/BusinessInsightsView.tsx:156`
  - Pass a short meta derived from the existing `datasetLabel` prop (it already gets `"Comparison · Real projects"` vs `"ML · Synthetic training pool"`). Strip the prefix or switch on a new enum prop (`source: "real" | "synthetic"`).
- Update `BusinessInsightsView.test.tsx` + `PortfolioKpis.test.tsx` assertions that check for `"real historical"`.

### 2. Rename the sidebar sections and home cards

- `frontend/src/components/DemoLayout.tsx`
  - `"Comparison tool"` → `"Real Data"` (line 144)
  - `"Machine learning tool"` → `"Synthetic Data"` (line 162)
  - Add a `Compare` sidebar link under each section (see routing below).
- `frontend/src/pages/demo/DemoHome.tsx`
  - Eyebrows: `"Comparison · Real data"` / `"Machine Learning · Synthetic"` → keep the tone but lean into **Real Data** / **Synthetic Data** as the primary label so the pitch reads consistently.
  - Description copy on the insights card should hint at the pitch arc: real = today, synthetic = at scale.
- Update `DemoLayout.test.tsx` snapshot/assertions.

### 3. Split `ComparisonQuoteTool` into separate Quote and Compare routes

Currently `pages/demo/ComparisonQuoteTool.tsx` owns both `Browse` and `Find Similar` as internal tabs. To match the new sidebar (Quote / Compare / Business Insights), give each its own route and page component:

- `frontend/src/pages/demo/compare/ComparisonQuote.tsx` → render **only** `CompareFindSimilarTab`. Drop the `Tabs` shell. Keep its current page header.
- New: `frontend/src/pages/demo/compare/ComparisonCompare.tsx` → render **only** `CompareBrowseTab`. Reuse the same header chrome as `ComparisonQuote` but with "Compare" eyebrow.
- `frontend/src/DemoApp.tsx`
  - Add route `compare/compare` → `ComparisonCompare`.
  - Keep `compare/quote` → `ComparisonQuote` (now Find-Similar-only).
  - Legacy redirect: `compare/browse` → `/compare/compare` (no existing consumers, but cheap insurance).

### 4. Add a Compare tab to the Synthetic tool

- New: `frontend/src/pages/demo/ml/MachineLearningCompare.tsx`
  - Structure mirrors `ComparisonCompare`, but fed by `useSyntheticPool()` from `@/demo/realProjects.ts:185`.
  - Reuse `CompareBrowseTab` as-is — it takes `records: ProjectRecord[]` and doesn't know where the rows came from.
  - Page header eyebrow: `"Synthetic Data · Compare"`. Description calls out that these are generated training rows, not billed projects.
- `frontend/src/DemoApp.tsx`
  - Add route `ml/compare` → `MachineLearningCompare` (lazy, matching the other lazy imports).

### 5. Interactive Business Insights

This is the biggest change. Everything lives in `frontend/src/pages/demo/business/`.

**Central state.** New hook `useInsightsFilters(records)` (either a small hook file in `business/useInsightsFilters.ts` or just `useState` in `BusinessInsightsView`). Holds:

```
{
  industries: Set<string>,      // multi-select
  categories: Set<string>,      // multi-select
  complexityMin: number,        // 1..5 slider
  complexityMax: number,
  search: string,               // project_name contains
}
```

Derived: `filteredRecords = records.filter(...)` → pass into existing `buildPortfolio()`. `buildPortfolio` stays pure; all interactivity is upstream of it.

**New components** (all under `pages/demo/business/`):

- `InsightsFilters.tsx` — a sticky card under the `PageHeader` with:
  - Industry multi-select chips (derived from `records`, ordered by frequency)
  - System category multi-select chips
  - Complexity slider (min/max, 1..5)
  - Search input (debounced 150ms)
  - "Reset filters" link; "Showing N of M projects" counter.
  - Emits `onChange(next)` to the page.
- `ProjectDetailDrawer.tsx` — right-side slide-in drawer (fixed position, width ~420px, transform + backdrop). Lists every non-null field on the record, grouped (Inputs / Per-op actuals / Identity). Closed by X, Esc, or backdrop click.

**Chart changes** (keep Recharts; small, surgical edits — don't rewrite):

- `HoursBySalesBucket.tsx` — add a small segmented toggle above the chart: `Total` / `Avg` / `Share %`. Recompute the `data` prop via a passed-in `metric` selector.
- `HoursByIndustry.tsx`
  - Add `Total` / `Avg` toggle (mirror above).
  - Wire `onClick` on the `<Bar>` to an `onIndustryClick(name)` prop. Selected industries render with `CHART_COLORS.teal`; unselected render with `CHART_COLORS.ink` — uses the existing palette.
- `SystemCategoryMix.tsx`
  - Wire `onClick` on the `<Pie>` to an `onCategoryClick(name)` prop. Selected slice gets full opacity, unselected gets `opacity={0.35}`.
- `ComplexityVsHours.tsx`
  - Add `onClick` on each `<Scatter>` that calls `onPointClick(point)` → opens `ProjectDetailDrawer`.
  - Add a compact x-axis toggle: `Complexity` ↔ `Stations` (reusing the already-computed `stations` field on `ScatterPoint`).
- `TopProjectsTable.tsx`
  - Add a search box (rebind to filter search) and sortable column headers (click to sort by `total_hours`, `stations`, `project_name`, `industry`). Keep the existing `GRID_COLS` layout.
  - Make rows clickable → calls `onRowClick(row)` → opens `ProjectDetailDrawer`. Keyboard: row is a `button` or has `role="button"` + `tabIndex={0}` + Enter/Space handler.
  - Add an "Export CSV" button in the existing header strip (line 28). Serializes the *filtered+sorted* rows. One pure helper: `toCsv(rows) => string` in the same file or `business/csv.ts`.

**Page wiring** (`BusinessInsightsView.tsx`):

- Lift filter state to the view.
- Compute `filteredRecords` then `portfolio = buildPortfolio(filteredRecords)`.
- Pass click handlers down that toggle entries in the corresponding filter Set.
- Keep the six-section layout; only add `<InsightsFilters>` above section 01 and mount `<ProjectDetailDrawer>` at the root.
- Preserve the existing loading skeleton + empty state paths (`isLoading`, `isEmpty`, `error`).

### 6. Plan document

Save this plan at `commands/business-insights-interactivity.md` (create the top-level `commands/` folder at repo root if it doesn't exist). Content: the Context, Shape of change diagram, and the file-by-file breakdown from this plan, lightly trimmed. This is the artifact the user asked for.

## Order of implementation

1. **Fix the KPI label bug** (small, isolated; ships value immediately). Add tests.
2. **Rename sidebar sections + home copy.** Update tests.
3. **Split Comparison into Quote-only and Compare-only routes.** Add redirects, update sidebar links.
4. **Add Synthetic Compare route + page.**
5. **Interactive Insights:** filters → cross-filter clicks → table sort/search → drawer → CSV export. Each step is a separable commit.
6. **Write `commands/business-insights-interactivity.md`.**

## Verification

- `cd frontend && npm run lint && npm run typecheck && npm test` — all green. Update snapshots for `DemoLayout.test.tsx`, `PortfolioKpis.test.tsx`, `BusinessInsightsView.test.tsx`.
- `npm run dev` and manually walk:
  - Sidebar reads **Real Data** / **Synthetic Data**; each has **Quote · Compare · Business Insights**.
  - `/ml/insights` KPI card meta reads `"synthetic pool"` (or equivalent), not `"real historical"`.
  - `/ml/compare` loads the synthetic pool browse table.
  - `/compare/quote` shows only Find-Similar; `/compare/compare` shows only Browse.
  - On either `/insights` route: pick an industry chip → all charts + KPI strip + table reflect the filter. Click an Industry bar → chip toggles. Click a pie slice → category chip toggles. Click a scatter dot or table row → drawer opens with full record. Sort table columns. Toggle Total/Avg on the bar charts. Export CSV — file downloads with the filtered rows.
  - Reset filters returns to the unfiltered state.
- Legacy routes (`/business`, `/compare-tool`, `/ml-tool`) still redirect correctly.
