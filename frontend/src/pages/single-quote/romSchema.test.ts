/**
 * Tests for romFormSchema, romFormDefaults, and toQuoteFormValues (Phase 7 — D-02 / D-04).
 *
 * The 4-field ROM zod schema is the contract Plan 07-03 will build the form
 * against. toQuoteFormValues is the bridge to the trained model — Plan 07-02's
 * romEstimator will pass its output to predictQuote.
 */
import { describe, expect, it } from "vitest";

import {
  romFormDefaults,
  romFormSchema,
  toQuoteFormValues,
} from "./romSchema";
import { quoteFormSchema } from "./schema";

describe("romFormSchema", () => {
  it("parses a fully-populated 4-field ROM input", () => {
    const out = romFormSchema.parse({
      industry_segment: "Auto",
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: 245000,
    });
    expect(out).toEqual({
      industry_segment: "Auto",
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: 245000,
    });
  });

  it("rejects estimated_materials_cost: 0 with the verbatim D-16 message", () => {
    const result = romFormSchema.safeParse({
      industry_segment: "Auto",
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Enter a material cost greater than zero.");
    }
  });

  it("rejects estimated_materials_cost: -1 with the same verbatim message", () => {
    const result = romFormSchema.safeParse({
      industry_segment: "Auto",
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Enter a material cost greater than zero.");
    }
  });

  it("rejects missing industry_segment with a 'Required' message", () => {
    const result = romFormSchema.safeParse({
      // industry_segment intentionally omitted
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: 245000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      // Either the schema's "Required" custom message or zod's default
      // "Required"-flavoured message — accept any issue on this path.
      const hasIndustryIssue = result.error.issues.some(
        (i) => i.path.join(".") === "industry_segment",
      );
      expect(hasIndustryIssue).toBe(true);
      // Also assert the literal "Required" string surfaces somewhere.
      expect(messages.join("\n")).toMatch(/Required/);
    }
  });
});

describe("romFormDefaults", () => {
  it("is itself a valid romFormSchema parse target (after react-hook-form fills the four fields)", () => {
    // Defaults have empty strings + 0; schema rejects them. That's intentional —
    // the SE must fill all four before the form enables submit. But the SHAPE
    // matches — applying overrides for the four required fields parses cleanly.
    const filled = {
      ...romFormDefaults,
      industry_segment: "Auto",
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: 1,
    };
    expect(() => romFormSchema.parse(filled)).not.toThrow();
  });

  it("has all four required fields blank / zero by default", () => {
    expect(romFormDefaults.industry_segment).toBe("");
    expect(romFormDefaults.system_category).toBe("");
    expect(romFormDefaults.automation_level).toBe("");
    expect(romFormDefaults.estimated_materials_cost).toBe(0);
  });
});

describe("toQuoteFormValues", () => {
  it("returns a complete QuoteFormValues that satisfies quoteFormSchema.parse() (D-04)", () => {
    const rom = {
      industry_segment: "Auto",
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: 245000,
    };
    const quoteValues = toQuoteFormValues(rom);
    // Must satisfy the parent quoteFormSchema — i.e. every required field
    // has a valid default value supplied from quoteFormDefaults.
    expect(() => quoteFormSchema.parse(quoteValues)).not.toThrow();
  });

  it("overlays the four ROM fields onto quoteFormDefaults verbatim", () => {
    const rom = {
      industry_segment: "Auto",
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: 245000,
    };
    const out = toQuoteFormValues(rom);
    expect(out.industry_segment).toBe("Auto");
    expect(out.system_category).toBe("Robotic Cell");
    expect(out.automation_level).toBe("Semi-Auto");
    expect(out.estimated_materials_cost).toBe(245000);
  });

  it("preserves the locked D-04 hidden defaults (PLC family, HMI family, scores, booleans, visionRows)", () => {
    const rom = {
      industry_segment: "Auto",
      system_category: "Robotic Cell",
      automation_level: "Semi-Auto",
      estimated_materials_cost: 245000,
    };
    const out = toQuoteFormValues(rom);
    // PLC / HMI family defaults from quoteFormDefaults.
    expect(out.plc_family).toBe("AB Compact Logix");
    expect(out.hmi_family).toBe("AB PanelView Plus");
    // Numeric counts default to 0.
    expect(out.stations_count).toBe(0);
    expect(out.robot_count).toBe(0);
    expect(out.servo_axes).toBe(0);
    // Mid-range product/process scale scores.
    expect(out.product_familiarity_score).toBe(3);
    expect(out.product_rigidity).toBe(3);
    expect(out.process_uncertainty_score).toBe(3);
    expect(out.complexity_score_1_5).toBe(3);
    expect(out.custom_pct).toBe(50);
    // Booleans — has_controls / has_robotics stay true (D-04 caveat to avoid
    // degenerate predictions); the rest stay false.
    expect(out.has_controls).toBe(true);
    expect(out.has_robotics).toBe(true);
    expect(out.is_product_deformable).toBe(false);
    expect(out.is_bulk_product).toBe(false);
    expect(out.has_tricky_packaging).toBe(false);
    expect(out.retrofit).toBe(false);
    expect(out.duplicate).toBe(false);
    // visionRows: [] — D-02 "no vision in ROM mode".
    expect(out.visionRows).toEqual([]);
  });
});
