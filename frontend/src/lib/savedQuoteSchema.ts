/**
 * Saved-quote types, zod schema, and the inverse of QuoteFormValues ↔ QuoteInput coercion.
 *
 * Plan 05-01 — IndexedDB persistence data layer.
 *
 * The schema is the contract Wave 2/3 builds against; downstream Phase 5 plans
 * import these types directly. Forward-compat for Phase 6 (multi-vision) and
 * Phase 7 (ROM mode) is preserved through:
 *   - schemaVersion: 1 literal (D-18) — Phase 6/7 will bump.
 *   - .passthrough() on UnifiedQuoteResult so unknown fields survive save/load
 *     round-trips intact (W8 mitigation).
 */
import { z } from "zod";

import type { QuoteInput } from "@/api/types";
import { quoteFormSchema, type QuoteFormValues } from "@/pages/single-quote/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Bertsche-verbatim workflow status states (D-08). Order matters — chip cycle. */
export const STATUS_CYCLE = ["draft", "sent", "won", "lost", "revised"] as const;

/** Quote shape mode (D-03). "rom" = ROM-quote (Phase 7); "full" = full-input quote.
 *  Optional on read; missing or undefined defaults to "full" for backward-compat
 *  with every Phase 5 / Phase 6 saved record. */
export const QUOTE_MODE_VALUES = ["rom", "full"] as const;
export type QuoteMode = (typeof QUOTE_MODE_VALUES)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Workspace = "real" | "synthetic";
export type WorkflowStatus = (typeof STATUS_CYCLE)[number];

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

/** Quote name. Trimmed; min 1, max 80 chars. T-05-03 DoS bound. */
export const savedQuoteNameSchema = z
  .string()
  .trim()
  .min(1, "Please give this quote a name before saving.")
  .max(80, "That name is too long — keep it under 80 characters.");

/**
 * UnifiedQuoteResult zod with `.passthrough()` at every nesting level so
 * unknown fields from the live shape (e.g. Phase 6 multi-vision details,
 * Phase 7 ROM-mode metadata) round-trip through save/load without
 * truncation. W8.
 *
 * Validates the known fields; preserves everything else verbatim. Storage
 * fidelity > strictness.
 */
export const unifiedQuoteResultSchema = z
  .object({
    estimateHours: z.number(),
    likelyRangeLow: z.number(),
    likelyRangeHigh: z.number(),
    overallConfidence: z.enum(["high", "moderate", "lower"]),
    perCategory: z.array(
      z
        .object({
          label: z.string(),
          estimateHours: z.number(),
          rangeLow: z.number(),
          rangeHigh: z.number(),
          confidence: z.enum(["high", "moderate", "lower"]),
        })
        .passthrough(),
    ),
    topDrivers: z.array(
      z
        .object({
          label: z.string(),
          direction: z.enum(["increases", "decreases"]),
          magnitude: z.enum(["strong", "moderate", "minor"]),
        })
        .passthrough(),
    ),
    supportingMatches: z
      .object({
        label: z.string(),
        items: z.array(
          z
            .object({
              projectId: z.string(),
              projectName: z.string(),
              actualHours: z.number(),
              similarity: z.number(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  })
  .passthrough();

/** A single immutable version snapshot. Newest is appended LAST in versions[]. */
export const quoteVersionSchema = z.object({
  version: z.number().int().min(1),
  savedAt: z.string().datetime(),
  statusAtTime: z.enum(STATUS_CYCLE),
  formValues: quoteFormSchema,
  unifiedResult: unifiedQuoteResultSchema,
  restoredFromVersion: z.number().int().min(1).optional(),
  compareInputs: z
    .object({
      humanQuotedByBucket: z.record(z.string(), z.number()),
    })
    .optional(),
  /** D-03 / D-19: ROM vs full quote shape, per version. Optional on read;
   *  defaults to "full" for legacy v2 records that pre-date Phase 7. */
  mode: z.enum(QUOTE_MODE_VALUES).optional().default("full"),
});

/** A persisted saved quote. Keyed by id (UUID v4). */
export const savedQuoteSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.literal(2),
  name: savedQuoteNameSchema,
  workspace: z.enum(["real", "synthetic"]),
  status: z.enum(STATUS_CYCLE),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  versions: z.array(quoteVersionSchema).min(1),
  // Denormalized list-row metadata.
  salesBucket: z.string(),
  visionLabel: z.string(),
  materialsCost: z.number(),
  /** D-03 / D-19: ROM vs full quote shape, denormalized at the top level for
   *  list-row rendering (mirrors salesBucket/visionLabel/materialsCost). Optional
   *  on read; defaults to "full" for legacy v2 records that pre-date Phase 7. */
  mode: z.enum(QUOTE_MODE_VALUES).optional().default("full"),
});

export type SavedQuote = z.infer<typeof savedQuoteSchema>;
export type QuoteVersion = z.infer<typeof quoteVersionSchema>;

// ---------------------------------------------------------------------------
// Inverse of transformToQuoteInput (from @/pages/single-quote/schema.ts:114-162)
// ---------------------------------------------------------------------------

/**
 * Reverse the wire-format coercion done by transformToQuoteInput.
 *   - log1p(materials_cost) → expm1
 *   - 0/1 ints → booleans (must use `=== 1` not truthy — D-PATTERNS gotcha #2)
 *   - Retrofit (capital R) ↔ retrofit (lowercase) field name renaming
 *
 * Required fields on QuoteInput are typed as optional in api/types.ts (parent
 * app's openapi shape); we coerce missing numeric fields to the form defaults
 * so the inverse always produces a complete QuoteFormValues.
 */
export function transformToFormValues(input: QuoteInput): QuoteFormValues {
  return {
    industry_segment: input.industry_segment,
    system_category: input.system_category,
    automation_level: input.automation_level,
    plc_family: input.plc_family,
    hmi_family: input.hmi_family,

    // Mirror migrateFormValuesV1ToV2: any non-empty / non-"None" vision_type
    // surfaces as a single visionRow so saved quotes from the trained model's
    // full vocabulary ("Cognex 2D", "3D Vision", "Keyence IV3", ...) round-trip
    // intact instead of being silently discarded by a hard-coded "2D"/"3D"
    // allowlist.
    visionRows:
      typeof input.vision_type === "string" &&
      input.vision_type.trim() !== "" &&
      input.vision_type !== "None"
        ? [
            {
              type: input.vision_type,
              count: Math.max(1, Number(input.vision_systems_count ?? 0)),
            },
          ]
        : [],

    stations_count: input.stations_count ?? 0,
    robot_count: input.robot_count ?? 0,
    fixture_sets: input.fixture_sets ?? 0,
    part_types: input.part_types ?? 0,
    servo_axes: input.servo_axes ?? 0,
    pneumatic_devices: input.pneumatic_devices ?? 0,
    safety_doors: input.safety_doors ?? 0,
    weldment_perimeter_ft: input.weldment_perimeter_ft ?? 0,
    fence_length_ft: input.fence_length_ft ?? 0,
    conveyor_length_ft: input.conveyor_length_ft ?? 0,

    product_familiarity_score: input.product_familiarity_score ?? 3,
    product_rigidity: input.product_rigidity ?? 3,
    bulk_rigidity_score: input.bulk_rigidity_score ?? 3,
    process_uncertainty_score: input.process_uncertainty_score ?? 3,
    changeover_time_min: input.changeover_time_min ?? 0,

    is_product_deformable: input.is_product_deformable === 1,
    is_bulk_product: input.is_bulk_product === 1,
    has_tricky_packaging: input.has_tricky_packaging === 1,
    has_controls: input.has_controls === 1,
    has_robotics: input.has_robotics === 1,
    retrofit: input.Retrofit === 1,
    duplicate: input.duplicate === 1,

    safety_devices_count: input.safety_devices_count ?? 0,
    complexity_score_1_5: input.complexity_score_1_5 ?? 3,
    custom_pct: input.custom_pct ?? 50,
    panel_count: input.panel_count ?? 0,
    drive_count: input.drive_count ?? 0,

    stations_robot_index: input.stations_robot_index ?? 0,
    mech_complexity_index: input.mech_complexity_index ?? 0,
    controls_complexity_index: input.controls_complexity_index ?? 0,
    physical_scale_index: input.physical_scale_index ?? 0,

    estimated_materials_cost: Math.expm1(input.log_quoted_materials_cost ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Auto-suggested name (UI-SPEC §"Auto-suggested name format")
// ---------------------------------------------------------------------------

/**
 * Heuristic sales-bucket label. The form does not carry a sales_bucket column
 * today; we synthesize ME / EE / ME+EE / Quote from controls and robotics
 * signals (Claude's discretion per CONTEXT D-XX, stable per call).
 */
export function deriveSalesBucket(values: QuoteFormValues): string {
  const hasME = values.stations_count > 0 || values.has_controls;
  const hasEE = values.has_robotics || values.servo_axes > 0;
  if (hasME && hasEE) return "ME+EE";
  if (hasEE) return "EE";
  if (hasME) return "ME";
  return "Quote";
}

/**
 * Format: "{salesBucket}[ ROM] {hourLabel} · {visionLabel} · {ISODate}".
 * Capped at 80 chars; vision label is truncated first if needed, date intact.
 *
 * Phase 7 / D-17: when mode === "rom", insert the literal token " ROM" between
 * the salesBucket and the hour label. The canonical D-17 example is
 * "ME ROM 240h · No vision · 2026-05-06". The literal "ROM" is acceptable in
 * the saved-quote name (it's industry vernacular Ben himself used; the user
 * can edit on save) and is NOT in BANNED_TOKENS.
 *
 * Examples:
 *   "ME 800h · Vision · 2026-05-05"          (mode: "full" / undefined)
 *   "EE 240h · No vision · 2026-05-05"       (mode: "full" / undefined)
 *   "ME ROM 240h · No vision · 2026-05-06"   (mode: "rom")
 */
export function buildAutoSuggestedName(
  values: QuoteFormValues,
  estimatedHours: number,
  mode?: QuoteMode,
): string {
  const bucket = deriveSalesBucket(values);
  const romToken = mode === "rom" ? " ROM" : "";
  const hours = `${Math.round(estimatedHours).toLocaleString("en-US")}h`;
  const visionLabel =
    !values.visionRows || values.visionRows.length === 0
      ? "No vision"
      : values.visionRows
          .map((r) => `${r.type}×${r.count}`)
          .join("+");
  const date = new Date().toISOString().slice(0, 10);
  const candidate = `${bucket}${romToken} ${hours} · ${visionLabel} · ${date}`;
  if (candidate.length <= 80) return candidate;

  const overrun = candidate.length - 80;
  const truncatedLen = Math.max(0, visionLabel.length - overrun - 1);
  const truncatedVision = visionLabel.slice(0, truncatedLen) + "…";
  return `${bucket}${romToken} ${hours} · ${truncatedVision} · ${date}`;
}
