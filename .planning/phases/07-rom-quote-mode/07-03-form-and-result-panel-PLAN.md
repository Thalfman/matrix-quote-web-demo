---
phase: 07
plan: 03
type: execute
wave: 2
depends_on:
  - "07-01"
  - "07-02"
files_modified:
  - frontend/src/pages/single-quote/RomForm.tsx
  - frontend/src/pages/single-quote/RomForm.test.tsx
  - frontend/src/components/quote/RomResultPanel.tsx
  - frontend/src/components/quote/RomResultPanel.test.tsx
autonomous: true
requirements:
  - ROM-01
  - ROM-02
specialists:
  - frontend-specialist
  - ui-ux-specialist
  - test-writer
must_haves:
  truths:
    - "<RomForm /> renders exactly THREE Selects (industry_segment, system_category, automation_level) plus ONE currency input (estimated_materials_cost) — no other fields are reachable through the UI (D-02)."
    - "RomForm's submit button is disabled until all four required fields are filled and material cost > 0; once enabled, the button label is 'Compute ROM estimate' (D-12 + Copywriting Contract verbatim)."
    - "When the user types a non-positive material cost and submits, the form shows the inline error 'Enter a material cost greater than zero.' (D-16 verbatim)."
    - "The materials-cost field shows helper text 'In US dollars. Even a rough number will do.' (Copywriting Contract verbatim)."
    - "<RomResultPanel /> renders the hero card with <RomBadge /> (NOT a CONFIDENCE_LABEL chip — D-08)."
    - "<RomResultPanel /> renders the 'Why this is preliminary' card with the verbatim D-13 body copy."
    - "<RomResultPanel /> renders a single combined-totals row '{salesBucket}: {hours} hrs · range {low}–{high}' INSTEAD of the per-category H/M/L breakdown (D-06)."
    - "When `rom.sanityFlag === true`, RomResultPanel renders the verbatim D-15 banner: 'This early estimate is unusually wide. Fill in a full quote when you have more details — it will give a tighter range.'"
    - "<RomResultPanel /> renders the SaveQuoteButton with `mode='rom'` so the saved record carries the ROM flag (D-19)."
    - "<RomResultPanel /> does NOT render the per-category H/M/L breakdown, the top-drivers card, OR the per-vision contributions section (D-06 HIDDEN list)."
    - "RomResultPanel.test.tsx contains a side-by-side test rendering both <QuoteResultPanel /> and <RomResultPanel /> with equivalent inputs and asserting only the ROM render contains 'Preliminary' + 'Why this is preliminary' (SC-3 grep-verifiable)."
  artifacts:
    - path: "frontend/src/pages/single-quote/RomForm.tsx"
      provides: "4-field react-hook-form + zod form, calls estimateRom on submit"
      contains: "export function RomForm"
    - path: "frontend/src/pages/single-quote/RomForm.test.tsx"
      provides: "form validation tests + submit-disabled tests + onSubmit-fires-with-coerced-values tests"
      contains: "RomForm"
    - path: "frontend/src/components/quote/RomResultPanel.tsx"
      provides: "ROM-mode result chrome (hero + RomBadge + Why-preliminary + sanity banner + combined totals + supporting matches + Save quote ROM)"
      contains: "export function RomResultPanel"
    - path: "frontend/src/components/quote/RomResultPanel.test.tsx"
      provides: "Render tests for hero badge, Why-preliminary card, sanity banner, hidden sections (top drivers / per-category H/M/L / per-vision), AND a side-by-side SC-3 differential render test"
      contains: "RomResultPanel"
  key_links:
    - from: "frontend/src/pages/single-quote/RomForm.tsx"
      to: "frontend/src/demo/romEstimator.ts"
      via: "estimateRom() invocation in onSubmit"
      pattern: "estimateRom\\("
    - from: "frontend/src/components/quote/RomResultPanel.tsx"
      to: "frontend/src/components/quote/RomBadge.tsx"
      via: "<RomBadge /> rendered in hero card chip slot"
      pattern: "<RomBadge"
    - from: "frontend/src/components/quote/RomResultPanel.tsx"
      to: "frontend/src/components/quote/SaveQuoteButton.tsx"
      via: "<SaveQuoteButton mode='rom' ... />"
      pattern: "mode=\"rom\""
---

<objective>
Compose the two ROM-specific UI surfaces from the Wave-1 primitives:
- `RomForm` — the 4-field react-hook-form + zod form (D-02). On submit, hands the validated `RomFormValues` to a parent-supplied `onSubmit` callback (the page handlers in Plan 07-04 own the `estimateRom` invocation, the formRef, and the result state — same pattern as ComparisonQuote / QuoteForm split).
- `RomResultPanel` — a sibling of `QuoteResultPanel` (NOT a fork) that renders the ROM-mode chrome: hero card with `<RomBadge />`, the "Why this is preliminary" explanatory card, the optional sanity-check banner, the combined-totals row (replaces per-category H/M/L), the supporting-matches card (unchanged), and the Save quote button threaded with `mode="rom"`. Per-category H/M/L drilldown, top-drivers card, and per-vision contributions are HIDDEN (D-06).

Purpose: this plan satisfies SC-1 (a ROM-mode workflow that produces an estimate from material cost only), the customer-facing half of SC-2 (the result is "labeled as preliminary in plain non-ML language" via the badge + the explanatory card), and the chrome half of SC-3 (a non-technical reviewer can tell ROM vs full apart at a glance because the hero badge, the Why-preliminary card, and the absent H/M/L drilldown are all visible differences). SC-4 round-trip is wired up in Plan 07-05.

Output: 2 NEW components + 2 NEW component tests = 4 file touches, 0 modified files. Wave 2 because both files import from Plan 07-01 (RomBadge, romFormSchema) and Plan 07-02 (estimateRom) — no parallel risk.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/07-rom-quote-mode/07-UI-SPEC.md
@.planning/phases/07-rom-quote-mode/07-01-schema-and-primitives-PLAN.md
@.planning/phases/07-rom-quote-mode/07-02-rom-estimator-PLAN.md

<interfaces>
<!-- Key contracts the executor needs. Verified against the live codebase 2026-05-06. -->

From frontend/src/pages/single-quote/romSchema.ts (NEW from Plan 07-01):
```typescript
export const romFormSchema: z.ZodObject<...>;
export const romFormDefaults: RomFormValues;
export type RomFormValues;
export function toQuoteFormValues(rom: RomFormValues): QuoteFormValues;
```

From frontend/src/demo/romEstimator.ts (NEW from Plan 07-02):
```typescript
export const ROM_BAND_MULTIPLIER: 1.75;
export const ROM_BASELINE_RATE_HOURS_PER_DOLLAR: 0.0008;

export interface RomMetadata {
  mode: "rom";
  bandMultiplier: number;
  baselineRate: number;
  sanityFlag: boolean;
}

export interface EstimateRomArgs {
  romValues: RomFormValues;
  dataset: Dataset;
  metrics: Record<string, ModelMetric>;
  supportingPool: ProjectRecord[];
  supportingLabel: string;
}

export interface EstimateRomResult {
  result: UnifiedQuoteResult;
  rom: RomMetadata;
  formValues: QuoteFormValues;
}

export async function estimateRom(args: EstimateRomArgs): Promise<EstimateRomResult>;
```

From frontend/src/components/quote/RomBadge.tsx (NEW from Plan 07-01):
```typescript
export function RomBadge(): JSX.Element; // no props
```

From frontend/src/components/quote/SaveQuoteButton.tsx (MODIFIED in Plan 07-01):
```typescript
export interface SaveQuoteButtonProps {
  workspace: Workspace;
  formValues: QuoteFormValues;
  unifiedResult: UnifiedQuoteResult;
  quoteId?: string;
  existingName?: string;
  status?: WorkflowStatus;
  restoredFromVersion?: number;
  compareInputs?: { humanQuotedByBucket: Record<string, number> };
  variant?: "primary" | "compact";
  mode?: QuoteMode; // <-- NEW from Plan 07-01
}
```

From frontend/src/components/Field.tsx (the canonical form-field primitive — verified live 2026-05-06):
```typescript
export function Field({
  label: string,
  hint?: string,
  error?: string,
  glossaryTerm?: string,
  children: ReactNode,
  className?: string,
}): JSX.Element;
```

From frontend/src/components/Select.tsx (the canonical select primitive — verified live 2026-05-06):
```typescript
type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  options: string[];
  placeholder?: string;
};
export const Select: forwardRef<HTMLSelectElement, Props>;
```

QuoteForm.tsx (line 6, 9) imports them as:
```typescript
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
```

These are the ONLY correct paths — there is no `@/pages/single-quote/Field` or `@/pages/single-quote/Select` module. RomForm MUST use the same imports.

From frontend/src/components/quote/QuoteResultPanel.tsx (full file already read in context — line 1-388; the visual contract being mirrored).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create RomForm.tsx — 4-field react-hook-form + zod form</name>
  <files>frontend/src/pages/single-quote/RomForm.tsx</files>

  <read_first>
    - frontend/src/pages/single-quote/QuoteForm.tsx (full file — the structural pattern. The same `Field` / `Select` primitives must be reused; do NOT introduce new form-field components.)
    - frontend/src/components/Field.tsx (full file — the live `Field` primitive that QuoteForm imports from `@/components/Field`. Pay attention to the `label`, `hint`, `error`, `glossaryTerm`, `children` props.)
    - frontend/src/components/Select.tsx (full file — the live `Select` primitive that QuoteForm imports from `@/components/Select`. It is `forwardRef<HTMLSelectElement, SelectHTMLAttributes & { options: string[]; placeholder?: string }>`.)
    - frontend/src/pages/single-quote/schema.ts (full file — quoteFormDefaults source for dropdown options; understanding `transformToQuoteInput`'s coercion rules)
    - frontend/src/pages/single-quote/romSchema.ts (NEW from Plan 07-01)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-02 + D-12 + D-16 + Copywriting Contract verbatim + RomForm anatomy at line 241-273)
  </read_first>

  <action>
    Create `frontend/src/pages/single-quote/RomForm.tsx`. This component is structured exactly like `QuoteForm` — controlled-by-parent (parent owns the `formRef`, the `form` instance, the dropdowns, and the onSubmit handler). The signature mirrors QuoteForm so the page handlers can pattern-match.

    **VERIFIED imports (live codebase 2026-05-06):** `Field` and `Select` live at `@/components/Field` and `@/components/Select`. QuoteForm.tsx lines 6 and 9 import them from there. There is NO `@/pages/single-quote/Field` or `@/pages/single-quote/Select` module. RomForm MUST use the same imports as QuoteForm.

    ```typescript
    /**
     * Phase 7 — D-02. ROM-mode form (3 Selects + 1 currency input).
     *
     * Pattern-mirrors QuoteForm: parent owns formRef, the useForm instance,
     * the dropdowns, and the onSubmit handler. RomForm is a presentational
     * field-cluster.
     *
     * Uses the same Field / Select primitives as QuoteForm — reuse, don't
     * fork. The four fields: industry_segment, system_category, automation_level
     * (D-02 required categorical trio), and estimated_materials_cost (D-02
     * required currency input, > 0).
     *
     * No advanced disclosure, no hidden fields, no "Show more" affordance —
     * D-02 forbids them. The SE who needs more fields uses the full Single
     * Quote tab.
     */
    import type { RefObject } from "react";
    import type { UseFormReturn } from "react-hook-form";

    import { Field } from "@/components/Field";
    import { Select } from "@/components/Select";
    import type { RomFormValues } from "@/pages/single-quote/romSchema";

    export interface RomFormProps {
      formRef: RefObject<HTMLFormElement>;
      form: UseFormReturn<RomFormValues>;
      dropdowns?: {
        industry_segment: string[];
        system_category: string[];
        automation_level: string[];
      };
      onSubmit: () => void;
      submitting: boolean;
    }

    export function RomForm({
      formRef,
      form,
      dropdowns,
      onSubmit,
      submitting,
    }: RomFormProps) {
      const {
        register,
        formState: { errors, isValid },
      } = form;

      const ready = Boolean(dropdowns);

      return (
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(() => onSubmit())}
          className="card p-6 space-y-5"
          aria-label="ROM quote form"
        >
          <div className="eyebrow text-xs text-muted">Project basics</div>

          <Field
            label="Industry segment"
            error={errors.industry_segment?.message}
          >
            <Select
              {...register("industry_segment")}
              options={dropdowns?.industry_segment ?? []}
              required
            />
          </Field>

          <Field
            label="System category"
            error={errors.system_category?.message}
          >
            <Select
              {...register("system_category")}
              options={dropdowns?.system_category ?? []}
              required
            />
          </Field>

          <Field
            label="Automation level"
            error={errors.automation_level?.message}
          >
            <Select
              {...register("automation_level")}
              options={dropdowns?.automation_level ?? []}
              required
            />
          </Field>

          <Field
            label="Estimated materials cost"
            error={errors.estimated_materials_cost?.message}
            hint="In US dollars. Even a rough number will do."
          >
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              {...register("estimated_materials_cost", { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm border rounded-sm border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              aria-label="Estimated materials cost in US dollars"
            />
          </Field>

          <button
            type="submit"
            disabled={!ready || submitting || !isValid}
            className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-teal text-white font-medium px-4 py-2.5 text-sm hover:bg-tealDark transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          >
            Compute ROM estimate
          </button>
          {(!ready || !isValid) && (
            <div className="text-xs text-muted text-center">
              Fill in the four fields above to enable.
            </div>
          )}
        </form>
      );
    }
    ```

    NOTE on `isValid`: react-hook-form's `formState.isValid` is computed lazily; the resolver runs onBlur per `mode: "onBlur"` in the parent useForm. If `isValid` is unreliable in the parent's mode setting, use a manual computed gate: `dropdowns && form.watch("industry_segment") && form.watch("system_category") && form.watch("automation_level") && Number(form.watch("estimated_materials_cost")) > 0`.
  </action>

  <verify>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/pages/single-quote/RomForm.tsx` exists.
    - File contains `export function RomForm`.
    - File contains the literal import line `import { Field } from "@/components/Field";` (verified path; NOT `@/pages/single-quote/Field`).
    - File contains the literal import line `import { Select } from "@/components/Select";` (verified path; NOT `@/pages/single-quote/Select`).
    - File contains exactly THREE `<Select` element references (industry_segment / system_category / automation_level).
    - File contains exactly ONE `register("estimated_materials_cost"` reference.
    - File does NOT contain `register("stations_count"` (or any other QuoteFormValues field name beyond the four locked in D-02).
    - File contains the literal string `Project basics`.
    - File contains the literal string `Compute ROM estimate` (D-02 / Copywriting Contract verbatim).
    - File contains the literal string `In US dollars. Even a rough number will do.` (Copywriting Contract verbatim).
    - File contains the literal string `Fill in the four fields above to enable.` (D-12 verbatim).
    - File contains the literal string `Estimated materials cost` (the field label).
    - File does NOT contain `disclosure` / `Show more` / `Advanced` / `accordion` strings (D-02 forbids advanced disclosure).
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    RomForm.tsx exists with exactly the four locked fields, the locked submit button label, and the locked helper/hint copy. Reuses Field/Select primitives from `@/components/Field` and `@/components/Select` (verified live paths). typecheck + lint clean.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write RomForm.test.tsx — validation, submit-disabled, error-state, valueAsNumber coercion</name>
  <files>frontend/src/pages/single-quote/RomForm.test.tsx</files>

  <read_first>
    - frontend/src/pages/single-quote/RomForm.tsx (just-created in Task 1)
    - frontend/src/pages/single-quote/QuoteForm.test.tsx (if exists — same pattern for setting up the parent form harness)
    - frontend/src/test/jargon-guard.test.tsx (the VisionRowsHarness pattern at line 367-379 — useForm + zodResolver harness for testing field-cluster components in isolation)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-02 + D-12 + D-16)
  </read_first>

  <behavior>
    - Test (D-12 disabled-on-load): mount RomForm with empty defaults and dropdowns provided. Submit button is disabled. The "Fill in the four fields above to enable." hint is visible.
    - Test (D-12 enables on completion): user types valid values into all four fields. Submit button becomes enabled. Hint disappears.
    - Test (D-16 zero materials cost): user fills the three Selects + types `0` into materials cost + clicks submit. Form shows error message "Enter a material cost greater than zero." (D-16 verbatim). onSubmit callback is NOT invoked.
    - Test (D-16 negative materials cost): user types `-100` and submits. Same error.
    - Test (D-02 only four fields): the rendered DOM contains 0 inputs for stations_count / robot_count / panel_count / vision systems / etc. Concretely, query `form.querySelectorAll('input[name], select[name]')` and assert length === 4 (the three Selects + the materials_cost input).
    - Test (valueAsNumber coercion): user types `245000` into materials cost. The `form.getValues().estimated_materials_cost` is the number 245000, NOT the string "245000".
    - Test (onSubmit fires with valid values): user fills all four fields validly, clicks submit. The parent's onSubmit prop is called exactly once.
    - Test (jargon-guard local): rendered text contains no BANNED_TOKENS regex match.
  </behavior>

  <action>
    Create `frontend/src/pages/single-quote/RomForm.test.tsx`. Use the harness pattern from `jargon-guard.test.tsx:367-379`:

    ```typescript
    import { describe, expect, it, vi } from "vitest";
    import { fireEvent, screen, waitFor } from "@testing-library/react";
    import userEvent from "@testing-library/user-event";
    import { useForm } from "react-hook-form";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { useRef } from "react";

    import { renderWithProviders } from "@/test/render";
    import { BANNED_TOKENS } from "@/test/jargon";
    import { RomForm } from "@/pages/single-quote/RomForm";
    import {
      romFormDefaults,
      romFormSchema,
      type RomFormValues,
    } from "@/pages/single-quote/romSchema";

    function Harness({ onSubmit, dropdowns }: {
      onSubmit?: (values: RomFormValues) => void;
      dropdowns?: { industry_segment: string[]; system_category: string[]; automation_level: string[] };
    }) {
      const form = useForm<RomFormValues>({
        resolver: zodResolver(romFormSchema),
        defaultValues: romFormDefaults,
        mode: "onChange", // make isValid recompute eagerly so the disabled-state assertion is deterministic
      });
      const formRef = useRef<HTMLFormElement>(null);
      return (
        <RomForm
          formRef={formRef}
          form={form}
          dropdowns={dropdowns ?? {
            industry_segment: ["Automotive", "Food & Bev"],
            system_category: ["Robotic Cell", "Welding"],
            automation_level: ["Semi-Auto", "Full-Auto"],
          }}
          onSubmit={() => {
            const values = form.getValues();
            onSubmit?.(values);
          }}
          submitting={false}
        />
      );
    }

    describe("RomForm", () => {
      it("disables submit on initial load (D-12)", () => {
        renderWithProviders(<Harness />);
        const button = screen.getByRole("button", { name: /compute rom estimate/i });
        expect(button).toBeDisabled();
        expect(screen.getByText(/fill in the four fields above to enable/i)).toBeInTheDocument();
      });

      it("enables submit when all four fields are valid", async () => {
        const user = userEvent.setup();
        renderWithProviders(<Harness />);
        // Fill three selects
        await user.selectOptions(screen.getByLabelText(/industry segment/i), "Automotive");
        await user.selectOptions(screen.getByLabelText(/system category/i), "Robotic Cell");
        await user.selectOptions(screen.getByLabelText(/automation level/i), "Semi-Auto");
        // Fill currency
        await user.type(screen.getByLabelText(/estimated materials cost/i), "245000");
        // Trigger validation
        await waitFor(() => {
          const button = screen.getByRole("button", { name: /compute rom estimate/i });
          expect(button).not.toBeDisabled();
        });
      });

      it("shows D-16 error 'Enter a material cost greater than zero.' on zero materials cost", async () => {
        const user = userEvent.setup();
        renderWithProviders(<Harness />);
        await user.selectOptions(screen.getByLabelText(/industry segment/i), "Automotive");
        await user.selectOptions(screen.getByLabelText(/system category/i), "Robotic Cell");
        await user.selectOptions(screen.getByLabelText(/automation level/i), "Semi-Auto");
        // Leave materials cost at 0 → invalid
        const button = screen.getByRole("button", { name: /compute rom estimate/i });
        // Force-submit via fireEvent because the disabled state may block click
        fireEvent.submit(button.closest("form")!);
        await waitFor(() => {
          expect(
            screen.getByText("Enter a material cost greater than zero."),
          ).toBeInTheDocument();
        });
      });

      it("rejects negative materials cost with the same D-16 error", async () => {
        const user = userEvent.setup();
        renderWithProviders(<Harness />);
        await user.selectOptions(screen.getByLabelText(/industry segment/i), "Automotive");
        await user.selectOptions(screen.getByLabelText(/system category/i), "Robotic Cell");
        await user.selectOptions(screen.getByLabelText(/automation level/i), "Semi-Auto");
        await user.type(screen.getByLabelText(/estimated materials cost/i), "-100");
        const button = screen.getByRole("button", { name: /compute rom estimate/i });
        fireEvent.submit(button.closest("form")!);
        await waitFor(() => {
          expect(
            screen.getByText("Enter a material cost greater than zero."),
          ).toBeInTheDocument();
        });
      });

      it("renders ONLY four form inputs/selects (D-02 — no hidden fields)", () => {
        renderWithProviders(<Harness />);
        const fields = document.querySelectorAll("form input[name], form select[name]");
        expect(fields).toHaveLength(4);
      });

      it("coerces materials cost to a number via valueAsNumber", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        renderWithProviders(<Harness onSubmit={onSubmit} />);
        await user.selectOptions(screen.getByLabelText(/industry segment/i), "Automotive");
        await user.selectOptions(screen.getByLabelText(/system category/i), "Robotic Cell");
        await user.selectOptions(screen.getByLabelText(/automation level/i), "Semi-Auto");
        await user.type(screen.getByLabelText(/estimated materials cost/i), "245000");
        const button = screen.getByRole("button", { name: /compute rom estimate/i });
        await waitFor(() => expect(button).not.toBeDisabled());
        await user.click(button);
        await waitFor(() => {
          expect(onSubmit).toHaveBeenCalledTimes(1);
          const payload = onSubmit.mock.calls[0][0] as RomFormValues;
          expect(typeof payload.estimated_materials_cost).toBe("number");
          expect(payload.estimated_materials_cost).toBe(245000);
        });
      });

      it("renders no banned ML-jargon tokens (DATA-03)", () => {
        renderWithProviders(<Harness />);
        const body = document.body.textContent ?? "";
        for (const re of BANNED_TOKENS) {
          expect(body, `[jargon-guard] RomForm: ${re}`).not.toMatch(re);
        }
      });
    });
    ```
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/pages/single-quote/RomForm.test.tsx</automated>
    <automated>cd frontend && npm run typecheck</automated>
  </verify>

  <acceptance_criteria>
    - File `frontend/src/pages/single-quote/RomForm.test.tsx` exists with at least 7 `it(` blocks.
    - File contains `expect(\n            screen.getByText("Enter a material cost greater than zero.")` (D-16 verbatim assertion).
    - File contains `expect(fields).toHaveLength(4)` (D-02 four-fields invariant).
    - File contains `expect(typeof payload.estimated_materials_cost).toBe("number")` (valueAsNumber assertion).
    - `cd frontend && npm run test -- --run src/pages/single-quote/RomForm.test.tsx` exits 0.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    7 test cases pass, covering disabled state, enabling on completion, D-16 error verbatim, four-field invariant, valueAsNumber coercion, onSubmit firing, jargon-guard local scan.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create RomResultPanel.tsx — ROM-mode result chrome (hero + Why-preliminary + sanity banner + combined totals + Save quote)</name>
  <files>frontend/src/components/quote/RomResultPanel.tsx</files>

  <read_first>
    - frontend/src/components/quote/QuoteResultPanel.tsx (full file — line 1-388, the chrome being mirrored selectively per D-06)
    - frontend/src/components/quote/RomBadge.tsx (NEW from Plan 07-01)
    - frontend/src/components/quote/SaveQuoteButton.tsx (MODIFIED in Plan 07-01 to accept mode prop)
    - frontend/src/demo/romEstimator.ts (NEW from Plan 07-02 — RomMetadata type)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-06 REMAIN/REPLACE/HIDDEN list + D-13 verbatim copy + D-15 sanity banner copy + RomResultPanel anatomy at line 275-350)
  </read_first>

  <action>
    Create `frontend/src/components/quote/RomResultPanel.tsx`:

    ```typescript
    /**
     * Phase 7 — D-06 / D-08 / D-13 / D-15. ROM-mode result panel.
     *
     * Sibling of QuoteResultPanel (NOT a fork — UI-SPEC §"Component Map").
     * Renders ROM-flavored chrome:
     *   - Your inputs recap (only the four ROM fields surface visibly)
     *   - Hero estimate with <RomBadge /> instead of CONFIDENCE_LABEL chip (D-08)
     *   - "Why this is preliminary" explanatory card (D-13 verbatim copy)
     *   - Optional sanity-check banner when rom.sanityFlag === true (D-15)
     *   - Combined-totals row (D-06: replaces per-category H/M/L)
     *   - Supporting matches (REMAIN — same as QuoteResultPanel)
     *   - Save quote button with mode="rom" (D-19)
     *   - Export PDF button (REMAIN secondary)
     *
     * HIDDEN (D-06): top-drivers card, per-category H/M/L breakdown,
     * per-vision contributions section. Confidence chip in hero (D-08).
     */
    import { Download, Info } from "lucide-react";

    import { RomBadge } from "@/components/quote/RomBadge";
    import { SaveQuoteButton } from "@/components/quote/SaveQuoteButton";
    import type { UnifiedQuoteResult } from "@/demo/quoteResult";
    import type { RomMetadata } from "@/demo/romEstimator";
    import { deriveSalesBucket } from "@/lib/savedQuoteSchema";
    import type { QuoteFormValues } from "@/pages/single-quote/schema";

    // ---------------------------------------------------------------------------
    // Verbatim D-13 copy. Pinned to a constant so the jargon-guard test (Plan
    // 07-05 Task X) and any future code-search scan reads it from one source.
    // ---------------------------------------------------------------------------
    export const WHY_PRELIMINARY_COPY =
      "This is a quick early estimate based only on materials cost and the project type. The hours range is wider than a full quote because it does not yet reflect station counts, robotics, vision systems, or other engineering-hour-driving inputs.";

    // ---------------------------------------------------------------------------
    // Verbatim D-15 copy.
    // ---------------------------------------------------------------------------
    export const SANITY_BANNER_COPY =
      "This early estimate is unusually wide. Fill in a full quote when you have more details — it will give a tighter range.";

    // ---------------------------------------------------------------------------
    // Formatters
    // ---------------------------------------------------------------------------
    function fmtHrs(n: number): string {
      return Math.round(n).toLocaleString();
    }

    function fmtMoney(n: number): string {
      if (!Number.isFinite(n) || n <= 0) return "—";
      return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }

    // ---------------------------------------------------------------------------
    // Component
    // ---------------------------------------------------------------------------

    export interface RomResultPanelProps {
      result: UnifiedQuoteResult;
      input: QuoteFormValues;
      rom: RomMetadata;
      workspace?: "real" | "synthetic";
      quoteId?: string;
      existingName?: string;
      status?: "draft" | "sent" | "won" | "lost" | "revised";
    }

    export function RomResultPanel({
      result,
      input,
      rom,
      workspace,
      quoteId,
      existingName,
      status,
    }: RomResultPanelProps) {
      const salesBucket = deriveSalesBucket(input);

      return (
        <div className="space-y-6" id="quote-results">
          {/* Your inputs — only the four ROM fields */}
          <div className="card p-5">
            <div className="eyebrow text-[10px] text-muted mb-3">Your inputs</div>
            <RomInputsRecap input={input} />
          </div>

          {/* Hero — RomBadge instead of confidence chip (D-08) */}
          <div className="card p-6">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow text-xs text-muted">Estimated hours</span>
              <RomBadge />
            </div>
            <div className="display-hero text-4xl text-ink tnum mt-2">
              {fmtHrs(result.estimateHours)} hrs
            </div>
            <div className="text-sm text-muted mt-1">
              Likely range {fmtHrs(result.likelyRangeLow)}–{fmtHrs(result.likelyRangeHigh)} hrs
            </div>
          </div>

          {/* "Why this is preliminary" card (D-13) — REPLACES top drivers */}
          <div className="card p-5 flex items-start gap-3">
            <Info size={16} strokeWidth={1.75} className="text-muted shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="eyebrow text-xs text-muted mb-1">Why this is preliminary</div>
              <p className="text-sm text-ink">{WHY_PRELIMINARY_COPY}</p>
            </div>
          </div>

          {/* Sanity-check banner — only when divergence > 5× (D-15) */}
          {rom.sanityFlag && (
            <div className="card p-4 text-sm text-ink" role="status">
              {SANITY_BANNER_COPY}
            </div>
          )}

          {/* Combined-totals row — REPLACES per-category H/M/L (D-06) */}
          <div className="card p-5">
            <div className="eyebrow text-xs text-muted mb-3">Hours by work category</div>
            <div className="text-sm text-ink">
              <span className="font-medium">{salesBucket}</span>:{" "}
              <span className="tnum">{fmtHrs(result.estimateHours)}</span> hrs · range{" "}
              <span className="tnum">{fmtHrs(result.likelyRangeLow)}</span>–
              <span className="tnum">{fmtHrs(result.likelyRangeHigh)}</span>
            </div>
          </div>

          {/* Supporting matches — REMAIN unchanged */}
          <div className="card p-5">
            <div className="eyebrow text-xs text-muted mb-3">
              {result.supportingMatches.label}
            </div>
            <div className="space-y-2">
              {result.supportingMatches.items.map((m) => (
                <div
                  key={m.projectId}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate text-ink">{m.projectName}</span>
                  <span className="text-sm text-muted mono shrink-0">
                    {fmtHrs(m.actualHours)} hrs · {(m.similarity * 100).toFixed(0)}% match
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Save quote — threaded with mode="rom" (D-19) */}
          {workspace && (
            <SaveQuoteButton
              workspace={workspace}
              formValues={input}
              unifiedResult={result}
              quoteId={quoteId}
              existingName={existingName}
              status={status}
              mode="rom"
              variant="primary"
            />
          )}

          {/* Export PDF — REMAIN secondary */}
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-paper text-ink text-sm font-medium rounded-sm border hairline hover:bg-line/40 transition-colors"
          >
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            Export PDF
          </button>
        </div>
      );
    }

    // ---------------------------------------------------------------------------
    // RomInputsRecap — only the four ROM fields (UI-SPEC §"`RomInputsRecap`")
    // ---------------------------------------------------------------------------
    function RomInputsRecap({ input }: { input: QuoteFormValues }) {
      const rows: Array<[string, string]> = [
        ["Industry segment", input.industry_segment || "—"],
        ["System category", input.system_category || "—"],
        ["Automation level", input.automation_level || "—"],
        ["Estimated materials cost", fmtMoney(input.estimated_materials_cost)],
      ];
      return (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted truncate">{label}</dt>
              <dd className="text-ink tnum text-right truncate">{value}</dd>
            </div>
          ))}
        </dl>
      );
    }
    ```
  </action>

  <verify>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/components/quote/RomResultPanel.tsx` exists.
    - File contains `export function RomResultPanel`.
    - File contains `<RomBadge />` (in the hero card chip slot — D-08).
    - File contains `mode="rom"` (the SaveQuoteButton wiring — D-19).
    - File contains the verbatim D-13 string `This is a quick early estimate based only on materials cost and the project type. The hours range is wider than a full quote because it does not yet reflect station counts, robotics, vision systems, or other engineering-hour-driving inputs.` (as the WHY_PRELIMINARY_COPY constant value).
    - File contains the verbatim D-15 string `This early estimate is unusually wide. Fill in a full quote when you have more details — it will give a tighter range.` (as the SANITY_BANNER_COPY constant value).
    - File contains the literal string `Why this is preliminary` (the card eyebrow).
    - File contains the literal string `Hours by work category` (the combined-totals card eyebrow — same label as full mode, different content per D-06).
    - File contains `rom.sanityFlag &&` (or equivalent guarded render — the banner only appears when sanity flag is true).
    - File does NOT contain `topDrivers` (D-06 HIDDEN — top-drivers card removed).
    - File does NOT contain `perVisionContributions` (D-06 HIDDEN — multi-vision section removed).
    - File does NOT contain `CONFIDENCE_LABEL` or any imports from QuoteResultPanel (D-08 — confidence chip is replaced, not imported).
    - File does NOT contain `result.perCategory.map` (D-06 — per-category H/M/L drilldown is HIDDEN; combined-totals row uses the hero numbers only).
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    RomResultPanel.tsx exists with the locked chrome: hero+RomBadge, Why-preliminary card with verbatim D-13 copy, optional sanity banner with verbatim D-15 copy, combined-totals row, supporting matches, SaveQuoteButton mode="rom", Export PDF. HIDDEN sections genuinely absent from the source. typecheck + lint clean.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Write RomResultPanel.test.tsx — render hero badge, Why-preliminary, sanity banner, hidden sections, AND side-by-side SC-3 differential render</name>
  <files>frontend/src/components/quote/RomResultPanel.test.tsx</files>

  <read_first>
    - frontend/src/components/quote/RomResultPanel.tsx (just-created in Task 3)
    - frontend/src/components/quote/QuoteResultPanel.test.tsx (if exists — fixture pattern reference)
    - frontend/src/test/jargon-guard.test.tsx (line 81-104 — the HIGH_CONFIDENCE_RESULT fixture pattern)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-06, D-13, D-15, SC-3)
  </read_first>

  <behavior>
    - Test (hero badge present): rendering RomResultPanel surfaces the literal text "Preliminary" (the RomBadge text).
    - Test (no confidence chip): rendering does NOT surface "High confidence" / "Moderate confidence" / "Lower confidence" anywhere.
    - Test (Why-preliminary card present): rendered DOM contains the verbatim D-13 body string.
    - Test (sanity banner — when sanityFlag true): rendering with `rom={{...rom, sanityFlag: true}}` surfaces the verbatim D-15 banner string.
    - Test (sanity banner — when sanityFlag false): rendering with `sanityFlag: false` does NOT surface the D-15 banner string.
    - Test (combined-totals row): rendered DOM contains a "Hours by work category" eyebrow AND a single combined-totals row in the format `{salesBucket}: {hours} hrs · range {low}–{high}`.
    - Test (HIDDEN — no top-drivers card): rendering does NOT surface "What drives this estimate" anywhere.
    - Test (HIDDEN — no per-category H/M/L): rendering does NOT surface multiple `H` / `M` / `L` confidence-tone chips next to category labels (the full-mode panel renders one per perCategory row; the ROM panel renders zero).
    - Test (HIDDEN — no per-vision contribution section): rendering does NOT surface "Per-vision contribution".
    - Test (Save button receives mode='rom'): mock the SaveQuoteButton to capture its props (or assert via the saved-record mock from Plan 07-01 / 07-02 hooks). Assert SaveQuoteButton was called with `mode: "rom"`.
    - Test (jargon-guard local): rendered text contains no BANNED_TOKENS regex match.
    - Test (SC-3 side-by-side differential — NEW): render BOTH `<QuoteResultPanel result={fullResult} input={inputs} />` and `<RomResultPanel result={romResult} input={inputs} rom={romMetadata} />` with equivalent inputs in the same harness. Assert: (a) only the ROM render contains the literal text `"Preliminary"`; (b) only the ROM render contains the literal text `"Why this is preliminary"`; (c) the full render contains a top-drivers section heading (e.g. `"What drives this estimate"`); the ROM render does NOT. This makes SC-3 (non-tech reviewer side-by-side recognition) grep-verifiable directly in unit tests.
  </behavior>

  <action>
    Create `frontend/src/components/quote/RomResultPanel.test.tsx`. Reuse the HIGH_CONFIDENCE_RESULT fixture pattern from `jargon-guard.test.tsx:81-104` and the makeFormValues helper:

    ```typescript
    import { describe, expect, it, vi } from "vitest";

    import { renderWithProviders } from "@/test/render";
    import { BANNED_TOKENS } from "@/test/jargon";
    import { RomResultPanel, WHY_PRELIMINARY_COPY, SANITY_BANNER_COPY } from "@/components/quote/RomResultPanel";
    import { QuoteResultPanel } from "@/components/quote/QuoteResultPanel";
    import {
      quoteFormDefaults,
      type QuoteFormValues,
    } from "@/pages/single-quote/schema";
    import type { UnifiedQuoteResult } from "@/demo/quoteResult";
    import type { RomMetadata } from "@/demo/romEstimator";

    // SaveQuoteButton has its own test surface; spy on it here to capture the
    // `mode` prop. Importing the live component requires a TanStack QueryClient
    // and would expand the harness needlessly — mock to keep this test focused.
    const SaveQuoteButtonSpy = vi.fn(() => <div data-testid="save-quote-button" />);
    vi.mock("@/components/quote/SaveQuoteButton", () => ({
      SaveQuoteButton: (props: unknown) => SaveQuoteButtonSpy(props),
    }));

    function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
      return {
        ...quoteFormDefaults,
        industry_segment: "Automotive",
        system_category: "Robotic Cell",
        automation_level: "Semi-Auto",
        estimated_materials_cost: 245_000,
        ...over,
      };
    }

    const BASE_RESULT: UnifiedQuoteResult = {
      estimateHours: 240,
      likelyRangeLow: 140,
      likelyRangeHigh: 340,
      overallConfidence: "moderate",
      perCategory: [
        // Even when the upstream estimator widens these, the ROM panel must NOT render them.
        { label: "Mechanical Engineering", estimateHours: 120, rangeLow: 80, rangeHigh: 160, confidence: "moderate" },
      ],
      topDrivers: [
        // ROM panel must NOT render these.
        { label: "Number of stations", direction: "increases", magnitude: "strong" },
      ],
      supportingMatches: {
        label: "Most similar past projects",
        items: [
          { projectId: "p1", projectName: "Alpha Build Cell", actualHours: 250, similarity: 0.92 },
        ],
      },
    };

    const BASE_ROM: RomMetadata = {
      mode: "rom",
      bandMultiplier: 1.75,
      baselineRate: 0.0008,
      sanityFlag: false,
    };

    describe("RomResultPanel", () => {
      it("renders the RomBadge 'Preliminary' on the hero card", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        expect(document.body.textContent).toContain("Preliminary");
      });

      it("does NOT render any confidence-chip label (D-08)", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        const body = document.body.textContent ?? "";
        expect(body).not.toMatch(/high confidence|moderate confidence|lower confidence/i);
      });

      it("renders the Why-this-is-preliminary verbatim D-13 copy", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        const body = document.body.textContent ?? "";
        expect(body).toContain(WHY_PRELIMINARY_COPY);
      });

      it("renders the sanity-banner D-15 copy when rom.sanityFlag is true", () => {
        renderWithProviders(
          <RomResultPanel
            result={BASE_RESULT}
            input={makeFormValues()}
            rom={{ ...BASE_ROM, sanityFlag: true }}
          />,
        );
        expect(document.body.textContent).toContain(SANITY_BANNER_COPY);
      });

      it("does NOT render the sanity-banner copy when rom.sanityFlag is false", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        expect(document.body.textContent).not.toContain(SANITY_BANNER_COPY);
      });

      it("renders the combined-totals row (D-06) — sales-bucket label + hours + range", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        const body = document.body.textContent ?? "";
        // Sales bucket from deriveSalesBucket(quoteFormDefaults overlay) — defaults
        // give has_controls:true and has_robotics:true → "ME+EE".
        expect(body).toMatch(/ME\+EE/);
        expect(body).toMatch(/240/); // estimateHours
        expect(body).toMatch(/140/); // likelyRangeLow
        expect(body).toMatch(/340/); // likelyRangeHigh
      });

      it("does NOT render the top-drivers card (D-06 HIDDEN)", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        expect(document.body.textContent).not.toMatch(/what drives this estimate/i);
      });

      it("does NOT render the per-category H/M/L breakdown (D-06 HIDDEN)", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        // Mechanical Engineering label from BASE_RESULT.perCategory must NOT surface.
        expect(document.body.textContent).not.toMatch(/mechanical engineering/i);
      });

      it("does NOT render the per-vision contribution section (D-06 HIDDEN)", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        expect(document.body.textContent).not.toMatch(/per-vision contribution/i);
      });

      it("threads mode='rom' to SaveQuoteButton (D-19)", () => {
        SaveQuoteButtonSpy.mockClear();
        renderWithProviders(
          <RomResultPanel
            result={BASE_RESULT}
            input={makeFormValues()}
            rom={BASE_ROM}
            workspace="real"
          />,
        );
        expect(SaveQuoteButtonSpy).toHaveBeenCalled();
        const props = SaveQuoteButtonSpy.mock.calls[0][0] as { mode?: string };
        expect(props.mode).toBe("rom");
      });

      it("renders supporting matches unchanged (D-06 REMAIN)", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        expect(document.body.textContent).toMatch(/alpha build cell/i);
      });

      it("renders no banned ML-jargon tokens (DATA-03)", () => {
        renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={makeFormValues()} rom={BASE_ROM} />,
        );
        const body = document.body.textContent ?? "";
        for (const re of BANNED_TOKENS) {
          expect(body, `[jargon-guard] RomResultPanel: ${re}`).not.toMatch(re);
        }
      });

      // -----------------------------------------------------------------------
      // SC-3 (non-tech reviewer side-by-side recognition) — grep-verifiable
      // differential render. Renders BOTH panels with equivalent inputs and
      // asserts the chrome differences appear ONLY where they should.
      // -----------------------------------------------------------------------
      it("SC-3 side-by-side: only ROM render carries 'Preliminary' + 'Why this is preliminary'; only full render carries top-drivers heading", () => {
        const inputs = makeFormValues();

        // Render ROM panel into its own container.
        const romScope = document.createElement("div");
        romScope.id = "rom-scope";
        document.body.appendChild(romScope);
        const { unmount: unmountRom } = renderWithProviders(
          <RomResultPanel result={BASE_RESULT} input={inputs} rom={BASE_ROM} />,
          // renderWithProviders accepts options; if it doesn't expose a container,
          // the executor SHOULD use a sibling render() from RTL with `container: romScope`
          // to get isolated text scopes. The simplest fallback is two sequential
          // renders + scope-by-text since both panels output disjoint copy.
        );
        const romBody = document.body.textContent ?? "";
        expect(romBody).toContain("Preliminary");
        expect(romBody).toContain("Why this is preliminary");
        expect(romBody).not.toMatch(/what drives this estimate/i);
        unmountRom();

        // Render full panel.
        renderWithProviders(
          <QuoteResultPanel result={BASE_RESULT} input={inputs} />,
        );
        const fullBody = document.body.textContent ?? "";
        // Only ROM has "Preliminary" — full render must NOT.
        expect(fullBody).not.toContain("Preliminary");
        expect(fullBody).not.toContain("Why this is preliminary");
        // The full panel renders the top-drivers section heading. The exact
        // string in QuoteResultPanel.tsx is "What drives this estimate" (per
        // UI-SPEC §"Component Map"). If that copy lives behind a different
        // heading literal in the live file, the executor MUST grep the source
        // for the actual heading string and update this assertion to match —
        // the contract is "the full panel has SOME top-drivers heading the
        // ROM panel doesn't."
        expect(fullBody).toMatch(/what drives this estimate/i);
      });
    });
    ```

    Note on the side-by-side test isolation: the cleanest pattern is to render each panel into its own RTL render() call (each gets its own container automatically) and assert against `document.body.textContent` between unmounts. RTL's `cleanup()` (auto-called between tests in vitest) handles the cross-test isolation; within ONE test, sequential render+unmount keeps each scan isolated.

    Note on the full-panel top-drivers heading literal: if `QuoteResultPanel.tsx` uses a different heading than `"What drives this estimate"` (e.g., `"Top drivers"` or a different localization), the executor MUST grep `frontend/src/components/quote/QuoteResultPanel.tsx` for the actual heading string and update the assertion's regex to that string. The contract is that the assertion FAILS if the full panel's top-drivers section is removed or the ROM panel grows one — that's the SC-3 lock.
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/components/quote/RomResultPanel.test.tsx</automated>
    <automated>cd frontend && npm run typecheck</automated>
  </verify>

  <acceptance_criteria>
    - File `frontend/src/components/quote/RomResultPanel.test.tsx` exists with at least 12 `it(` blocks (one per behavior case + the SC-3 side-by-side test).
    - File contains assertions on `WHY_PRELIMINARY_COPY` and `SANITY_BANNER_COPY` import (verifies the constants are exported from RomResultPanel.tsx).
    - File contains `expect(props.mode).toBe("rom")` (mode-prop threading assertion).
    - File contains `expect(body).not.toMatch(/what drives this estimate/i)` (HIDDEN-section assertion — appears in BOTH the standalone HIDDEN test AND the SC-3 side-by-side test for the ROM render).
    - File contains `expect(body).not.toMatch(/per-vision contribution/i)` (HIDDEN-section assertion).
    - File contains `expect(body).not.toMatch(/high confidence|moderate confidence|lower confidence/i)` (D-08 confidence-chip-replaced assertion).
    - File contains a test case with the literal title fragment `SC-3 side-by-side` (the differential-render test).
    - The SC-3 test renders BOTH `QuoteResultPanel` AND `RomResultPanel` (verifiable by grep — both component names appear in the same describe block).
    - The SC-3 test contains `expect(romBody).toContain("Preliminary")` AND `expect(fullBody).not.toContain("Preliminary")` (or equivalent variable names).
    - `cd frontend && npm run test -- --run src/components/quote/RomResultPanel.test.tsx` exits 0.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    12+ test cases pass, covering hero badge presence, no confidence chip, D-13 verbatim, D-15 verbatim (both polarities of sanityFlag), combined-totals row, no top-drivers card, no per-category H/M/L, no per-vision section, mode='rom' threading, supporting matches REMAIN, jargon-guard local, AND a side-by-side SC-3 differential render proving "Preliminary" + "Why this is preliminary" appear ONLY in the ROM render and the top-drivers heading appears ONLY in the full render. typecheck + lint clean.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser form input → estimateRom | Validated by romFormSchema (Plan 07-01); zod rejects non-positive cost and missing classification. |
| RomResultPanel render → screen reader / customer | Static copy strings (D-13, D-15) + dynamic numbers from estimateRom output. |

This plan adds NO network boundary, NO new auth surface, NO new secrets. Same posture as Plan 07-01 / 07-02.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-08 | Tampering | RomForm input | mitigate | romFormSchema's `z.coerce.number().positive(...)` rejects zero/negative; `z.string().trim().min(1)` rejects empty Selects; react-hook-form's resolver runs zod on every change/blur. |
| T-07-09 | XSS | RomResultPanel rendered strings | mitigate | All copy is static (D-13, D-15 verbatim constants) or comes from validated zod-parsed numbers (estimateHours, range bounds). Project records' projectName field flows through React's default escaping (no dangerouslySetInnerHTML). |
| T-07-10 | DoS | RomResultPanel re-renders | accept | The panel is a leaf React component; render cost is bounded by `result.supportingMatches.items` length (capped upstream by toUnifiedResult). No nested loops, no synchronous expensive computations. |
| T-07-11 | Information Disclosure | sanity banner exposes internal heuristic | accept | The D-15 copy is plain English ("unusually wide"); the underlying ROM_BASELINE_RATE_HOURS_PER_DOLLAR constant is NOT user-facing (D-05). Disclosure is intentional UX. |

Block-on severity: high. T-07-08 + T-07-09 are mitigated by zod and React's default escaping.
</threat_model>

<verification>
After all four tasks complete:

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test -- --run \
  src/pages/single-quote/RomForm.test.tsx \
  src/components/quote/RomResultPanel.test.tsx
cd frontend && npm run build
```

All exit 0.
</verification>

<success_criteria>
1. SC-1 (ROM workflow produces an estimate): RomForm validates 4 inputs; the parent's onSubmit runs estimateRom (Plan 07-04 wires the parent); RomResultPanel renders the estimate.
2. SC-2 (preliminary label + wider band): RomBadge renders "Preliminary"; Why-preliminary card explains in plain English; combined-totals row uses the widened bounds from Plan 07-02.
3. SC-3 (non-technical reviewer can tell ROM vs full apart): the badge, the Why-preliminary card, and the absence of top-drivers / per-category H/M/L drilldown / per-vision section are all visible differences from QuoteResultPanel. **The new SC-3 side-by-side differential render test in Task 4 makes this grep-verifiable in unit tests.**
4. ROM-01 (material-cost-only path): the form lets the SE submit only the four locked fields. ROM-02 (visual distinction): all chrome assertions.

Definition of done:
- 4 files created (2 components + 2 tests).
- 18 grep-verifiable strings/patterns present across the components and tests.
- 19+ test cases pass.
- `cd frontend && npm run typecheck && npm run lint && npm run test && npm run build` all exit 0.
- HIDDEN sections genuinely absent from RomResultPanel.tsx source (grep proves no `topDrivers`, `perVisionContributions`, `result.perCategory.map`, `CONFIDENCE_LABEL`).
</success_criteria>

<output>
After completion, create `.planning/phases/07-rom-quote-mode/07-03-form-and-result-panel-SUMMARY.md` documenting:
- The RomForm and RomResultPanel signatures (full TS interfaces).
- Verbatim copy constants exported (WHY_PRELIMINARY_COPY, SANITY_BANNER_COPY).
- Test count delta.
- Hand-off note for Plan 07-04 (pages + routes layer): the page handlers wire RomForm + RomResultPanel together. The parent owns useForm({resolver: zodResolver(romFormSchema), defaultValues: romFormDefaults}), formRef, the dropdowns derived from the realProjects pool, and the onSubmit handler that calls estimateRom. The output of estimateRom feeds RomResultPanel via {result, input: result.formValues, rom}.
- Hand-off note for Plan 07-05 (list integration + re-open + jargon-guard + round-trip): the SC-3 grep-verifiable differential render test in this plan's Task 4 satisfies SC-3 at the unit-test level; Plan 07-05 only needs to add jargon-guard scans + the SC-4 round-trip integration tests.
</output>
</content>
</invoke>