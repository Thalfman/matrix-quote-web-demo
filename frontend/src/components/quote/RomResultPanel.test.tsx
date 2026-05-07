/**
 * Phase 7 — RomResultPanel render tests + SC-3 side-by-side differential.
 *
 * Coverage (12 it() cases + 1 SC-3 differential):
 *   - hero RomBadge ('Preliminary') is present
 *   - no confidence-chip label rendered (D-08)
 *   - 'Why this is preliminary' verbatim D-13 copy
 *   - sanity-banner D-15 copy when rom.sanityFlag is true
 *   - sanity-banner copy ABSENT when rom.sanityFlag is false
 *   - combined-totals row (D-06: replaces per-category H/M/L)
 *   - HIDDEN: top-drivers card (D-06)
 *   - HIDDEN: per-category H/M/L breakdown (D-06)
 *   - HIDDEN: per-vision contribution section (D-06)
 *   - SaveQuoteButton receives mode='rom' (D-19)
 *   - supporting matches REMAIN unchanged
 *   - jargon-guard local scan
 *   - SC-3 side-by-side: 'Preliminary' + 'Why this is preliminary' only
 *     in the ROM render; top-drivers heading only in the full render
 */
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { BANNED_TOKENS } from "@/test/jargon";
import {
  RomResultPanel,
  WHY_PRELIMINARY_COPY,
  SANITY_BANNER_COPY,
} from "@/components/quote/RomResultPanel";
import { QuoteResultPanel } from "@/components/quote/QuoteResultPanel";
import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import type { RomMetadata } from "@/demo/romEstimator";

// SaveQuoteButton has its own test surface; spy on it here to capture the
// `mode` prop. Importing the live component requires a TanStack QueryClient
// and would expand the harness needlessly — mock to keep this test focused.
const SaveQuoteButtonSpy = vi.fn((_props: Record<string, unknown>) => null);
vi.mock("@/components/quote/SaveQuoteButton", () => ({
  SaveQuoteButton: (props: Record<string, unknown>) => {
    SaveQuoteButtonSpy(props);
    return <div data-testid="save-quote-button" />;
  },
}));

function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return {
    ...quoteFormDefaults,
    industry_segment: "Automotive",
    system_category: "Robotic Cell",
    automation_level: "Semi-Auto",
    estimated_materials_cost: 245_000,
    ...over,
  };
}

const BASE_RESULT: UnifiedQuoteResult = {
  estimateHours: 240,
  likelyRangeLow: 140,
  likelyRangeHigh: 340,
  overallConfidence: "moderate",
  perCategory: [
    // Even when the upstream estimator widens these, the ROM panel must NOT
    // render them. We pick a uniquely-identifiable label so the negative
    // assertion is unambiguous.
    {
      label: "Mechanical Engineering",
      estimateHours: 120,
      rangeLow: 80,
      rangeHigh: 160,
      confidence: "moderate",
    },
  ],
  topDrivers: [
    // ROM panel must NOT render these.
    {
      label: "Number of stations",
      direction: "increases",
      magnitude: "strong",
    },
  ],
  supportingMatches: {
    label: "Most similar past projects",
    items: [
      {
        projectId: "p1",
        projectName: "Alpha Build Cell",
        actualHours: 250,
        similarity: 0.92,
      },
    ],
  },
};

const BASE_ROM: RomMetadata = {
  mode: "rom",
  bandMultiplier: 1.75,
  baselineRate: 0.0008,
  sanityFlag: false,
};

describe("RomResultPanel", () => {
  it("renders the RomBadge 'Preliminary' on the hero card", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    expect(document.body.textContent).toContain("Preliminary");
  });

  it("does NOT render any confidence-chip label (D-08)", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/high confidence|moderate confidence|lower confidence/i);
  });

  it("renders the Why-this-is-preliminary verbatim D-13 copy", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    const body = document.body.textContent ?? "";
    expect(body).toContain(WHY_PRELIMINARY_COPY);
  });

  it("renders the sanity-banner D-15 copy when rom.sanityFlag is true", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={{ ...BASE_ROM, sanityFlag: true }}
      />,
    );
    expect(document.body.textContent).toContain(SANITY_BANNER_COPY);
  });

  it("does NOT render the sanity-banner copy when rom.sanityFlag is false", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    expect(document.body.textContent).not.toContain(SANITY_BANNER_COPY);
  });

  it("renders the combined-totals row (D-06) — sales-bucket label + hours + range", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    const body = document.body.textContent ?? "";
    // quoteFormDefaults: has_controls:true + has_robotics:true → "ME+EE".
    expect(body).toMatch(/ME\+EE/);
    expect(body).toMatch(/240/); // estimateHours
    expect(body).toMatch(/140/); // likelyRangeLow
    expect(body).toMatch(/340/); // likelyRangeHigh
  });

  it("does NOT render the top-drivers card (D-06 HIDDEN)", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    expect(document.body.textContent).not.toMatch(/what drives this estimate/i);
  });

  it("does NOT render the per-category H/M/L breakdown (D-06 HIDDEN)", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    // The unique BASE_RESULT.perCategory[0].label must NOT surface anywhere
    // in the ROM render.
    expect(document.body.textContent).not.toMatch(/mechanical engineering/i);
  });

  it("does NOT render the per-vision contribution section (D-06 HIDDEN)", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    expect(document.body.textContent).not.toMatch(/per-vision contribution/i);
  });

  it("threads mode='rom' to SaveQuoteButton (D-19)", () => {
    SaveQuoteButtonSpy.mockClear();
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
        workspace="real"
      />,
    );
    expect(SaveQuoteButtonSpy).toHaveBeenCalled();
    const firstCall = SaveQuoteButtonSpy.mock.calls[0];
    const props = firstCall[0] as { mode?: string };
    expect(props.mode).toBe("rom");
  });

  it("renders supporting matches unchanged (D-06 REMAIN)", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    expect(document.body.textContent).toMatch(/alpha build cell/i);
  });

  it("renders no banned ML-jargon tokens (DATA-03)", () => {
    renderWithProviders(
      <RomResultPanel
        result={BASE_RESULT}
        input={makeFormValues()}
        rom={BASE_ROM}
      />,
    );
    const body = document.body.textContent ?? "";
    for (const re of BANNED_TOKENS) {
      expect(body, `[jargon-guard] RomResultPanel: ${re}`).not.toMatch(re);
    }
  });

  // -------------------------------------------------------------------------
  // SC-3 (non-tech reviewer side-by-side recognition) — grep-verifiable
  // differential render. Renders BOTH panels with equivalent inputs and
  // asserts the chrome differences appear ONLY where they should.
  //
  // RTL's auto-cleanup runs between tests, but inside ONE test we render
  // each panel sequentially and unmount before the next render so the body
  // text scope is unambiguous.
  // -------------------------------------------------------------------------
  it("SC-3 side-by-side: only ROM render carries 'Preliminary' + 'Why this is preliminary'; only full render carries top-drivers heading", () => {
    const inputs = makeFormValues();

    // ROM panel
    const { unmount: unmountRom } = renderWithProviders(
      <RomResultPanel result={BASE_RESULT} input={inputs} rom={BASE_ROM} />,
    );
    const romBody = document.body.textContent ?? "";
    expect(romBody).toContain("Preliminary");
    expect(romBody).toContain("Why this is preliminary");
    expect(romBody).not.toMatch(/what drives this estimate/i);
    unmountRom();

    // Full panel — re-render in a clean DOM
    renderWithProviders(
      <QuoteResultPanel result={BASE_RESULT} input={inputs} />,
    );
    const fullBody = document.body.textContent ?? "";
    // Only ROM has "Preliminary" — full render must NOT.
    expect(fullBody).not.toContain("Preliminary");
    expect(fullBody).not.toContain("Why this is preliminary");
    // Full panel renders the top-drivers section heading
    // (QuoteResultPanel.tsx line 98: "What drives this estimate").
    expect(fullBody).toMatch(/what drives this estimate/i);
  });
});
