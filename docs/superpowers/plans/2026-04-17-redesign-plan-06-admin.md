# Matrix Quote Web — Redesign Plan 6: Admin Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle all four admin pages (`/admin`, `/admin/train`, `/admin/data`, `/admin/drivers`) and the admin login (`/admin/login`) to match the design. Because the backend endpoints for most admin surfaces don't exist yet, this plan ships **visual shells with realistic placeholder data** — the functional wiring lands when endpoints ship.

**Architecture:** AdminLogin is fully functional and gets a direct restyle. UploadTrain retains its real demo-load card and adds a visual step-rail shell around it. Overview, DataExplorer, and Drivers replace their `EmptyState` stubs with rich placeholder UIs built from local fixture data — clearly labeled "sample data" so nobody mistakes it for production numbers.

**Tech Stack:** React 18, Tailwind (Plan 1 tokens), `lucide-react`, existing React Query hooks.

---

## Design reference

- `docs/design/claude-design-20260417/project/Admin Shell.html`
  - Overview: KPI strip + training runs table + system alerts + data sources.
  - Upload & Train: step rail (4 steps) + upload-resolved card + config panel + training log.
  - Data Explorer: filter bar + summary card + histogram + table.
  - Drivers & Similar: global importance + partial dependence + neighbor pool + debug sample.

---

## Prerequisites

- **Plan 1 (Foundation) complete.** Tokens, `PageHeader`, `EmptyState`, card utilities required.

---

## File Structure

**Created:**
- `frontend/src/pages/admin/fixtures.ts` — placeholder rows for training runs, alerts, data sources, distributions, top features

**Modified:**
- `frontend/src/pages/AdminLogin.tsx` — restyled login card
- `frontend/src/pages/Overview.tsx` — KPI strip + runs table + alerts
- `frontend/src/pages/UploadTrain.tsx` — demo card restyle + step rail shell
- `frontend/src/pages/DataExplorer.tsx` — filter bar + summary card + histogram + table shell
- `frontend/src/pages/Drivers.tsx` — global importance bars + partial-dependence placeholder

---

## Tasks

### Task 1: Create admin fixtures

**Files:**
- Create: `frontend/src/pages/admin/fixtures.ts`

- [ ] **Step 1: Create the file**

```ts
export type TrainingRun = {
  id: string;
  trainedAt: string;
  rows: number;
  durationSec: number;
  mapePct: number;
  by: string;
};

export type AdminAlert = {
  id: string;
  tone: "info" | "warning" | "danger";
  title: string;
  body: string;
  at: string;
};

export type DataSource = {
  id: string;
  fileName: string;
  rows: number;
  newRows: number;
  dupes: number;
  uploadedAt: string;
  status: "ok" | "stale" | "error";
};

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

export const SAMPLE_RUNS: TrainingRun[] = [
  { id: "r12", trainedAt: new Date(now -  1 * day).toISOString(), rows: 1284, durationSec: 142, mapePct: 11.8, by: "admin" },
  { id: "r11", trainedAt: new Date(now -  9 * day).toISOString(), rows: 1261, durationSec: 138, mapePct: 12.1, by: "admin" },
  { id: "r10", trainedAt: new Date(now - 22 * day).toISOString(), rows: 1247, durationSec: 141, mapePct: 12.6, by: "admin" },
];

export const SAMPLE_ALERTS: AdminAlert[] = [
  {
    id: "a1",
    tone: "info",
    title: "Calibration is within target",
    body: "91.2% of last-30-day quotes fell inside their 90% CI — above the 88% floor.",
    at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "a2",
    tone: "warning",
    title: "Robotics MAPE creeping up",
    body: "Last two training runs show MAPE on robotics_hours rising from 9.8% → 12.4%.",
    at: new Date(now - 1 * day).toISOString(),
  },
];

export const SAMPLE_SOURCES: DataSource[] = [
  { id: "s1", fileName: "2026-Q1-master.xlsx",      rows: 1284, newRows:  37, dupes: 2, uploadedAt: new Date(now -  1 * day).toISOString(), status: "ok" },
  { id: "s2", fileName: "2025-Q4-Atlas-archive.csv", rows:  412, newRows:   0, dupes: 0, uploadedAt: new Date(now - 32 * day).toISOString(), status: "stale" },
];

export type FeatureImportance = { feature: string; importance: number };
export const SAMPLE_IMPORTANCE: FeatureImportance[] = [
  { feature: "stations_count",          importance: 1.00 },
  { feature: "estimated_materials_cost", importance: 0.86 },
  { feature: "robot_count",             importance: 0.71 },
  { feature: "complexity_score_1_5",    importance: 0.58 },
  { feature: "custom_pct",              importance: 0.52 },
  { feature: "servo_axes",              importance: 0.44 },
  { feature: "vision_systems_count",    importance: 0.31 },
  { feature: "panel_count",             importance: 0.27 },
  { feature: "changeover_time_min",     importance: 0.19 },
];

export const SAMPLE_HISTOGRAM: number[] = [
  3, 5, 9, 14, 22, 31, 44, 58, 62, 55, 47, 36, 28, 21, 14, 9, 6, 3, 2, 1,
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/admin/fixtures.ts
git commit -m "feat(admin): placeholder fixtures for runs, alerts, sources, importance, histogram"
```

---

### Task 2: Restyle AdminLogin

**Files:**
- Modify: `frontend/src/pages/AdminLogin.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api, setAdminToken } from "@/api/client";
import { LoginResponse } from "@/api/types";

type LocationState = { from?: { pathname?: string } };

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? "/admin";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post<LoginResponse>("/admin/login", { password });
      setAdminToken(data.token);
      toast.success("Signed in");
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error("Invalid password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="card p-8 w-full max-w-sm relative overflow-hidden"
      >
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-1 bg-amber"
        />
        <div className="mb-6">
          <div className="eyebrow text-[11px] text-teal">Admin · access</div>
          <h1 className="display-hero text-2xl text-ink mt-1">Sign in</h1>
          <p className="text-xs text-muted mt-2">
            Admin endpoints (dataset upload, training, demo load) require the shared password.
          </p>
        </div>
        <label className="block mb-5">
          <span className="eyebrow text-[10px] text-muted block mb-1.5">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-sm border hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-sm bg-ink text-white py-2.5 text-sm font-medium hover:bg-ink2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/AdminLogin.tsx
git commit -m "style(admin): restyle login card with amber stripe + ink button"
```

---

### Task 3: Build Overview with KPI strip + training runs + alerts + sources

**Files:**
- Modify: `frontend/src/pages/Overview.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

import { api } from "@/api/client";
import { HealthResponse } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

import {
  SAMPLE_ALERTS,
  SAMPLE_RUNS,
  SAMPLE_SOURCES,
  type AdminAlert,
} from "./admin/fixtures";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function alertIcon(tone: AdminAlert["tone"]) {
  switch (tone) {
    case "danger":  return <AlertOctagon  size={16} className="text-danger"  strokeWidth={1.75} />;
    case "warning": return <AlertTriangle size={16} className="text-amber"   strokeWidth={1.75} />;
    default:        return <CheckCircle2  size={16} className="text-success" strokeWidth={1.75} />;
  }
}

export function Overview() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<HealthResponse>("/health")).data,
  });

  const modelsReady = health?.models_ready ?? false;

  return (
    <>
      <PageHeader
        eyebrow="Admin · Overview"
        title="System Overview"
        description="Dataset health, training status, and recent admin activity. Functional wiring for the per-source actions lands with the admin endpoints."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 relative overflow-hidden">
          <span
            aria-hidden="true"
            className={
              "absolute top-0 left-0 right-0 h-1 " +
              (modelsReady ? "bg-success" : "bg-danger")
            }
          />
          <div className="eyebrow text-[10px] text-muted">Models ready</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">
            {modelsReady ? "12 / 12" : "0 / 12"}
          </div>
          <div className="text-[11px] text-muted mono mt-1">
            {modelsReady ? "all operations" : "training required"}
          </div>
        </div>
        <div className="card p-4">
          <div className="eyebrow text-[10px] text-muted">Training rows</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">{fmt(1284)}</div>
          <div className="text-[11px] text-muted mono mt-1">+37 since last run</div>
        </div>
        <div className="card p-4">
          <div className="eyebrow text-[10px] text-muted">API uptime · 30d</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">99.87%</div>
          <div className="text-[11px] text-muted mono mt-1">target ≥ 99.5%</div>
        </div>
        <div className="card p-4 relative overflow-hidden">
          <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-amber" />
          <div className="eyebrow text-[10px] text-muted">Open flags</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">
            {SAMPLE_ALERTS.filter((a) => a.tone !== "info").length}
          </div>
          <div className="text-[11px] text-muted mono mt-1">sample data</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Training runs */}
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
            <div className="eyebrow text-[10px] text-muted">Training runs</div>
            <div className="text-[11px] text-muted mono">sample data</div>
          </div>
          <div
            className="grid items-center gap-x-3 px-4 py-2 bg-paper/40 border-b hairline"
            style={{ gridTemplateColumns: "90px 90px 90px 90px 90px" }}
          >
            {["Ran", "Rows", "Seconds", "MAPE", "By"].map((h, i) => (
              <div
                key={h}
                className={
                  "eyebrow text-[10px] text-muted " +
                  (i >= 1 && i <= 3 ? "text-right" : "")
                }
              >
                {h}
              </div>
            ))}
          </div>
          {SAMPLE_RUNS.map((r) => (
            <div
              key={r.id}
              className="grid items-center gap-x-3 px-4 py-2.5 border-b hairline last:border-b-0"
              style={{ gridTemplateColumns: "90px 90px 90px 90px 90px" }}
            >
              <div className="mono text-[12px] text-muted">{relativeTime(r.trainedAt)}</div>
              <div className="mono tnum text-[12px] text-right text-ink">{fmt(r.rows)}</div>
              <div className="mono tnum text-[12px] text-right text-muted">{r.durationSec}</div>
              <div className="mono tnum text-[12px] text-right text-ink">
                {r.mapePct.toFixed(1)}%
              </div>
              <div className="text-[12px] text-muted truncate">{r.by}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
            <div className="eyebrow text-[10px] text-muted">System alerts</div>
            <div className="text-[11px] text-muted mono">sample data</div>
          </div>
          {SAMPLE_ALERTS.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 px-4 py-3 border-b hairline last:border-b-0"
            >
              <div className="pt-0.5">{alertIcon(a.tone)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">{a.title}</div>
                <div className="text-[12px] text-muted mt-0.5">{a.body}</div>
                <div className="text-[11px] text-muted mono mt-1">{relativeTime(a.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data sources */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
          <div className="eyebrow text-[10px] text-muted">Data sources</div>
          <div className="text-[11px] text-muted mono">sample data</div>
        </div>
        <div
          className="grid items-center gap-x-3 px-4 py-2 bg-paper/40 border-b hairline"
          style={{ gridTemplateColumns: "2fr 80px 80px 80px 120px 90px" }}
        >
          {["File", "Rows", "New", "Dupes", "Uploaded", "Status"].map((h, i) => (
            <div
              key={h}
              className={
                "eyebrow text-[10px] text-muted " +
                (i >= 1 && i <= 3 ? "text-right" : "")
              }
            >
              {h}
            </div>
          ))}
        </div>
        {SAMPLE_SOURCES.map((s) => (
          <div
            key={s.id}
            className="grid items-center gap-x-3 px-4 py-3 border-b hairline last:border-b-0"
            style={{ gridTemplateColumns: "2fr 80px 80px 80px 120px 90px" }}
          >
            <div className="mono text-[12px] text-ink truncate">{s.fileName}</div>
            <div className="mono tnum text-right text-ink text-[12px]">{fmt(s.rows)}</div>
            <div className="mono tnum text-right text-success text-[12px]">{fmt(s.newRows)}</div>
            <div className="mono tnum text-right text-muted text-[12px]">{fmt(s.dupes)}</div>
            <div className="mono text-[12px] text-muted">
              {new Date(s.uploadedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1.5 text-[12px]">
              <span
                className={
                  "w-1.5 h-1.5 rounded-full " +
                  (s.status === "ok"
                    ? "bg-success"
                    : s.status === "stale"
                      ? "bg-amber"
                      : "bg-danger")
                }
                aria-hidden="true"
              />
              <span className="capitalize text-ink">{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Overview.tsx
git commit -m "style(admin): Overview with KPI strip, training runs, alerts, data sources"
```

---

### Task 4: Restyle UploadTrain — demo card + step rail shell

**Files:**
- Modify: `frontend/src/pages/UploadTrain.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/api/client";
import { PageHeader } from "@/components/PageHeader";

type DemoStatus = { is_demo: boolean; enabled_env: boolean; has_real_data: boolean };
type LoadResponse = { loaded: boolean; reason: string | null };

const STEPS = [
  { n: 1, label: "Upload" },
  { n: 2, label: "Validate" },
  { n: 3, label: "Train" },
  { n: 4, label: "Review" },
];

export function UploadTrain() {
  const qc = useQueryClient();

  const { data: status } = useQuery<DemoStatus>({
    queryKey: ["demoStatus"],
    queryFn: async () => (await api.get<DemoStatus>("/demo/status")).data,
  });

  const load = useMutation<LoadResponse, unknown, void>({
    mutationFn: async () => (await api.post<LoadResponse>("/admin/demo/load")).data,
    onSuccess: (r) => {
      if (r.loaded) {
        toast.success("Demo data loaded. Reload the app to see estimates.");
        qc.invalidateQueries();
      } else {
        toast.error(r.reason ?? "Could not load demo data.");
      }
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin · Train"
        title="Upload & Train"
        description="Upload the latest project-hours export, merge into master, and retrain all per-operation models. Non-demo upload lands with the admin dataset endpoint."
      />

      {/* Demo data card */}
      <div className="card p-4 flex items-center justify-between mb-6 relative overflow-hidden">
        <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-teal" />
        <div>
          <div className="eyebrow text-[11px] text-teal">Demo mode</div>
          <div className="text-sm text-ink mt-1">
            Load a synthetic dataset + pretrained models so every screen works.
          </div>
          {status?.has_real_data && (
            <div className="mt-1 text-xs text-danger">
              Real data is already present — demo load is disabled to avoid clobbering it.
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={status?.has_real_data || load.isPending}
          onClick={() => load.mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-ink text-white text-sm font-medium hover:bg-ink2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
          {load.isPending ? "Loading…" : "Load demo data"}
        </button>
      </div>

      {/* Step rail */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className="inline-flex items-center gap-2.5">
              <span
                className={
                  "w-6 h-6 rounded-full grid place-items-center mono text-[11px] " +
                  (s.n === 1
                    ? "bg-ink text-white"
                    : "border hairline text-muted bg-surface")
                }
              >
                {s.n}
              </span>
              <span
                className={
                  "eyebrow text-[11px] " +
                  (s.n === 1 ? "text-ink" : "text-muted")
                }
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="flex-1 h-px bg-line" />}
          </div>
        ))}
      </div>

      {/* Upload-resolved shell */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6 border-dashed border-line2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-sm bg-ink text-white grid place-items-center">
              <Upload size={20} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-medium text-ink">
                Awaiting an XLSX or CSV from the admin endpoint
              </div>
              <div className="text-[12px] text-muted mono mt-0.5">
                Accepted: .xlsx · .csv · max 10 MB
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-0 border-t hairline">
            {[
              { label: "Total", value: "—" },
              { label: "New",   value: "—" },
              { label: "Dupes", value: "—" },
              { label: "Invalid", value: "—" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={
                  "py-3 text-center " + (i < 3 ? "border-r hairline" : "")
                }
              >
                <div className="eyebrow text-[10px] text-muted">{s.label}</div>
                <div className="display-hero text-xl tnum text-ink mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="eyebrow text-[11px] text-ink mb-4">Config</div>
          <div className="space-y-3">
            <div>
              <div className="eyebrow text-[10px] text-muted mb-1.5">Model family</div>
              <div className="flex gap-1">
                {["LightGBM", "GBM", "RandomForest"].map((m, i) => (
                  <span
                    key={m}
                    className={
                      "px-3 py-1.5 text-xs border rounded-sm " +
                      (i === 0
                        ? "bg-ink text-white border-ink"
                        : "hairline text-muted bg-surface")
                    }
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="eyebrow text-[10px] text-muted mb-1.5">CV folds</div>
                <div className="mono tnum text-ink text-sm border hairline rounded-sm px-3 py-2 bg-surface">5</div>
              </div>
              <div>
                <div className="eyebrow text-[10px] text-muted mb-1.5">Random seed</div>
                <div className="mono tnum text-ink text-sm border hairline rounded-sm px-3 py-2 bg-surface">42</div>
              </div>
            </div>
            <div className="text-[11px] text-muted pt-2 border-t hairline">
              Click <span className="text-ink font-medium">Load demo data</span> above to populate
              models without waiting for the real training pipeline.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/UploadTrain.tsx
git commit -m "style(admin): UploadTrain with demo card + 4-step rail + config shell"
```

---

### Task 5: Restyle DataExplorer — filter bar + summary + histogram shell

**Files:**
- Modify: `frontend/src/pages/DataExplorer.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { Search } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { SAMPLE_HISTOGRAM } from "./admin/fixtures";

const FILTERS = [
  { label: "Industry", value: "All" },
  { label: "Automation", value: "All" },
  { label: "Year", value: "All" },
];

export function DataExplorer() {
  const max = Math.max(1, ...SAMPLE_HISTOGRAM);

  return (
    <>
      <PageHeader
        eyebrow="Admin · Data"
        title="Data Explorer"
        description="Filter the master training dataset and inspect per-operation distributions. Functional filters land with the admin dataset endpoint."
      />

      {/* Filter bar */}
      <div className="card flex items-stretch overflow-hidden mb-6">
        <div className="relative flex-1 min-w-0 flex items-center">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search project or client"
            className="flex-1 bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted"
          />
        </div>
        {FILTERS.map((f) => (
          <div key={f.label} className="flex items-center">
            <div className="w-px bg-line" aria-hidden="true" />
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="eyebrow text-[10px] text-muted">{f.label}</span>
              <span className="text-sm text-muted">{f.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="eyebrow text-[10px] text-muted">Filtered projects</div>
          <div className="display-hero text-4xl tnum mt-2 text-ink">1,284</div>
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t hairline">
            {[
              { label: "Median hrs", value: "920" },
              { label: "Mean hrs",   value: "1,034" },
              { label: "p10 hrs",    value: "412" },
              { label: "p90 hrs",    value: "2,187" },
            ].map((s) => (
              <div key={s.label}>
                <div className="eyebrow text-[9px] text-muted">{s.label}</div>
                <div className="mono tnum text-ink text-base mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="eyebrow text-[10px] text-muted mb-3">Hours distribution</div>
          <div className="flex items-end gap-1 h-[140px]">
            {SAMPLE_HISTOGRAM.map((v, i) => {
              const height = (v / max) * 100;
              // Amber the middle buckets (~7–11) to match the design.
              const highlight = i >= 7 && i <= 11;
              return (
                <div
                  key={i}
                  className={
                    "flex-1 rounded-t-sm " + (highlight ? "bg-amber" : "bg-ink")
                  }
                  style={{ height: `${height}%` }}
                  aria-hidden="true"
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted mono">
            <span>0</span>
            <span>1,500</span>
            <span>3,000+</span>
          </div>
        </div>
      </div>

      <div className="card p-5 text-center">
        <div className="eyebrow text-[10px] text-muted">Data table</div>
        <div className="text-sm text-muted mt-2">
          Sortable rows with per-project drill-downs land when the admin dataset endpoint ships.
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/DataExplorer.tsx
git commit -m "style(admin): DataExplorer with filter bar, summary stats, histogram shell"
```

---

### Task 6: Restyle Drivers — global importance + partial-dependence placeholder

**Files:**
- Modify: `frontend/src/pages/Drivers.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { PageHeader } from "@/components/PageHeader";
import { SAMPLE_IMPORTANCE } from "./admin/fixtures";

const OPERATIONS = ["mechanical", "electrical", "controls", "robotics"];

export function Drivers() {
  return (
    <>
      <PageHeader
        eyebrow="Admin · Drivers"
        title="Drivers & Similar Projects"
        description="Per-operation feature importance + partial-dependence curves. Live wiring lands when the admin driver endpoint ships — placeholder values shown below."
      />

      {/* Operation picker */}
      <div className="flex items-center gap-1 mb-6">
        {OPERATIONS.map((op, i) => (
          <button
            key={op}
            type="button"
            className={
              "px-3 py-1.5 text-xs rounded-sm " +
              (i === 0
                ? "bg-ink text-white border border-ink"
                : "border hairline text-muted bg-surface hover:text-ink")
            }
          >
            {op}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[11px] text-muted mono">sample data</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Global importance */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b hairline bg-paper/60">
            <div className="eyebrow text-[10px] text-muted">Global importance</div>
          </div>
          <div className="p-5 space-y-2">
            {SAMPLE_IMPORTANCE.map((f) => (
              <div key={f.feature} className="flex items-center gap-3 text-sm">
                <div className="w-44 mono text-[12px] text-ink truncate">{f.feature}</div>
                <div className="flex-1 h-2 bg-line rounded-sm overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-ink"
                    style={{ width: `${f.importance * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="mono tnum w-10 text-right text-[11px] text-muted">
                  {(f.importance * 100).toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partial dependence (placeholder) */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b hairline bg-paper/60">
            <div className="eyebrow text-[10px] text-muted">Partial dependence · stations_count</div>
          </div>
          <div className="p-5 h-[240px] relative">
            <svg
              viewBox="0 0 400 200"
              preserveAspectRatio="none"
              className="w-full h-full"
              aria-hidden="true"
            >
              {/* Confidence band */}
              <polygon
                fill="#1F8FA6"
                fillOpacity="0.12"
                points="10,160 50,130 110,95 170,72 240,58 300,52 360,48 390,46 390,76 360,80 300,84 240,90 170,108 110,130 50,165 10,190"
              />
              {/* Mean line */}
              <polyline
                fill="none"
                stroke="#0D1B2A"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                points="10,175 50,148 110,112 170,90 240,74 300,68 360,60 390,57"
              />
              {/* Grid */}
              <line x1="0"   y1="195" x2="400" y2="195" stroke="#E5E1D8" strokeWidth="1" />
              <line x1="0.5" y1="0"   x2="0.5" y2="200" stroke="#E5E1D8" strokeWidth="1" />
            </svg>
            <div className="absolute bottom-2 left-5 text-[10px] text-muted mono">0</div>
            <div className="absolute bottom-2 right-5 text-[10px] text-muted mono">40</div>
            <div className="absolute top-2 left-5 text-[10px] text-muted mono">max</div>
          </div>
        </div>
      </div>

      {/* Neighbor pool config */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b hairline bg-paper/60 flex items-baseline justify-between">
          <div className="eyebrow text-[10px] text-muted">Neighbor pool</div>
          <div className="text-[11px] text-muted mono">defaults shown</div>
        </div>
        <div className="grid lg:grid-cols-2 divide-x hairline">
          <div className="p-5 space-y-3">
            <div>
              <div className="eyebrow text-[10px] text-muted">Distance metric</div>
              <div className="text-sm text-ink mt-1">Weighted Euclidean · normalized features</div>
            </div>
            <div>
              <div className="eyebrow text-[10px] text-muted">k (returned)</div>
              <div className="mono tnum text-ink text-sm mt-1">4</div>
            </div>
            <div>
              <div className="eyebrow text-[10px] text-muted">Similarity floor</div>
              <div className="mono tnum text-ink text-sm mt-1">0.50</div>
            </div>
          </div>
          <div className="p-5">
            <div className="eyebrow text-[10px] text-muted mb-2">Debug sample</div>
            <div className="text-[12px] text-muted">
              Paste a project profile to preview which neighbors the pool returns. Wiring lands with
              the admin driver endpoint.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Drivers.tsx
git commit -m "style(admin): Drivers with global importance + partial-dependence placeholder"
```

---

### Task 7: Final verification gate

- [ ] **Step 1: Tests + type-check + build**

```bash
cd frontend && npm run test && npm run typecheck && npm run build
```

Expected: clean.

- [ ] **Step 2: Visual smoke — walk each admin route**

```bash
cd frontend && npm run dev
```

- `/admin/login`: card with amber top stripe, teal "Admin · access" eyebrow, ink Sign in button.
- `/admin`: 4 KPI cards (green/amber stripes), 2-col training runs + alerts, full-width data sources.
- `/admin/train`: teal-stripe demo card, 4-step rail with step 1 ink-filled, dashed upload card with 4-stat grid, config panel.
- `/admin/data`: filter card, summary stats, histogram with amber mid-bars.
- `/admin/drivers`: operation picker, global importance bars, SVG partial-dependence, neighbor pool card.

Stop the dev server.

---

## Done

Plan 6 complete. Plans 1–6 together restyle every user-facing surface. Plan 7 adds dark mode + PDF.
