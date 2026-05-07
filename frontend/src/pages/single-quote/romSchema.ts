/**
 * Phase 7 — D-02. ROM-mode form schema (4-field zod subset of quoteFormSchema).
 *
 * The ROM form takes ONLY:
 *   - industry_segment        (Select, required, free string)
 *   - system_category         (Select, required, free string)
 *   - automation_level        (Select, required, free string — model's required
 *                              categorical trio; the joblibs refuse to predict
 *                              without it)
 *   - estimated_materials_cost (currency input, required, > 0)
 *
 * Every other QuoteFormValues field is HIDDEN from the user (D-02 forbids a
 * "show advanced" disclosure — the SE who opens that disclosure is no longer
 * in ROM mode). On submit, toQuoteFormValues fills the hidden fields with the
 * locked ROM defaults from D-04 (= quoteFormDefaults; spreading first preserves
 * forward-compat for any future quoteFormDefaults additions) so the trained
 * model can run on a complete QuoteFormValues input.
 *
 * D-04 defaults summary (= quoteFormDefaults):
 *   - plc_family: "AB Compact Logix" / hmi_family: "AB PanelView Plus"
 *   - all numeric counts: 0
 *   - product/process scale scores: 3 (model's mid-range)
 *   - complexity_score_1_5: 3 / custom_pct: 50
 *   - has_controls: true / has_robotics: true (zeroing both produces a
 *     degenerate prediction; quoteFormDefaults keeps them true)
 *   - all other booleans: false
 *   - visionRows: [] (D-02 — no vision in ROM mode)
 */
import { z } from "zod";

import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";

const requiredString = z.string().trim().min(1, "Required");

export const romFormSchema = z.object({
  industry_segment: requiredString,
  system_category: requiredString,
  automation_level: requiredString,
  // D-16 verbatim: "Enter a material cost greater than zero."
  // `valueAsNumber: true` on the input emits NaN when the field is cleared,
  // which would surface Zod's technical "Expected number, received nan"
  // instead of the friendly D-16 copy. Override invalid_type_error so the
  // blank/cleared path renders the same D-16 message as the 0/negative path.
  estimated_materials_cost: z.coerce
    .number({
      invalid_type_error: "Enter a material cost greater than zero.",
      required_error: "Enter a material cost greater than zero.",
    })
    .positive("Enter a material cost greater than zero."),
});

export type RomFormValues = z.infer<typeof romFormSchema>;

/**
 * Initial values for the ROM form. All four required fields blank/zero so that
 * react-hook-form's required validation prevents submission until the SE fills
 * them in (D-12 — disabled-button + hint).
 */
export const romFormDefaults: RomFormValues = {
  industry_segment: "",
  system_category: "",
  automation_level: "",
  estimated_materials_cost: 0,
};

/**
 * D-04: expand the 4 ROM fields into a complete QuoteFormValues by spreading
 * quoteFormDefaults and overlaying the four ROM-supplied values. This is the
 * input that the romEstimator hands to predictQuote.
 *
 * Spreading quoteFormDefaults FIRST then overlaying the ROM fields keeps this
 * function correct even if quoteFormDefaults grows new fields in a future
 * phase. We deliberately do NOT override visionRows here — quoteFormDefaults
 * already has `visionRows: []`, which is the locked ROM-mode shape (D-02:
 * "no vision in ROM mode").
 */
export function toQuoteFormValues(rom: RomFormValues): QuoteFormValues {
  return {
    ...quoteFormDefaults,
    industry_segment: rom.industry_segment,
    system_category: rom.system_category,
    automation_level: rom.automation_level,
    estimated_materials_cost: rom.estimated_materials_cost,
  };
}
