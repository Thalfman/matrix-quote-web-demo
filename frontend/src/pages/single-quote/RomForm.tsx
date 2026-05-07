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
        aria-label="Compute ROM estimate"
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
