# Matrix Quote Web — Redesign Plan 3: Saved Quotes + Compare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `/quotes` (Saved Quotes list) and `/quotes/compare` to match the design — KPI strip, divide-x filter bar, bulk action bar on selection, mono-tnum table with confidence pips, and an amber-anchored compare view with signed deltas.

**Architecture:** Keep all API usage and routing intact. Add a `QuotesKpiStrip` component and reuse `QuotesFilters` / `QuotesTable` with tightened markup. Restyle `CompareHeader`, `CompareBucketsChart` (keep Recharts, swap palette to ink/amber/teal), `CompareInputDiff` (highlight changed cells), and `CompareDriversStrip`. Add a bulk action bar that only appears when ≥1 row selected.

**Tech Stack:** React 18, React Query, Recharts, Tailwind (new tokens from Plan 1).

---

## Design reference

- `docs/design/claude-design-20260417/project/Saved Quotes + Compare.html`
  - Screen 1 (list): KPI strip, filter bar, bulk action bar, 9-col table, pagination.
  - Screen 2 (compare): scenario columns with amber anchor, headline estimates, grouped bars, input diff, driver columns.

---

## Prerequisites

- **Plan 1 (Foundation) complete.** `PageHeader`, `EmptyState`, tokens, fonts must be in place.

---

## File Structure

**Created:**
- `frontend/src/pages/quotes/QuotesKpiStrip.tsx` — 4-card KPI strip (total / 7d / avg / high-confidence)
- `frontend/src/pages/quotes/QuotesBulkBar.tsx` — selection-scoped action bar

**Modified:**
- `frontend/src/pages/Quotes.tsx` — strip layout + bulk bar integration
- `frontend/src/pages/Compare.tsx` — section headers in eyebrow
- `frontend/src/pages/quotes/QuotesFilters.tsx` — divide-x industrial bar
- `frontend/src/pages/quotes/QuotesTable.tsx` — 9-col grid layout + confidence pips + mono tnum
- `frontend/src/pages/quotes/CompareHeader.tsx` — amber anchor column + display-hero totals + signed delta colors
- `frontend/src/pages/quotes/CompareBucketsChart.tsx` — ink/amber/teal Recharts palette + absolute/delta toggle
- `frontend/src/pages/quotes/CompareInputDiff.tsx` — grid markup + changed-cell highlights
- `frontend/src/pages/quotes/CompareDriversStrip.tsx` — 3-column split with eyebrow labels

**Unchanged:**
- `frontend/src/api/quote.ts`, `frontend/src/api/types.ts`

---

## Tasks

### Task 1: Create QuotesKpiStrip component

**Files:**
- Create: `frontend/src/pages/quotes/QuotesKpiStrip.tsx`

**Design reference:** `Saved Quotes + Compare.html` — first screen KPI cards (display-hero values, eyebrow labels, 4th card amber top stripe).

- [ ] **Step 1: Create the file**

```tsx
import { SavedQuoteSummary } from "@/api/types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function QuotesKpiStrip({ rows }: { rows: SavedQuoteSummary[] }) {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const recent = rows.filter((r) => now - new Date(r.created_at).getTime() <= sevenDays);
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const avgHours = rows.length > 0 ? totalHours / rows.length : 0;

  // High-confidence = CI band narrower than 25% of total p50.
  const highConf = rows.filter((r) => {
    const band = r.range_high - r.range_low;
    return r.hours > 0 && band / r.hours <= 0.25;
  });
  const highConfPct =
    rows.length > 0 ? Math.round((highConf.length / rows.length) * 100) : 0;

  const cards: {
    label: string;
    value: string;
    meta?: string;
    accent?: boolean;
  }[] = [
    { label: "Total saved", value: fmt(rows.length), meta: "all time" },
    { label: "Last 7 days",  value: fmt(recent.length), meta: `${recent.length === 1 ? "scenario" : "scenarios"}` },
    { label: "Avg hours",    value: fmt(avgHours),     meta: "across saved" },
    { label: "High confidence", value: `${highConfPct}%`, meta: "narrow 90% CI", accent: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="card p-4 relative overflow-hidden">
          {c.accent && (
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 right-0 h-1 bg-amber"
            />
          )}
          <div className="eyebrow text-[10px] text-muted">{c.label}</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">{c.value}</div>
          {c.meta && <div className="text-[11px] text-muted mt-1">{c.meta}</div>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/quotes/QuotesKpiStrip.tsx
git commit -m "feat(quotes): KPI strip component for Saved Quotes header"
```

---

### Task 2: Create QuotesBulkBar component

**Files:**
- Create: `frontend/src/pages/quotes/QuotesBulkBar.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { X } from "lucide-react";

type Props = {
  selectedCount: number;
  onCompare: () => void;
  onClear: () => void;
  canCompare: boolean;
};

export function QuotesBulkBar({ selectedCount, onCompare, onClear, canCompare }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 bg-ink text-white px-4 py-2.5 rounded-sm mb-3">
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="text-white/70 hover:text-white"
      >
        <X size={14} strokeWidth={2} />
      </button>
      <div className="mono text-sm font-semibold">{selectedCount} selected</div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onCompare}
        disabled={!canCompare}
        className={
          "text-sm font-medium transition-colors " +
          (canCompare ? "text-amber hover:text-amber/80" : "text-white/30 cursor-not-allowed")
        }
      >
        {canCompare ? "Compare →" : "Pick 2 or 3 to compare"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/quotes/QuotesBulkBar.tsx
git commit -m "feat(quotes): bulk action bar (ink background, amber compare link)"
```

---

### Task 3: Restyle QuotesFilters — divide-x, search first

**Files:**
- Modify: `frontend/src/pages/quotes/QuotesFilters.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { Search } from "lucide-react";

type Props = {
  projects: string[];
  industries: string[];
  project: string | null;
  industry: string | null;
  search: string;
  onChange: (next: { project: string | null; industry: string | null; search: string }) => void;
};

export function QuotesFilters({
  projects,
  industries,
  project,
  industry,
  search,
  onChange,
}: Props) {
  return (
    <div className="card flex items-stretch overflow-hidden">
      <div className="relative flex-1 min-w-0 flex items-center">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onChange({ project, industry, search: e.target.value })}
          placeholder="Search name, project, client"
          className="flex-1 bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted"
        />
      </div>
      <div className="w-px bg-line" aria-hidden="true" />
      <label className="flex items-center gap-2 px-3 py-2.5">
        <span className="eyebrow text-[10px] text-muted">Project</span>
        <select
          value={project ?? ""}
          onChange={(e) => onChange({ project: e.target.value || null, industry, search })}
          className={
            "bg-transparent text-sm outline-none " +
            (project ? "text-ink font-medium" : "text-muted")
          }
        >
          <option value="">All</option>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <div className="w-px bg-line" aria-hidden="true" />
      <label className="flex items-center gap-2 px-3 py-2.5">
        <span className="eyebrow text-[10px] text-muted">Industry</span>
        <select
          value={industry ?? ""}
          onChange={(e) => onChange({ project, industry: e.target.value || null, search })}
          className={
            "bg-transparent text-sm outline-none " +
            (industry ? "text-ink font-medium" : "text-muted")
          }
        >
          <option value="">All</option>
          {industries.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/quotes/QuotesFilters.tsx
git commit -m "style(quotes): filter bar as divided card with inline eyebrow labels"
```

---

### Task 4: Restyle QuotesTable — 9-col grid, confidence pips, mono tnum

**Files:**
- Modify: `frontend/src/pages/quotes/QuotesTable.tsx`

**Design reference:** Saved Quotes list screen — checkbox 32px | project (font-medium) | industry (mono) | hours | range | confidence pips | saved | by | menu. Hover:bg-paper.

- [ ] **Step 1: Overwrite the file**

```tsx
import { Download, Copy, Trash2, MoreVertical } from "lucide-react";

import { SavedQuoteSummary } from "@/api/types";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function confidenceDots(row: SavedQuoteSummary): number {
  if (row.hours <= 0) return 1;
  const rel = (row.range_high - row.range_low) / row.hours;
  if (rel <= 0.10) return 5;
  if (rel <= 0.20) return 4;
  if (rel <= 0.35) return 3;
  if (rel <= 0.55) return 2;
  return 1;
}

type Props = {
  rows: SavedQuoteSummary[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onRowAction: (id: string, action: "duplicate" | "delete" | "pdf" | "open") => void;
};

export function QuotesTable({ rows, selected, onToggle, onRowAction }: Props) {
  return (
    <div className="card overflow-hidden">
      <div
        className="grid items-center gap-3 px-4 py-2.5 bg-paper/60 border-b hairline"
        style={{ gridTemplateColumns: "32px 2fr 1.5fr 100px 140px 120px 110px 40px" }}
      >
        {[
          "", "Project", "Industry", "Hours", "Range", "Confidence", "Saved", "",
        ].map((h, i) => (
          <div key={i} className="eyebrow text-[10px] text-muted">{h}</div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted">No saved quotes yet.</div>
      ) : (
        rows.map((r) => {
          const dots = confidenceDots(r);
          const isSel = selected.has(r.id);
          return (
            <div
              key={r.id}
              className={
                "grid items-center gap-3 px-4 py-3 border-b hairline last:border-b-0 group transition-colors " +
                (isSel ? "bg-tealSoft/40" : "hover:bg-paper/80")
              }
              style={{ gridTemplateColumns: "32px 2fr 1.5fr 100px 140px 120px 110px 40px" }}
            >
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => onToggle(r.id)}
                aria-label={`Select ${r.name}`}
                className="accent-teal"
              />
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onRowAction(r.id, "open")}
                  className="font-medium text-ink hover:underline truncate text-left block w-full"
                >
                  {r.name}
                </button>
                <div className="text-[11px] text-muted truncate mono">{r.project_name}</div>
              </div>
              <div className="text-[12px] text-muted mono truncate">{r.industry_segment}</div>
              <div className="mono tnum text-ink text-sm font-medium text-right">
                {formatHours(r.hours)}
              </div>
              <div className="mono tnum text-muted text-[12px]">
                {formatHours(r.range_low)}–{formatHours(r.range_high)}
              </div>
              <div
                className="flex items-center gap-1"
                aria-label={`Confidence ${dots} of 5`}
                title={`Confidence ${dots} of 5`}
              >
                {[1, 2, 3, 4, 5].map((k) => (
                  <span
                    key={k}
                    className={
                      "w-1.5 h-1.5 rounded-full " +
                      (k <= dots ? "bg-amber" : "bg-line2")
                    }
                  />
                ))}
              </div>
              <div className="mono tnum text-muted text-[11px]">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
              <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                <details className="relative">
                  <summary className="list-none cursor-pointer inline-flex items-center justify-center w-6 h-6 rounded-sm hover:bg-line">
                    <MoreVertical size={14} strokeWidth={1.75} className="text-muted" />
                  </summary>
                  <div className="absolute right-0 top-7 z-10 w-40 card shadow-md text-sm">
                    <button
                      type="button"
                      onClick={() => onRowAction(r.id, "duplicate")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-paper"
                    >
                      <Copy size={14} strokeWidth={1.75} /> Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => onRowAction(r.id, "pdf")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-paper"
                    >
                      <Download size={14} strokeWidth={1.75} /> Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onRowAction(r.id, "delete")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-paper text-danger"
                    >
                      <Trash2 size={14} strokeWidth={1.75} /> Delete
                    </button>
                  </div>
                </details>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run Quotes tests**

```bash
cd frontend && npm run test -- Quotes.test
```

Expected: PASS. If any test asserts specific cell text, ensure new markup preserves project name, industry, hours.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/quotes/QuotesTable.tsx
git commit -m "style(quotes): table as 9-col grid with confidence pips and hover menu"
```

---

### Task 5: Update Quotes.tsx to wire KPI strip + bulk bar

**Files:**
- Modify: `frontend/src/pages/Quotes.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";

import {
  downloadScenarioPdf,
  useDeleteScenario,
  useDuplicateScenario,
  useSavedQuotes,
} from "@/api/quote";
import { PageHeader } from "@/components/PageHeader";

import { QuotesBulkBar } from "./quotes/QuotesBulkBar";
import { QuotesFilters } from "./quotes/QuotesFilters";
import { QuotesKpiStrip } from "./quotes/QuotesKpiStrip";
import { QuotesTable } from "./quotes/QuotesTable";

export function Quotes() {
  const [project, setProject] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const query = useSavedQuotes({
    project: project ?? undefined,
    industry: industry ?? undefined,
    search: search || undefined,
  });
  const rows = query.data?.rows ?? [];

  const projects = useMemo(
    () => Array.from(new Set(rows.map((r) => r.project_name))).sort(),
    [rows],
  );
  const industries = useMemo(
    () => Array.from(new Set(rows.map((r) => r.industry_segment))).sort(),
    [rows],
  );

  const del = useDeleteScenario();
  const dup = useDuplicateScenario();

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const canCompare = selected.size >= 2 && selected.size <= 3;
  const compareSelected = () => {
    if (!canCompare) return;
    navigate(`/quotes/compare?ids=${[...selected].join(",")}`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Quotes · Library"
        title="Saved Quotes"
        description="Every saved scenario — filter, compare, or export."
      />

      <QuotesKpiStrip rows={rows} />

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <QuotesFilters
            projects={projects}
            industries={industries}
            project={project}
            industry={industry}
            search={search}
            onChange={({ project: p, industry: i, search: s }) => {
              setProject(p);
              setIndustry(i);
              setSearch(s);
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs border hairline rounded-sm bg-surface hover:bg-paper"
        >
          <Plus size={14} strokeWidth={1.75} /> New quote
        </button>
        <button
          type="button"
          onClick={() => toast.info("CSV export lands later")}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs border hairline rounded-sm bg-surface hover:bg-paper"
        >
          <Download size={14} strokeWidth={1.75} /> Export CSV
        </button>
      </div>

      <QuotesBulkBar
        selectedCount={selected.size}
        canCompare={canCompare}
        onCompare={compareSelected}
        onClear={() => setSelected(new Set())}
      />

      <QuotesTable
        rows={rows}
        selected={selected}
        onToggle={toggle}
        onRowAction={async (id, action) => {
          if (action === "duplicate") {
            const copy = await dup.mutateAsync(id);
            toast.success(`Duplicated as "${copy.name}"`);
          } else if (action === "delete") {
            if (!confirm("Delete this scenario?")) return;
            await del.mutateAsync(id);
            toast.success("Deleted");
          } else if (action === "pdf") {
            try {
              await downloadScenarioPdf(id);
            } catch {
              toast.error("Could not generate PDF");
            }
          } else if (action === "open") {
            toast.info("Opening saved quotes in the cockpit lands in a follow-up");
          }
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npm run test -- Quotes
```

Expected: PASS. If the prior test asserted a `Compare` button outside the bulk bar, update the test to exercise the bulk bar: select rows first, then click `Compare →`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Quotes.tsx
git commit -m "style(quotes): integrate KPI strip, filter card, and bulk action bar"
```

---

### Task 6: Restyle CompareHeader — amber anchor column + display-hero totals

**Files:**
- Modify: `frontend/src/pages/quotes/CompareHeader.tsx`

**Design reference:** compare screen — anchor (first scenario) column has `border-l-2 border-l-amber`, delta row uses amber (+%) / teal (−%).

- [ ] **Step 1: Overwrite the file**

```tsx
import { SavedQuote } from "@/api/types";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function CompareHeader({ quotes }: { quotes: SavedQuote[] }) {
  const base = quotes[0];
  const baseTotal = base.prediction.total_p50;

  return (
    <div
      className="grid gap-x-4 gap-y-2"
      style={{ gridTemplateColumns: `140px repeat(${quotes.length}, minmax(0, 1fr))` }}
    >
      <div />
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className={
            "py-2 " + (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
          }
        >
          {i === 0 && <div className="eyebrow text-[10px] text-amber">Anchor</div>}
          <div className="font-medium text-ink truncate">{q.name}</div>
          <div className="text-[11px] text-muted mono truncate">{q.project_name}</div>
        </div>
      ))}

      <div className="eyebrow text-[10px] text-muted pt-2">Hours</div>
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className={
            "display-hero text-3xl tnum text-ink " +
            (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
          }
        >
          {fmt(q.prediction.total_p50)}
        </div>
      ))}

      <div className="eyebrow text-[10px] text-muted">Range (90% CI)</div>
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className={
            "text-sm text-muted mono tnum " +
            (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
          }
        >
          {fmt(q.prediction.total_p10)}–{fmt(q.prediction.total_p90)}
        </div>
      ))}

      <div className="eyebrow text-[10px] text-muted">Δ vs anchor</div>
      {quotes.map((q, i) => {
        const d = q.prediction.total_p50 - baseTotal;
        const pct = baseTotal > 0 ? (d / baseTotal) * 100 : 0;
        const sign = d > 0 ? "+" : d < 0 ? "" : "";
        const color = i === 0 ? "text-muted" : d > 0 ? "text-amber" : "text-teal";
        return (
          <div
            key={q.id}
            className={
              "text-sm mono tnum " +
              color +
              " " +
              (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
            }
          >
            {i === 0 ? "—" : `${sign}${fmt(d)} (${sign}${pct.toFixed(1)}%)`}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/quotes/CompareHeader.tsx
git commit -m "style(compare): anchor-first header with display-hero totals and signed delta"
```

---

### Task 7: Restyle CompareBucketsChart — ink/amber/teal Recharts palette

**Files:**
- Modify: `frontend/src/pages/quotes/CompareBucketsChart.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SavedQuote } from "@/api/types";

// Match the palette: anchor = ink, second = amber, third = teal.
const BAR_COLORS = ["#0D1B2A", "#F2B61F", "#1F8FA6"];

export function CompareBucketsChart({ quotes }: { quotes: SavedQuote[] }) {
  const allBuckets = new Set<string>();
  quotes.forEach((q) =>
    Object.keys(q.prediction.sales_buckets ?? {}).forEach((k) => allBuckets.add(k)),
  );

  const data = Array.from(allBuckets).map((bucket) => {
    const row: Record<string, number | string> = { bucket };
    quotes.forEach((q, i) => {
      row[q.name || `Q${i + 1}`] = q.prediction.sales_buckets?.[bucket]?.p50 ?? 0;
    });
    return row;
  });

  return (
    <div className="card p-4 h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11, fill: "#5A6573", fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "#E5E1D8" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#5A6573", fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "#E5E1D8" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E1D8",
              borderRadius: 2,
              fontSize: 12,
              fontFamily: "Inter",
            }}
            cursor={{ fill: "rgba(31, 143, 166, 0.06)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }}
            iconType="square"
          />
          {quotes.map((q, i) => (
            <Bar
              key={q.id}
              dataKey={q.name || `Q${i + 1}`}
              fill={BAR_COLORS[i % BAR_COLORS.length]}
              radius={[1, 1, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/quotes/CompareBucketsChart.tsx
git commit -m "style(compare): CompareBucketsChart in ink/amber/teal with mono axis labels"
```

---

### Task 8: Restyle CompareInputDiff — changed cells highlighted

**Files:**
- Modify: `frontend/src/pages/quotes/CompareInputDiff.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { SavedQuote } from "@/api/types";

export function CompareInputDiff({ quotes }: { quotes: SavedQuote[] }) {
  const keys = new Set<string>();
  for (const q of quotes) Object.keys(q.inputs).forEach((k) => keys.add(k));

  const diffRows: { field: string; values: string[] }[] = [];
  for (const k of keys) {
    const values = quotes.map((q) => String((q.inputs as Record<string, unknown>)[k] ?? ""));
    if (new Set(values).size > 1) diffRows.push({ field: k, values });
  }

  if (diffRows.length === 0) {
    return (
      <div className="card p-5 text-sm text-muted">
        These scenarios have identical inputs.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div
        className="grid items-center gap-x-4 px-4 py-2 bg-paper/60 border-b hairline"
        style={{
          gridTemplateColumns: `160px repeat(${quotes.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="eyebrow text-[10px] text-muted">Field</div>
        {quotes.map((q, i) => (
          <div
            key={q.id}
            className={
              "eyebrow text-[10px] text-muted " +
              (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
            }
          >
            {q.name}
          </div>
        ))}
      </div>
      {diffRows.map(({ field, values }) => {
        const anchor = values[0];
        return (
          <div
            key={field}
            className="grid items-center gap-x-4 px-4 py-2.5 border-b hairline last:border-b-0"
            style={{
              gridTemplateColumns: `160px repeat(${quotes.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="mono text-[12px] text-muted truncate">{field}</div>
            {values.map((v, i) => {
              const changed = i > 0 && v !== anchor;
              return (
                <div
                  key={i}
                  className={
                    "text-sm truncate " +
                    (i === 0
                      ? "text-ink font-medium border-l-2 border-l-amber pl-3"
                      : changed
                        ? "text-amber font-medium pl-3"
                        : "text-ink pl-3")
                  }
                >
                  {v || "—"}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="px-4 py-2 bg-paper/40 text-[11px] text-muted border-t hairline">
        {diffRows.length} of {keys.size} inputs differ · anchor values highlighted along the left
        amber bar
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/quotes/CompareInputDiff.tsx
git commit -m "style(compare): input diff as grid with amber anchor + amber-highlighted changes"
```

---

### Task 9: Restyle CompareDriversStrip — 3-column split with eyebrow labels

**Files:**
- Modify: `frontend/src/pages/quotes/CompareDriversStrip.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { SavedQuote } from "@/api/types";

export function CompareDriversStrip({ quotes }: { quotes: SavedQuote[] }) {
  return (
    <div className="card overflow-hidden">
      <div
        className="grid divide-x hairline"
        style={{ gridTemplateColumns: `repeat(${quotes.length}, minmax(0, 1fr))` }}
      >
        {quotes.map((q, i) => (
          <div key={q.id} className="p-4 space-y-3">
            <div>
              <div
                className={
                  "eyebrow text-[10px] " + (i === 0 ? "text-amber" : "text-muted")
                }
              >
                {i === 0 ? "Anchor · top drivers" : "Top drivers"}
              </div>
              <div className="text-sm font-medium text-ink truncate mt-1">{q.name}</div>
            </div>
            <div className="text-sm text-muted">
              Driver attribution snapshots from quote time are not re-computed here — open the
              cockpit to see live drivers.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/quotes/CompareDriversStrip.tsx
git commit -m "style(compare): drivers strip as 3-col split with amber anchor label"
```

---

### Task 10: Restyle Compare.tsx page shell

**Files:**
- Modify: `frontend/src/pages/Compare.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { Link, useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { api } from "@/api/client";
import { SavedQuote } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

import { CompareBucketsChart } from "./quotes/CompareBucketsChart";
import { CompareDriversStrip } from "./quotes/CompareDriversStrip";
import { CompareHeader } from "./quotes/CompareHeader";
import { CompareInputDiff } from "./quotes/CompareInputDiff";

export function Compare() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["savedQuote", id],
      queryFn: async () => (await api.get<SavedQuote>(`/quotes/${id}`)).data,
    })),
  });

  const loaded = queries.every((q) => q.data);
  const quotes = loaded ? queries.map((q) => q.data!) : [];

  if (ids.length < 2 || ids.length > 3) {
    return (
      <>
        <PageHeader eyebrow="Quotes · Compare" title="Compare scenarios" />
        <EmptyState
          title="Select 2–3 scenarios to compare"
          body="Open the Saved Quotes list and tick 2 or 3 rows before pressing Compare."
        />
      </>
    );
  }

  return (
    <>
      <Link
        to="/quotes"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-2"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        Back to Saved Quotes
      </Link>
      <PageHeader
        eyebrow="Quotes · Compare"
        title={`Comparing ${ids.length} scenarios`}
        description="Anchor scenario sets the baseline — deltas on other columns are measured against it."
      />

      {!loaded ? (
        <div className="card p-6 text-sm text-muted mb-6">Loading scenarios…</div>
      ) : (
        <div className="space-y-6">
          <div className="card p-5">
            <CompareHeader quotes={quotes} />
          </div>

          <div>
            <div className="eyebrow text-[10px] text-muted mb-2">Per-bucket hours</div>
            <CompareBucketsChart quotes={quotes} />
          </div>

          <div>
            <div className="eyebrow text-[10px] text-muted mb-2">Input differences</div>
            <CompareInputDiff quotes={quotes} />
          </div>

          <div>
            <div className="eyebrow text-[10px] text-muted mb-2">Drivers</div>
            <CompareDriversStrip quotes={quotes} />
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Run Compare tests**

```bash
cd frontend && npm run test -- Compare
```

Expected: PASS. If a test asserts legacy eyebrow labels (e.g. `"Per-bucket hours"` in a specific wrapper class), update to the new markup.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Compare.tsx
git commit -m "style(compare): page shell with back link and eyebrow section headers"
```

---

### Task 11: Final verification gate

- [ ] **Step 1: Full test suite**

```bash
cd frontend && npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Type-check + build**

```bash
cd frontend && npm run typecheck && npm run build
```

Expected: clean.

- [ ] **Step 3: Visual smoke**

```bash
cd frontend && npm run dev
```

At `http://localhost:5173/quotes`:
- KPI strip: 4 cards in a row, display-hero numbers, amber top stripe on 4th card.
- Filter bar is one card with search + divide-x project/industry eyebrow selects.
- Table: 9 columns, checkbox teal, confidence pips amber/line2, row hover paper/80, menu opacity 0→100 on hover.
- Select 2 rows → bulk bar appears (ink background, `2 selected` mono white, `Compare →` amber). Click Compare.

At `/quotes/compare?ids=a,b`:
- Scenario columns: first has left amber bar + "Anchor" eyebrow.
- Δ row: anchor `—`, others amber (+) or teal (−).
- Recharts bars in ink/amber/teal with mono axis labels.
- Input diff: amber anchor column, amber-colored changed cells in other columns.

Stop the dev server.

---

## Done

Plan 3 complete. Plans 4, 5, 6, 7 can now proceed.
