/**
 * Tests for savedQuoteSchema — types, zod schema, and the inverse of
 * QuoteFormValues ↔ QuoteInput coercion (transformToFormValues).
 *
 * Plan: 05-01. TDD RED → GREEN.
 *
 * W8 mitigation tests: round-trip the production UnifiedQuoteResult fixture
 * through unifiedQuoteResultSchema.parse() and verify .passthrough() preserves
 * unknown fields (forward-compat for Phase 6/7).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  STATUS_CYCLE,
  buildAutoSuggestedName,
  deriveSalesBucket,
  quoteVersionSchema,
  savedQuoteNameSchema,
  savedQuoteSchema,
  transformToFormValues,
  unifiedQuoteResultSchema,
  type QuoteVersion,
  type SavedQuote,
} from "./savedQuoteSchema";
import {
  quoteFormDefaults,
  transformToQuoteInput,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PRODUCTION_UNIFIED_FIXTURE: UnifiedQuoteResult = {
  estimateHours: 1500,
  likelyRangeLow: 1200,
  likelyRangeHigh: 1800,
  overallConfidence: "high",
  perCategory: [
    {
      label: "Mechanical Engineering",
      estimateHours: 800,
      rangeLow: 640,
      rangeHigh: 960,
      confidence: "high",
    },
    {
      label: "Electrical Engineering",
      estimateHours: 240,
      rangeLow: 192,
      rangeHigh: 288,
      confidence: "moderate",
    },
  ],
  topDrivers: [
    { label: "Stations count", direction: "increases", magnitude: "strong" },
    { label: "Vision systems", direction: "increases", magnitude: "moderate" },
  ],
  supportingMatches: {
    label: "Most similar past projects",
    items: [
      { projectId: "p1", projectName: "Alpha", actualHours: 1450, similarity: 0.92 },
      { projectId: "p2", projectName: "Beta", actualHours: 1610, similarity: 0.84 },
    ],
  },
};

function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return { ...quoteFormDefaults, ...over };
}

function makeVersion(over: Partial<QuoteVersion> = {}): QuoteVersion {
  return {
    version: 1,
    savedAt: "2026-05-05T12:00:00.000Z",
    statusAtTime: "draft",
    formValues: makeFormValues(),
    unifiedResult: PRODUCTION_UNIFIED_FIXTURE,
    ...over,
  };
}

function makeSavedQuote(over: Partial<SavedQuote> = {}): SavedQuote {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    schemaVersion: 1,
    name: "Test quote",
    workspace: "real",
    status: "draft",
    createdAt: "2026-05-05T12:00:00.000Z",
    updatedAt: "2026-05-05T12:00:00.000Z",
    versions: [makeVersion()],
    salesBucket: "ME",
    visionLabel: "No vision",
    materialsCost: 0,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// savedQuoteSchema — happy path + zod rejections
// ---------------------------------------------------------------------------

describe("savedQuoteSchema — happy path + rejections", () => {
  it("parses a valid SavedQuote", () => {
    const out = savedQuoteSchema.parse(makeSavedQuote());
    expect(out.name).toBe("Test quote");
    expect(out.versions).toHaveLength(1);
    expect(out.schemaVersion).toBe(1);
  });

  it("rejects empty name (min 1)", () => {
    expect(() => savedQuoteSchema.parse(makeSavedQuote({ name: "" }))).toThrow();
  });

  it("rejects names longer than 80 chars (max 80)", () => {
    expect(() => savedQuoteSchema.parse(makeSavedQuote({ name: "x".repeat(81) }))).toThrow();
  });

  it("rejects unknown status enum values", () => {
    expect(() =>
      savedQuoteSchema.parse(makeSavedQuote({ status: "open" as never })),
    ).toThrow();
  });

  it("rejects unknown workspace enum values", () => {
    expect(() =>
      savedQuoteSchema.parse(makeSavedQuote({ workspace: "neither" as never })),
    ).toThrow();
  });

  it("rejects schemaVersion ≠ 1 (literal forward-compat guard)", () => {
    expect(() =>
      savedQuoteSchema.parse(makeSavedQuote({ schemaVersion: 2 as never })),
    ).toThrow();
  });

  it("rejects versions array of length 0", () => {
    expect(() => savedQuoteSchema.parse(makeSavedQuote({ versions: [] }))).toThrow();
  });

  it("savedQuoteNameSchema trims whitespace", () => {
    expect(savedQuoteNameSchema.parse("  hello  ")).toBe("hello");
  });

  it("STATUS_CYCLE is exactly the five Bertsche-verbatim states in order", () => {
    expect([...STATUS_CYCLE]).toEqual(["draft", "sent", "won", "lost", "revised"]);
  });

  it("quoteVersionSchema rejects version < 1", () => {
    expect(() =>
      quoteVersionSchema.parse(makeVersion({ version: 0 })),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// transformToFormValues — inverse round-trip
// ---------------------------------------------------------------------------

describe("transformToFormValues — inverse of transformToQuoteInput", () => {
  it("round-trips quoteFormDefaults (forward then inverse deep-equals)", () => {
    const wire = transformToQuoteInput(quoteFormDefaults);
    const back = transformToFormValues(wire);
    expect(back).toEqual(quoteFormDefaults);
  });

  it("round-trips a fully-populated form (non-default values)", () => {
    const populated = makeFormValues({
      industry_segment: "Automotive",
      system_category: "Machine Tending",
      automation_level: "Robotic",
      stations_count: 6,
      robot_count: 3,
      has_controls: true,
      has_robotics: false,
      retrofit: true,
      duplicate: false,
      is_product_deformable: true,
      vision_type: "Vision",
      estimated_materials_cost: 50000,
    });
    const wire = transformToQuoteInput(populated);
    const back = transformToFormValues(wire);
    expect(back).toEqual(populated);
  });

  it("inverse-maps log_quoted_materials_cost back to estimated_materials_cost (within 1e-6)", () => {
    const populated = makeFormValues({ estimated_materials_cost: 50000 });
    const wire = transformToQuoteInput(populated);
    const back = transformToFormValues(wire);
    expect(back.estimated_materials_cost).toBeCloseTo(50000, 6);
  });

  it("maps has_controls: 1 back to true and 0 back to false", () => {
    const onWire = transformToQuoteInput(makeFormValues({ has_controls: true }));
    const offWire = transformToQuoteInput(makeFormValues({ has_controls: false }));
    expect(transformToFormValues(onWire).has_controls).toBe(true);
    expect(transformToFormValues(offWire).has_controls).toBe(false);
  });

  it("maps Retrofit (capital R) on wire back to retrofit (lowercase) on form", () => {
    const wire = transformToQuoteInput(makeFormValues({ retrofit: true }));
    expect(wire.Retrofit).toBe(1);
    const back = transformToFormValues(wire);
    expect(back.retrofit).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildAutoSuggestedName — UI-SPEC §"Auto-suggested name format"
// ---------------------------------------------------------------------------

describe("buildAutoSuggestedName", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats with vision label and date for an ME-flavoured form", () => {
    const values = makeFormValues({
      stations_count: 1,
      has_robotics: false,
      servo_axes: 0,
      has_controls: true,
      vision_type: "Vision",
    });
    expect(buildAutoSuggestedName(values, 800)).toBe("ME 800h · Vision · 2026-05-05");
  });

  it("formats 'No vision' when vision_type is 'None'", () => {
    const values = makeFormValues({
      stations_count: 0,
      has_controls: false,
      has_robotics: true,
      servo_axes: 1,
      vision_type: "None",
    });
    expect(buildAutoSuggestedName(values, 240)).toBe("EE 240h · No vision · 2026-05-05");
  });

  it("uses ME+EE bucket when both ME and EE signals present", () => {
    const values = makeFormValues({
      stations_count: 4,
      has_controls: true,
      has_robotics: true,
      servo_axes: 2,
      vision_type: "Vision",
    });
    expect(buildAutoSuggestedName(values, 1200)).toBe(
      "ME+EE 1,200h · Vision · 2026-05-05",
    );
  });

  it("truncates to 80 chars when vision label is huge", () => {
    const values = makeFormValues({
      has_controls: true,
      stations_count: 1,
      vision_type: "x".repeat(120),
    });
    const out = buildAutoSuggestedName(values, 100);
    expect(out.length).toBeLessThanOrEqual(80);
    // Date segment must remain intact at the tail.
    expect(out.endsWith("2026-05-05")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deriveSalesBucket
// ---------------------------------------------------------------------------

describe("deriveSalesBucket", () => {
  it("returns a non-empty string for default form values", () => {
    expect(deriveSalesBucket(quoteFormDefaults).length).toBeGreaterThan(0);
  });

  it("returns 'Quote' fallback when no ME/EE signals", () => {
    const values = makeFormValues({
      stations_count: 0,
      has_controls: false,
      has_robotics: false,
      servo_axes: 0,
    });
    expect(deriveSalesBucket(values)).toBe("Quote");
  });
});

// ---------------------------------------------------------------------------
// W8 — unifiedQuoteResultSchema passthrough fidelity
// ---------------------------------------------------------------------------

describe("unifiedQuoteResultSchema — W8 passthrough fidelity", () => {
  it("safeParse on the production fixture succeeds", () => {
    const result = unifiedQuoteResultSchema.safeParse(PRODUCTION_UNIFIED_FIXTURE);
    expect(result.success).toBe(true);
  });

  it("parse round-trips every key on the production fixture (no truncation)", () => {
    const parsed = unifiedQuoteResultSchema.parse(PRODUCTION_UNIFIED_FIXTURE);
    expect(parsed).toEqual(PRODUCTION_UNIFIED_FIXTURE);
  });

  it("parse preserves unknown forward-compat fields (passthrough)", () => {
    const withExtra = {
      ...PRODUCTION_UNIFIED_FIXTURE,
      futureField: "phase-6-multivision",
    };
    const parsed = unifiedQuoteResultSchema.parse(withExtra);
    expect(parsed).toHaveProperty("futureField", "phase-6-multivision");
  });

  it("preserves unknown nested fields on perCategory rows", () => {
    const withExtra = {
      ...PRODUCTION_UNIFIED_FIXTURE,
      perCategory: PRODUCTION_UNIFIED_FIXTURE.perCategory.map((c) => ({
        ...c,
        nestedFutureField: "phase-7-rom",
      })),
    };
    const parsed = unifiedQuoteResultSchema.parse(withExtra) as {
      perCategory: Array<{ nestedFutureField?: string }>;
    };
    expect(parsed.perCategory[0].nestedFutureField).toBe("phase-7-rom");
  });

  it("preserves unknown nested fields on supportingMatches.items", () => {
    const withExtra = {
      ...PRODUCTION_UNIFIED_FIXTURE,
      supportingMatches: {
        ...PRODUCTION_UNIFIED_FIXTURE.supportingMatches,
        items: PRODUCTION_UNIFIED_FIXTURE.supportingMatches.items.map((it) => ({
          ...it,
          extraScore: 0.42,
        })),
      },
    };
    const parsed = unifiedQuoteResultSchema.parse(withExtra) as {
      supportingMatches: { items: Array<{ extraScore?: number }> };
    };
    expect(parsed.supportingMatches.items[0].extraScore).toBe(0.42);
  });
});
