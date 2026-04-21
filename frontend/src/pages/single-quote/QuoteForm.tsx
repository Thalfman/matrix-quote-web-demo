import React, { useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";

import { DropdownOptions } from "@/api/types";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Section } from "@/components/Section";
import { Select } from "@/components/Select";
import { Slider } from "@/components/Slider";
import { Switch } from "@/components/Switch";

import { QuoteFormValues, SALES_BUCKETS } from "./schema";

type Props = {
  dropdowns: DropdownOptions | undefined;
  submitting: boolean;
  onSubmit: (quoted: Partial<Record<(typeof SALES_BUCKETS)[number], number>>) => void;
  form: UseFormReturn<QuoteFormValues>;
  formRef?: React.RefObject<HTMLFormElement>;
};

export function QuoteForm({ dropdowns, submitting, onSubmit, form, formRef }: Props) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [quotedHours, setQuotedHours] = useState<Record<string, number>>({});
  const [lastValues] = useState(readLastValues);

  const { register, handleSubmit, control, reset, formState } = form;

  const fire = handleSubmit(() => {
    const cleaned = Object.fromEntries(
      Object.entries(quotedHours).filter(([, v]) => v > 0),
    ) as Partial<Record<(typeof SALES_BUCKETS)[number], number>>;
    onSubmit(cleaned);
  });

  const opts = (key: keyof DropdownOptions, fallback: string[]) =>
    dropdowns?.[key]?.length ? dropdowns[key] : fallback;

  return (
    <form ref={formRef} onSubmit={fire}>
      {Object.keys(lastValues).length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => form.reset(lastValues)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs border hairline rounded-sm bg-surface hover:bg-paper transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted2" aria-hidden="true" />
            Populate with last quote
          </button>
        </div>
      )}
      <Section step="01" title="Project classification" description="Segment, system type, and project flags">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Field label="Industry segment" error={formState.errors.industry_segment?.message}>
            <Select
              placeholder="Select..."
              options={opts("industry_segment", ["Automotive", "Food & Beverage", "General Industry"])}
              {...register("industry_segment")}
            />
          </Field>
          <Field label="System category" error={formState.errors.system_category?.message}>
            <Select
              placeholder="Select..."
              options={opts("system_category", [
                "Machine Tending",
                "End of Line Automation",
                "Robotic Metal Finishing",
                "Engineered Manufacturing Systems",
                "Other",
              ])}
              {...register("system_category")}
            />
          </Field>
          <Field label="Automation level" error={formState.errors.automation_level?.message}>
            <Select
              placeholder="Select..."
              options={opts("automation_level", ["Semi-Automatic", "Robotic", "Hard Automation"])}
              {...register("automation_level")}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Controller
            control={control}
            name="has_controls"
            render={({ field }) => (
              <Switch label="Includes controls" checked={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="has_robotics"
            render={({ field }) => (
              <Switch label="Includes robotics" checked={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="retrofit"
            render={({ field }) => (
              <Switch label="Retrofit project" checked={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="duplicate"
            render={({ field }) => (
              <Switch label="Duplicate of prior" checked={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </Section>

      <Section step="02" title="Physical scale" description="Stations, robots, fixtures, and footprint">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Stations count">
            <Input type="number" min={0} step={1} {...register("stations_count")} />
          </Field>
          <Field label="Robot count">
            <Input type="number" min={0} step={1} {...register("robot_count")} />
          </Field>
          <Field label="Fixture sets">
            <Input type="number" min={0} step={1} {...register("fixture_sets")} />
          </Field>
          <Field label="Part types">
            <Input type="number" min={0} step={1} {...register("part_types")} />
          </Field>
          <Field label="Weldment perimeter (ft)">
            <Input type="number" min={0} step={0.1} {...register("weldment_perimeter_ft")} />
          </Field>
          <Field label="Fence length (ft)">
            <Input type="number" min={0} step={0.1} {...register("fence_length_ft")} />
          </Field>
          <Field label="Safety doors">
            <Input type="number" min={0} step={1} {...register("safety_doors")} />
          </Field>
          <Field label="Safety devices count">
            <Input type="number" min={0} step={1} {...register("safety_devices_count")} />
          </Field>
          <Field label="Conveyor length (ft)">
            <Input type="number" min={0} step={0.1} {...register("conveyor_length_ft")} />
          </Field>
        </div>
      </Section>

      <Section
        step="03"
        title="Controls & automation"
        description="PLC/HMI platform, vision, panels, and drives"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="PLC family">
            <Select options={opts("plc_family", ["AB Compact Logix", "AB Control Logix", "Siemens S7"])} {...register("plc_family")} />
          </Field>
          <Field label="HMI family">
            <Select options={opts("hmi_family", ["AB PanelView Plus", "Siemens Comfort Panel"])} {...register("hmi_family")} />
          </Field>
          <Field label="Vision type">
            <Select options={opts("vision_type", ["None", "2D", "3D"])} {...register("vision_type")} />
          </Field>
          <Field label="Panel count">
            <Input type="number" min={0} step={1} {...register("panel_count")} />
          </Field>
          <Field label="Servo axes">
            <Input type="number" min={0} step={1} {...register("servo_axes")} />
          </Field>
          <Field label="Drive count">
            <Input type="number" min={0} step={1} {...register("drive_count")} />
          </Field>
          <Field label="Pneumatic devices">
            <Input type="number" min={0} step={1} {...register("pneumatic_devices")} />
          </Field>
          <Field label="Vision systems count">
            <Input type="number" min={0} step={1} {...register("vision_systems_count")} />
          </Field>
        </div>
      </Section>

      <Section
        step="04"
        title="Product & process"
        description="Familiarity, uncertainty, and product characteristics"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <Controller
            control={control}
            name="product_familiarity_score"
            render={({ field }) => (
              <Field label="Product familiarity (1–5)">
                <Slider value={field.value} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="product_rigidity"
            render={({ field }) => (
              <Field label="Product rigidity (1–5)">
                <Slider value={field.value} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="bulk_rigidity_score"
            render={({ field }) => (
              <Field label="Bulk rigidity (1–5)">
                <Slider value={field.value} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="process_uncertainty_score"
            render={({ field }) => (
              <Field label="Process uncertainty (1–5)">
                <Slider value={field.value} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
              </Field>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Changeover time (min)">
            <Input type="number" min={0} step={1} {...register("changeover_time_min")} />
          </Field>
          <Controller
            control={control}
            name="is_product_deformable"
            render={({ field }) => (
              <Switch label="Product deformable" checked={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="is_bulk_product"
            render={({ field }) => (
              <Switch label="Bulk product" checked={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="has_tricky_packaging"
            render={({ field }) => (
              <Switch label="Tricky packaging" checked={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </Section>

      <Section step="05" title="Complexity & indices" description="Overall complexity and custom work">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <Controller
            control={control}
            name="complexity_score_1_5"
            render={({ field }) => (
              <Field label="Overall complexity (1–5)">
                <Slider value={field.value} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="custom_pct"
            render={({ field }) => (
              <Field label="Custom %">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.currentTarget.value))}
                />
              </Field>
            )}
          />
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer muted text-xs tracking-widest">ADVANCED — derived indices</summary>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <Field
              label="Stations/robot idx"
              hint="Auto-computed server-side if left at 0"
            >
              <Input type="number" min={0} step={0.1} {...register("stations_robot_index")} />
            </Field>
            <Field
              label="Mech complexity idx"
              hint="Auto-computed server-side if left at 0"
            >
              <Input type="number" min={0} step={0.1} {...register("mech_complexity_index")} />
            </Field>
            <Field
              label="Controls complexity idx"
              hint="Auto-computed server-side if left at 0"
            >
              <Input type="number" min={0} step={0.1} {...register("controls_complexity_index")} />
            </Field>
            <Field
              label="Physical scale idx"
              hint="Auto-computed server-side if left at 0"
            >
              <Input type="number" min={0} step={0.1} {...register("physical_scale_index")} />
            </Field>
          </div>
        </details>
      </Section>

      <Section step="06" title="Cost" description="Materials estimate — log-transformed before prediction">
        <Field label="Estimated materials cost ($)">
          <Input type="number" min={0} step={100} {...register("estimated_materials_cost")} />
        </Field>
      </Section>

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
    </form>
  );
}

const LAST_KEY = "matrix.singlequote.last";

function readLastValues(): QuoteFormValues {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_KEY) ?? "{}");
  } catch {
    return {} as QuoteFormValues;
  }
}
