import { describe, expect, it } from "vitest";

import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";
import { buildAutoSuggestedName } from "@/lib/savedQuoteSchema";

function fv(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return { ...quoteFormDefaults, ...over };
}

describe("buildAutoSuggestedName — visionRows derivation (Phase 6 D-12)", () => {
  it("empty visionRows produces 'No vision' label", () => {
    const name = buildAutoSuggestedName(fv({ visionRows: [] }), 800);
    expect(name).toContain("No vision");
    expect(name).not.toContain("2D");
    expect(name).not.toContain("3D");
  });

  it("single 2D row produces '2D×2' label", () => {
    const name = buildAutoSuggestedName(
      fv({ visionRows: [{ type: "2D", count: 2 }] }),
      800,
    );
    expect(name).toContain("2D×2");
  });

  it("multi-row visionRows produces a '+'-joined label", () => {
    const name = buildAutoSuggestedName(
      fv({
        visionRows: [
          { type: "2D", count: 2 },
          { type: "3D", count: 1 },
        ],
      }),
      800,
    );
    expect(name).toContain("2D×2+3D×1");
  });

  it("truncates to <= 80 chars even with many rows", () => {
    const manyRows = Array.from({ length: 20 }, () => ({ type: "2D" as const, count: 99 }));
    const name = buildAutoSuggestedName(fv({ visionRows: manyRows }), 800);
    expect(name.length).toBeLessThanOrEqual(80);
  });

  it("output uses plain-language vision label (no ML jargon)", () => {
    const name = buildAutoSuggestedName(
      fv({ visionRows: [{ type: "3D", count: 1 }] }),
      1234,
    );
    expect(name).not.toMatch(/\bP50\b|\bP10\b|\bP90\b|\bR²|gradient boosting|confidence intervals/i);
  });
});
