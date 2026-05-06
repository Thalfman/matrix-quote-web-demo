# Phase 6: Multi-vision per project - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 14 (4 NEW, 10 MODIFIED)
**Analogs found:** 14 / 14
**Note:** No RESEARCH.md (workflow.research=false). Patterns sourced from v1.0 + Phase 5 codebase only.

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|----------------|---------------|
| `frontend/src/demo/multiVisionAggregator.ts` | demo aggregator | request-response (N+1 transform) | `frontend/src/demo/quoteAdapter.ts` | role-match |
| `frontend/src/pages/single-quote/VisionRowsField.tsx` | form field component | event-driven (form state) | `frontend/src/pages/single-quote/QuoteForm.tsx:105-134` (Controller pattern), `frontend/src/components/quote/VersionHistoryList.tsx` (stacked-list component shape) | partial — no `useFieldArray` exists yet |
| `frontend/src/pages/single-quote/__tests__/multiVisionAggregator.test.ts` | unit test | pure-function | `frontend/src/demo/quoteAdapter.test.ts` | exact |
| `frontend/src/pages/single-quote/__tests__/VisionRowsField.test.tsx` | component test | RTL + form | `frontend/src/components/quote/SaveQuoteDialog.test.tsx` (form dialog test) | role-match |
| `frontend/src/pages/single-quote/QuoteForm.tsx` (MOD :172-198) | form section | event-driven | self (sections 01-06 already in file) | exact |
| `frontend/src/pages/single-quote/schema.ts` (MOD :36/41/88/93/121/151) | zod schema + transform | data shape | self + `frontend/src/lib/savedQuoteSchema.ts` (z.array pattern) | role-match |
| `frontend/src/components/quote/QuoteResultPanel.tsx` (MOD :235/240 + new section) | result panel UI | render | self (existing card/section pattern) | exact |
| `frontend/src/demo/quoteAdapter.ts::toUnifiedResult` (MOD) | adapter | transform | self | exact |
| `frontend/src/demo/quoteResult.ts` (MOD type) | type definition | data shape | self | exact |
| `frontend/src/lib/quoteStorage.ts` (MOD onupgradeneeded + on-read migrator) | storage | CRUD migration | self (Phase 5 onupgradeneeded :103-122) | exact |
| `frontend/src/lib/savedQuoteSchema.ts` (MOD schemaVersion 1→2) | schema | data shape | self | exact |
| `frontend/src/demo/realProjects.ts::recordToPrediction` (MOD legacy-compat) | adapter | transform | self | exact |
| `frontend/src/lib/nearestNeighbor.ts` (MOD legacy-compat) | distance | transform | self | exact |
| `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` (MOD handleSubmit), `frontend/src/pages/demo/compare/ComparisonQuote.tsx` (MOD handleSubmit) | page (predict orchestration) | request-response | self | exact |
| `frontend/src/test/jargon-guard.test.tsx` (MOD — extend) | test | scan | self (Phase 5 surface block :209-342) | exact |

---

## Pattern Assignments

### `frontend/src/demo/multiVisionAggregator.ts` (NEW — demo aggregator)

**Analog:** `frontend/src/demo/quoteAdapter.ts:25-66` (`toUnifiedResult`) — single-args-object public API + private helpers + JSDoc style. The aggregator is an N+1 orchestrator over `predictQuote`/`getFeatureImportances`, then funnels into `toUnifiedResult` exactly like today.

**Imports pattern** (mirror `quoteAdapter.ts:1-9`):

```ts
/** Multi-vision aggregator — orchestrates baseline + N per-row predicts and aggregates into a UnifiedQuoteResult. */
import type { QuoteInput } from "@/api/types";
import type { Dataset } from "@/demo/pyodideClient";
import { predictQuote, getFeatureImportances } from "@/demo/pyodideClient";
import { toUnifiedResult } from "@/demo/quoteAdapter";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import type { ProjectRecord } from "@/demo/realProjects";
import type { ModelMetric } from "@/demo/modelMetrics";
import type { VisionRow, QuoteFormValues } from "@/pages/single-quote/schema";
```

**Public API shape** (mirror `AdapterArgs` interface + named function from `quoteAdapter.ts:11-19`):

```ts
export interface AggregatorArgs {
  formValues: QuoteFormValues;
  dataset: Dataset;
  metrics: Record<string, ModelMetric>;
  supportingPool: ProjectRecord[];
  supportingLabel: string;
}

export interface PerVisionContribution {
  rowIndex: number;
  rowLabel: string;          // auto-generated "Vision 1: 2D × 2" or label-overridden
  hoursDelta: number;        // p50 delta from baseline
  topDrivers: Array<{ label: string; direction: "increases" | "decreases" }>;
}

export async function aggregateMultiVisionEstimate(
  args: AggregatorArgs,
): Promise<{ result: UnifiedQuoteResult; perVisionContributions: PerVisionContribution[] }> { ... }
```

**Core orchestration pattern** (mirror Promise.all from `MachineLearningQuoteTool.tsx:138-141` + the per-target sum pattern from `quoteAdapter.ts:36-41`):

```ts
// 1. Baseline call: vision_type="None", vision_systems_count=0
const baselineInput = { ...transformToQuoteInput(formValues), vision_type: "None", vision_systems_count: 0 };
const [baselinePred, importances] = await Promise.all([
  predictQuote(baselineInput, dataset),
  getFeatureImportances(dataset),
]);

// 2. Per-row calls (sequential or parallel — Pyodide single-threaded, parallel only helps if predictQuote itself yields)
const perRowPreds = await Promise.all(
  formValues.visionRows.map((row) =>
    predictQuote(
      { ...transformToQuoteInput(formValues), vision_type: row.type, vision_systems_count: row.count },
      dataset,
    ),
  ),
);

// 3. Aggregate per-target totals: total = baseline + sum(delta_row)
//    Half-widths: sqrt(baseline² + sum(delta²)) — preserves asymmetry
//    Confidence: min(baseline, ...perRow) per target — worst-case posture (D-07)

// 4. Build aggregated prediction object with same shape as predictQuote result, pass to toUnifiedResult.
```

**How the new code differs from the analog:** `quoteAdapter.ts::toUnifiedResult` is a single-call transform; `multiVisionAggregator.ts` is an orchestrator that runs N+1 `predictQuote` calls, computes `delta_row = perRow - baseline` (D-05), aggregates per-target sums + RSS-combined intervals (D-07), and emits a sibling `perVisionContributions[]` for the new UI section (D-08). When `visionRows.length === 0`, falls through to a single baseline call and returns `perVisionContributions: []`.

---

### `frontend/src/pages/single-quote/VisionRowsField.tsx` (NEW — form field component)

**Closest analog (visual primitives):** `frontend/src/pages/single-quote/QuoteForm.tsx:105-134` (Controller pattern with `register` + Switch), and the Vision subsection at lines 174-199 (Section/grid/Field/Select/Input layout it replaces).

**Closest analog (stacked-row component):** `frontend/src/components/quote/VersionHistoryList.tsx` (Phase 5) — stacked vertical list with per-row controls + a top action button. Same visual rhythm: header + list + Add button.

**No existing `useFieldArray` usage in the codebase** (`grep useFieldArray frontend/src` → 0 matches). This component establishes the pattern. Use the canonical `react-hook-form@7` shape:

```tsx
import { useFieldArray, useFormContext, Controller, type Control } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import type { QuoteFormValues } from "./schema";

export function VisionRowsField({ control }: { control: Control<QuoteFormValues> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "visionRows",
  });

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <div className="text-sm text-muted">No vision systems on this project.</div>
      )}
      {fields.map((row, i) => (
        <div key={row.id} className="grid grid-cols-1 md:grid-cols-[140px_120px_1fr_auto] gap-3 items-end">
          <Field label={i === 0 ? "Vision type" : ""} glossaryTerm="Vision Type">
            <Controller
              control={control}
              name={`visionRows.${i}.type`}
              render={({ field }) => (
                <Select options={["2D", "3D"]} {...field} />
              )}
            />
          </Field>
          <Field label={i === 0 ? "Count" : ""}>
            <Controller
              control={control}
              name={`visionRows.${i}.count`}
              render={({ field }) => (
                <Input type="number" min={1} step={1} {...field} />
              )}
            />
          </Field>
          {/* label optional — schema field exists; UI may defer rendering (Claude's discretion D-XX) */}
          <button
            type="button"
            aria-label="Remove vision system"
            onClick={() => remove(i)}
            className="text-muted hover:text-danger"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ type: "2D", count: 1 })}
        className="inline-flex items-center gap-1.5 text-xs eyebrow text-teal hover:text-tealDark"
      >
        <Plus size={14} aria-hidden="true" />
        Add vision system
      </button>
    </div>
  );
}
```

**How the new code differs from the analog:** First `useFieldArray` consumer in the repo. Otherwise reuses the same `Field` + `Controller` + Tailwind grid primitives from `QuoteForm.tsx:174-199`. Add/Remove handlers replace single `register`/Controller bindings. Section heading + glossary tooltip continue to live in `QuoteForm.tsx` (this component is rendered inside the existing Section).

---

### `frontend/src/pages/single-quote/__tests__/multiVisionAggregator.test.ts` (NEW — unit test)

**Analog:** `frontend/src/demo/quoteAdapter.test.ts` (factory functions + `describe` per scenario, inline fixtures) and `frontend/src/demo/pyodideClient.test.ts` (mocking `loadPyodide`/`predictQuote`).

**Imports + factory pattern** (mirror `quoteAdapter.test.ts:11-30`):

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { QuoteFormValues } from "@/pages/single-quote/schema";
import { quoteFormDefaults } from "@/pages/single-quote/schema";

vi.mock("@/demo/pyodideClient", () => ({
  predictQuote: vi.fn(),
  getFeatureImportances: vi.fn(() => Promise.resolve({ me10_actual_hours: [["stations_count", 0.5]] })),
}));
import { predictQuote } from "@/demo/pyodideClient";
import { aggregateMultiVisionEstimate } from "@/demo/multiVisionAggregator";

function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return { ...quoteFormDefaults, ...over };
}

beforeEach(() => {
  vi.mocked(predictQuote).mockReset();
});
```

**Per-test pattern** (mirror dataset-aware mocks from `MachineLearningQuoteTool.test.tsx:260-266` shown in TESTING.md):

```ts
it("aggregates baseline + per-row deltas into total p50", async () => {
  // baseline: 100h; row1 (2D×1): 130h → delta 30h; row2 (3D×1): 160h → delta 60h
  vi.mocked(predictQuote)
    .mockResolvedValueOnce(makePred(100))   // baseline
    .mockResolvedValueOnce(makePred(130))   // row 1
    .mockResolvedValueOnce(makePred(160));  // row 2

  const out = await aggregateMultiVisionEstimate({
    formValues: makeFormValues({ visionRows: [{ type: "2D", count: 1 }, { type: "3D", count: 1 }] }),
    dataset: "synthetic",
    metrics: { me10_actual_hours: { target: "me10_actual_hours", rows: 10, mae: 5, r2: 0.85 } },
    supportingPool: [],
    supportingLabel: "Most similar training rows",
  });

  expect(out.result.estimateHours).toBeCloseTo(190, 0);   // 100 + 30 + 60
  expect(out.perVisionContributions).toHaveLength(2);
  expect(out.perVisionContributions[0]).toMatchObject({ rowIndex: 0, hoursDelta: 30 });
});
```

**Required cases** (success criteria 1, 2, 4 from ROADMAP.md):
1. Empty `visionRows: []` → single baseline call, `perVisionContributions: []`.
2. Single row → baseline + 1 per-row call → contributions length 1.
3. Three rows of mixed types → linear sum on p50; RSS on half-widths; confidence = min across all calls (D-07).
4. Range/confidence rule edge case: when one row's confidence is `lower`, aggregated confidence per target is `lower`.

**How the new code differs from the analog:** `quoteAdapter.test.ts` tests a pure transform; this tests an N+1 orchestrator with mocked `predictQuote`. Mock counter (`.mockResolvedValueOnce` chain) is the new wrinkle.

---

### `frontend/src/pages/single-quote/__tests__/VisionRowsField.test.tsx` (NEW — component test)

**Analog:** `frontend/src/components/quote/SaveQuoteDialog.test.tsx` (form-bearing component with controlled state + RTL fireEvent), and `QuoteResultPanel.test.tsx:12-85` (inline fixtures pattern).

**Pattern**:

```tsx
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { renderWithProviders } from "@/test/render";
import { VisionRowsField } from "../VisionRowsField";
import { quoteFormSchema, quoteFormDefaults, type QuoteFormValues } from "../schema";

function Harness({ defaults }: { defaults?: Partial<QuoteFormValues> }) {
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { ...quoteFormDefaults, ...defaults },
  });
  return <VisionRowsField control={form.control} />;
}

describe("VisionRowsField", () => {
  it("renders the empty state when visionRows is empty", () => {
    renderWithProviders(<Harness defaults={{ visionRows: [] }} />);
    expect(screen.getByText(/no vision systems/i)).toBeInTheDocument();
  });

  it("Add appends a new row with default { type: '2D', count: 1 }", () => {
    renderWithProviders(<Harness defaults={{ visionRows: [] }} />);
    fireEvent.click(screen.getByRole("button", { name: /add vision system/i }));
    expect(screen.getAllByLabelText(/vision type/i)).toHaveLength(1);
  });

  it("Remove drops the targeted row", () => {
    renderWithProviders(<Harness defaults={{ visionRows: [{ type: "2D", count: 1 }, { type: "3D", count: 2 }] }} />);
    const removes = screen.getAllByRole("button", { name: /remove vision system/i });
    fireEvent.click(removes[0]);
    // Only one row remains; assert against count input value
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });
});
```

**How the new code differs from the analog:** `SaveQuoteDialog.test.tsx` tests a controlled-by-state dialog; this tests a `useFieldArray` consumer wrapped in a real `useForm` harness so `field.value` actually updates. Per-test default rows are the variability axis.

---

### `frontend/src/pages/single-quote/QuoteForm.tsx` (MODIFIED — :172-198 swap)

**Analog:** Self — the existing Section/grid/Field structure stays. Only the inner Vision controls change.

**Existing block to replace** (lines 169-200):

```tsx
<Section step="03" title="Controls & automation" description="...">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Field label="PLC family" glossaryTerm="PLC Family">
      <Select options={opts("plc_family", [...])} {...register("plc_family")} />
    </Field>
    <Field label="HMI family" glossaryTerm="HMI Family">
      <Select options={opts("hmi_family", [...])} {...register("hmi_family")} />
    </Field>
    <Field label="Vision type" glossaryTerm="Vision Type">          {/* :181 — REMOVE */}
      <Select options={opts("vision_type", ["None", "2D", "3D"])} {...register("vision_type")} />
    </Field>
    {/* …other controls…  */}
    <Field label="Vision systems count">                            {/* :196 — REMOVE */}
      <Input type="number" min={0} step={1} {...register("vision_systems_count")} />
    </Field>
  </div>
</Section>
```

**Replacement** (the picker becomes a sub-block inside the same Section, before/after the rest of the controls grid):

```tsx
<Section step="03" title="Controls & automation" description="...">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Field label="PLC family" glossaryTerm="PLC Family">
      <Select options={opts("plc_family", [...])} {...register("plc_family")} />
    </Field>
    <Field label="HMI family" glossaryTerm="HMI Family">
      <Select options={opts("hmi_family", [...])} {...register("hmi_family")} />
    </Field>
    {/* …other controls (Panel count, Servo axes, Drive count, Pneumatic devices)… */}
  </div>

  {/* Vision picker — replaces the two flat fields (D-02). */}
  <div className="mt-4">
    <div className="eyebrow text-[10px] text-muted mb-2">Vision systems</div>
    <VisionRowsField control={control} />
  </div>
</Section>
```

**How the new code differs from the analog:** Two `<Field>` rows replaced by one sub-block hosting `<VisionRowsField>`. Imports add `VisionRowsField` from `./VisionRowsField`. The Section description copy can stay (D-17 jargon-guard re-scans).

---

### `frontend/src/pages/single-quote/schema.ts` (MODIFIED — :36, 41, 88, 93, 121, 151)

**Analog:** Self (existing zod object pattern) + `frontend/src/lib/savedQuoteSchema.ts:97-109` (the only existing `z.array(z.object(...))` in the repo) for the array shape.

**z.array(z.object(...)) reference from `savedQuoteSchema.ts:97-109`**:

```ts
export const quoteVersionSchema = z.object({
  version: z.number().int().min(1),
  savedAt: z.string().datetime(),
  statusAtTime: z.enum(STATUS_CYCLE),
  formValues: quoteFormSchema,
  unifiedResult: unifiedQuoteResultSchema,
  restoredFromVersion: z.number().int().min(1).optional(),
  compareInputs: z.object({ humanQuotedByBucket: z.record(z.string(), z.number()) }).optional(),
});

export const savedQuoteSchema = z.object({
  // ...
  versions: z.array(quoteVersionSchema).min(1),
  // ...
});
```

**New `VisionRowSchema` (D-01)** to add at top of `single-quote/schema.ts`:

```ts
export const VISION_TYPES = ["2D", "3D"] as const;
export type VisionType = (typeof VISION_TYPES)[number];

export const VisionRowSchema = z.object({
  type: z.enum(VISION_TYPES),
  count: z.coerce.number().int().min(1),
  label: z.string().trim().max(80).optional(),
});
export type VisionRow = z.infer<typeof VisionRowSchema>;
```

**Edits to `quoteFormSchema`**:
- Line 36 — DELETE `vision_type: requiredString,`.
- Line 41 — DELETE `vision_systems_count: z.coerce.number().int().min(0),`.
- ADD (anywhere in 03 block): `visionRows: z.array(VisionRowSchema),`.

**Edits to `quoteFormDefaults`**:
- Line 88 — DELETE `vision_type: "None",`.
- Line 93 — DELETE `vision_systems_count: 0,`.
- ADD: `visionRows: [],` (D-02 — empty by default).

**Edits to `transformToQuoteInput`** (the wire-format builder):
- Line 121 — DELETE `vision_type: v.vision_type,`.
- Line 151 — DELETE `vision_systems_count: v.vision_systems_count,`.
- The transform NO LONGER copies these flat fields. Instead, the aggregator (D-06) injects per-call `vision_type` and `vision_systems_count` for each predict call. Keep `transformToQuoteInput` as the "everything else" baseline transform; the aggregator overlays vision per call.

**Inverse `transformToFormValues` in `frontend/src/lib/savedQuoteSchema.ts:144-192`** (only relevant if Phase 5 round-trip uses it for restore):
- The inverse builder reads `input.vision_type` / `input.vision_systems_count`. Per D-13 the v1→v2 migrator strips those keys before they reach the form, so this inverse path will receive a v2 record where those keys are absent. Audit and (if necessary) gate the keys with `?? undefined`.

**How the new code differs from the analog:** First `z.array(z.object(...))` in the form schema. Mirrors the savedQuote shape exactly. Defaults shift from `vision_type: "None"` to `visionRows: []` — the empty-array case is the new "no vision."

---

### `frontend/src/components/quote/QuoteResultPanel.tsx` (MODIFIED — :235/240 swap + new section)

**Analog (inputs-echo swap, D-11):** Self — the `SECTIONS` constant at lines 200-269 is the existing pattern. Each row is a `[label, getter]` tuple.

**Existing rows to replace** (inside "Controls & automation" section, lines 230-242):

```ts
{
  title: "Controls & automation",
  rows: [
    ["PLC family", (v) => v.plc_family || "—"],
    ["HMI family", (v) => v.hmi_family || "—"],
    ["Vision type", (v) => v.vision_type || "—"],            // :235 — REMOVE
    ["Panel count", (v) => fmtCount(v.panel_count)],
    ["Servo axes", (v) => fmtCount(v.servo_axes)],
    ["Drive count", (v) => fmtCount(v.drive_count)],
    ["Pneumatic devices", (v) => fmtCount(v.pneumatic_devices)],
    ["Vision systems count", (v) => fmtCount(v.vision_systems_count)],  // :240 — REMOVE
  ],
},
```

**Replacement** (single row aggregating across visionRows, D-11):

```ts
{
  title: "Controls & automation",
  rows: [
    ["PLC family", (v) => v.plc_family || "—"],
    ["HMI family", (v) => v.hmi_family || "—"],
    ["Vision systems", (v) => formatVisionSystems(v.visionRows)],   // NEW row
    ["Panel count", (v) => fmtCount(v.panel_count)],
    ["Servo axes", (v) => fmtCount(v.servo_axes)],
    ["Drive count", (v) => fmtCount(v.drive_count)],
    ["Pneumatic devices", (v) => fmtCount(v.pneumatic_devices)],
  ],
},
```

`formatVisionSystems` helper (paired with the existing `fmtCount`/`fmtMoney`/`yesNo` group at :329-343):

```ts
function formatVisionSystems(rows: QuoteFormValues["visionRows"]): string {
  if (!rows || rows.length === 0) return "—";
  // "2D × 2; 3D × 1" — sums by type if labels are absent (D-11)
  return rows.map((r) => `${r.type} × ${fmtCount(r.count)}`).join("; ");
}
```

Also update the glossary `MAP` at lines 277-285 — `"Vision type"` → `"Vision systems"` is a plain row (no glossary term registered yet); leave `MAP` untouched if no `"Vision Systems"` glossary entry exists.

**Analog (per-vision card section, D-09):** Self — the existing "Top drivers" card at lines 96-121 (eyebrow + flex list) and "Per-category breakdown" card at lines 123-147 (eyebrow + space-y stacked rows). The new section sits between these two per D-10.

**Existing card pattern to mirror** (lines 96-121):

```tsx
<div className="card p-5">
  <div className="eyebrow text-xs text-muted mb-3">What drives this estimate</div>
  <ul className="space-y-2">
    {result.topDrivers.map((d, i) => (
      <li key={i} className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-ink">{...}</span>
        <span className="text-sm eyebrow text-muted shrink-0">
          {MAGNITUDE_LABEL[d.magnitude]}
        </span>
      </li>
    ))}
  </ul>
</div>
```

**New "Per-vision contribution" section** (D-09; placed between top-drivers card at :96 and per-category card at :123):

```tsx
{result.perVisionContributions && result.perVisionContributions.length > 0 && (
  <div className="card p-5">
    <div className="eyebrow text-xs text-muted mb-3">Per-vision contribution</div>
    <div className="space-y-3">
      {result.perVisionContributions.map((pvc) => (
        <div key={pvc.rowIndex} className="space-y-1 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-ink">{pvc.rowLabel}</span>
            <span className="text-muted tnum shrink-0">
              {pvc.hoursDelta >= 0 ? "+" : ""}
              {fmtHrs(pvc.hoursDelta)} hrs
            </span>
          </div>
          {pvc.topDrivers.length > 0 && (
            <ul className="text-[12px] text-muted space-y-0.5">
              {pvc.topDrivers.map((d, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {d.direction === "increases" ? (
                    <TrendingUp size={12} className="text-amber" aria-hidden="true" />
                  ) : (
                    <TrendingDown size={12} className="text-teal" aria-hidden="true" />
                  )}
                  {d.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

**How the new code differs from the analog:** Reuses the existing card eyebrow + space-y vertical list patterns. New section is gated on `result.perVisionContributions?.length` (optional sibling field on `UnifiedQuoteResult` — v1 single-vision quotes that lack the field render unchanged). Hours-delta phrasing uses plain hours not "delta from baseline" (D-17).

---

### `frontend/src/demo/quoteAdapter.ts::toUnifiedResult` (MODIFIED — accept aggregator output)

**Analog:** Self — the public function shape stays. The aggregator already has its own predict + importances + supportingPool, so it can call `toUnifiedResult` directly with the *aggregated* prediction object. `toUnifiedResult` does not need to know about multi-vision.

**Implementation note:** The cleanest move is **no change to `toUnifiedResult`** — the aggregator constructs an aggregated `prediction` map (per-target sums) and passes it to `toUnifiedResult` exactly as today. The aggregator then attaches `perVisionContributions` to the returned `UnifiedQuoteResult` *after* the call:

```ts
// Inside aggregateMultiVisionEstimate:
const aggregatedPredByTarget = buildAggregatedPrediction(baselinePred, perRowPreds);
const result = toUnifiedResult({
  input: transformToQuoteInput(formValues),  // baseline shape — vision row info is on perVisionContributions
  prediction: aggregatedPredByTarget,
  importances,
  metrics,
  supportingPool,
  supportingLabel,
});
return {
  result: { ...result, perVisionContributions },
  perVisionContributions,
};
```

**How the new code differs from the analog:** No change to `toUnifiedResult` itself. The aggregator wraps it. This keeps `quoteAdapter.ts` focused on a single transform and isolates the multi-vision orchestration in `multiVisionAggregator.ts`.

---

### `frontend/src/demo/quoteResult.ts` (MODIFIED — extend type)

**Analog:** Self — the existing interface.

**Existing definition** (`quoteResult.ts:1-28`):

```ts
export interface UnifiedQuoteResult {
  estimateHours: number;
  likelyRangeLow: number;
  likelyRangeHigh: number;
  overallConfidence: "high" | "moderate" | "lower";
  perCategory: Array<{ ... }>;
  topDrivers: Array<{ ... }>;
  supportingMatches: { label: string; items: Array<{ ... }> };
}
```

**Replacement** — add `perVisionContributions` as optional sibling field (so v1 saved quotes that lack it round-trip cleanly):

```ts
export interface PerVisionContribution {
  rowIndex: number;
  rowLabel: string;
  hoursDelta: number;
  topDrivers: Array<{ label: string; direction: "increases" | "decreases" }>;
}

export interface UnifiedQuoteResult {
  estimateHours: number;
  likelyRangeLow: number;
  likelyRangeHigh: number;
  overallConfidence: "high" | "moderate" | "lower";
  perCategory: Array<{ ... }>;
  topDrivers: Array<{ ... }>;
  supportingMatches: { label: string; items: Array<{ ... }> };
  /** Multi-vision per-row breakdown (Phase 6, D-08/D-09). Absent on v1 quotes. */
  perVisionContributions?: PerVisionContribution[];
}
```

**How the new code differs from the analog:** One new optional field + one new type alias. The `?` on `perVisionContributions` is load-bearing — Phase 5 v1 quotes do not carry it and must continue to render the existing layout unchanged.

---

### `frontend/src/lib/quoteStorage.ts` (MODIFIED — bump DB to v2 + on-read migrator)

**Analog:** Self — the existing `onupgradeneeded` block at lines 103-122 (Phase 5 D-01 created it; Phase 6 D-12 extends it).

**Existing pattern** (lines 32-122):

```ts
export const QUOTE_DB_NAME = "matrix-quotes";
export const QUOTE_STORE_NAME = "quotes";
export const QUOTE_DB_VERSION = 1;                // ← BUMP TO 2

export function ensureDbReady(): Promise<void> {
  if (!dbPromise) {
    dbPromise = openDB(QUOTE_DB_NAME, QUOTE_DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(QUOTE_STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("status", "status");
          store.createIndex("workspace", "workspace");
        }
      },
    }).catch(...);
  }
  return dbPromise.then(() => undefined);
}
```

**Modified pattern (D-12, D-13)**:

```ts
export const QUOTE_DB_VERSION = 2;                // bumped

export function ensureDbReady(): Promise<void> {
  if (!dbPromise) {
    dbPromise = openDB(QUOTE_DB_NAME, QUOTE_DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(QUOTE_STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("status", "status");
          store.createIndex("workspace", "workspace");
        }
        if (oldVersion < 2) {
          // D-13: migrate every existing record's persisted form values from
          // flat vision fields → visionRows[].
          const store = tx.objectStore(QUOTE_STORE_NAME);
          let cursor = await store.openCursor();
          while (cursor) {
            const migrated = migrateRecordV1ToV2(cursor.value);
            await cursor.update(migrated);
            cursor = await cursor.continue();
          }
        }
      },
    }).catch((err: Error) => { dbPromise = null; throw err; });
  }
  return dbPromise.then(() => undefined);
}

/** Idempotent v1→v2 record migration (D-13). Called from onupgradeneeded
 * AND defensively from getSavedQuote/listSavedQuotes for tabs open during
 * the upgrade window. */
export function migrateRecordV1ToV2(rec: any): any {
  if (rec?.schemaVersion === 2) return rec;
  if (rec?.schemaVersion !== 1) return rec;  // unknown — leave to upstream resilience
  const v2 = { ...rec, schemaVersion: 2 };
  v2.versions = (rec.versions ?? []).map((v: any) => ({
    ...v,
    formValues: migrateFormValuesV1ToV2(v.formValues),
  }));
  return v2;
}

function migrateFormValuesV1ToV2(fv: any): any {
  if (!fv || Array.isArray(fv.visionRows)) return fv;  // already v2
  const visionType = fv.vision_type;
  const count = Number(fv.vision_systems_count ?? 0);
  let visionRows: Array<{ type: "2D" | "3D"; count: number }> = [];
  if (visionType === "2D" || visionType === "3D") {
    visionRows = [{ type: visionType, count: Math.max(1, count) }];
  }
  // Strip legacy keys (D-13: clean cutover).
  const { vision_type: _vt, vision_systems_count: _vc, ...rest } = fv;
  return { ...rest, visionRows };
}
```

**Defensive on-read migration (D-13)** — wrap `getSavedQuote` (line 221) and `listSavedQuotes` (line 201) so a v1 record slipping through (e.g. cross-tab race) is migrated before zod validation:

```ts
export async function getSavedQuote(id: string): Promise<SavedQuote | null> {
  const handle = await db();
  const rec = await handle.get(QUOTE_STORE_NAME, id);
  if (!rec) return null;
  const migrated = migrateRecordV1ToV2(rec);   // NEW — defensive
  return savedQuoteSchema.parse(migrated);
}

export async function listSavedQuotes(): Promise<SavedQuote[]> {
  // ...
  const validated: SavedQuote[] = [];
  for (const rec of raw) {
    const migrated = migrateRecordV1ToV2(rec);   // NEW — defensive
    const parsed = savedQuoteSchema.safeParse(migrated);
    if (parsed.success) validated.push(parsed.data);
  }
  // ...
}
```

The Phase 5 WR-02 forward-compat (silently drop unparseable rows in `listSavedQuotes`) stays intact (D-14) — a future schemaVersion 3 record still doesn't crash the v2 list.

**How the new code differs from the analog:** `QUOTE_DB_VERSION` bumps 1→2. New `if (oldVersion < 2)` branch in `upgrade` walks the cursor and rewrites every record. New exported `migrateRecordV1ToV2` runs both at upgrade time and defensively on each read. The structural pattern (`if (oldVersion < N)`) is identical to Phase 5's pattern at line 108.

---

### `frontend/src/lib/savedQuoteSchema.ts` (MODIFIED — schemaVersion 1 → 2)

**Analog:** Self — line 114 `schemaVersion: z.literal(1)` is the only structural lock.

**Single-line edit (D-12)**:

```ts
// Before:
schemaVersion: z.literal(1),

// After:
schemaVersion: z.literal(2),
```

**Plus**: `quoteFormSchema` (imported at :16) automatically picks up the `visionRows` field from `single-quote/schema.ts`, so `quoteVersionSchema.formValues` becomes v2-shaped without further edits to this file.

**Audit** the inverse `transformToFormValues` at lines 144-192 — the v1→v2 migrator strips `vision_type` and `vision_systems_count` before this function is called, so today's `input.vision_type` / `input.vision_systems_count` references will receive `undefined`. Add `?? "None"` / `?? 0` defaults if any test exercises raw-`QuoteInput`-without-migration (otherwise this function is only called on already-v2 records and is fine).

**`buildAutoSuggestedName`** at lines 220-239 reads `values.vision_type`. Replace with a derivation from `visionRows`:

```ts
const visionLabel =
  !values.visionRows || values.visionRows.length === 0
    ? "No vision"
    : values.visionRows
        .map((r) => `${r.type}×${r.count}`)
        .join("+");
```

`deriveSalesBucket` at :203-210 doesn't touch vision; leave alone.

**How the new code differs from the analog:** One literal bump (1→2). Auto-name string format extends to multi-row.

---

### `frontend/src/demo/realProjects.ts::recordToPrediction` (MODIFIED — legacy-compat numeric features)

**Analog:** Self — the existing `recordToQuoteInput` (lines 75-90) at the same file owns the flat-field-to-numeric-feature loop. `recordToPrediction` builds a synthetic `QuotePrediction` from CSV `*_actual_hours` columns; it is downstream of the form transform. No multi-vision bleed-through here.

**Source files (read-only)** carrying the model's view of the world:
- `core/config.py:79, 96` — `vision_systems_count ∈ QUOTE_NUM_FEATURES`, `vision_type ∈ QUOTE_CAT_FEATURES`. These remain pinned to the model's pickle. The aggregator's per-row predict feeds these flat fields per call (D-06).
- `core/features.py:75, 80` — `stations_robot_index` derived index uses `vision_systems_count`. Each per-row predict calculation respects this — `count` flows in.

**Effect on `recordToPrediction`:** None. CSV records have flat `vision_type` + `vision_systems_count` columns; the function reads them as-is and builds a fake `QuotePrediction` from `*_actual_hours`. Multi-vision changes only the *form-side* shape, not the historical CSV shape. Confirmed: `recordToPrediction` body (`realProjects.ts:93-137`) does NOT reference `vision_type` or `vision_systems_count` directly.

**Where the legacy-compat shim is actually needed:** `recordToQuoteInput` (lines 75-90) feeds `nearestNeighbor.ts::distance` which reads QUOTE_NUM_FIELDS / QUOTE_CAT_FIELDS. Those constants list `"vision_type"` and `"vision_systems_count"` (lines 43-62). When the SE submits a multi-vision quote, the QuoteInput passed to `nearestK` lacks those keys → distance contribution becomes 0/empty. Legacy-compat fallback (D-04):

```ts
// In MachineLearningQuoteTool.tsx / ComparisonQuote.tsx, BEFORE handing off to
// the aggregator's adapter call, build a "shadow" QuoteInput that injects
// vision_type = visionRows[0]?.type ?? "None" and vision_systems_count =
// sum(row.count) for similar-projects matching only.
const inputForMatching = {
  ...transformToQuoteInput(formValues),
  vision_type: formValues.visionRows[0]?.type ?? "None",
  vision_systems_count: formValues.visionRows.reduce((s, r) => s + r.count, 0),
};
```

Pass `inputForMatching` to `toUnifiedResult` *only* (so its internal `nearestK` call sees the legacy shape). The aggregator's per-call inputs use the per-row override (already correct).

**How the new code differs from the analog:** No change to `recordToPrediction` body. The legacy-compat shim lives in the page handlers (`MachineLearningQuoteTool.tsx` / `ComparisonQuote.tsx`) where `transformToQuoteInput` is called.

---

### `frontend/src/lib/nearestNeighbor.ts` (MODIFIED — same legacy-compat fallback)

**Analog:** Self — the distance loop (lines 29-49). No changes to the function.

**Effect:** None — `distance()` reads `(input as Record<string, unknown>)[f]` for each `f` in `QUOTE_NUM_FIELDS`/`QUOTE_CAT_FIELDS`. Missing vision keys → `numericValue(undefined)` returns 0 → distance contribution 0 (effectively "matches everyone on this dimension"). The legacy-compat shim (above, in the page handler) injects `vision_type = visionRows[0]?.type` so matches still penalise on vision-type mismatch.

**How the new code differs from the analog:** No code change. The fix is upstream in the page handlers per the legacy-compat shim above.

---

### `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` (MODIFIED — handleSubmit wiring)

**Analog:** Self — `handleSubmit` at lines 132-177 is the canonical predict path.

**Existing block** (lines 132-177):

```ts
const handleSubmit = async () => {
  if (!ready) return;
  const values = form.getValues();
  const input = transformToQuoteInput(values);
  setSubmitting(true);
  try {
    const [prediction, importances] = await Promise.all([
      predictQuote(input, "synthetic"),
      getFeatureImportances("synthetic"),
    ]);
    const predByTarget: Record<string, { p10: number; p50: number; p90: number }> = {};
    for (const [opKey, opPred] of Object.entries(prediction.ops)) {
      const target = `${opKey}_actual_hours`;
      predByTarget[target] = { p10: opPred.p10, p50: opPred.p50, p90: opPred.p90 };
    }
    setResult({
      unified: toUnifiedResult({
        input, prediction: predByTarget, importances,
        metrics: metricsByTarget, supportingPool: pool ?? [],
        supportingLabel: "Most similar training rows",
      }),
      formValues: values,
    });
    requestAnimationFrame(() => { document.getElementById("quote-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Prediction failed";
    toast.error(msg);
  } finally {
    setSubmitting(false);
  }
};
```

**Replacement (call aggregator instead of predictQuote directly):**

```ts
const handleSubmit = async () => {
  if (!ready) return;
  const values = form.getValues();
  setSubmitting(true);
  try {
    const { result } = await aggregateMultiVisionEstimate({
      formValues: values,
      dataset: "synthetic",
      metrics: metricsByTarget,
      supportingPool: pool ?? [],
      supportingLabel: "Most similar training rows",
    });
    setResult({ unified: result, formValues: values });
    requestAnimationFrame(() => {
      document.getElementById("quote-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Prediction failed";
    toast.error(msg);
  } finally {
    setSubmitting(false);
  }
};
```

**Imports** add `import { aggregateMultiVisionEstimate } from "@/demo/multiVisionAggregator";`. Drop the now-unused `predictQuote`, `getFeatureImportances`, `toUnifiedResult` imports (or keep `predictQuote` only if some other call site uses it — none does).

**How the new code differs from the analog:** One async call replaces the parallel `predictQuote` + `getFeatureImportances` + manual ops-to-target remap + `toUnifiedResult` chain. The aggregator absorbs all of it. Same try/catch/setSubmitting envelope.

---

### `frontend/src/pages/demo/compare/ComparisonQuote.tsx` (MODIFIED — handleSubmit wiring, mirror)

**Analog:** Self — `handleSubmit` at lines 130-175. Identical structure to `MachineLearningQuoteTool.tsx::handleSubmit`. Same exact swap, with `dataset: "real"` and `supportingLabel: "Most similar past projects"`.

**How the new code differs from the analog:** Same delta as above; mirrors across both Quote tabs.

---

### `frontend/src/test/jargon-guard.test.tsx` (MODIFIED — extend coverage, D-17)

**Analog:** Self — Phase 5 surface-coverage block at lines 209-342 is the precedent.

**Existing pattern** (lines 209-217 — the canonical add-a-surface block):

```tsx
describe("jargon-guard (DATA-03 — Phase 5 surface coverage)", () => {
  it("MyQuotesEmptyState renders no banned ML-jargon tokens", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    const body = document.body.textContent ?? "";
    expect(body, "expected MyQuotesEmptyState chrome to render").toMatch(
      /no saved quotes yet/i,
    );
    assertNoBannedTokens("MyQuotesEmptyState", body);
  });
  // ...
});
```

**New Phase 6 surface-coverage block** (D-17):

```tsx
describe("jargon-guard (DATA-03 — Phase 6 surface coverage)", () => {
  it("VisionRowsField (empty + populated) renders no banned ML-jargon tokens", () => {
    // 1. Empty state
    const { unmount } = renderWithProviders(<VisionRowsFieldHarness rows={[]} />);
    let body = document.body.textContent ?? "";
    expect(body).toMatch(/no vision systems/i);
    assertNoBannedTokens("VisionRowsField (empty)", body);
    unmount();
    // 2. Populated state
    renderWithProviders(<VisionRowsFieldHarness rows={[{ type: "2D", count: 2 }, { type: "3D", count: 1 }]} />);
    body = document.body.textContent ?? "";
    expect(body).toMatch(/add vision system/i);
    assertNoBannedTokens("VisionRowsField (populated)", body);
  });

  it("QuoteResultPanel with perVisionContributions renders no banned ML-jargon tokens", () => {
    const result: UnifiedQuoteResult = {
      ...HIGH_CONFIDENCE_RESULT,
      perVisionContributions: [
        { rowIndex: 0, rowLabel: "Vision 1: 2D × 2", hoursDelta: 38, topDrivers: [{ label: "Number of stations", direction: "increases" }] },
        { rowIndex: 1, rowLabel: "Vision 2: 3D × 1", hoursDelta: 65, topDrivers: [{ label: "Robot count", direction: "increases" }] },
      ],
    };
    renderWithProviders(<QuoteResultPanel result={result} input={makeFormValues({ visionRows: [{ type: "2D", count: 2 }, { type: "3D", count: 1 }] })} />);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/per-vision contribution/i);
    assertNoBannedTokens("QuoteResultPanel (multi-vision)", body);
  });
});
```

**No additions to `BANNED_TOKENS`** — Phase 6 introduces no new ML-risk vocabulary (mirrors the Phase 5 D-19 stance at jargon-guard.test.tsx:190-191). Existing 16-pattern list catches "delta from baseline" / "uncertainty band" if accidentally introduced via the `\bregression\b` and `\bensemble\b` family — review and confirm.

**How the new code differs from the analog:** New describe block scoped to Phase 6 surfaces. Same fixture-then-render-then-assert structure.

---

## Shared Patterns

### Static-SPA / browser-only constraints (durable across phases)
- **No HTTP calls.** Aggregator and migration code never reach `frontend/src/api/*` (ARCHITECTURE.md anti-pattern, carry-forward Phase 5 D-01).
- **No editing `core/`.** Aggregation lives in TS only (D-06). `core/{config,features,models}.py` stay vendored. Verified: `core/config.py:79,96` has `vision_systems_count`/`vision_type` pinned; the aggregator overlays them per call.
- **IS_DEMO is always true.** No `IS_DEMO === false` branch.

### Module-level singletons (mirror `pyodideClient.ts:78-86` and `quoteStorage.ts:72-74`)
The aggregator does NOT need its own singleton — it is a pure orchestrator over the existing `predictQuote` machinery. State stays in the existing `pyodidePromise` + `modelPromises` cache.

### Subscribe / notify pattern
Already used by Pyodide loading (`pyodideClient.ts:101-105`) and quote-storage broadcast (`quoteStorage.ts:374-381`). Aggregator does NOT need it — N+1 calls are short on warm cache.

### `useFieldArray` (NEW pattern for this repo)
**Source:** TanStack `react-hook-form@7` canonical — `useFieldArray({ control, name })` returns `{ fields, append, remove, ... }`. Each item in `fields` carries an `id` for the `key` prop. `append({ ... })` adds with default values; `remove(i)` drops by index.
**Apply to:** `VisionRowsField.tsx` only (this phase). Future phases (e.g. multi-row anything) reuse this primitive.

### Jargon-guard scan (DATA-03)
**Source:** `frontend/src/test/jargon-guard.test.tsx:98-105` (`assertNoBannedTokens` helper) + `frontend/src/test/jargon.ts` (`BANNED_TOKENS` regex list).
**Apply to:** Every new user-facing string introduced by Phase 6 — picker labels, "Add vision system" copy, empty-state copy, "Vision systems" inputs-echo row, "Per-vision contribution" section heading, hours-delta phrasing, any error toasts. New describe block per the precedent at lines 209-342.

### Confidence aggregation (D-07 worst-case posture)
**Source:** Existing `r2ToConfidence` in `quoteAdapter.ts:72-76` (continuous → discrete) + `rollUpConfidence` in `quoteAdapter.ts:78-91` (weighted-mean rollup).
**Apply to:** Aggregator confidence-aggregation rule. The aggregator does NOT use `rollUpConfidence` — instead, it takes `min` over baseline + per-row confidence per target (D-07: "minimum confidence observed across baseline + per-row predicts"), which is honest-signal posture. Then `toUnifiedResult` applies its existing `rollUpConfidence` to the aggregated `perCategory`.

### Schema versioning + on-read defense (Phase 5 D-18 → Phase 6 D-12/D-13)
**Source:** `quoteStorage.ts:103-122` (`onupgradeneeded`) + `quoteStorage.ts:201-215` (`listSavedQuotes` resilience for unknown schema versions).
**Apply to:** Phase 6 only extends — adds `if (oldVersion < 2)` cursor walk + exports `migrateRecordV1ToV2` for defensive on-read use in both `getSavedQuote` and `listSavedQuotes`.

### Customer-trust hygiene
**Source:** Phase 4 DATA-03 ratchet, Phase 5 D-19 extension precedent.
**Apply to:** All new user-facing copy. Plain hours, no "delta", no "baseline", no "aggregation". Per-vision section heading: "Per-vision contribution" (passes regex set). Hours delta phrasing: `"+38 hrs"` not `"+38h delta"`.

---

## No Analog Found

| File | Role | Data Flow | Why no analog |
|------|------|-----------|---------------|
| `frontend/src/pages/single-quote/VisionRowsField.tsx` | form field component | event-driven (form state) | First `useFieldArray` consumer in the repo. The closest existing analog is the multi-Switch group in `QuoteForm.tsx:105-134` and the stacked-list visual in `VersionHistoryList.tsx`, but neither uses `useFieldArray`. Pattern documented above using TanStack `react-hook-form@7` canonical shape. |

All other files have exact or strong-role analogs in v1.0 + Phase 5 code.

---

## Metadata

**Analog search scope:**
- `frontend/src/demo/` — `pyodideClient.ts`, `quoteAdapter.ts`, `quoteResult.ts`, `realProjects.ts`
- `frontend/src/lib/` — `quoteStorage.ts`, `savedQuoteSchema.ts`, `nearestNeighbor.ts`, `jargon.ts`
- `frontend/src/components/` — `quote/QuoteResultPanel.tsx`, `quote/SaveQuoteButton.tsx`, `Field.tsx`
- `frontend/src/pages/single-quote/` — `QuoteForm.tsx`, `schema.ts`
- `frontend/src/pages/demo/` — `MachineLearningQuoteTool.tsx`, `compare/ComparisonQuote.tsx`
- `frontend/src/test/` — `jargon-guard.test.tsx`, `jargon.ts`, `render.tsx`

**Files scanned:** ~17 (above) + grep sweeps for `useFieldArray` (0 matches) + `z.array` (1 match: `savedQuoteSchema.ts`).

**Pattern extraction date:** 2026-05-05
