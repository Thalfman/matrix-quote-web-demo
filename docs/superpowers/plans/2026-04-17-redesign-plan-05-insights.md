# Matrix Quote Web — Redesign Plan 5: Insights (Accuracy + Executive)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `/performance` (Estimate Accuracy) and `/insights` (Executive Overview) to match the design — KPI cards with display-hero numerics and amber accents, Recharts restyled with ink/amber/teal palette + hairline gridlines + mono axis labels, heatmap in teal-tint ramp, and tables rebuilt as grid rows with confidence pips.

**Architecture:** Pure restyle. All data/API wiring stays intact. Recharts colors shift from `#2563EB` blue to `#0D1B2A` ink (primary bar), `#F2B61F` amber (highlight / axis of symmetry), `#1F8FA6` teal (secondary series). Chart frame utilities (grid, axis, tooltip, font) move into a shared `chartTheme.ts` to keep each chart component terse.

**Tech Stack:** React 18, Recharts, Tailwind (Plan 1 tokens).

---

## Design reference

- `docs/design/claude-design-20260417/project/Insights Dashboards.html` (two surfaces in one file)
  - **Estimate Accuracy:** KPI strip (MAPE amber-stripe / R² / Median Δ / Coverage), scatter with y=x diagonal + ±10% bands, residual histogram (mid buckets amber), error-by-segment horizontal bars, per-op table with trend sparklines.
  - **Executive Overview:** KPI strip with micro-sparklines, 16-week stacked bar chart with current-week ring, pipeline funnel, leaderboard, activity feed.

**Scope note:** The design's sparklines, funnel, leaderboard, and activity feed are not backed by existing endpoints. This plan restyles **only what the repo already renders** — that means KPI cards, activity bar chart, latest-quotes table, accuracy heatmap, headline KPIs, MAPE bars, calibration scatter, training history line. Pipeline funnel / leaderboard / activity feed are left for a follow-up plan once endpoints exist.

---

## Prerequisites

- **Plan 1 (Foundation) complete.** Tokens, fonts, `PageHeader` required.

---

## File Structure

**Created:**
- `frontend/src/pages/insights/chartTheme.ts` — shared Recharts theme (axis, grid, tooltip, font)

**Modified:**
- `frontend/src/pages/insights/KpiCards.tsx`
- `frontend/src/pages/insights/QuotesActivityChart.tsx`
- `frontend/src/pages/insights/LatestQuotesTable.tsx`
- `frontend/src/pages/insights/AccuracyHeatmap.tsx`
- `frontend/src/pages/performance/HeadlineKPIs.tsx`
- `frontend/src/pages/performance/MapeByOperation.tsx`
- `frontend/src/pages/performance/CalibrationScatter.tsx`
- `frontend/src/pages/performance/TrainingHistoryChart.tsx`
- `frontend/src/pages/ExecutiveOverview.tsx` — eyebrow section headers
- `frontend/src/pages/ModelPerformance.tsx` — eyebrow section headers

---

## Tasks

### Task 1: Create shared chartTheme.ts

**Files:**
- Create: `frontend/src/pages/insights/chartTheme.ts`

- [ ] **Step 1: Create the file**

```ts
export const CHART_COLORS = {
  ink:     "#0D1B2A",
  ink2:    "#1E2B3A",
  amber:   "#F2B61F",
  teal:    "#1F8FA6",
  tealDark:"#177082",
  success: "#2F8F6F",
  danger:  "#B5412B",
  line:    "#E5E1D8",
  line2:   "#D8D3C6",
  muted:   "#5A6573",
  muted2:  "#8A94A1",
  paper:   "#F6F4EF",
};

export const AXIS_TICK = {
  fontSize: 11,
  fill: CHART_COLORS.muted,
  fontFamily: "JetBrains Mono",
};

export const AXIS_LINE = {
  stroke: CHART_COLORS.line,
};

export const GRID_STYLE = {
  stroke: CHART_COLORS.line,
  strokeDasharray: "2 2",
};

export const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: `1px solid ${CHART_COLORS.line}`,
  borderRadius: 2,
  fontSize: 12,
  fontFamily: "Inter",
  color: CHART_COLORS.ink,
  padding: "8px 10px",
};

export const TOOLTIP_CURSOR = {
  fill: "rgba(31, 143, 166, 0.06)",
  stroke: CHART_COLORS.line,
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/insights/chartTheme.ts
git commit -m "feat(insights): shared Recharts theme tokens (ink/amber/teal)"
```

---

### Task 2: Restyle KpiCards — display-hero + amber stripe on confidence card

**Files:**
- Modify: `frontend/src/pages/insights/KpiCards.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { InsightsOverview } from "@/api/types";

function KpiCard({
  label,
  value,
  suffix,
  accent,
  meta,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
  meta?: string;
}) {
  return (
    <div className="card p-4 relative overflow-hidden">
      {accent && (
        <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-amber" />
      )}
      <div className="eyebrow text-[10px] text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="display-hero text-3xl tnum text-ink">{value}</span>
        {suffix && <span className="text-muted text-sm">{suffix}</span>}
      </div>
      {meta && <div className="text-[11px] text-muted mt-1 mono">{meta}</div>}
    </div>
  );
}

export function KpiCards({ data }: { data: InsightsOverview | undefined }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Active quotes · 30d"
        value={(data?.active_quotes_30d ?? 0).toString()}
        meta="scenarios saved"
      />
      <KpiCard
        label="Models trained"
        value={`${data?.models_trained ?? 0}`}
        suffix={`/ ${data?.models_target ?? 12}`}
        meta="per-op LightGBM"
      />
      <KpiCard
        label="Overall MAPE"
        value={data?.overall_mape != null ? data.overall_mape.toFixed(1) : "—"}
        suffix={data?.overall_mape != null ? "%" : ""}
        meta="lower is better"
      />
      <KpiCard
        label="Confidence calibration"
        value={data?.calibration_within_band_pct != null
          ? data.calibration_within_band_pct.toFixed(1)
          : "—"}
        suffix={data?.calibration_within_band_pct != null ? "%" : ""}
        meta="inside 90% CI"
        accent
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/insights/KpiCards.tsx
git commit -m "style(insights): KpiCards with display-hero numerics + amber confidence stripe"
```

---

### Task 3: Restyle QuotesActivityChart — ink bars + mono axis + hairline grid

**Files:**
- Modify: `frontend/src/pages/insights/QuotesActivityChart.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "./chartTheme";

export function QuotesActivityChart({ rows }: { rows: [string, number][] }) {
  const data = rows.map(([week, count]) => ({ week, count }));
  const lastIndex = data.length - 1;

  if (data.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">No quote activity yet.</div>
    );
  }

  return (
    <div className="card p-4 h-64">
      <div className="eyebrow text-[10px] text-muted mb-2">
        Quotes per week · last 26
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="week"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={TOOLTIP_CURSOR}
          />
          <Bar
            dataKey="count"
            radius={[1, 1, 0, 0]}
            fill={CHART_COLORS.ink}
            // Recharts lets a function set per-cell fill:
            shape={(props: {
              x: number; y: number; width: number; height: number; index: number;
            }) => (
              <rect
                x={props.x}
                y={props.y}
                width={props.width}
                height={props.height}
                fill={props.index === lastIndex ? CHART_COLORS.amber : CHART_COLORS.ink}
                rx={1}
              />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npm run test -- QuotesActivityChart
```

Expected: PASS. Chart renders 26 bars with last bar in amber.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/insights/QuotesActivityChart.tsx
git commit -m "style(insights): activity chart in ink with amber current-week bar"
```

---

### Task 4: Restyle LatestQuotesTable — grid rows + mono tnum

**Files:**
- Modify: `frontend/src/pages/insights/LatestQuotesTable.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { Link } from "react-router-dom";
import { SavedQuoteSummary } from "@/api/types";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function LatestQuotesTable({ rows }: { rows: SavedQuoteSummary[] }) {
  if (rows.length === 0) {
    return <div className="card p-6 text-sm text-muted">No saved quotes yet.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline justify-between px-4 py-2.5 bg-paper/60 border-b hairline">
        <div className="eyebrow text-[10px] text-muted">Latest quotes</div>
        <div className="text-[11px] text-muted mono">{rows.length} rows</div>
      </div>
      <div
        className="grid items-center gap-3 px-4 py-2 border-b hairline bg-paper/40"
        style={{ gridTemplateColumns: "2fr 1.5fr 110px 110px" }}
      >
        {["Name", "Project", "Hours", "Saved"].map((h, i) => (
          <div
            key={h}
            className={
              "eyebrow text-[10px] text-muted " + (i === 2 ? "text-right" : "")
            }
          >
            {h}
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          className="grid items-center gap-3 px-4 py-2.5 border-b hairline last:border-b-0 hover:bg-paper/80 transition-colors"
          style={{ gridTemplateColumns: "2fr 1.5fr 110px 110px" }}
        >
          <div className="text-sm text-ink truncate font-medium">{r.name}</div>
          <div className="text-sm text-muted truncate mono">{r.project_name}</div>
          <div className="mono tnum text-ink text-sm text-right">
            {fmt(r.hours)}
          </div>
          <div className="mono tnum text-muted text-[12px]">
            {new Date(r.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
      <div className="px-4 py-2.5 text-right">
        <Link
          to="/quotes"
          className="text-sm text-teal hover:text-tealDark"
        >
          See all saved quotes →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/insights/LatestQuotesTable.tsx
git commit -m "style(insights): LatestQuotesTable as grid rows with mono tnum columns"
```

---

### Task 5: Restyle AccuracyHeatmap — teal-tint ramp + eyebrow axis labels

**Files:**
- Modify: `frontend/src/pages/insights/AccuracyHeatmap.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
export function AccuracyHeatmap({
  operations,
  quarters,
  matrix,
}: {
  operations: string[];
  quarters: string[];
  matrix: (number | null)[][];
}) {
  if (operations.length === 0 || quarters.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Accuracy heatmap populates once per-quarter training history is persisted.
      </div>
    );
  }

  const all = matrix.flat().filter((v): v is number => v != null);
  const max = all.length ? Math.max(...all) : 1;

  // Teal-tint ramp: low MAPE = light teal/paper, high MAPE = deep ink/danger.
  const color = (v: number | null): string => {
    if (v == null) return "#F6F4EF";
    const t = Math.min(1, v / Math.max(max, 1));
    const shades = ["#D7ECF1", "#A9D5DF", "#7ABDCC", "#1F8FA6", "#0D1B2A"];
    return shades[Math.min(shades.length - 1, Math.floor(t * shades.length))];
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b hairline bg-paper/60">
        <div className="eyebrow text-[10px] text-muted">MAPE · operation × quarter</div>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="text-xs">
          <thead>
            <tr>
              <th />
              {quarters.map((q) => (
                <th
                  key={q}
                  className="px-2 py-1 mono text-muted font-normal"
                >
                  {q}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {operations.map((op, r) => (
              <tr key={op}>
                <td className="pr-3 py-1 text-right mono text-[11px] text-muted whitespace-nowrap">
                  {op}
                </td>
                {matrix[r].map((v, c) => (
                  <td
                    key={c}
                    title={v == null ? "no data" : `${v.toFixed(1)}%`}
                    style={{ background: color(v) }}
                    className="w-12 h-7 border border-surface"
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted">
          <span>MAPE:</span>
          <div className="flex items-center gap-0">
            {["#D7ECF1", "#A9D5DF", "#7ABDCC", "#1F8FA6", "#0D1B2A"].map((c) => (
              <span
                key={c}
                aria-hidden="true"
                style={{ background: c }}
                className="w-5 h-3 border border-surface"
              />
            ))}
          </div>
          <span>low → high</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/insights/AccuracyHeatmap.tsx
git commit -m "style(insights): AccuracyHeatmap in teal-tint ramp with mono axis labels"
```

---

### Task 6: Restyle HeadlineKPIs — display-hero + amber stripe on first

**Files:**
- Modify: `frontend/src/pages/performance/HeadlineKPIs.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { PerformanceHeadline } from "@/api/types";

function KPI({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  accent?: boolean;
}) {
  const txt = value == null ? "—" : `${value.toFixed(1)}${suffix ?? ""}`;
  return (
    <div className="card p-4 relative overflow-hidden">
      {accent && (
        <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-amber" />
      )}
      <div className="eyebrow text-[10px] text-muted">{label}</div>
      <div className="display-hero text-3xl tnum mt-2 text-ink">{txt}</div>
    </div>
  );
}

export function HeadlineKPIs({ head }: { head: PerformanceHeadline | undefined }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KPI label="Overall MAPE" value={head?.overall_mape ?? null} suffix="%" accent />
      <KPI label="Within ±10%"  value={head?.within_10_pct ?? null} suffix="%" />
      <KPI label="Within ±20%"  value={head?.within_20_pct ?? null} suffix="%" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/performance/HeadlineKPIs.tsx
git commit -m "style(perf): HeadlineKPIs with amber stripe on MAPE card"
```

---

### Task 7: Restyle MapeByOperation — ink bars + mono axis

**Files:**
- Modify: `frontend/src/pages/performance/MapeByOperation.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MetricRow } from "@/api/types";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "../insights/chartTheme";

export function MapeByOperation({ rows }: { rows: MetricRow[] }) {
  const anyMape = rows.some(
    (r) => "mape" in r && (r as unknown as { mape?: number }).mape != null,
  );
  const data = rows
    .map((r) => ({
      op: r.target.replace(/_hours$/, ""),
      mape: anyMape ? (r as unknown as { mape?: number }).mape ?? 0 : r.mae ?? 0,
    }))
    .sort((a, b) => b.mape - a.mape);

  if (data.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        No training metrics yet. Once the models are trained, per-operation accuracy appears here.
      </div>
    );
  }

  return (
    <div className="card p-4 h-72">
      <div className="eyebrow text-[10px] text-muted mb-2">
        {anyMape ? "MAPE · by operation" : "MAE · by operation (hours)"}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="op"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} />
          <Bar dataKey="mape" fill={CHART_COLORS.ink} radius={[1, 1, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/performance/MapeByOperation.tsx
git commit -m "style(perf): MapeByOperation in ink bars with mono axis labels"
```

---

### Task 8: Restyle CalibrationScatter — success/danger dots + y=x reference line

**Files:**
- Modify: `frontend/src/pages/performance/CalibrationScatter.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { CalibrationPoint } from "@/api/types";
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART_COLORS,
  GRID_STYLE,
  TOOLTIP_STYLE,
} from "../insights/chartTheme";

export function CalibrationScatter({ points }: { points: CalibrationPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Calibration data isn't available yet. Persist predicted vs actual points during training
        to populate this chart.
      </div>
    );
  }

  const inside = points
    .filter((p) => p.inside_band)
    .map((p) => ({
      mid: (p.predicted_low + p.predicted_high) / 2,
      actual: p.actual,
    }));
  const outside = points
    .filter((p) => !p.inside_band)
    .map((p) => ({
      mid: (p.predicted_low + p.predicted_high) / 2,
      actual: p.actual,
    }));

  const allXY = points.flatMap((p) => [
    (p.predicted_low + p.predicted_high) / 2,
    p.actual,
  ]);
  const max = Math.max(1, ...allXY);

  return (
    <div className="card p-4 h-80">
      <div className="eyebrow text-[10px] text-muted mb-2">
        Confidence calibration · predicted (mid) vs actual
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis
            type="number"
            dataKey="mid"
            name="Predicted (mid)"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            domain={[0, max]}
          />
          <YAxis
            type="number"
            dataKey="actual"
            name="Actual"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            domain={[0, max]}
          />
          <ZAxis range={[36, 36]} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ strokeDasharray: "3 3", stroke: CHART_COLORS.line }}
          />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: max, y: max },
            ]}
            stroke={CHART_COLORS.ink}
            strokeDasharray="2 3"
          />
          <Scatter
            name="Inside 90% band"
            data={inside}
            fill={CHART_COLORS.success}
            fillOpacity={0.85}
          />
          <Scatter
            name="Outside 90% band"
            data={outside}
            fill={CHART_COLORS.danger}
            fillOpacity={0.85}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full bg-success"
          />
          Inside band
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full bg-danger"
          />
          Outside band
        </span>
        <span className="mono">y = x reference</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/performance/CalibrationScatter.tsx
git commit -m "style(perf): CalibrationScatter with y=x reference + success/danger dots"
```

---

### Task 9: Restyle TrainingHistoryChart — teal line + mono axis

**Files:**
- Modify: `frontend/src/pages/performance/TrainingHistoryChart.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { TrainingRunRow } from "@/api/types";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "../insights/chartTheme";

export function TrainingHistoryChart({ rows }: { rows: TrainingRunRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Training history isn't persisted yet. Once each training run writes a snapshot, this
        chart shows MAPE over time.
      </div>
    );
  }
  const data = rows.map((r) => ({
    date: new Date(r.trained_at).toLocaleDateString(),
    mape: r.overall_mape,
    rows: r.rows,
  }));

  return (
    <div className="card p-4 h-72">
      <div className="eyebrow text-[10px] text-muted mb-2">Training history</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} />
          <Line
            dataKey="mape"
            stroke={CHART_COLORS.teal}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLORS.teal, stroke: CHART_COLORS.teal }}
            activeDot={{ r: 5, fill: CHART_COLORS.amber, stroke: CHART_COLORS.amber }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/performance/TrainingHistoryChart.tsx
git commit -m "style(perf): TrainingHistoryChart in teal line with amber hover dot"
```

---

### Task 10: Update ExecutiveOverview.tsx + ModelPerformance.tsx — eyebrow section headers

**Files:**
- Modify: `frontend/src/pages/ExecutiveOverview.tsx`
- Modify: `frontend/src/pages/ModelPerformance.tsx`

- [ ] **Step 1: Overwrite ExecutiveOverview.tsx**

```tsx
import { useInsightsOverview } from "@/api/quote";
import { PageHeader } from "@/components/PageHeader";

import { KpiCards } from "./insights/KpiCards";
import { QuotesActivityChart } from "./insights/QuotesActivityChart";
import { LatestQuotesTable } from "./insights/LatestQuotesTable";
import { AccuracyHeatmap } from "./insights/AccuracyHeatmap";

export function ExecutiveOverview() {
  const { data } = useInsightsOverview();

  return (
    <>
      <PageHeader
        eyebrow="Insights · Executive"
        title="Executive Overview"
        description="Pipeline activity, model accuracy, and per-operation trends at a glance."
      />

      <div className="mb-6">
        <KpiCards data={data} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Pipeline activity</div>
          <QuotesActivityChart rows={data?.quotes_activity ?? []} />
        </div>
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Latest saved</div>
          <LatestQuotesTable rows={data?.latest_quotes ?? []} />
        </div>
      </div>

      <div>
        <div className="eyebrow text-[10px] text-muted mb-2">Accuracy heatmap</div>
        <AccuracyHeatmap
          operations={data?.operations ?? []}
          quarters={data?.quarters ?? []}
          matrix={data?.accuracy_heatmap ?? []}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Overwrite ModelPerformance.tsx**

```tsx
import {
  useCalibration,
  useMetricsHistory,
  usePerformanceHeadline,
} from "@/api/quote";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { MetricsSummary } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

import { HeadlineKPIs } from "./performance/HeadlineKPIs";
import { MapeByOperation } from "./performance/MapeByOperation";
import { CalibrationScatter } from "./performance/CalibrationScatter";
import { TrainingHistoryChart } from "./performance/TrainingHistoryChart";

export function ModelPerformance() {
  const { data: summary } = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => (await api.get<MetricsSummary>("/metrics")).data,
  });
  const { data: headline } = usePerformanceHeadline();
  const { data: calibration } = useCalibration();
  const { data: history } = useMetricsHistory();

  return (
    <>
      <PageHeader
        eyebrow="Insights · Accuracy"
        title="Estimate Accuracy"
        description="How well the model predicts actuals across operations, confidence bands, and training runs."
      />

      <div className="mb-6">
        <HeadlineKPIs head={headline} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Per-operation MAPE</div>
          <MapeByOperation rows={summary?.metrics ?? []} />
        </div>
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Calibration</div>
          <CalibrationScatter points={calibration ?? []} />
        </div>
      </div>

      <div>
        <div className="eyebrow text-[10px] text-muted mb-2">Training history</div>
        <TrainingHistoryChart rows={history ?? []} />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm run test -- ExecutiveOverview ModelPerformance
```

Expected: PASS (these tests are behavior-level: verify child components render).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ExecutiveOverview.tsx frontend/src/pages/ModelPerformance.tsx
git commit -m "style(insights): eyebrow section labels and 2-col grid on both dashboards"
```

---

### Task 11: Final verification gate

- [ ] **Step 1: Tests + type-check + build**

```bash
cd frontend && npm run test && npm run typecheck && npm run build
```

Expected: clean.

- [ ] **Step 2: Visual smoke**

```bash
cd frontend && npm run dev
```

At `/insights`:
- 4 KPI cards with display-hero numerics; confidence card has amber top stripe.
- Activity chart: ink bars, last week is amber, mono axis labels, dotted hairline horizontal grid.
- Latest quotes: grid-row table, teal "See all" link.
- Heatmap: teal→ink ramp, legend strip below.

At `/performance`:
- 3 KPI cards; MAPE has amber stripe.
- MAPE bars ink.
- Calibration scatter: dashed y=x line, green inside dots, danger outside dots, legend below.
- Training history line in teal.

Stop the dev server.

---

## Done

Plan 5 complete.
