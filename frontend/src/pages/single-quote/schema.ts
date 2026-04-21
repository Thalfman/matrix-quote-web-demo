import { z } from "zod";

import { QuoteInput } from "@/api/types";

const requiredString = z.string().trim().min(1, "Required");

/**
 * The shape the user fills in. Materials cost is a raw dollar amount;
 * booleans are real booleans. transformToQuoteInput() converts to the
 * wire format (log1p'd cost, int 0/1 for flags).
 */
export const quoteFormSchema = z.object({
  // 01 · classification
  industry_segment: requiredString,
  system_category: requiredString,
  automation_level: requiredString,
  has_controls: z.boolean(),
  has_robotics: z.boolean(),
  retrofit: z.boolean(),
  duplicate: z.boolean(),

  // 02 · physical scale
  stations_count: z.coerce.number().int().min(0),
  part_types: z.coerce.number().int().min(0),
  safety_doors: z.coerce.number().int().min(0),
  robot_count: z.coerce.number().int().min(0),
  weldment_perimeter_ft: z.coerce.number().min(0),
  safety_devices_count: z.coerce.number().int().min(0),
  fixture_sets: z.coerce.number().int().min(0),
  fence_length_ft: z.coerce.number().min(0),
  conveyor_length_ft: z.coerce.number().min(0),

  // 03 · controls & automation
  plc_family: requiredString,
  hmi_family: requiredString,
  vision_type: requiredString,
  panel_count: z.coerce.number().int().min(0),
  servo_axes: z.coerce.number().int().min(0),
  drive_count: z.coerce.number().int().min(0),
  pneumatic_devices: z.coerce.number().int().min(0),
  vision_systems_count: z.coerce.number().int().min(0),

  // 04 · product & process
  product_familiarity_score: z.coerce.number().min(1).max(5),
  product_rigidity: z.coerce.number().min(1).max(5),
  bulk_rigidity_score: z.coerce.number().min(1).max(5),
  process_uncertainty_score: z.coerce.number().min(1).max(5),
  changeover_time_min: z.coerce.number().min(0),
  is_product_deformable: z.boolean(),
  is_bulk_product: z.boolean(),
  has_tricky_packaging: z.boolean(),

  // 05 · complexity & indices
  complexity_score_1_5: z.coerce.number().min(1).max(5),
  custom_pct: z.coerce.number().min(0).max(100),
  stations_robot_index: z.coerce.number().min(0),
  mech_complexity_index: z.coerce.number().min(0),
  controls_complexity_index: z.coerce.number().min(0),
  physical_scale_index: z.coerce.number().min(0),

  // 06 · cost
  estimated_materials_cost: z.coerce.number().min(0),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export const quoteFormDefaults: QuoteFormValues = {
  industry_segment: "",
  system_category: "",
  automation_level: "",
  has_controls: true,
  has_robotics: true,
  retrofit: false,
  duplicate: false,

  stations_count: 0,
  part_types: 0,
  safety_doors: 0,
  robot_count: 0,
  weldment_perimeter_ft: 0,
  safety_devices_count: 0,
  fixture_sets: 0,
  fence_length_ft: 0,
  conveyor_length_ft: 0,

  plc_family: "AB Compact Logix",
  hmi_family: "AB PanelView Plus",
  vision_type: "None",
  panel_count: 0,
  servo_axes: 0,
  drive_count: 0,
  pneumatic_devices: 0,
  vision_systems_count: 0,

  product_familiarity_score: 3,
  product_rigidity: 3,
  bulk_rigidity_score: 3,
  process_uncertainty_score: 3,
  changeover_time_min: 0,
  is_product_deformable: false,
  is_bulk_product: false,
  has_tricky_packaging: false,

  complexity_score_1_5: 3,
  custom_pct: 50,
  stations_robot_index: 0,
  mech_complexity_index: 0,
  controls_complexity_index: 0,
  physical_scale_index: 0,

  estimated_materials_cost: 0,
};

export function transformToQuoteInput(v: QuoteFormValues): QuoteInput {
  return {
    industry_segment: v.industry_segment,
    system_category: v.system_category,
    automation_level: v.automation_level,
    plc_family: v.plc_family,
    hmi_family: v.hmi_family,
    vision_type: v.vision_type,

    stations_count: v.stations_count,
    robot_count: v.robot_count,
    fixture_sets: v.fixture_sets,
    part_types: v.part_types,
    servo_axes: v.servo_axes,
    pneumatic_devices: v.pneumatic_devices,
    safety_doors: v.safety_doors,
    weldment_perimeter_ft: v.weldment_perimeter_ft,
    fence_length_ft: v.fence_length_ft,
    conveyor_length_ft: v.conveyor_length_ft,

    product_familiarity_score: v.product_familiarity_score,
    product_rigidity: v.product_rigidity,
    bulk_rigidity_score: v.bulk_rigidity_score,
    process_uncertainty_score: v.process_uncertainty_score,
    changeover_time_min: v.changeover_time_min,

    is_product_deformable: v.is_product_deformable ? 1 : 0,
    is_bulk_product: v.is_bulk_product ? 1 : 0,
    has_tricky_packaging: v.has_tricky_packaging ? 1 : 0,
    has_controls: v.has_controls ? 1 : 0,
    has_robotics: v.has_robotics ? 1 : 0,
    Retrofit: v.retrofit ? 1 : 0,
    duplicate: v.duplicate ? 1 : 0,

    safety_devices_count: v.safety_devices_count,
    complexity_score_1_5: v.complexity_score_1_5,
    custom_pct: v.custom_pct,
    vision_systems_count: v.vision_systems_count,
    panel_count: v.panel_count,
    drive_count: v.drive_count,

    stations_robot_index: v.stations_robot_index,
    mech_complexity_index: v.mech_complexity_index,
    controls_complexity_index: v.controls_complexity_index,
    physical_scale_index: v.physical_scale_index,

    log_quoted_materials_cost: Math.log1p(Math.max(v.estimated_materials_cost, 0)),
  };
}

export const SALES_BUCKETS = [
  "ME",
  "EE",
  "PM",
  "Docs",
  "Build",
  "Robot",
  "Controls",
  "Install",
  "Travel",
] as const;

export type SalesBucket = (typeof SALES_BUCKETS)[number];

/** Order operations stably in the results view (matches core/config.py TARGETS). */
export const OPERATION_ORDER = [
  "me10",
  "me15",
  "me230",
  "ee20",
  "rb30",
  "cp50",
  "bld100",
  "shp150",
  "inst160",
  "trv180",
  "doc190",
  "pm200",
] as const;
