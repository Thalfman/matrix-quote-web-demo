---
phase: 06-multi-vision
plan: 03
subsystem: form-ui
tags: [multi-vision, useFieldArray, picker-ui, form-component, rtl-real-form-harness]
requires:
  - 06-01 (VisionRowSchema, visionRows on quoteFormSchema, VISION_TYPES, quoteFormDefaults.visionRows = [])
provides:
  - VisionRowsField component (first useFieldArray consumer in the repo)
  - "Vision systems" sub-block inside QuoteForm Section 03
  - 5 user-facing strings ready for the 06-04 jargon-guard extension:
      "Vision type", "Count", "No vision systems on this project.",
      "Remove vision system", "Add vision system"
affects:
  - frontend/src/pages/demo/MachineLearningQuoteTool.tsx (06-04 will swap handleSubmit to aggregator)
  - frontend/src/pages/demo/compare/ComparisonQuote.tsx (06-04 mirror)
  - frontend/src/components/quote/QuoteResultPanel.tsx (06-04 inputs-echo + per-vision section)
  - frontend/tests/jargon-guard.test.tsx (06-04 will scan the 5 strings introduced here)
tech-stack:
  added: []
  patterns:
    - "react-hook-form useFieldArray (FIRST consumer in the repo)"
    - "Real useForm + zodResolver harness in component tests so useFieldArray mutations flow through real form state"
    - "Controller + Number(e.target.value) eager coercion for the count Input (z.coerce.number does not auto-coerce until parse)"
    - "Header-row labels: i === 0 ? 'Label' : '' so labels render only on the first row"
key-files:
  created:
    - frontend/src/pages/single-quote/VisionRowsField.tsx
    - frontend/src/pages/single-quote/__tests__/VisionRowsField.test.tsx
  modified:
    - frontend/src/pages/single-quote/QuoteForm.tsx
decisions:
  - "VisionRowsField is rendered inside Section 03 as a separate sub-block AFTER the existing 03 grid (PLC / HMI / Panel / Servo / Drive / Pneumatic). Section heading + description copy unchanged."
  - "Per D-01/D-18 (Claude's discretion), the optional `label: string` schema slot ships from 06-01 but the picker does NOT render a label input in v2.0. Preserves Ben's 'trying to keep data entry simple' posture; adding the input later is a minor UI-only change."
  - "Empty-state copy 'No vision systems on this project.' renders only when fields.length === 0. Add button is always present below the rows (regardless of count)."
  - "Add appends { type: '2D', count: 1 } verbatim per D-02. Remove drops by index — useFieldArray's standard `remove(i)` API."
  - "Tailwind classes mirror existing project visual language: `text-muted`, `text-teal hover:text-tealDark`, `border hairline`, `eyebrow`. No new Tailwind tokens introduced. (NB: `border-hairline` referenced in the plan was corrected to `border hairline` — the existing CSS class pattern in the repo splits border + hairline as separate utility classes; verified against frontend/src/components/Input.tsx and Select.tsx.)"
  - "Test harness uses real useForm + zodResolver + quoteFormSchema; useFieldArray mutations flow through the real RHF state so assertions on formRef.getValues('visionRows') prove field-array semantics, not just DOM rendering."
metrics:
  duration: ~20 minutes
  completed_date: 2026-05-05
  tasks_completed: 3
  files_created: 2
  files_modified: 1
  tests_added: 5
  commits: 3
---

# Phase 6 Plan 03: Multi-vision picker UI + QuoteForm swap Summary

Built `VisionRowsField`, the first `useFieldArray` consumer in the repo, and swapped the Vision subsection of `QuoteForm.tsx` from two flat fields (`vision_type` Select + `vision_systems_count` Input) to a single `<VisionRowsField control={control} />` sub-block inside Section 03. Implements D-01 (UI half), D-02 (picker layout + empty state + Add), D-03 (Add/Remove only — no reorder), and D-04 (form-rendering half — flat fields no longer registered on the form). Closes the form-side of DATA-04. The 5 user-facing strings introduced are jargon-guard-clean and enumerated for the 06-04 jargon-guard extension. Build is intentionally not green project-wide — `MachineLearningQuoteTool.tsx`, `ComparisonQuote.tsx`, and `QuoteResultPanel.tsx` still type-fail against the deleted flat fields; 06-04 fixes those by swapping to `aggregateMultiVisionEstimate` (06-02).

## What Shipped

### VisionRowsField component (Task 1, commit `a0b2330`)

- New file: `frontend/src/pages/single-quote/VisionRowsField.tsx` (104 lines).
- Imports `useFieldArray, Controller, type Control` from `react-hook-form`; `Field`, `Input`, `Select` from `@/components/*`; `VISION_TYPES`, `QuoteFormValues`, `VisionRow` from `./schema`.
- Public signature: `export function VisionRowsField({ control }: { control: Control<QuoteFormValues> })`.
- `useFieldArray<QuoteFormValues, "visionRows">({ control, name: "visionRows" })` returns `{ fields, append, remove }`.
- Empty state: `<div className="text-sm text-muted">No vision systems on this project.</div>` rendered when `fields.length === 0`.
- Per-row layout: `grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-end` containing:
  - Field with `label={i === 0 ? "Vision type" : ""}` + `glossaryTerm="Vision Type"` wrapping a Controller-bound Select (`options={[...VISION_TYPES]}`, spread `{...field}`).
  - Field with `label={i === 0 ? "Count" : ""}` wrapping a Controller-bound number Input with explicit `Number(e.target.value)` coercion in `onChange` (z.coerce.number does not eagerly coerce).
  - Trash2-icon Remove button with `aria-label="Remove vision system"` calling `remove(i)`.
- Add button at bottom: Plus icon + literal text `Add vision system`, wired to `handleAdd` which calls `append({ type: "2D", count: 1 } as VisionRow)` per D-02.
- `key={row.id}` (NOT the array index) — `useFieldArray` manages stable ids across reorders, the documented canonical pattern.
- Per Claude's discretion (D-18): the optional `label` schema slot is NOT rendered as an input in v2.0 — keeps data entry simple per Ben's posture; the schema slot already ships from 06-01.

### QuoteForm.tsx swap (Task 2, commit `a129caf`)

- Imports `import { VisionRowsField } from "./VisionRowsField";` — placed in the local-relative-imports group below `./schema`, per CONVENTIONS.md import-organization rules.
- Section 03 grid (`grid grid-cols-1 md:grid-cols-3 gap-4`) now contains 6 fields: PLC family, HMI family, Panel count, Servo axes, Drive count, Pneumatic devices. The two flat Vision fields (`vision_type` Select on the original line 181-183 and `vision_systems_count` Input on line 196-198) are gone.
- A new sub-block sits AFTER the closing `</div>` of the grid but still INSIDE the same `<Section step="03" ...>`:
  ```tsx
  {/* Vision picker (Phase 6 D-02) — replaces the two flat fields. */}
  <div className="mt-4">
    <div className="eyebrow text-[10px] text-muted mb-2">Vision systems</div>
    <VisionRowsField control={control} />
  </div>
  ```
- `control` was already in scope (destructured from `form` at line 31) — no signature change needed.
- Sections 01, 02, 04, 05, 06 are untouched.

### Component test (Task 3, commit `3306be1`)

`frontend/src/pages/single-quote/__tests__/VisionRowsField.test.tsx` — 5 tests, all pass:

| # | Test | Asserts |
|---|------|---------|
| 1 | Empty state | "No vision systems on this project." renders, Add button present, no Remove buttons. |
| 2 | Add appends default | Click Add → empty-state copy disappears, exactly one Remove button now exists, `formRef.getValues("visionRows")` equals `[{type:"2D", count:1}]`. |
| 3 | Pre-populated + Remove by index | `[{2D×2}, {3D×1}]` renders 2 Remove buttons; click first → 1 remains; surviving form state is exactly `[{type:"3D", count:1}]`. |
| 4 | Add+Add+Remove leaves 1 row | Two clicks of Add then one Remove on the first → `getValues("visionRows").length === 1`. |
| 5 | Pre-populated row 0 type Select | Default `[{type:"3D", count:5}]` → `<select>` value is `"3D"`. |

The harness uses `useForm<QuoteFormValues>({ resolver: zodResolver(quoteFormSchema), defaultValues: { ...quoteFormDefaults, visionRows: defaultRows ?? [] }, mode: "onChange" })` and forwards `form.control` into `<VisionRowsField control={form.control} />`. An optional `exposeForm` callback gives tests a ref to the live `UseFormReturn` so `formRef.getValues("visionRows")` can prove that `useFieldArray` actually mutated the form state — not just the DOM. No mocking of `react-hook-form`. Run via `npx vitest run src/pages/single-quote/__tests__/VisionRowsField.test.tsx` exits 0; transient React Router future-flag warnings are emitted by the shared `renderWithProviders` (existing project posture).

## Files Created / Modified

| File | Status | Change |
|------|--------|--------|
| `frontend/src/pages/single-quote/VisionRowsField.tsx` | NEW | First useFieldArray consumer in the repo (104 lines). |
| `frontend/src/pages/single-quote/__tests__/VisionRowsField.test.tsx` | NEW | 5-test Vitest suite, all passing. |
| `frontend/src/pages/single-quote/QuoteForm.tsx` | MODIFIED | Imports `VisionRowsField`; flat `vision_type` / `vision_systems_count` fields removed; 'Vision systems' sub-block added inside Section 03 hosting `<VisionRowsField control={control} />`. |

## User-Facing Strings (for 06-04 jargon-guard extension)

Five strings introduced by this plan. All jargon-guard-clean (no "Pyodide", "P10/P50/P90", "R²", "gradient boosting", "confidence intervals", "delta from baseline", "uncertainty band", or any ML jargon). 06-04 will add explicit assertions for these:

| String | Where | Purpose |
|--------|-------|---------|
| `Vision type` | Field label, row 0 only | Header label above the type Select column |
| `Count` | Field label, row 0 only | Header label above the count Input column |
| `No vision systems on this project.` | Empty-state line | Renders when fields.length === 0 |
| `Remove vision system` | Button aria-label | Trash2-icon Remove button per row |
| `Add vision system` | Button text | Plus-icon Add button below the rows |

A sixth string `Vision systems` appears in the 03-Section eyebrow above the picker — not introduced by VisionRowsField itself but added in the QuoteForm swap. 06-04 jargon-guard should also scan this.

## Note for Plan 06-04 (Build Health)

By design, this plan does NOT leave the project-wide `npx tsc --noEmit` green. Rule-of-art deletions cascade:

- `MachineLearningQuoteTool.tsx::handleSubmit` — currently builds the predict input from `transformToQuoteInput(values)` and passes it to `predictQuote` directly. Plan 06-01 stripped the flat vision keys from `transformToQuoteInput`, so the QuoteInput shape no longer carries `vision_type` / `vision_systems_count`. Plan 06-04 swaps to `aggregateMultiVisionEstimate(...)` from 06-02 (which overlays per-call vision shape internally) and populates `inputForMatching` with the legacy-compat shadow `{vision_type: visionRows[0]?.type ?? "None", vision_systems_count: sum(row.count)}` for `nearestK` distance reads.
- `ComparisonQuote.tsx::handleSubmit` — same delta as above; mirror.
- `QuoteResultPanel.tsx:235, 240` — inputs-echo block currently references `v.vision_type` and `v.vision_systems_count`. Plan 06-04 replaces with a single "Vision systems" row driven by `formatVisionSystems(visionRows)`.

The plan-level verification block in 06-03-PLAN.md only requires `VisionRowsField.tsx` and `QuoteForm.tsx` to typecheck cleanly in isolation — both do (`npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(VisionRowsField|QuoteForm)\.tsx"` returned zero hits). The cascading errors are tracked under 06-04's scope and are documented in 06-01-SUMMARY.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tailwind utility class corrected: `border-hairline` → `border hairline`**
- **Found during:** Task 1 (after writing the initial code skeleton verbatim from the plan).
- **Issue:** The plan skeleton used `border border-hairline` for the Remove button border. The repo's existing primitives (`Input.tsx`, `Select.tsx`) use a different idiom: `border hairline` (two separate utility classes — `border` for the 1px border + `hairline` for the project's hairline-color custom class). The hyphenated `border-hairline` would not match any defined Tailwind/project utility and would render as a no-op.
- **Fix:** Changed `border border-hairline` to `border hairline` to match `Input.tsx:11` and `Select.tsx:18` precedent (`"w-full rounded-sm border hairline bg-surface"`). VersionHistoryList.tsx also uses `border-b hairline` — same idiom.
- **Files modified:** `frontend/src/pages/single-quote/VisionRowsField.tsx` (one className).
- **Commit:** Folded into Task 1's commit `a0b2330`.

No other deviations. No architectural changes. No checkpoints required.

## Acceptance Criteria — All Met

### Task 1
- ✅ `frontend/src/pages/single-quote/VisionRowsField.tsx` exists.
- ✅ Contains `import { Controller, useFieldArray, type Control } from "react-hook-form";` exactly once.
- ✅ Contains `useFieldArray<QuoteFormValues, "visionRows">` exactly once.
- ✅ Contains `Add vision system` exactly once (button text).
- ✅ Contains `aria-label="Remove vision system"` exactly once.
- ✅ Contains `No vision systems on this project.` exactly once.
- ✅ `append(newRow)` semantically calls `{ type: "2D", count: 1 }` (D-02) — `const newRow: VisionRow = { type: "2D", count: 1 }; append(newRow);`.
- ✅ `npx tsc --noEmit` reports no errors in VisionRowsField.tsx.

### Task 2
- ✅ `QuoteForm.tsx` contains `import { VisionRowsField } from "./VisionRowsField";` exactly once.
- ✅ `QuoteForm.tsx` contains `<VisionRowsField control={control} />` exactly once.
- ✅ Zero `register("vision_type")` / `register("vision_systems_count")` occurrences (verified: `grep -c -E 'register\(.vision_(type|systems_count).\)' src/pages/single-quote/QuoteForm.tsx` returned 0).
- ✅ "Vision systems" eyebrow label is present (verified at line 198).
- ✅ `npx tsc --noEmit` reports no errors in QuoteForm.tsx.

### Task 3
- ✅ Test file exists.
- ✅ Contains `import { useForm, type UseFormReturn } from "react-hook-form";` (real useForm harness — not mocked).
- ✅ Contains 5 `it(` blocks (one over the plan's >=5 floor).
- ✅ Tests 2, 3, 4 assert `formRef!.getValues("visionRows")` to verify useFieldArray mutates real form state, not just DOM.
- ✅ Test 1, 3, 4 use `screen.getAllByRole("button", { name: /remove vision system/i })`.
- ✅ `npx vitest run src/pages/single-quote/__tests__/VisionRowsField.test.tsx` exits 0 (5 passed).

### Plan-level verification
- ✅ `grep "useFieldArray" src/pages/single-quote/VisionRowsField.tsx` returns 3 matches (>=1 required).
- ✅ `grep "VisionRowsField" src/pages/single-quote/QuoteForm.tsx` returns 2 matches (>=2 required for import + render).
- ✅ `grep -c -E 'register\(.vision_(type|systems_count).\)' src/pages/single-quote/QuoteForm.tsx` returns 0.
- ✅ Component test exits 0.
- ✅ `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(VisionRowsField|QuoteForm)\.tsx"` returns no hits.

## Self-Check: PASSED

- Files created exist:
  - `frontend/src/pages/single-quote/VisionRowsField.tsx` ✅
  - `frontend/src/pages/single-quote/__tests__/VisionRowsField.test.tsx` ✅
- File modified exists with required content:
  - `frontend/src/pages/single-quote/QuoteForm.tsx` ✅ (contains `VisionRowsField` x2, no `register("vision_type")`, no `register("vision_systems_count")`).
- Commits exist (verifiable via `git log --oneline | grep '06-03'`):
  - `a0b2330` feat(06-03): add VisionRowsField multi-row picker
  - `a129caf` feat(06-03): swap QuoteForm Vision subsection to VisionRowsField
  - `3306be1` test(06-03): VisionRowsField component test (real useForm harness)
- All 5 tests pass.
- TypeScript: zero errors in `VisionRowsField.tsx` and `QuoteForm.tsx` (the two files this plan owns).
