import React, { useEffect, useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { useSearchParams } from "react-router-dom";

import { DropdownOptions } from "@/api/types";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Section } from "@/components/Section";
import { Select } from "@/components/Select";
import { Slider } from "@/components/Slider";
import { Switch } from "@/components/Switch";
import { Tooltip, TooltipProvider } from "@/components/Tooltip";

import { parseQuotedHours } from "@/lib/parseQuotedHours";

import { QuoteFormValues, SALES_BUCKETS } from "./schema";
import { VisionRowsField } from "./VisionRowsField";
import { VISION_TYPE_NONE } from "./schema";

type Props = {
  dropdowns: DropdownOptions | undefined;
  submitting: boolean;
  onSubmit: (quoted: Partial<Record<(typeof SALES_BUCKETS)[number], number>>) => void;
  form: UseFormReturn<QuoteFormValues>;
  formRef?: React.RefObject<HTMLFormElement>;
};

export function QuoteForm({ dropdowns, submitting, onSubmit, form, formRef }: Props) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [quotedHours, setQuotedHours] = useState<Record<string, number | undefined>>({});
  const [rawQuotedHours, setRawQuotedHours] = useState<Record<string, string>>({});

  const { register, handleSubmit, control, reset, formState } = form;

  // Phase 5 (D-16): replaces the deprecated `sessionStorage["matrix.singlequote.last"]`
  // recall. When `?fromQuote=<id>` is present, hydrate the form from IndexedDB.
  // `?restoreVersion=N` selects an older version (D-06 fork-on-restore).
  const [searchParams] = useSearchParams();
  const fromQuoteId = searchParams.get("fromQuote");
  const restoreVersion = searchParams.get("restoreVersion");

  useEffect(() => {
    if (!fromQuoteId) return;
    let cancelled = false;
    void (async () => {
      const { getSavedQuote } = await import("@/lib/quoteStorage");
      const saved = await getSavedQuote(fromQuoteId);
      if (cancelled || !saved || saved.versions.length === 0) return;
      const versionN = restoreVersion
        ? Number(restoreVersion)
        : saved.versions[saved.versions.length - 1].version;
      const target =
        saved.versions.find((v) => v.version === versionN) ??
        saved.versions[saved.versions.length - 1];
      form.reset(target.formValues);
    })();
    return () => {
      cancelled = true;
    };
  }, [fromQuoteId, restoreVersion, form]);

  const fire = handleSubmit(() => {
    const cleaned = Object.fromEntries(
      Object.entries(quotedHours).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && entry[1] > 0,
      ),
    ) as Partial<Record<(typeof SALES_BUCKETS)[number], number>>;
    onSubmit(cleaned);
  });

  const opts = (key: keyof DropdownOptions, fallback: string[]) =>
    dropdowns?.[key]?.length ? dropdowns[key] : fallback;

  return (
    <form ref={formRef} onSubmit={fire}>
      <Section step="01" title="Project classification" description="Segment, system type, and project flags">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Field label="Industry segment" glossaryTerm="Industry Segment" error={formState.errors.industry_segment?.message}>
            <Select
              placeholder="Select..."
              options={opts("industry_segment", ["Automotive", "Food & Beverage", "General Industry"])}
              {...register("industry_segment")}
            />
          </Field>
          <Field label="System category" glossaryTerm="System Category" error={formState.errors.system_category?.message}>
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
          <Field label="Automation level" glossaryTerm="Automation Level" error={formState.errors.automation_level?.message}>
            <Select
              placeholder="Select..."
              options={opts("automation_level", ["Semi-Automatic", "Robotic", "Hard Automation"])}
              {...register("automation_level")}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
          <Field label="PLC family" glossaryTerm="PLC Family">
            <Select options={opts("plc_family", ["AB Compact Logix", "AB Control Logix", "Siemens S7"])} {...register("plc_family")} />
          </Field>
          <Field label="HMI family" glossaryTerm="HMI Family">
            <Select options={opts("hmi_family", ["AB PanelView Plus", "Siemens Comfort Panel"])} {...register("hmi_family")} />
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
        </div>

        {/* Vision picker (Phase 6 D-02) — replaces the two flat fields. */}
        <div className="mt-4">
          <div className="eyebrow text-[10px] text-muted mb-2">Vision systems</div>
          <VisionRowsField
            control={control}
            visionTypeOptions={
              dropdowns?.vision_type?.filter((v) => v !== VISION_TYPE_NONE) ?? []
            }
          />
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
              <Field label="Overall complexity (1–5)" glossaryTerm="Complexity (1–5)">
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
          <summary className="cursor-pointer muted text-xs tracking-widest">ADVANCED · derived indices</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-3">
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

      <Section step="06" title="Cost" description="Materials estimate (log-transformed before prediction)">
        <Field label="Estimated materials cost ($)">
          <Input type="number" min={0} step={100} {...register("estimated_materials_cost")} />
        </Field>
      </Section>

      <section className="mb-8">
        <TooltipProvider delayDuration={200}>
          <Tooltip term="Sales Bucket" side="top">
            <button
              type="button"
              onClick={() => setCompareOpen((v) => !v)}
              className="eyebrow text-[11px] text-teal hover:text-tealDark"
            >
              {compareOpen ? "Hide" : "Optional:"} compare to your quoted hours
            </button>
          </Tooltip>
        </TooltipProvider>
        {compareOpen && (
          <div className="card p-5 mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {SALES_BUCKETS.map((bucket) => {
              const raw = rawQuotedHours[bucket] ?? "";
              const parsed = quotedHours[bucket];
              const showError = raw.trim() !== "" && parsed === undefined;
              return (
                <Field
                  key={bucket}
                  label={`${bucket} quoted hours`}
                  error={showError ? "Enter a number" : undefined}
                >
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={raw}
                    onChange={(e) => {
                      const next = e.currentTarget.value;
                      setRawQuotedHours((prev) => ({ ...prev, [bucket]: next }));
                      setQuotedHours((prev) => ({
                        ...prev,
                        [bucket]: parseQuotedHours(next) ?? undefined,
                      }));
                    }}
                  />
                </Field>
              );
            })}
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
            setRawQuotedHours({});
          }}
          className="ml-auto text-xs text-muted hover:text-ink transition-colors"
        >
          Reset form
        </button>
      </div>
    </form>
  );
}
