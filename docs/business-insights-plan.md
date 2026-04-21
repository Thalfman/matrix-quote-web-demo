# Business Insights — static demo dashboard (original design)

> **Note:** This document describes the initial static implementation. The interactive iteration — filters, cross-filter, detail drawer, sort/search, CSV export, Real/Synthetic Data sidebar framing, and the Compare tab added to both sections — is documented in `commands/business-insights-interactivity.md`.

## Context

The demo today has two tools (Comparison + ML Quote) aimed at estimators. A business audience — sales leadership, ops exec, industry stakeholders — wants portfolio-level views: where hours go, which industries we serve, how complexity drives scope, and which projects dominate the book. All of that can be computed client-side from the 24 real projects already in `real-projects.json`; nothing backend-side needs to change.

Deliverable: a new "Business Insights" page under the demo shell, wired into the sidebar and home cards, showing a KPI strip + four charts + a ranked project table. It reuses the existing chart palette and the existing `recordToPrediction()` aggregation utility.

## Shape of the change

```
┌─────────────────────────────────────────────────────────────────────┐
│ App.tsx (IS_DEMO → DemoApp)                                         │
└─────────────────────────────────────────────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
     DemoApp.tsx (routes)               DemoLayout.tsx (sidebar NAV)
     + /business route (lazy)           + "Business Insights" link
              │
              ▼
     pages/demo/BusinessInsights.tsx  ◄── new page (top-level)
              │
              ├── useRealProjects()  ──►  real-projects.json  (existing)
              │
              ├── pages/demo/business/portfolioStats.ts        [data]
              │     buildPortfolio(records) → { kpis, buckets,
              │                                 industries, categories,
              │                                 scatter, ranked }
              │
              └── renders:
                  pages/demo/business/PortfolioKpis.tsx
                  pages/demo/business/HoursBySalesBucket.tsx   recharts
                  pages/demo/business/HoursByIndustry.tsx      recharts
                  pages/demo/business/SystemCategoryMix.tsx    recharts
                  pages/demo/business/ComplexityVsHours.tsx    recharts
                  pages/demo/business/TopProjectsTable.tsx

  DemoHome.tsx adds a third card → /business (md:grid-cols-3)
```

All new files live under `frontend/src/pages/demo/business/` except the page component itself (kept under `frontend/src/pages/demo/` alongside its peers). Chart styling pulls from the existing `pages/insights/chartTheme.ts` — same palette, axes, tooltips as the Executive Overview.

## Data derivation (one pure function)

File: `frontend/src/pages/demo/business/portfolioStats.ts`

A single `buildPortfolio(records: ProjectRecord[])` function that walks every record once and emits everything the charts need. Internals:

- For each record, call `recordToPrediction(r)` (already exported from `src/demo/realProjects.ts`) to get `{ total_p50, sales_buckets, ops }`. The `p50` total is the sum of per-op actuals, which is what we want.
- Derive `total_hours`, `primary_bucket = argmax(sales_buckets[*].p50)`, `industry = r.industry_segment ?? "Unknown"`, `system_category`, `stations_count`, `complexity_score_1_5`, `log_quoted_materials_cost`, `project_name`, `project_id`.
- Aggregate:
  - `kpis`: `projectCount`, `totalHours`, `avgHours`, `medianHours`, `avgMaterialsCost = exp(mean(log_quoted_materials_cost))` (guard against 0/NaN; fall back to `—` rendering).
  - `bucketsTotal`: `Record<bucket, hours>` summed across all projects, sorted desc.
  - `industries`: `[{ industry, projectCount, avgHours, totalHours }]` sorted by `totalHours` desc.
  - `categories`: `[{ category, count }]` sorted desc.
  - `scatter`: `[{ complexity, stations, hours, industry, name }]` per project.
  - `ranked`: records sorted by `total_hours` desc.

No new dependencies. `SALES_BUCKETS` and categorical/numeric field name constants already exist in `src/demo/realProjects.ts` — reuse those.

## Files to create / edit

**Create**

- `frontend/src/pages/demo/BusinessInsights.tsx` — page shell. Uses `PageHeader` (eyebrow "Insights · Portfolio", title "Business Insights", description about the 24 real projects, chip `{records.length} projects`). Calls `useRealProjects()`, shows the same loading/error blocks `ComparisonQuoteTool.tsx` does, then renders the sections below in order:
  1. `PortfolioKpis` (KPI row)
  2. grid `lg:grid-cols-2 gap-6`: `HoursBySalesBucket` + `HoursByIndustry`
  3. grid `lg:grid-cols-2 gap-6`: `SystemCategoryMix` + `ComplexityVsHours`
  4. `TopProjectsTable`
- `frontend/src/pages/demo/business/portfolioStats.ts` — the aggregation function described above, plus exported types `PortfolioStats`, `IndustryRow`, `CategoryRow`, `ScatterPoint`, `RankedRow`.
- `frontend/src/pages/demo/business/PortfolioKpis.tsx` — 4 cards mirroring the style of `pages/insights/KpiCards.tsx` (copy the inner `KpiCard` structure, don't import — keeps the demo bundle independent of the non-demo code path that uses `InsightsOverview` types). Cards: Projects, Total hours, Avg hours / project, Avg materials cost (USD, formatted with `Intl.NumberFormat`). Use the `accent` top-bar on the first card.
- `frontend/src/pages/demo/business/HoursBySalesBucket.tsx` — recharts `BarChart` (horizontal; `layout="vertical"`, `YAxis dataKey="bucket"`, `XAxis type="number"`). Single bar series `hours`, fill `CHART_COLORS.teal`. Uses `CHART_COLORS`, `AXIS_TICK`, `AXIS_LINE`, `GRID_STYLE`, `TOOLTIP_STYLE`, `TOOLTIP_CURSOR` from `pages/insights/chartTheme.ts`. Empty-state block matches `QuotesActivityChart.tsx`'s pattern.
- `frontend/src/pages/demo/business/HoursByIndustry.tsx` — recharts `BarChart` (vertical bars) keyed on `industry`. Single `avgHours` bar; `projectCount` surfaces in the tooltip.
- `frontend/src/pages/demo/business/SystemCategoryMix.tsx` — recharts `PieChart` with a donut (`innerRadius={60}`, `outerRadius={90}`). Slice colors cycled from `[ink, amber, teal, tealDark, ink2, muted]`. Legend on the right. Tooltip shows `count` and share %.
- `frontend/src/pages/demo/business/ComplexityVsHours.tsx` — recharts `ScatterChart` with X = `complexity_score_1_5`, Y = `total_hours`, dot size fixed. Color dots by `industry` using a color map derived from the unique industries (cycle palette). Tooltip shows project name, industry, stations, hours.
- `frontend/src/pages/demo/business/TopProjectsTable.tsx` — table of all 24 projects sorted by total hours desc. Columns: Project, Industry, System, Stations, Total hours, Primary bucket. Use the same layout grid pattern as `LatestQuotesTable.tsx` (grid header + rows, hairline dividers, `mono tnum` for numeric cells).

**Edit**

- `frontend/src/DemoApp.tsx` — add a lazy-loaded route:
  ```tsx
  const BusinessInsights = lazy(() =>
    import("@/pages/demo/BusinessInsights").then((m) => ({
      default: m.BusinessInsights,
    })),
  );
  ...
  <Route path="business" element={<BusinessInsights />} />
  ```
  Placed between `compare-tool` and `ml-tool`. Catch-all `<Navigate to="/" replace />` stays last.
- `frontend/src/components/DemoLayout.tsx` — extend `NAV` with `{ to: "/business", label: "Business Insights" }`, inserted after `/compare-tool`. No other changes to the layout.
- `frontend/src/pages/demo/DemoHome.tsx` — switch outer grid from `md:grid-cols-2` to `md:grid-cols-3` (still stacks on mobile). Add a third `<Link to="/business">` card matching the existing two; eyebrow `"Insights · Portfolio"` with a teal accent, the `projects` count chip, title "Business Insights", description like "Portfolio-level view of the 24 real projects — hours by discipline, industry mix, complexity drivers." Reuses the existing manifest query; no new fetch needed.

**Do not touch**

- `scripts/build_demo_static.py` and any backend/CSV pipeline. Everything we need is already in `real-projects.json` via the existing `QUOTE_CAT_FEATURES + QUOTE_NUM_FEATURES + TARGETS` keep-list.
- The non-demo `ExecutiveOverview` page. It depends on `useInsightsOverview()` (an API call) and is shown only outside demo mode.

## Styling & reuse specifics

- Import colors/axes/tooltip/grid from `@/pages/insights/chartTheme`. Don't inline hex values.
- Cards use the `.card` utility class (already defined in globals); padding matches existing charts (`p-4 h-64` / `h-80` for chart cards; `p-4` for KPIs).
- Section eyebrows use `eyebrow text-[10px] text-muted mb-2` — mirrors `ExecutiveOverview.tsx`.
- Monospace numerics use `mono tnum` — mirrors existing tables.
- Chart components must render a `ResponsiveContainer`; charts sit inside a `.card` with a fixed height (`h-64` or `h-80`) so the container has something to fill.
- Tooltip formatting for hours: `Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })`.

## Verification

1. `cd frontend && npm install` (if the workspace hasn't been installed yet).
2. Ensure demo assets exist: if `frontend/public/demo-assets/` is missing, run `python3 scripts/build_demo_static.py` from the repo root (requires `git lfs pull` once to hydrate joblib bundles; for this UI-only change the joblibs aren't actually needed at runtime, but the script will copy them).
3. `cd frontend && VITE_DEMO_MODE=1 npm run dev` and open `/business`.
   - Confirm all five sections render (KPI row, 2 chart rows, table).
   - Confirm the sidebar link and the home card both route to it.
   - Hover tooltips on each chart; confirm numbers match a spot-check against `real-projects.json` (e.g. total hours = sum of the 12 per-op actuals across all 24 rows).
4. `cd frontend && npm run typecheck && npm run lint && npm test` — existing tests must still pass. No new tests required for this pass, but if one is wanted, mirror `QuotesActivityChart.test.tsx`: mock `recharts.ResponsiveContainer`, render with a small hand-crafted `records` fixture, assert section headings appear.
5. `cd frontend && VITE_DEMO_MODE=1 npm run build` — confirm the lazy-loaded `BusinessInsights` chunk shows up in the build output and the bundle still builds cleanly.

## Out of scope (call out if the user wants them)

- Quoted-vs-actual overrun views. That data (`quoted_*_hours`, `total_*_quoted_hours`) exists in the source CSV but is not currently emitted by `build_demo_static.py`. Adding it is a ~5-line change to the script's `_records()` keep-list plus a component — worth a follow-up if executives ask "where do we miss our estimates".
- Time-series by `quote_date`. The date column is in the CSV but not in the JSON; same follow-up as above.
- Dark-mode tuning of the new charts (inherits whatever `chartTheme.ts` currently provides).
