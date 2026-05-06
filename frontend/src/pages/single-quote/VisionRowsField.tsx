/**
 * Multi-row vision picker — first useFieldArray consumer in this repo (Phase 6, D-02).
 *
 * Renders one row per `visionRows[i]` with a type Select + count Input + Remove
 * button, plus an "Add vision system" button at the bottom. Empty state shows
 * "No vision systems on this project." (D-02 copy, jargon-guard-clean per D-17).
 *
 * Per D-01 the schema permits an optional `label: string`; per Claude's
 * discretion this picker does NOT render a label input in v2.0 to keep data
 * entry simple (Ben's "trying to keep data entry simple" posture). Schema slot
 * ships; UI input deferred until Ben asks.
 */
import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, type Control } from "react-hook-form";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";

import {
  type QuoteFormValues,
  type VisionRow,
} from "./schema";

/**
 * `visionTypeOptions` is the dropdown vocabulary derived from the trained
 * model's vision_type categories (see /catalog/dropdowns or the demo-mode
 * buildDropdowns analog). The "None" sentinel is filtered out upstream — the
 * empty visionRows array IS the no-vision UI state. If options is empty, the
 * picker renders the empty state and disables Add.
 */
export function VisionRowsField({
  control,
  visionTypeOptions,
}: {
  control: Control<QuoteFormValues>;
  visionTypeOptions: string[];
}) {
  const { fields, append, remove } = useFieldArray<QuoteFormValues, "visionRows">({
    control,
    name: "visionRows",
  });

  const defaultType = visionTypeOptions[0];

  const handleAdd = () => {
    if (!defaultType) return;
    const newRow: VisionRow = { type: defaultType, count: 1 };
    append(newRow);
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <div className="text-sm text-muted">
          No vision systems on this project.
        </div>
      )}

      {fields.map((row, i) => (
        <div
          key={row.id}
          className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-end"
        >
          <Field label={i === 0 ? "Vision type" : ""} glossaryTerm="Vision Type">
            <Controller
              control={control}
              name={`visionRows.${i}.type`}
              render={({ field }) => (
                <Select options={visionTypeOptions} {...field} />
              )}
            />
          </Field>

          <Field label={i === 0 ? "Count" : ""}>
            <Controller
              control={control}
              name={`visionRows.${i}.count`}
              render={({ field }) => (
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={field.value ?? 1}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                />
              )}
            />
          </Field>

          <button
            type="button"
            aria-label="Remove vision system"
            onClick={() => remove(i)}
            className="text-muted hover:text-danger inline-flex items-center justify-center h-9 w-9 rounded border hairline"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!defaultType}
        className="inline-flex items-center gap-1.5 text-xs eyebrow text-teal hover:text-tealDark disabled:text-muted disabled:hover:text-muted disabled:cursor-not-allowed"
      >
        <Plus size={14} aria-hidden="true" />
        Add vision system
      </button>
    </div>
  );
}
