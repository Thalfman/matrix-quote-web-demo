// Human-readable labels for every feature the ML pipeline can produce.
// Numeric features map 1-to-1 from QUOTE_NUM_FIELDS in realProjects.ts (33 fields).
// Categorical features are one-hot encoded by the pipeline preprocessor; they
// arrive as "field_Value" strings. We match on prefix.

const NUM_LABELS: Record<string, string> = {
  // Core project structure (8)
  stations_count: "Number of stations",
  robot_count: "Number of robots",
  fixture_sets: "Fixture sets",
  part_types: "Part types",
  servo_axes: "Servo axes",
  pneumatic_devices: "Pneumatic devices",
  safety_doors: "Safety doors",
  safety_devices_count: "Safety devices",

  // Physical scale (3)
  weldment_perimeter_ft: "Weldment perimeter",
  fence_length_ft: "Safety fencing length",
  conveyor_length_ft: "Conveyor length",

  // Product characteristics (6)
  product_familiarity_score: "Product familiarity",
  product_rigidity: "Product rigidity",
  is_product_deformable: "Deformable product",
  is_bulk_product: "Bulk product",
  bulk_rigidity_score: "Bulk rigidity",
  has_tricky_packaging: "Tricky packaging",

  // Process complexity (3)
  // UI label flipped: model feature is uncertainty (positive coefficient on
  // hours), but customers see it framed as certainty. Direction is inverted
  // below in humanFeatureLabel — high certainty drives hours DOWN.
  process_uncertainty_score: "Process certainty",
  changeover_time_min: "Changeover time",
  custom_pct: "Custom content percentage",

  // Scope flags (4)
  duplicate: "Duplicate / repeat build",
  has_controls: "Includes controls scope",
  has_robotics: "Includes robotics scope",
  Retrofit: "Retrofit project",

  // Derived complexity indices (5)
  complexity_score_1_5: "Overall complexity score",
  mech_complexity_index: "Mechanical complexity index",
  controls_complexity_index: "Controls complexity index",
  physical_scale_index: "Physical scale index",
  stations_robot_index: "Stations-to-robot ratio",

  // Electrical hardware (4)
  vision_systems_count: "Vision systems",
  panel_count: "Electrical panels",
  drive_count: "Drive count",
  log_quoted_materials_cost: "Quoted materials cost",
};

// Categorical field prefixes (one-hot encoded values arrive as "field_Value")
const CAT_LABELS: Record<string, string> = {
  industry_segment: "Industry",
  system_category: "System category",
  automation_level: "Automation level",
  plc_family: "PLC family",
  hmi_family: "HMI family",
  vision_type: "Vision system",
};

/**
 * Convert a raw pipeline feature name to a business-language label.
 * Numeric features map directly; one-hot categorical names ("field_Value")
 * get the field's display label joined with the value.
 * Falls back to a best-effort title-case transform so unknown features never crash.
 */
export function humanFeatureLabel(
  rawName: string,
  _input: Record<string, unknown>,
): { label: string; direction: "increases" | "decreases" } {
  if (NUM_LABELS[rawName]) {
    // Special-case: feature stored as `process_uncertainty_score` (model
    // contract), but the UI flips it to "Process certainty". Polarity
    // therefore inverts — high certainty pushes hours DOWN.
    const direction =
      rawName === "process_uncertainty_score" ? "decreases" : "increases";
    return { label: NUM_LABELS[rawName], direction };
  }

  // One-hot encoded names: "industry_segment_Aerospace" → prefix = "industry_segment"
  for (const field of Object.keys(CAT_LABELS)) {
    if (rawName.startsWith(field + "_")) {
      const value = rawName.slice(field.length + 1);
      return { label: `${CAT_LABELS[field]}: ${value}`, direction: "increases" };
    }
  }

  // Best-effort fallback: replace underscores with spaces and title-case
  const fallback = rawName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: fallback, direction: "increases" };
}
