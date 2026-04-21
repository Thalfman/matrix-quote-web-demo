# Matrix Quote Web — Redesign Plan 2: Single Quote Cockpit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Single Quote cockpit (`/`) to match the canonical design — amber-striped hero with CI rail and confidence pips, bidirectional driver bars, teal-underlined tabs, and ink/teal action pair.

**Architecture:** Rebuild `HeroEstimate`, `ResultSkeleton`, `ResultTabs`, the four tab components (`EstimateTab`, `DriversTab`, `SimilarTab`, `ScenariosTab`), `ResultPanel`, and the submit bar inside `QuoteForm`. Preserve every existing prop signature and test behavior — this plan touches visuals only. All shared primitives (`Section`, `Field`, `Input`, `Select`, `Switch`, `Slider`, `Tabs`) were restyled in Plan 1 and are used as-is.

**Tech Stack:** React 18, Tailwind 3.4 (new tokens from Plan 1), React Query, Vitest.

---

## Design reference

- Canonical mock: `docs/design/claude-design-20260417/project/Cockpit Redesign.html`
  - Lines 192–500 — left-column `QuoteForm` sections
  - Lines 505–551 — `HeroEstimate` (amber stripe, display-hero number, CI rail, pips)
  - Lines 553–631 — `ResultTabs` + four panels
  - Lines 633–647 — action bar + model meta strip
- Reference React components (for signatures, but their styling in the design repo is HTML-prototype-quality — use our primitive props):
  - `docs/design/claude-design-20260417/project/pages/single-quote/HeroEstimate.tsx`
  - `docs/design/claude-design-20260417/project/pages/single-quote/ResultPanel.tsx`
  - `docs/design/claude-design-20260417/project/pages/single-quote/tabs/*.tsx`

---

## Prerequisites

- **Plan 1 (Foundation) must be complete** and merged to the base branch. Palette, fonts, primitives (`Section`, `Field`, `Input`, `Select`, `Switch`, `Slider`, `Tabs`), and Layout must already show the new paper/ink/teal/amber design.
- Verify Plan 1 by running: `cd frontend && git grep -l "from-navy-900" -- src/` returns nothing (Plan 1 reworded the old `HeroEstimate` to a different gradient).

---

## File Structure

**Modified:**
- `frontend/src/pages/single-quote/HeroEstimate.tsx` — rebuild around amber stripe + CI rail
- `frontend/src/pages/single-quote/ResultSkeleton.tsx` — match new hero shape
- `frontend/src/pages/single-quote/ResultTabs.tsx` — teal underline, mono count badge
- `frontend/src/pages/single-quote/tabs/EstimateTab.tsx` — eyebrow codes, ink bars on line rail
- `frontend/src/pages/single-quote/tabs/DriversTab.tsx` — bidirectional amber/teal with center axis + legend
- `frontend/src/pages/single-quote/tabs/SimilarTab.tsx` — compact pip rows
- `frontend/src/pages/single-quote/tabs/ScenariosTab.tsx` — current scenario ring + teal "current" tag
- `frontend/src/pages/single-quote/ResultPanel.tsx` — outlined Save + teal Export + model meta strip
- `frontend/src/pages/single-quote/QuoteForm.tsx` — submit bar (`bg-ink` + mono ↵) + sync status dot, strip `dark:` classes
- `frontend/src/pages/SingleQuote.tsx` — update chip styling (already Plan 1 compatible)

**Unchanged:**
- `frontend/src/pages/single-quote/Scenario.ts` (type definitions)
- `frontend/src/pages/single-quote/schema.ts` (form schema)
- `frontend/src/pages/single-quote/tabs/*.test.tsx` (behavior-level; confirm still passing)
- `frontend/src/pages/SingleQuote.test.tsx` (same)

---

## Tasks

### Task 1: Rebuild HeroEstimate — amber stripe, display-hero number, CI rail, confidence pips

**Files:**
- Modify: `frontend/src/pages/single-quote/HeroEstimate.tsx`

**Design reference:** `Cockpit Redesign.html` lines 505–551.

- [ ] **Step 1: Overwrite `HeroEstimate.tsx`**

```tsx
import { ExplainedQuoteResponse } from "@/api/types";
import { useCountUp } from "@/lib/useCountUp";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function confidenceDots(rel: number): number {
  // Smaller rel_width = higher confidence; map to 1..5 dots.
  if (rel <= 0.10) return 5;
  if (rel <= 0.20) return 4;
  if (rel <= 0.35) return 3;
  if (rel <= 0.55) return 2;
  return 1;
}

function confidenceLabel(dots: number): string {
  return ["Weak", "Weak", "Moderate", "Strong", "Very Strong", "Very Strong"][dots];
}

export function HeroEstimate({ result }: { result: ExplainedQuoteResponse }) {
  const total = result.prediction.total_p50;
  const low   = result.prediction.total_p10;
  const high  = result.prediction.total_p90;
  const rel   = high > 0 ? (high - low) / Math.max(1, total) : 1;
  const animated = useCountUp(total);
  const dots = confidenceDots(rel);

  // CI rail math — clamp marker position to [10%, 90%] of rail.
  const range = Math.max(1, high - low);
  const leftPct  = Math.max(0, Math.min(100, ((low - low) / range) * 100));  // always 0
  const rightPct = Math.max(0, Math.min(100, 100 - ((high - low) / range) * 100));  // always 0
  const markerPct = Math.max(0, Math.min(100, ((total - low) / range) * 100));
  const bandPercent = Math.round((rel / 2) * 100);

  return (
    <div className="card relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber via-amber/70 to-transparent"
      />
      <div className="p-6 pt-7">
        <div className="flex items-center justify-between">
          <div className="eyebrow text-[11px] text-muted">Estimated hours</div>
        </div>

        <div className="mt-3 flex items-end gap-4">
          <div className="display-hero text-[76px] leading-none tracking-tight text-ink tnum">
            {formatHours(animated)}
          </div>
          <div className="pb-3">
            <div className="eyebrow text-[10px] text-muted">hrs</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-[11px] text-muted mono">
            <span>p10 · {formatHours(low)}</span>
            <span className="eyebrow text-[10px]">90% CI</span>
            <span>p90 · {formatHours(high)}</span>
          </div>
          <div className="relative h-2 mt-2 bg-line rounded-full">
            <div
              className="absolute inset-y-0 bg-teal/30 rounded-full"
              style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
              aria-hidden="true"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-ink border-2 border-amber shadow-sm"
              style={{ left: `calc(${markerPct}% - 6px)` }}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">Confidence</span>
              <span aria-hidden="true" className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={
                      "w-1.5 h-1.5 rounded-full " +
                      (i <= dots ? "bg-amber" : "bg-line2")
                    }
                  />
                ))}
              </span>
              <span className="font-medium text-ink">{confidenceLabel(dots)}</span>
            </div>
            <div className="text-xs text-muted">
              ±<span className="mono">{bandPercent}%</span> band
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the single-quote tests to confirm no regression**

```bash
cd frontend && npm run test -- SingleQuote.test
```

Expected: PASS (the hero shows the animated total; tests check for "Estimated hours" + `total_p50` formatted).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/single-quote/HeroEstimate.tsx
git commit -m "style(cockpit): HeroEstimate with amber stripe, CI rail, and confidence pips"
```

---

### Task 2: Rebuild ResultSkeleton to match new hero shape

**Files:**
- Modify: `frontend/src/pages/single-quote/ResultSkeleton.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
export function ResultSkeleton() {
  return (
    <div className="motion-safe:animate-pulse space-y-4" aria-hidden="true">
      <div className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-line2" />
        <div className="p-6 pt-7">
          <div className="h-3 w-32 bg-line rounded-sm" />
          <div className="mt-4 h-16 w-56 bg-line rounded-sm" />
          <div className="mt-6 flex items-baseline justify-between">
            <div className="h-3 w-20 bg-line rounded-sm" />
            <div className="h-3 w-14 bg-line rounded-sm" />
            <div className="h-3 w-20 bg-line rounded-sm" />
          </div>
          <div className="mt-2 h-2 bg-line rounded-full" />
          <div className="mt-4 flex items-center gap-2">
            <div className="h-3 w-20 bg-line rounded-sm" />
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-1.5 h-1.5 bg-line rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-0 border-b hairline">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 h-10 border-r hairline last:border-r-0 px-4 py-2.5"
            >
              <div className="h-4 w-16 bg-line rounded-sm" />
            </div>
          ))}
        </div>
        <div className="p-5 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-16 bg-line rounded-sm" />
              <div className="h-3 w-14 bg-line rounded-sm" />
              <div className="flex-1 h-2.5 bg-line rounded-sm" />
              <div className="h-3 w-10 bg-line rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-line rounded-sm" />
        <div className="flex-1 h-10 bg-line rounded-sm" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/ResultSkeleton.tsx
git commit -m "style(cockpit): ResultSkeleton matches new hero + tabs shape"
```

---

### Task 3: Rebuild ResultTabs — flex-equal tabs, teal underline, mono count badge

**Files:**
- Modify: `frontend/src/pages/single-quote/ResultTabs.tsx`

- [ ] **Step 1: Overwrite ResultTabs.tsx**

```tsx
import { useState } from "react";
import { ExplainedQuoteResponse } from "@/api/types";
import { EstimateTab } from "./tabs/EstimateTab";
import { DriversTab } from "./tabs/DriversTab";
import { SimilarTab } from "./tabs/SimilarTab";
import { ScenariosTab } from "./tabs/ScenariosTab";
import { Scenario } from "./Scenario";

type TabId = "estimate" | "drivers" | "similar" | "scenarios";

const TABS: { id: TabId; label: string }[] = [
  { id: "estimate",  label: "Estimate"  },
  { id: "drivers",   label: "Drivers"   },
  { id: "similar",   label: "Similar"   },
  { id: "scenarios", label: "Scenarios" },
];

export function ResultTabs({
  result,
  scenarios,
  onRemoveScenario,
  onCompare,
}: {
  result: ExplainedQuoteResponse;
  scenarios: Scenario[];
  onRemoveScenario: (id: string) => void;
  onCompare: () => void;
}) {
  const [active, setActive] = useState<TabId>("estimate");

  return (
    <div className="card">
      <div role="tablist" className="flex items-center border-b hairline">
        {TABS.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={
                "flex-1 px-4 py-3 text-sm border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 justify-center " +
                (selected
                  ? "border-teal text-ink font-medium"
                  : "border-transparent text-muted hover:text-ink")
              }
            >
              <span>{t.label}</span>
              {t.id === "scenarios" && scenarios.length > 0 && (
                <span
                  aria-label={`${scenarios.length} saved`}
                  className="mono text-[10px] bg-ink text-white rounded-full w-4 h-4 grid place-items-center"
                >
                  {scenarios.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="p-5">
        {active === "estimate"  && <EstimateTab result={result} />}
        {active === "drivers"   && <DriversTab   drivers={result.drivers} />}
        {active === "similar"   && <SimilarTab   neighbors={result.neighbors} estimate={result.prediction.total_p50} />}
        {active === "scenarios" && <ScenariosTab scenarios={scenarios} onRemove={onRemoveScenario} onCompare={onCompare} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/ResultTabs.tsx
git commit -m "style(cockpit): ResultTabs with teal underline and mono count badge"
```

---

### Task 4: Rebuild EstimateTab — eyebrow codes + ink bars on line rail + Hours/% toggle

**Files:**
- Modify: `frontend/src/pages/single-quote/tabs/EstimateTab.tsx`

**Design reference:** `Cockpit Redesign.html` lines 565–577, 671–683 (sample render).

- [ ] **Step 1: Overwrite the file**

```tsx
import { useState } from "react";
import { ExplainedQuoteResponse } from "@/api/types";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

const BUCKET_LABELS: Record<string, string> = {
  mechanical:    "Mechanical",
  electrical:    "Electrical",
  controls:      "Controls",
  robotics:      "Robotics",
  assembly:      "Assembly",
  shipping:      "Shipping",
  install:       "Install",
  startup:       "Startup",
  engineering:   "Engineering",
  project_mgmt:  "Project mgmt",
  documentation: "Docs",
  misc:          "Misc",
};

// Short codes for the mono column (fallback to first 3 chars upper).
const BUCKET_CODES: Record<string, string> = {
  mechanical:    "ME",
  electrical:    "EE",
  controls:      "CON",
  robotics:      "ROB",
  assembly:      "ASM",
  shipping:      "SHP",
  install:       "INS",
  startup:       "STU",
  engineering:   "ENG",
  project_mgmt:  "PM",
  documentation: "DOC",
  misc:          "MSC",
};

type Mode = "hours" | "pct";

export function EstimateTab({ result }: { result: ExplainedQuoteResponse }) {
  const [mode, setMode] = useState<Mode>("hours");
  const buckets = Object.entries(result.prediction.sales_buckets ?? {});
  const total = buckets.reduce((s, [, v]) => s + v.p50, 0) || 1;
  const maxBucket = Math.max(1, ...buckets.map(([, v]) => v.p50));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="eyebrow text-[10px] text-muted">Hours by sales bucket</div>
          <div className="text-xs text-muted mt-0.5">
            {buckets.length} buckets · summing to{" "}
            <span className="mono text-ink">{formatHours(total)}</span>
          </div>
        </div>
        <div className="inline-flex text-[10px] mono rounded-sm border hairline overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("hours")}
            className={
              "px-2 py-1 " +
              (mode === "hours" ? "bg-ink text-white" : "text-muted hover:text-ink")
            }
          >
            Hours
          </button>
          <button
            type="button"
            onClick={() => setMode("pct")}
            className={
              "px-2 py-1 " +
              (mode === "pct" ? "bg-ink text-white" : "text-muted hover:text-ink")
            }
          >
            % split
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {buckets.map(([key, v]) => {
          const code = BUCKET_CODES[key] ?? key.slice(0, 3).toUpperCase();
          const label = BUCKET_LABELS[key] ?? key;
          const pct = Math.round((v.p50 / total) * 100);
          const barPct = mode === "hours" ? (v.p50 / maxBucket) * 100 : pct;
          return (
            <div key={key} className="flex items-center gap-3 text-sm">
              <div className="w-14 eyebrow text-[10px] text-muted" title={label}>
                {code}
              </div>
              <div className="mono tnum w-14 text-right text-ink font-medium">
                {formatHours(v.p50)}
              </div>
              <div className="flex-1 h-2.5 bg-line rounded-sm overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-ink"
                  style={{ width: `${barPct}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="mono tnum w-10 text-right text-muted text-[11px]">
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/tabs/EstimateTab.tsx
git commit -m "style(cockpit): EstimateTab with eyebrow codes, ink bars, hours/pct toggle"
```

---

### Task 5: Rebuild DriversTab — bidirectional bars with center axis + amber/teal legend

**Files:**
- Modify: `frontend/src/pages/single-quote/tabs/DriversTab.tsx`

**Design reference:** `Cockpit Redesign.html` lines 580–598 (layout), 696–711 (bar math).

- [ ] **Step 1: Overwrite the file**

```tsx
import { useState } from "react";
import { OperationDrivers } from "@/api/types";

function formatSigned(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 0) return "0";
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function humanizeOp(op: string): string {
  return op
    .replace(/_hours$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DriversTab({ drivers }: { drivers: OperationDrivers[] | null | undefined }) {
  const [selected, setSelected] = useState<string>("__all__");

  if (!drivers || drivers.length === 0) {
    return (
      <div className="text-sm text-muted">
        Driver analysis is not available for this estimate.
      </div>
    );
  }

  const available = drivers.filter((d) => d.available);
  const displayed =
    selected === "__all__"
      ? _aggregateAll(available)
      : available.find((d) => d.operation === selected)?.drivers ?? [];

  const max = Math.max(1, ...displayed.map((d) => Math.abs(d.contribution)));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="eyebrow text-[10px] text-muted">Signed contribution</div>
          <div className="text-xs text-muted mt-0.5">vs. model baseline</div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs border hairline rounded-sm px-2 py-1 bg-surface">
          <span className="text-muted">Operation</span>
          <select
            aria-label="Operation"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-transparent font-medium text-ink outline-none"
          >
            <option value="__all__">All</option>
            {available.map((d) => (
              <option key={d.operation} value={d.operation}>
                {humanizeOp(d.operation)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        {displayed.map((d, i) => {
          const pct = (Math.abs(d.contribution) / max) * 50;
          const isPositive = d.contribution > 0;
          const left = isPositive ? "50%" : `${50 - pct}%`;
          const color = isPositive ? "bg-amber" : "bg-teal";
          return (
            <div key={`${d.feature}-${i}`} className="flex items-center gap-2 text-sm">
              <div
                className="w-40 truncate text-ink"
                title={d.value ? `${d.feature}: ${d.value}` : d.feature}
              >
                {d.feature}
                {d.value && <span className="text-muted"> · {d.value}</span>}
              </div>
              <div className="mono tnum w-14 text-right text-ink text-[12px] font-medium">
                {formatSigned(d.contribution)}
              </div>
              <div className="flex-1 relative h-2.5 bg-line rounded-sm">
                <span
                  className="absolute top-0 bottom-0 w-px bg-muted2"
                  style={{ left: "50%" }}
                  aria-hidden="true"
                />
                <div
                  className={"absolute top-0 bottom-0 rounded-sm " + color}
                  style={{ left, width: `${pct}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div className="text-sm text-muted">No drivers to show.</div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t hairline flex items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-amber rounded-sm" aria-hidden="true" />
          Pushes hours up
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-teal rounded-sm" aria-hidden="true" />
          Pulls hours down
        </span>
      </div>

      {available.length < drivers.length && (
        <div className="mt-2 text-xs text-muted">
          Some operations did not return drivers for this quote.
        </div>
      )}
    </div>
  );
}

function _aggregateAll(ops: OperationDrivers[]) {
  const acc = new Map<string, { contribution: number; value: string }>();
  for (const op of ops) {
    for (const d of op.drivers) {
      const prev = acc.get(d.feature);
      if (prev) {
        prev.contribution += d.contribution;
      } else {
        acc.set(d.feature, { contribution: d.contribution, value: d.value });
      }
    }
  }
  return [...acc.entries()]
    .map(([feature, v]) => ({ feature, contribution: v.contribution, value: v.value }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 8);
}
```

- [ ] **Step 2: Run DriversTab tests to confirm behavior preserved**

```bash
cd frontend && npm run test -- DriversTab.test
```

Expected: All 5 tests pass. The tests rely on `role="combobox"` with `name="operation"` which the new markup preserves (the `<label>` wraps the `<select>` and carries the accessible name via the "Operation" text).

If any tests fail on the combobox accessible-name assertion, replace the `<label>` in the new code with:

```tsx
<label className="inline-flex items-center gap-2 text-xs border hairline rounded-sm px-2 py-1 bg-surface">
  <span className="text-muted sr-only" id="op-label">Operation</span>
  <span className="text-muted" aria-hidden="true">Operation</span>
  <select
    aria-labelledby="op-label"
    ...
  >
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/single-quote/tabs/DriversTab.tsx
git commit -m "style(cockpit): DriversTab bidirectional bars with amber/teal legend"
```

---

### Task 6: Rebuild SimilarTab — compact pip rows

**Files:**
- Modify: `frontend/src/pages/single-quote/tabs/SimilarTab.tsx`

**Design reference:** `Cockpit Redesign.html` lines 601–604 (panel header + sample style).

- [ ] **Step 1: Overwrite the file**

```tsx
import { NeighborProject } from "@/api/types";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function similarityDots(sim: number): number {
  if (sim >= 0.90) return 5;
  if (sim >= 0.80) return 4;
  if (sim >= 0.65) return 3;
  if (sim >= 0.50) return 2;
  return 1;
}

export function SimilarTab({
  neighbors,
  estimate,
}: {
  neighbors: NeighborProject[] | null | undefined;
  estimate: number;
}) {
  if (!neighbors || neighbors.length === 0) {
    return (
      <div className="text-sm text-muted">
        No similar historical projects were found.
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow text-[10px] text-muted mb-3">Nearest historical projects</div>
      <div className="space-y-2">
        {neighbors.map((n, i) => {
          const delta = n.actual_hours - estimate;
          const deltaPct = estimate > 0 ? (delta / estimate) * 100 : 0;
          const dots = similarityDots(n.similarity);
          const deltaColor = delta > 0 ? "text-amber" : "text-teal";
          return (
            <div
              key={`${n.project_name}-${i}`}
              className="border hairline rounded-sm px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink truncate">
                    {n.project_name}
                  </div>
                  <div className="text-[11px] text-muted mono mt-0.5">
                    {n.industry_segment} · {n.automation_level}
                    {n.stations != null && <> · {n.stations} st</>}
                    {n.year != null && <> · {n.year}</>}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 shrink-0 pt-1"
                  aria-label={`Similarity ${Math.round(n.similarity * 100)}%`}
                  title={`Similarity ${Math.round(n.similarity * 100)}%`}
                >
                  {[1, 2, 3, 4, 5].map((k) => (
                    <span
                      key={k}
                      className={
                        "w-1.5 h-1.5 rounded-full " +
                        (k <= dots ? "bg-teal" : "bg-line2")
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs">
                <span className="text-muted">
                  Actual <span className="mono tnum text-ink">{formatHours(n.actual_hours)}</span>
                </span>
                <span className="text-muted2">·</span>
                <span className={`mono tnum ${deltaColor}`}>
                  {delta >= 0 ? "+" : ""}
                  {formatHours(delta)} ({deltaPct >= 0 ? "+" : ""}
                  {deltaPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run SimilarTab tests**

```bash
cd frontend && npm run test -- SimilarTab.test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/single-quote/tabs/SimilarTab.tsx
git commit -m "style(cockpit): SimilarTab compact rows with teal pips and signed delta"
```

---

### Task 7: Rebuild ScenariosTab — ring on current + teal tag + compare pill

**Files:**
- Modify: `frontend/src/pages/single-quote/tabs/ScenariosTab.tsx`

**Design reference:** `Cockpit Redesign.html` lines 609–629.

- [ ] **Step 1: Overwrite the file**

```tsx
import { Scenario } from "../Scenario";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function ScenariosTab({
  scenarios,
  onRemove,
  onCompare,
}: {
  scenarios: Scenario[];
  onRemove: (id: string) => void;
  onCompare: () => void;
}) {
  if (scenarios.length === 0) {
    return (
      <div className="text-sm text-muted">
        No scenarios saved yet this session. Click{" "}
        <span className="text-ink font-medium">Save scenario</span> to start building a
        comparison.
      </div>
    );
  }

  const canCompare = scenarios.length >= 2;
  // "Current" = the most recently added scenario.
  const currentId = scenarios[scenarios.length - 1]?.id;

  return (
    <div>
      <div className="eyebrow text-[10px] text-muted mb-3">Saved this session</div>
      <div className="space-y-2">
        {scenarios.map((s) => {
          const isCurrent = s.id === currentId;
          return (
            <div
              key={s.id}
              className={
                "border hairline rounded-sm px-3 py-2.5 flex items-center gap-3 " +
                (isCurrent ? "ring-1 ring-teal/30" : "")
              }
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-ink">
                  {s.name}
                  {isCurrent && (
                    <span className="mono text-[10px] text-teal ml-2">current</span>
                  )}
                </div>
                <div className="text-[11px] text-muted mono">
                  {new Date(s.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="mono tnum text-sm text-ink">
                {formatHours(s.result.prediction.total_p50)}
              </div>
              <span className="text-[11px] text-muted">hrs</span>
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                className="text-[11px] text-muted hover:text-danger transition-colors ml-2"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onCompare}
        disabled={!canCompare}
        className={
          "mt-3 w-full text-sm py-2 rounded-sm transition-colors " +
          (canCompare
            ? "border border-ink text-ink hover:bg-ink hover:text-white"
            : "border hairline text-muted cursor-not-allowed")
        }
      >
        Compare {scenarios.length} scenario{scenarios.length === 1 ? "" : "s"} →
      </button>
      {!canCompare && (
        <div className="mt-1 text-[11px] text-muted text-center">
          Need at least 2 to compare
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run ScenariosTab tests**

```bash
cd frontend && npm run test -- ScenariosTab.test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/single-quote/tabs/ScenariosTab.tsx
git commit -m "style(cockpit): ScenariosTab with teal current-ring and outlined compare pill"
```

---

### Task 8: Rebuild ResultPanel — outlined Save + teal Export + model meta strip

**Files:**
- Modify: `frontend/src/pages/single-quote/ResultPanel.tsx`

**Design reference:** `Cockpit Redesign.html` lines 633–647.

- [ ] **Step 1: Overwrite the file**

```tsx
import { Download, Save } from "lucide-react";
import { ExplainedQuoteResponse } from "@/api/types";
import { HeroEstimate } from "./HeroEstimate";
import { ResultTabs } from "./ResultTabs";
import { ResultSkeleton } from "./ResultSkeleton";
import { Scenario } from "./Scenario";

type Props = {
  result: ExplainedQuoteResponse | null;
  isLoading: boolean;
  scenarios: Scenario[];
  onSaveScenario: () => void;
  onExportPdf: () => void;
  onRemoveScenario: (id: string) => void;
  onCompare: () => void;
};

export function ResultPanel({
  result,
  isLoading,
  scenarios,
  onSaveScenario,
  onExportPdf,
  onRemoveScenario,
  onCompare,
}: Props) {
  if (isLoading) return <ResultSkeleton />;

  if (!result) {
    return (
      <div className="card p-8">
        <div className="eyebrow text-[11px] text-muted">Results</div>
        <p className="display-hero text-xl mt-3 text-ink">
          Fill the form and generate an estimate.
        </p>
        <p className="mt-1 text-sm text-muted">
          You'll see confidence intervals, drivers, and similar past projects here.
        </p>
      </div>
    );
  }

  const modelVersion = result.metadata?.model_version ?? "current";
  const elapsedMs = result.metadata?.elapsed_ms;
  const opsCount = result.drivers?.filter((d) => d.available).length ?? 0;

  return (
    <div className="space-y-4" id="quote-results">
      <HeroEstimate result={result} />
      <ResultTabs
        result={result}
        scenarios={scenarios}
        onRemoveScenario={onRemoveScenario}
        onCompare={onCompare}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveScenario}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-ink text-ink text-sm font-medium rounded-sm hover:bg-ink hover:text-white transition-colors"
        >
          <Save size={16} strokeWidth={1.75} aria-hidden="true" />
          Save scenario
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal text-white text-sm font-medium rounded-sm hover:bg-tealDark transition-colors"
        >
          <Download size={16} strokeWidth={1.75} aria-hidden="true" />
          Export PDF
        </button>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted mono px-1">
        <span>model {modelVersion}</span>
        <span>
          {elapsedMs != null ? `${elapsedMs} ms · ` : ""}
          {opsCount} ops
        </span>
      </div>
    </div>
  );
}
```

**Note:** If `ExplainedQuoteResponse` has no `metadata` field, replace the `modelVersion` / `elapsedMs` lines with hardcoded placeholders. Confirm by reading `frontend/src/api/types.ts` before implementing.

- [ ] **Step 2: Check the response type**

```bash
grep -n "ExplainedQuoteResponse\|metadata" frontend/src/api/types.ts
```

If `metadata` is not on `ExplainedQuoteResponse`, edit the code above — replace the strip with:

```tsx
<div className="flex items-center justify-between text-[11px] text-muted mono px-1">
  <span>model · current</span>
  <span>{opsCount} ops</span>
</div>
```

- [ ] **Step 3: Run the SingleQuote test**

```bash
cd frontend && npm run test -- SingleQuote.test
```

Expected: PASS. The test renders the result panel and checks for key strings.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/single-quote/ResultPanel.tsx
git commit -m "style(cockpit): ResultPanel outlined Save + teal Export + model meta strip"
```

---

### Task 9: Restyle QuoteForm submit bar + sync status dot, strip `dark:` classes

**Files:**
- Modify: `frontend/src/pages/single-quote/QuoteForm.tsx`

Only the submit bar and outer "Populate with last quote" row change. Plan 1's Section/Field/Input/Select/Switch/Slider primitives handle all the internal form styling automatically.

- [ ] **Step 1: Replace the "Populate with last quote" link block**

In `QuoteForm.tsx`, replace the block on lines 40–50 (the `{_hasLastValues() && ...}` section) with:

```tsx
      {_hasLastValues() && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => form.reset(_readLastValues())}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs border hairline rounded-sm bg-surface hover:bg-paper transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted2" aria-hidden="true" />
            Populate with last quote
          </button>
        </div>
      )}
```

- [ ] **Step 2: Replace the submit bar block**

Replace the final `<div className="flex items-center gap-3 mt-8">...</div>` block (lines 341–370 in the current file) with:

```tsx
      <div className="flex items-center gap-3 pt-2 mt-8">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white text-sm font-medium rounded-sm hover:bg-ink2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Estimating…" : "Regenerate estimate"}
          <span className="mono text-[10px] text-amber" aria-hidden="true">↵</span>
        </button>
        <span className="text-xs text-muted hidden md:inline">
          Press{" "}
          <kbd className="mono text-[10px] px-1.5 py-0.5 border hairline rounded-sm bg-surface">⌘</kbd>
          <kbd className="mono text-[10px] px-1.5 py-0.5 border hairline rounded-sm bg-surface">↵</kbd>{" "}
          anywhere on the page
        </span>
        <button
          type="button"
          onClick={() => {
            reset();
            setQuotedHours({});
          }}
          className="ml-auto text-xs text-muted hover:text-ink transition-colors"
        >
          Reset form
        </button>
      </div>
```

- [ ] **Step 3: Replace the bucket-compare-details section**

Replace the `<section>` block (lines 314–339 in the current file) starting with `<section className="mb-8">` up to its closing `</section>` with:

```tsx
      <section className="mb-8">
        <button
          type="button"
          onClick={() => setCompareOpen((v) => !v)}
          className="eyebrow text-[11px] text-teal hover:text-tealDark"
        >
          {compareOpen ? "Hide" : "Optional:"} compare to your quoted hours
        </button>
        {compareOpen && (
          <div className="card p-5 mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
            {SALES_BUCKETS.map((bucket) => (
              <Field key={bucket} label={`${bucket} quoted hours`}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={quotedHours[bucket] ?? 0}
                  onChange={(e) =>
                    setQuotedHours((prev) => ({ ...prev, [bucket]: Number(e.currentTarget.value) }))
                  }
                />
              </Field>
            ))}
          </div>
        )}
      </section>
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm run test -- single-quote
```

Expected: all single-quote tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/single-quote/QuoteForm.tsx
git commit -m "style(cockpit): QuoteForm submit bar in ink + amber ↵ hint, teal eyebrow compare toggle"
```

---

### Task 10: Update SingleQuote.tsx chip wording + ensure layout grid matches design

**Files:**
- Modify: `frontend/src/pages/SingleQuote.tsx`

Plan 1 already restyled `PageHeader`. Verify the chip wording and the grid ratio match the mock:

- [ ] **Step 1: Open `frontend/src/pages/SingleQuote.tsx`**

No structural changes needed — the current grid `lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` already matches the mock's `lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` (3:2 ratio).

Verify the `PageHeader` props unchanged:

```tsx
<PageHeader
  eyebrow="Estimate · Cockpit"
  title="Single Quote"
  description="Enter project parameters to generate an hour estimate with confidence intervals, driver attribution, and similar historical projects."
  chips={[{ label: "Models ready", tone: "success" }]}
/>
```

If the eyebrow currently reads `"Estimate"`, update both occurrences (trained-state and empty-state) to `"Estimate · Cockpit"` to match the design's eyebrow.

If the description currently reads `"Enter quote-time project parameters to generate an hour estimate with confidence intervals per sales bucket."`, update both occurrences to the shorter form above.

- [ ] **Step 2: Run the SingleQuote tests**

```bash
cd frontend && npm run test -- SingleQuote
```

Expected: PASS. If any test asserts exact eyebrow/description text, update those assertions to the new strings.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SingleQuote.tsx frontend/src/pages/SingleQuote.test.tsx
git commit -m "style(cockpit): tighten SingleQuote header eyebrow and description"
```

---

### Task 11: Final verification gate — tests, build, visual smoke

- [ ] **Step 1: Full test suite**

```bash
cd frontend && npm run test
```

Expected: All tests pass. If any pre-existing test fails on palette-only assertions (e.g. checks for `text-brand` class), defer to its owning plan (noted in Plan 1 Appendix A).

- [ ] **Step 2: Type-check**

```bash
cd frontend && npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Visual smoke**

```bash
cd frontend && npm run dev
```

Walk through at `http://localhost:5173/`:
1. Fill a full form, submit (or press Ctrl+Enter). Confirm:
   - Hero shows amber stripe across the top.
   - Big number is Barlow Condensed, tnum.
   - CI rail has teal/30 band + amber-bordered ink marker.
   - 5 confidence pips alternate amber / line2.
   - "±N% band" appears right of confidence.
2. Click each tab. Confirm:
   - Active tab underlined teal.
   - Estimate tab: eyebrow codes (ME/EE/CON etc.), mono hours, ink bars on line rail.
   - Drivers tab: central axis line, amber bars right (up), teal bars left (down). Legend reads "Pushes hours up / Pulls hours down".
   - Similar tab: teal pips, amber deltas on positive, teal deltas on negative.
   - Scenarios tab: newest scenario has teal/30 ring + "current" mono tag.
3. Save scenario → save scenario button is outlined ink, hovers to solid ink/white.
4. Export PDF → button is solid teal.
5. Model meta strip below shows "model · current · N ops" in mono.

Stop the dev server.

- [ ] **Step 5: Commit (if any late fixes made)**

If no changes beyond Tasks 1–10, skip. Otherwise:

```bash
git add -p
git commit -m "style(cockpit): verification pass"
```

---

## Done

When Task 11 passes, the Single Quote cockpit matches the design. Plans 3–7 can proceed in parallel.
