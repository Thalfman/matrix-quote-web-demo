# Plan B — Single Quote Cockpit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Single Quote page as a two-column workspace: form on the left, sticky result panel on the right with tabs for Estimate / Drivers / Similar / Scenarios. Adds a count-up hero number, a skeleton shimmer during submission, a keyboard shortcut, and graceful mobile collapse.

**Architecture:** Frontend-only plan. Restructure `SingleQuote.tsx` into left/right columns via CSS grid, break out `ResultPanel`, `ResultTabs`, `DriversPanel`, `SimilarPanel`, and `ScenariosPanel` components. All data comes from the `ExplainedQuoteResponse` shipped in Plan A. A session-scoped scenario list lives in React state for now; persistent saved quotes land in Plan C.

**Tech Stack:** React 18, Tailwind, TanStack Query, React Hook Form, Zod, Recharts (for per-bucket chart), Lucide icons.

**Spec reference:** `docs/superpowers/specs/2026-04-17-estimator-cockpit-redesign-design.md` — Section 4 (Single Quote Cockpit) and Section 6 (Drivers & Similar tab content).

**Prerequisites:**
- Plan A merged (Matrix palette live; backend returns `ExplainedQuoteResponse` with drivers + neighbors).

---

## File structure

**Modified:**
- `frontend/src/pages/SingleQuote.tsx` — two-column layout + state for scenarios list.
- `frontend/src/pages/single-quote/QuoteForm.tsx` — keyboard submit, Populate-from-last link.
- `frontend/src/pages/single-quote/QuoteResults.tsx` — now imports the tabbed ResultPanel.
- `frontend/src/pages/SingleQuote.test.tsx` — extended.

**Created:**
- `frontend/src/pages/single-quote/ResultPanel.tsx` — hero + tabs wrapper.
- `frontend/src/pages/single-quote/HeroEstimate.tsx` — big number + count-up + range + confidence.
- `frontend/src/pages/single-quote/ResultTabs.tsx` — tablist + tab state.
- `frontend/src/pages/single-quote/tabs/EstimateTab.tsx` — per-bucket breakdown.
- `frontend/src/pages/single-quote/tabs/DriversTab.tsx` — contributions list with op filter.
- `frontend/src/pages/single-quote/tabs/SimilarTab.tsx` — neighbor rows.
- `frontend/src/pages/single-quote/tabs/ScenariosTab.tsx` — session scenarios + compare CTA (stub until Plan C).
- `frontend/src/pages/single-quote/ResultSkeleton.tsx` — shimmer placeholder.
- `frontend/src/lib/useCountUp.ts` — reduced-motion-aware count-up hook.
- `frontend/src/lib/useHotkey.ts` — window-level keyboard listener hook.
- `frontend/src/pages/single-quote/Scenario.ts` — type for a session scenario.

**Not touched:** backend, admin, batch, other pages.

---

## Task 1: Add the reduced-motion count-up hook

**Files:**
- Create: `frontend/src/lib/useCountUp.ts`
- Create: `frontend/src/lib/useCountUp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { useCountUp } from "./useCountUp";

describe("useCountUp", () => {
  it("animates from 0 to target when reduced motion is not set", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountUp(1000, { durationMs: 500 }));

    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(500); });
    expect(Math.round(result.current)).toBe(1000);
    vi.useRealTimers();
  });

  it("returns the target immediately when prefers-reduced-motion", () => {
    const match = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    window.matchMedia = match as typeof window.matchMedia;

    const { result } = renderHook(() => useCountUp(1000));
    expect(result.current).toBe(1000);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `cd frontend && npx vitest run src/lib/useCountUp.test.ts`
Expected: `Cannot find module './useCountUp'`.

- [ ] **Step 3: Implement the hook**

```ts
// frontend/src/lib/useCountUp.ts
import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  { durationMs = 500 }: { durationMs?: number } = {},
): number {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [value, setValue] = useState<number>(prefersReducedMotion ? target : 0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }
    startRef.current = null;
    const step = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(target * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs, prefersReducedMotion]);

  return value;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/useCountUp.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/useCountUp.ts frontend/src/lib/useCountUp.test.ts
git commit -m "feat(ux): reduced-motion-aware useCountUp hook"
```

---

## Task 2: Add the keyboard shortcut hook

**Files:**
- Create: `frontend/src/lib/useHotkey.ts`

- [ ] **Step 1: Implement the hook**

```ts
// frontend/src/lib/useHotkey.ts
import { useEffect } from "react";

type Combo = { key: string; meta?: boolean; ctrl?: boolean; shift?: boolean };

export function useHotkey(combo: Combo, handler: (ev: KeyboardEvent) => void) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key.toLowerCase() !== combo.key.toLowerCase()) return;
      if (combo.meta !== undefined  && combo.meta  !== ev.metaKey)  return;
      if (combo.ctrl !== undefined  && combo.ctrl  !== ev.ctrlKey)  return;
      if (combo.shift !== undefined && combo.shift !== ev.shiftKey) return;
      handler(ev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo.key, combo.meta, combo.ctrl, combo.shift, handler]);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/useHotkey.ts
git commit -m "feat(ux): useHotkey hook for window-level shortcuts"
```

---

## Task 3: Scenario type + session list state

**Files:**
- Create: `frontend/src/pages/single-quote/Scenario.ts`

- [ ] **Step 1: Write the type**

```ts
// frontend/src/pages/single-quote/Scenario.ts
import { ExplainedQuoteResponse, QuoteInput } from "@/api/types";

export type Scenario = {
  id: string;           // uuid in memory only
  name: string;
  createdAt: string;    // ISO
  inputs: QuoteInput;
  result: ExplainedQuoteResponse;
  quotedHoursByBucket?: Record<string, number>;
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/Scenario.ts
git commit -m "feat(cockpit): session Scenario type"
```

---

## Task 4: ResultSkeleton shimmer placeholder

**Files:**
- Create: `frontend/src/pages/single-quote/ResultSkeleton.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/pages/single-quote/ResultSkeleton.tsx
export function ResultSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="card p-6">
        <div className="h-3 w-32 bg-steel-200 rounded" />
        <div className="mt-4 h-14 w-40 bg-steel-200 rounded" />
        <div className="mt-3 h-3 w-60 bg-steel-200 rounded" />
      </div>
      <div className="card p-6 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-24 bg-steel-200 rounded" />
            <div className="flex-1 h-3 bg-steel-200 rounded" />
            <div className="h-3 w-10 bg-steel-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/ResultSkeleton.tsx
git commit -m "feat(cockpit): skeleton shimmer for in-flight quote submission"
```

---

## Task 5: HeroEstimate component

**Files:**
- Create: `frontend/src/pages/single-quote/HeroEstimate.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/pages/single-quote/HeroEstimate.tsx
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

  return (
    <div className="card p-6 bg-gradient-to-br from-navy-900/[0.03] to-transparent">
      <div className="text-[10px] tracking-widest text-muted font-semibold">
        ESTIMATED HOURS
      </div>
      <div className="mt-2 font-sans text-display numeric tabular-nums leading-none text-ink">
        {formatHours(animated)}
      </div>
      <div className="mt-3 text-sm text-muted">
        Range {formatHours(low)} – {formatHours(high)} · 90% CI
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-muted">Confidence</span>
        <span aria-hidden="true" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={
                "w-1.5 h-1.5 rounded-full " +
                (i <= dots ? "bg-brand" : "bg-steel-200")
              }
            />
          ))}
        </span>
        <span className="font-medium text-ink">{confidenceLabel(dots)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/HeroEstimate.tsx
git commit -m "feat(cockpit): HeroEstimate with count-up number + 5-dot confidence"
```

---

## Task 6: EstimateTab (per-bucket breakdown)

**Files:**
- Create: `frontend/src/pages/single-quote/tabs/EstimateTab.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/pages/single-quote/tabs/EstimateTab.tsx
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
  project_mgmt:  "Project management",
  documentation: "Documentation",
  misc:          "Misc",
};

export function EstimateTab({ result }: { result: ExplainedQuoteResponse }) {
  const buckets = Object.entries(result.prediction.sales_buckets ?? {});
  const total = buckets.reduce((s, [, v]) => s + v.p50, 0) || 1;

  return (
    <div className="space-y-2">
      {buckets.map(([key, v]) => {
        const pct = Math.round((v.p50 / total) * 100);
        return (
          <div key={key} className="flex items-center gap-3 text-sm">
            <div className="w-36 text-muted">
              {BUCKET_LABELS[key] ?? key}
            </div>
            <div className="numeric tabular-nums w-16 text-right text-ink">
              {formatHours(v.p50)}
            </div>
            <div className="flex-1 h-2 bg-steel-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="numeric tabular-nums w-10 text-right text-muted">
              {pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/tabs/EstimateTab.tsx
git commit -m "feat(cockpit): EstimateTab per-bucket breakdown"
```

---

## Task 7: DriversTab

**Files:**
- Create: `frontend/src/pages/single-quote/tabs/DriversTab.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/pages/single-quote/tabs/DriversTab.tsx
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-muted" htmlFor="op-select">Operation</label>
        <select
          id="op-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-surface dark:bg-surface-dark border border-border rounded-md px-2 py-1 text-sm"
        >
          <option value="__all__">All</option>
          {available.map((d) => (
            <option key={d.operation} value={d.operation}>
              {humanizeOp(d.operation)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        {displayed.map((d, i) => {
          const pct = (Math.abs(d.contribution) / max) * 50;
          const isPositive = d.contribution > 0;
          return (
            <div key={`${d.feature}-${i}`} className="flex items-center gap-2 text-sm">
              <div className="w-48 text-ink truncate" title={`${d.feature}: ${d.value}`}>
                {d.feature}
                {d.value && <span className="text-muted"> · {d.value}</span>}
              </div>
              <div className="numeric tabular-nums w-16 text-right text-ink">
                {formatSigned(d.contribution)} hrs
              </div>
              <div className="flex-1 relative h-2 bg-steel-100 rounded-full">
                <span
                  className="absolute top-0 h-2 w-px bg-steel-300"
                  style={{ left: "50%" }}
                  aria-hidden="true"
                />
                <div
                  className={"absolute top-0 h-2 " + (isPositive ? "bg-brand" : "bg-warning")}
                  style={{
                    left: isPositive ? "50%" : `${50 - pct}%`,
                    width: `${pct}%`,
                    borderTopRightRadius: isPositive ? 999 : 0,
                    borderBottomRightRadius: isPositive ? 999 : 0,
                    borderTopLeftRadius: !isPositive ? 999 : 0,
                    borderBottomLeftRadius: !isPositive ? 999 : 0,
                  }}
                />
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div className="text-sm text-muted">No drivers to show.</div>
        )}
      </div>

      {available.length < drivers.length && (
        <div className="text-xs text-muted">
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/tabs/DriversTab.tsx
git commit -m "feat(cockpit): DriversTab with signed-contribution bars and op filter"
```

---

## Task 8: SimilarTab

**Files:**
- Create: `frontend/src/pages/single-quote/tabs/SimilarTab.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/pages/single-quote/tabs/SimilarTab.tsx
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
    <div className="space-y-2">
      {neighbors.map((n, i) => {
        const delta = n.actual_hours - estimate;
        const deltaPct = estimate > 0 ? (delta / estimate) * 100 : 0;
        const dots = similarityDots(n.similarity);
        return (
          <div key={`${n.project_name}-${i}`} className="card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-medium text-ink truncate">{n.project_name}</div>
              <div className="flex items-center gap-1" aria-label={`Similarity ${Math.round(n.similarity * 100)}%`}>
                {[1,2,3,4,5].map((k) => (
                  <span key={k} className={"w-1.5 h-1.5 rounded-full " + (k <= dots ? "bg-brand" : "bg-steel-200")} />
                ))}
              </div>
            </div>
            <div className="text-sm text-muted">
              {n.industry_segment} · {n.automation_level}
              {n.stations != null && <> · {n.stations} stations</>}
              {n.year != null && <> · {n.year}</>}
            </div>
            <div className="text-sm">
              <span className="text-muted">Actual:</span>{" "}
              <span className="numeric tabular-nums text-ink">{formatHours(n.actual_hours)}</span>
              <span className="text-muted"> · today's estimate {formatHours(estimate)} · Δ </span>
              <span className="numeric tabular-nums text-ink">
                {delta >= 0 ? "+" : ""}{formatHours(delta)} ({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/tabs/SimilarTab.tsx
git commit -m "feat(cockpit): SimilarTab showing neighbor projects with similarity dots + delta"
```

---

## Task 9: ScenariosTab (session-only, stub compare CTA)

**Files:**
- Create: `frontend/src/pages/single-quote/tabs/ScenariosTab.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/pages/single-quote/tabs/ScenariosTab.tsx
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
        No scenarios saved yet this session. Click <span className="text-ink font-medium">Save scenario</span> to start building a comparison.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scenarios.map((s) => (
        <div key={s.id} className="card p-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="font-medium text-ink truncate">{s.name}</div>
            <div className="text-xs text-muted">{new Date(s.createdAt).toLocaleString()}</div>
          </div>
          <div className="numeric tabular-nums text-ink">
            {formatHours(s.result.prediction.total_p50)} hrs
          </div>
          <button
            type="button"
            onClick={() => onRemove(s.id)}
            className="text-xs text-muted hover:text-danger transition-colors"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onCompare}
        disabled={scenarios.length < 2}
        className="text-sm text-brand disabled:text-muted disabled:cursor-not-allowed"
      >
        Compare {scenarios.length} scenario{scenarios.length === 1 ? "" : "s"}
        {scenarios.length < 2 && " (need at least 2)"}
      </button>
    </div>
  );
}
```

Note: `onCompare` is wired in Plan C to navigate to `/quotes/compare`. For Plan B it simply logs a placeholder.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/tabs/ScenariosTab.tsx
git commit -m "feat(cockpit): ScenariosTab (session-scoped; persist + compare land in Plan C)"
```

---

## Task 10: ResultTabs — tablist with state

**Files:**
- Create: `frontend/src/pages/single-quote/ResultTabs.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/pages/single-quote/ResultTabs.tsx
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
      <div role="tablist" className="flex border-b border-border">
        {TABS.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={
                "px-4 py-2.5 text-sm transition-colors " +
                (selected
                  ? "text-ink font-semibold border-b-2 border-brand -mb-px"
                  : "text-muted hover:text-ink")
              }
            >
              {t.label}
              {t.id === "scenarios" && scenarios.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-brand text-brand-foreground rounded-full px-1.5 py-0.5">
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
git commit -m "feat(cockpit): ResultTabs tablist with 4 panels + scenarios badge"
```

---

## Task 11: ResultPanel — hero + action row + tabs + empty/skeleton states

**Files:**
- Create: `frontend/src/pages/single-quote/ResultPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
// frontend/src/pages/single-quote/ResultPanel.tsx
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
        <div className="text-[10px] tracking-widest text-muted font-semibold">
          RESULTS
        </div>
        <p className="mt-3 text-ink">Fill the form and generate an estimate.</p>
        <p className="mt-1 text-sm text-muted">
          You'll see confidence intervals, drivers, and similar past projects here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="quote-results">
      <HeroEstimate result={result} />
      <ResultTabs
        result={result}
        scenarios={scenarios}
        onRemoveScenario={onRemoveScenario}
        onCompare={onCompare}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSaveScenario}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-brand-foreground text-sm font-medium hover:bg-brand-hover transition-colors"
        >
          <Save size={16} strokeWidth={1.75} />
          Save scenario
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-ink text-sm font-medium hover:bg-steel-100 transition-colors"
        >
          <Download size={16} strokeWidth={1.75} />
          Export PDF
        </button>
      </div>
    </div>
  );
}
```

`onExportPdf` is wired in Plan D; for Plan B it shows a toast "PDF export coming soon."

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/single-quote/ResultPanel.tsx
git commit -m "feat(cockpit): ResultPanel with hero, tabs, save/export action row, empty + skeleton states"
```

---

## Task 12: Rewire `SingleQuote.tsx` to the two-column cockpit

**Files:**
- Modify: `frontend/src/pages/SingleQuote.tsx`
- Modify: `frontend/src/pages/single-quote/QuoteResults.tsx` (delete or replace — see below)

- [ ] **Step 1: Replace `SingleQuote.tsx` body**

Replace the entire body (keep imports) of `frontend/src/pages/SingleQuote.tsx` with:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/api/client";
import { useDropdowns, useSingleQuote } from "@/api/quote";
import { ExplainedQuoteResponse, HealthResponse } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { useHotkey } from "@/lib/useHotkey";

import { ResultPanel } from "./single-quote/ResultPanel";
import { Scenario } from "./single-quote/Scenario";
import { QuoteForm } from "./single-quote/QuoteForm";
import {
  QuoteFormValues,
  SalesBucket,
  quoteFormDefaults,
  quoteFormSchema,
  transformToQuoteInput,
} from "./single-quote/schema";

export function SingleQuote() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<HealthResponse>("/health")).data,
  });
  const { data: dropdowns } = useDropdowns();
  const mutate = useSingleQuote();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: quoteFormDefaults,
    mode: "onBlur",
  });

  const [result, setResult] = useState<ExplainedQuoteResponse | null>(null);
  const [quotedHoursByBucket, setQuotedHoursByBucket] =
    useState<Partial<Record<SalesBucket, number>>>({});
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    if (!dropdowns) return;
    const current = form.getValues();
    const patch: Partial<QuoteFormValues> = {};
    if (!current.industry_segment && dropdowns.industry_segment[0])
      patch.industry_segment = dropdowns.industry_segment[0];
    if (!current.system_category && dropdowns.system_category[0])
      patch.system_category = dropdowns.system_category[0];
    if (!current.automation_level && dropdowns.automation_level[0])
      patch.automation_level = dropdowns.automation_level[0];
    if (Object.keys(patch).length) form.reset({ ...current, ...patch });
  }, [dropdowns, form]);

  useHotkey({ key: "Enter", meta: true }, () => formRef.current?.requestSubmit());
  useHotkey({ key: "Enter", ctrl: true }, () => formRef.current?.requestSubmit());

  const modelsReady = health?.models_ready ?? false;

  if (!modelsReady) {
    return (
      <>
        <PageHeader
          eyebrow="Estimate"
          title="Single Quote"
          description="Enter quote-time project parameters to generate an hour estimate with confidence intervals per sales bucket."
          chips={[{ label: "Models not trained", tone: "warning" }]}
        />
        <EmptyState
          title="Models are not trained"
          body="An admin needs to upload a project-hours dataset and train the per-operation models before quotes can be generated."
        />
      </>
    );
  }

  async function handleSubmit(quoted: Partial<Record<SalesBucket, number>>) {
    const values = form.getValues();
    const payload = transformToQuoteInput(values);
    try {
      const res = await mutate.mutateAsync(payload);
      setResult(res);
      setQuotedHoursByBucket(quoted);
      requestAnimationFrame(() => {
        document.getElementById("quote-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to generate estimate";
      toast.error(detail);
    }
  }

  const onSaveScenario = () => {
    if (!result) return;
    const name = prompt("Name this scenario", `Scenario ${scenarios.length + 1}`);
    if (!name) return;
    setScenarios((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        inputs: transformToQuoteInput(form.getValues()),
        result,
        quotedHoursByBucket,
      },
    ]);
    toast.success(`Saved "${name}" (session)`);
  };

  const onExportPdf = () => {
    toast.info("PDF export lands in Plan D");
  };

  const onRemoveScenario = (id: string) =>
    setScenarios((s) => s.filter((x) => x.id !== id));

  const onCompare = () => {
    toast.info("Compare lands in Plan C — will navigate to /quotes/compare");
  };

  return (
    <>
      <PageHeader
        eyebrow="Estimate"
        title="Single Quote"
        description="Enter quote-time project parameters to generate an hour estimate with confidence intervals per sales bucket."
        chips={[{ label: "Models ready", tone: "success" }]}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <QuoteForm
            formRef={formRef}
            form={form}
            dropdowns={dropdowns}
            onSubmit={handleSubmit}
            submitting={mutate.isPending}
          />
        </div>
        <aside className="lg:sticky lg:top-6 self-start">
          <ResultPanel
            result={result}
            isLoading={mutate.isPending}
            scenarios={scenarios}
            onSaveScenario={onSaveScenario}
            onExportPdf={onExportPdf}
            onRemoveScenario={onRemoveScenario}
            onCompare={onCompare}
          />
        </aside>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Update `QuoteForm.tsx` to accept the new props**

Open `frontend/src/pages/single-quote/QuoteForm.tsx` and ensure its prop signature includes `formRef`, `form`, `dropdowns`, `onSubmit`, `submitting`. Wire `formRef` to the root `<form>` element. If the existing implementation already emits `onSubmit(quoted)`, leave it. Otherwise make minimal changes.

- [ ] **Step 3: Delete the old `QuoteResults.tsx`**

The two-column layout replaces it. Run:

```bash
git rm frontend/src/pages/single-quote/QuoteResults.tsx
```

If any import still references it, the next step will surface the error.

- [ ] **Step 4: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(cockpit): two-column Single Quote workspace with sticky result panel"
```

---

## Task 13: Extend `SingleQuote.test.tsx`

**Files:**
- Modify: `frontend/src/pages/SingleQuote.test.tsx`

- [ ] **Step 1: Append tab / skeleton tests**

Append new test cases to the existing test file:

```tsx
it("renders the skeleton while a quote is in-flight", async () => {
  // ... existing render setup ...
  // Click Generate estimate but do not resolve MSW handler yet.
  // Assert presence of .animate-pulse container.
});

it("switches between Estimate, Drivers, and Similar tabs once a result arrives", async () => {
  // ... render, submit a successful quote via MSW ...
  // Click tab buttons in turn and assert the correct content region is visible.
});

it("keeps the hero number frozen at target under prefers-reduced-motion", async () => {
  window.matchMedia = (q: string) =>
    ({ matches: q.includes("reduce"), addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList;
  // ... render, submit, assert the hero text is already the full number (no 0 frame). ...
});
```

(Exact MSW mocks use the existing pattern in the file — match that style.)

- [ ] **Step 2: Run the tests**

Run: `cd frontend && npm test -- SingleQuote`
Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SingleQuote.test.tsx
git commit -m "test(cockpit): tabs, skeleton, and reduced-motion hero behavior"
```

---

## Task 14: Populate-with-last-quote link in QuoteForm

**Files:**
- Modify: `frontend/src/pages/single-quote/QuoteForm.tsx`

- [ ] **Step 1: Read last scenario from session storage and offer prefill**

Above the first field-group in `QuoteForm.tsx`, add:

```tsx
{_hasLastValues() && (
  <button
    type="button"
    onClick={() => form.reset(_readLastValues())}
    className="text-xs text-brand hover:underline"
  >
    Populate with last quote
  </button>
)}
```

And add the helpers at the bottom of the file:

```tsx
const LAST_KEY = "matrix.singlequote.last";

function _hasLastValues(): boolean {
  try { return !!sessionStorage.getItem(LAST_KEY); } catch { return false; }
}
function _readLastValues(): QuoteFormValues {
  return JSON.parse(sessionStorage.getItem(LAST_KEY) || "{}") as QuoteFormValues;
}
```

Then, on successful submit in `SingleQuote.tsx`, persist the just-submitted values:

```ts
sessionStorage.setItem("matrix.singlequote.last", JSON.stringify(values));
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src
git commit -m "feat(cockpit): 'Populate with last quote' link (sessionStorage-backed)"
```

---

## Task 15: Final verification gate

- [ ] **Step 1: Typecheck + build + test**

Run: `cd frontend && npm run typecheck && npm run build && npm test`
Expected: all PASS.

- [ ] **Step 2: Visual smoke test**

Boot both servers (backend with `DATA_DIR=tests/fixtures/tiny_models`), then:
- `⌘/Ctrl+Enter` submits the form from anywhere on the page.
- The skeleton briefly appears before the result.
- The hero number animates up from 0 (or snaps to target under reduced-motion).
- Estimate / Drivers / Similar / Scenarios tabs all populate.
- Saving a scenario shows it in the Scenarios tab with a count badge in the tablist.
- Window size < 1024px collapses to single-column with the form on top and the result below.

- [ ] **Step 3: No commit.** Plan B complete.

---

## Plan summary

- 15 tasks.
- Net new frontend components: 9.
- Two new hooks.
- Existing page transforms to a two-column workspace.
- No backend changes.
- Rollback: revert the commits; the previous single-column `SingleQuote.tsx` is restored.
