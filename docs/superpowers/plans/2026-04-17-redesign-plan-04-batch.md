# Matrix Quote Web — Redesign Plan 4: Batch Quotes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current stub `/batch` page with a design-matching **upload shell** — dropzone card, schema reference panel, and recent-batches table with static placeholder data. The review/results flow (sticky inspector, validation strip, errors tray) is out of scope until batch inference lands on the backend.

**Architecture:** Pure frontend — no new API calls. Compose three local components (`BatchDropzone`, `BatchSchemaRef`, `BatchRecentList`) into `BatchQuotes.tsx`. Drop-zone is visually wired (triggers a toast on drop/click) but does not send the file anywhere; Recent Batches renders a static mock array exported from a local fixture so the list has realistic rows for demo.

**Tech Stack:** React 18, Tailwind (Plan 1 tokens), `lucide-react` icons, `sonner` toasts.

---

## Design reference

- `docs/design/claude-design-20260417/project/Batch Quotes.html` — two states (Upload + Reviewing). **Only the Upload state is in scope for this plan.**
  - Dropzone: `border-dashed border-line2`, `bg-paper/40 hover:bg-paper`, icon `w-14 h-14 rounded-sm bg-ink`
  - Schema ref: 3-column grid (`mono field | text-muted type | eyebrow req/opt`)
  - Recent batches: 7-col table `batch | rows | ok | total_hrs | median | run | action`

---

## Prerequisites

- **Plan 1 (Foundation) complete.** `PageHeader`, `EmptyState`, card + hairline + eyebrow utilities are required.

---

## File Structure

**Created:**
- `frontend/src/pages/batch/BatchDropzone.tsx`
- `frontend/src/pages/batch/BatchSchemaRef.tsx`
- `frontend/src/pages/batch/BatchRecentList.tsx`
- `frontend/src/pages/batch/fixtures.ts` — placeholder rows

**Modified:**
- `frontend/src/pages/BatchQuotes.tsx` — replace stub with upload shell

---

## Tasks

### Task 1: Create the placeholder fixture

**Files:**
- Create: `frontend/src/pages/batch/fixtures.ts`

- [ ] **Step 1: Create the file**

```ts
export type RecentBatch = {
  id: string;
  fileName: string;
  rows: number;
  okCount: number;
  totalHours: number;
  medianHours: number;
  runAt: string; // ISO
  status: "ready" | "running" | "failed";
};

export const SAMPLE_RECENT_BATCHES: RecentBatch[] = [
  {
    id: "b-2025-104",
    fileName: "Q2-forecast-Atlas.csv",
    rows: 42,
    okCount: 40,
    totalHours: 42_310,
    medianHours: 984,
    runAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
  },
  {
    id: "b-2025-103",
    fileName: "Q2-Northland.csv",
    rows: 18,
    okCount: 18,
    totalHours: 16_880,
    medianHours: 912,
    runAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
  },
  {
    id: "b-2025-102",
    fileName: "ops-audit-Apex.csv",
    rows: 9,
    okCount: 8,
    totalHours: 7_204,
    medianHours: 794,
    runAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
  },
];

export type SchemaRow = { field: string; type: string; required: boolean };

// The schema here mirrors `frontend/src/pages/single-quote/schema.ts` — field-only.
export const BATCH_SCHEMA: SchemaRow[] = [
  { field: "project_name",            type: "string",  required: true  },
  { field: "industry_segment",        type: "enum",    required: true  },
  { field: "system_category",         type: "enum",    required: true  },
  { field: "automation_level",        type: "enum",    required: true  },
  { field: "stations_count",          type: "int",     required: true  },
  { field: "robot_count",             type: "int",     required: true  },
  { field: "fixture_sets",            type: "int",     required: false },
  { field: "part_types",              type: "int",     required: false },
  { field: "weldment_perimeter_ft",   type: "float",   required: false },
  { field: "fence_length_ft",         type: "float",   required: false },
  { field: "safety_doors",            type: "int",     required: false },
  { field: "conveyor_length_ft",      type: "float",   required: false },
  { field: "plc_family",              type: "enum",    required: false },
  { field: "panel_count",             type: "int",     required: false },
  { field: "servo_axes",              type: "int",     required: false },
  { field: "drive_count",             type: "int",     required: false },
  { field: "pneumatic_devices",       type: "int",     required: false },
  { field: "vision_systems_count",    type: "int",     required: false },
  { field: "changeover_time_min",     type: "int",     required: false },
  { field: "complexity_score_1_5",    type: "int 1–5", required: false },
  { field: "custom_pct",              type: "pct 0–100", required: false },
  { field: "estimated_materials_cost",type: "usd",     required: false },
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/batch/fixtures.ts
git commit -m "feat(batch): placeholder fixtures for recent batches and schema"
```

---

### Task 2: Create BatchDropzone component

**Files:**
- Create: `frontend/src/pages/batch/BatchDropzone.tsx`

**Design reference:** Batch Quotes mock upload card — dashed border, dropzone icon, replace button.

- [ ] **Step 1: Create the file**

```tsx
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

export function BatchDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHover(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      toast.info(`Received "${file.name}" · batch inference lands later`);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info(`Received "${file.name}" · batch inference lands later`);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      className={
        "card p-8 flex flex-col items-center justify-center gap-4 text-center " +
        "border-dashed border-line2 transition-colors " +
        (hover ? "bg-paper border-teal" : "bg-paper/40 hover:bg-paper")
      }
    >
      <div
        aria-hidden="true"
        className="w-14 h-14 rounded-sm bg-ink text-white grid place-items-center"
      >
        <UploadCloud size={22} strokeWidth={1.5} />
      </div>
      <div>
        <div className="display-hero text-lg text-ink">Drop a CSV or XLSX</div>
        <div className="text-xs text-muted mt-1 max-w-sm mx-auto">
          Up to 500 rows per batch. First header row must match the schema on the right. Duplicate
          project names are flagged but not dropped.
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-sm hover:bg-ink2"
        >
          Select file
        </button>
        <button
          type="button"
          onClick={() =>
            toast.info("Template download lands when the batch endpoint ships")
          }
          className="inline-flex items-center gap-2 px-3 py-2 text-xs border hairline rounded-sm bg-surface hover:bg-paper"
        >
          Download template
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={onChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/batch/BatchDropzone.tsx
git commit -m "feat(batch): dropzone card with design-spec dashed border and ink button"
```

---

### Task 3: Create BatchSchemaRef component

**Files:**
- Create: `frontend/src/pages/batch/BatchSchemaRef.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { BATCH_SCHEMA } from "./fixtures";

export function BatchSchemaRef() {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
        <div className="eyebrow text-[11px] text-ink">Schema reference</div>
        <div className="text-[11px] text-muted mono">
          {BATCH_SCHEMA.length} fields · {BATCH_SCHEMA.filter((s) => s.required).length} required
        </div>
      </div>
      <div
        className="divide-y hairline"
        role="table"
        aria-label="Schema reference"
      >
        {BATCH_SCHEMA.map((row) => (
          <div
            key={row.field}
            role="row"
            className="grid items-center px-4 py-2"
            style={{ gridTemplateColumns: "1.4fr 1fr 70px" }}
          >
            <div role="cell" className="mono text-[12px] text-ink truncate">{row.field}</div>
            <div role="cell" className="text-[12px] text-muted truncate">{row.type}</div>
            <div
              role="cell"
              className={
                "eyebrow text-[9px] text-right " +
                (row.required ? "text-danger" : "text-muted2")
              }
            >
              {row.required ? "Required" : "Optional"}
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
git add frontend/src/pages/batch/BatchSchemaRef.tsx
git commit -m "feat(batch): schema reference panel with required/optional eyebrow tags"
```

---

### Task 4: Create BatchRecentList component

**Files:**
- Create: `frontend/src/pages/batch/BatchRecentList.tsx`

**Design reference:** Batch Quotes mock — 7-col table (batch | rows | ok | total_hrs | median | run | action).

- [ ] **Step 1: Create the file**

```tsx
import { SAMPLE_RECENT_BATCHES } from "./fixtures";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function BatchRecentList() {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
        <div className="eyebrow text-[11px] text-ink">Recent batches</div>
        <div className="text-[11px] text-muted mono">sample data</div>
      </div>
      <div
        className="grid items-center gap-x-3 px-4 py-2 border-b hairline bg-paper/40"
        style={{
          gridTemplateColumns: "2fr 80px 90px 110px 110px 110px 90px",
        }}
      >
        {["File", "Rows", "OK", "Total hrs", "Median", "Ran", ""].map((h, i) => (
          <div
            key={i}
            className={
              "eyebrow text-[10px] text-muted " +
              (i >= 1 && i <= 5 ? "text-right" : "")
            }
          >
            {h}
          </div>
        ))}
      </div>

      {SAMPLE_RECENT_BATCHES.map((b) => (
        <div
          key={b.id}
          className="grid items-center gap-x-3 px-4 py-3 border-b hairline last:border-b-0 hover:bg-paper/80 transition-colors"
          style={{
            gridTemplateColumns: "2fr 80px 90px 110px 110px 110px 90px",
          }}
        >
          <div className="min-w-0">
            <div className="mono text-[13px] text-ink truncate">{b.fileName}</div>
            <div className="text-[11px] text-muted">{b.id}</div>
          </div>
          <div className="mono tnum text-right text-ink">{fmt(b.rows)}</div>
          <div className="mono tnum text-right text-success">
            {fmt(b.okCount)}
            <span className="text-[10px] text-muted ml-1">/ {fmt(b.rows)}</span>
          </div>
          <div className="mono tnum text-right text-ink">{fmt(b.totalHours)}</div>
          <div className="mono tnum text-right text-muted">{fmt(b.medianHours)}</div>
          <div className="text-right text-[12px] text-muted">{relativeTime(b.runAt)}</div>
          <div className="text-right">
            <button
              type="button"
              className="text-[12px] text-teal hover:text-tealDark"
            >
              Open
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/batch/BatchRecentList.tsx
git commit -m "feat(batch): recent batches list with mono tnum columns and teal Open link"
```

---

### Task 5: Replace BatchQuotes.tsx stub with upload shell

**Files:**
- Modify: `frontend/src/pages/BatchQuotes.tsx`

- [ ] **Step 1: Overwrite the file**

```tsx
import { PageHeader } from "@/components/PageHeader";

import { BatchDropzone } from "./batch/BatchDropzone";
import { BatchRecentList } from "./batch/BatchRecentList";
import { BatchSchemaRef } from "./batch/BatchSchemaRef";

export function BatchQuotes() {
  return (
    <>
      <PageHeader
        eyebrow="Estimate · Batch"
        title="Batch Quotes"
        description="Upload a CSV or XLSX with project rows and get predictions for all of them in one pass. Batch inference lands in a later slice — this page previews the upload flow."
      />

      <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 mb-8">
        <BatchDropzone />
        <BatchSchemaRef />
      </div>

      <BatchRecentList />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/BatchQuotes.tsx
git commit -m "style(batch): upload shell with dropzone, schema panel, recent batches"
```

---

### Task 6: Final verification gate

- [ ] **Step 1: Tests + type-check + build**

```bash
cd frontend && npm run test && npm run typecheck && npm run build
```

Expected: all green.

- [ ] **Step 2: Visual smoke**

```bash
cd frontend && npm run dev
```

At `http://localhost:5173/batch`:
- Header: "Estimate · Batch" eyebrow (teal), display-hero "Batch Quotes".
- Left: dashed dropzone card with ink icon box. Drop a CSV → toast "Received …".
- Right: schema reference with mono field names + Required (danger red) / Optional (muted) eyebrow tags.
- Below: recent batches with 3 mock rows, mono tnum numbers, teal "Open" action.

Stop the dev server.

---

## Done

Plan 4 ships the visual upload shell. When a batch inference endpoint lands later, add a separate plan to wire the review/results state (sticky inspector, validation bar, errors tray) — the design for it is already captured in `Batch Quotes.html`.
