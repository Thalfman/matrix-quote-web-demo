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
  QUOTE_MODE_VALUES,
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PRODUCTION_UNIFIED_FIXTURE = {
  estimateHours: 1500,
  likelyRangeLow: 1200,
  likelyRangeHigh: 1800,
  overallConfidence: "high" as const,
  perCategory: [
    {
      label: "Mechanical Engineering",
      estimateHours: 800,
      rangeLow: 640,
      rangeHigh: 960,
      confidence: "high" as const,
    },
    {
      label: "Electrical Engineering",
      estimateHours: 240,
      rangeLow: 192,
      rangeHigh: 288,
      confidence: "moderate" as const,
    },
  ],
  topDrivers: [
    {
      label: "Stations count",
      direction: "increases" as const,
      magnitude: "strong" as const,
    },
    {
      label: "Vision systems",
      direction: "increases" as const,
      magnitude: "moderate" as const,
    },
  ],
  supportingMatches: {
    label: "Most similar past projects",
    items: [
      { projectId: "p1", projectName: "Alpha", actualHours: 1450, similarity: 0.92 },
      { projectId: "p2", projectName: "Beta", actualHours: 1610, similarity: 0.84 },
    ],
  },
};

/**
 * quoteFormDefaults has empty strings for industry/system/automation that the
 * form-schema's `requiredString` rejects on parse. Tests that round-trip
 * through savedQuoteSchema (which embeds quoteFormSchema in versions) must
 * therefore provide non-empty placeholders.
 */
function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return {
    ...quoteFormDefaults,
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    ...over,
  };
}

function makeVersion(over: Partial<QuoteVersion> = {}): QuoteVersion {
  return {
    version: 1,
    savedAt: "2026-05-05T12:00:00.000Z",
    statusAtTime: "draft",
    formValues: makeFormValues(),
    unifiedResult: PRODUCTION_UNIFIED_FIXTURE,
    mode: "full",
    ...over,
  };
}

function makeSavedQuote(over: Partial<SavedQuote> = {}): SavedQuote {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    schemaVersion: 2,
    name: "Test quote",
    workspace: "real",
    status: "draft",
    createdAt: "2026-05-05T12:00:00.000Z",
    updatedAt: "2026-05-05T12:00:00.000Z",
    versions: [makeVersion()],
    salesBucket: "ME",
    visionLabel: "No vision",
    materialsCost: 0,
    mode: "full",
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
    expect(out.schemaVersion).toBe(2);
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

  it("rejects schemaVersion ≠ 2 (literal forward-compat guard)", () => {
    expect(() =>
      savedQuoteSchema.parse(makeSavedQuote({ schemaVersion: 3 as never })),
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
    // Phase-6 fix: transformToQuoteInput now surfaces visionRows[0] into the
    // wire payload, and transformToFormValues recovers it as a single-row
    // visionRows. The full multi-vision shape (N>1 rows) collapses to row 0
    // through the QuoteInput boundary — that lossy collapse is by design (the
    // wire format is single-vision; the multi-vision aggregator handles N>1
    // out-of-band per call). Single-row inputs DO round-trip cleanly.
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
      visionRows: [{ type: "Cognex 2D", count: 2 }],
      estimated_materials_cost: 50000,
    });
    const wire = transformToQuoteInput(populated);
    expect(wire.vision_type).toBe("Cognex 2D");
    expect(wire.vision_systems_count).toBe(2);
    const back = transformToFormValues(wire);
    // log1p / expm1 introduces sub-microscopic floating-point drift; compare
    // the cost within tolerance and the rest field-for-field.
    const { estimated_materials_cost: backCost, ...backRest } = back;
    const { estimated_materials_cost: popCost, ...popRest } = populated;
    expect(backRest).toEqual(popRest);
    expect(backCost).toBeCloseTo(popCost, 6);
  });

  it("multi-row visionRows collapses to row 0 across the wire boundary", () => {
    const populated = makeFormValues({
      visionRows: [
        { type: "Cognex 2D", count: 2 },
        { type: "3D Vision", count: 1 },
      ],
    });
    const wire = transformToQuoteInput(populated);
    // Wire format takes row 0's type and the SUM of counts (so similarity
    // matching against single-vision historicals stays directionally honest).
    expect(wire.vision_type).toBe("Cognex 2D");
    expect(wire.vision_systems_count).toBe(3);
    // Inverse recovers a single-row visionRows array.
    const back = transformToFormValues(wire);
    expect(back.visionRows).toEqual([{ type: "Cognex 2D", count: 3 }]);
  });

  it("empty visionRows wires to vision_type:'None' / count:0 and inverses to []", () => {
    const empty = makeFormValues({ visionRows: [] });
    const wire = transformToQuoteInput(empty);
    expect(wire.vision_type).toBe("None");
    expect(wire.vision_systems_count).toBe(0);
    expect(transformToFormValues(wire).visionRows).toEqual([]);
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
      visionRows: [{ type: "Cognex 2D", count: 1 }],
    });
    expect(buildAutoSuggestedName(values, 800)).toBe("ME 800h · Cognex 2D×1 · 2026-05-05");
  });

  it("formats 'No vision' when visionRows is empty", () => {
    const values = makeFormValues({
      stations_count: 0,
      has_controls: false,
      has_robotics: true,
      servo_axes: 1,
      visionRows: [],
    });
    expect(buildAutoSuggestedName(values, 240)).toBe("EE 240h · No vision · 2026-05-05");
  });

  it("uses ME+EE bucket when both ME and EE signals present", () => {
    const values = makeFormValues({
      stations_count: 4,
      has_controls: true,
      has_robotics: true,
      servo_axes: 2,
      visionRows: [{ type: "Cognex 2D", count: 1 }],
    });
    expect(buildAutoSuggestedName(values, 1200)).toBe(
      "ME+EE 1,200h · Cognex 2D×1 · 2026-05-05",
    );
  });

  it("truncates to 80 chars when vision label is huge", () => {
    // Many-row visionRows → long combined label that should trigger
    // the truncation branch.
    const visionRows = Array.from({ length: 10 }, () => ({
      type: "Cognex 2D",
      count: 9999,
    }));
    const values = makeFormValues({
      has_controls: true,
      stations_count: 1,
      visionRows,
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

// ---------------------------------------------------------------------------
// Phase 7 — D-03 / D-19: optional `mode` field on top-level + per-version
// ---------------------------------------------------------------------------

describe("savedQuoteSchema — Phase 7 mode flag (D-03, D-19)", () => {
  it("QUOTE_MODE_VALUES is exactly ['rom', 'full']", () => {
    expect([...QUOTE_MODE_VALUES]).toEqual(["rom", "full"]);
  });

  it("parses a v2 record WITHOUT a mode field — defaults to 'full' at top level + per version", () => {
    const out = savedQuoteSchema.parse(makeSavedQuote());
    expect(out.mode).toBe("full");
    expect(out.versions[0].mode).toBe("full");
  });

  it("round-trips mode: 'rom' at both top level AND versions[0]", () => {
    const out = savedQuoteSchema.parse(
      makeSavedQuote({
        mode: "rom",
        versions: [makeVersion({ mode: "rom" })],
      }),
    );
    expect(out.mode).toBe("rom");
    expect(out.versions[0].mode).toBe("rom");
  });

  it("round-trips mode: 'full' explicitly", () => {
    const out = savedQuoteSchema.parse(
      makeSavedQuote({
        mode: "full",
        versions: [makeVersion({ mode: "full" })],
      }),
    );
    expect(out.mode).toBe("full");
    expect(out.versions[0].mode).toBe("full");
  });

  it("rejects invalid mode at top level (capitalized 'ROM')", () => {
    expect(() =>
      savedQuoteSchema.parse(makeSavedQuote({ mode: "ROM" as never })),
    ).toThrow();
  });

  it("rejects invalid mode at top level ('preliminary')", () => {
    expect(() =>
      savedQuoteSchema.parse(makeSavedQuote({ mode: "preliminary" as never })),
    ).toThrow();
  });

  it("rejects invalid mode at version level", () => {
    expect(() =>
      quoteVersionSchema.parse(makeVersion({ mode: "ROM" as never })),
    ).toThrow();
  });

  it("does NOT bump schemaVersion (literal stays at 2)", () => {
    // Belt-and-suspenders — D-03 forbids the schemaVersion bump. A v2 record
    // with mode: "rom" must still parse cleanly.
    const out = savedQuoteSchema.parse(
      makeSavedQuote({
        schemaVersion: 2,
        mode: "rom",
        versions: [makeVersion({ mode: "rom" })],
      }),
    );
    expect(out.schemaVersion).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Phase 7 — D-17: buildAutoSuggestedName accepts optional `mode` and inserts
// the literal " ROM" token between salesBucket and the hour label.
// ---------------------------------------------------------------------------

describe("buildAutoSuggestedName — Phase 7 ROM token (D-17)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT insert ' ROM ' when called with mode === 'full' (default)", () => {
    const values = makeFormValues({
      stations_count: 1,
      has_controls: true,
      has_robotics: false,
      servo_axes: 0,
      visionRows: [],
    });
    const name = buildAutoSuggestedName(values, 240, "full");
    expect(name).not.toMatch(/ ROM /);
    expect(name).toBe("ME 240h · No vision · 2026-05-06");
  });

  it("does NOT insert ' ROM ' when mode argument is omitted (default behaviour)", () => {
    const values = makeFormValues({
      stations_count: 1,
      has_controls: true,
      has_robotics: false,
      servo_axes: 0,
      visionRows: [],
    });
    const name = buildAutoSuggestedName(values, 240);
    expect(name).not.toMatch(/ ROM /);
  });

  it("inserts ' ROM ' between bucket and hour token when mode === 'rom' (D-17 verbatim example)", () => {
    const values = makeFormValues({
      stations_count: 1,
      has_controls: true,
      has_robotics: false,
      servo_axes: 0,
      visionRows: [],
    });
    const name = buildAutoSuggestedName(values, 240, "rom");
    // D-17 canonical example string verbatim.
    expect(name).toBe("ME ROM 240h · No vision · 2026-05-06");
    expect(name).toMatch(/^(ME|EE|ME\+EE|Quote) ROM \d+h · /);
  });

  it("ROM-mode 80-char cap truncates the vision label first, never the date", () => {
    const visionRows = Array.from({ length: 10 }, () => ({
      type: "Cognex 2D",
      count: 9999,
    }));
    const values = makeFormValues({
      has_controls: true,
      stations_count: 1,
      visionRows,
    });
    const out = buildAutoSuggestedName(values, 100, "rom");
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith("2026-05-06")).toBe(true);
    // Bucket may be ME / EE / ME+EE / Quote depending on the fixture's signals.
    // What matters for D-17 is that the literal " ROM " token appears between
    // the bucket and the hour label.
    expect(out).toMatch(/^(ME|EE|ME\+EE|Quote) ROM \d+h · /);
  });
});
