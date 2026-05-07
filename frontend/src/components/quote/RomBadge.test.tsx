/**
 * Tests for the RomBadge primitive (Phase 7 — D-07 / D-08).
 *
 * Covers: visible text verbatim, aria-label verbatim, locked color tokens
 * (bg-amberSoft / text-ink), eyebrow/uppercase chrome, 28px touch-target
 * chrome, and a local jargon-guard belt-and-suspenders scan (the full
 * repo jargon-guard scan adds RomBadge to its surface set in Plan 07-05).
 */
import { describe, expect, it } from "vitest";

import { RomBadge } from "@/components/quote/RomBadge";
import { BANNED_TOKENS } from "@/test/jargon";
import { renderWithProviders } from "@/test/render";

describe("RomBadge", () => {
  it("renders the literal text 'Preliminary'", () => {
    const { getByText } = renderWithProviders(<RomBadge />);
    expect(getByText("Preliminary")).toBeInTheDocument();
  });

  it("exposes aria-label='Preliminary estimate'", () => {
    const { getByLabelText } = renderWithProviders(<RomBadge />);
    expect(getByLabelText("Preliminary estimate")).toBeInTheDocument();
  });

  it("uses bg-amberSoft + text-ink + eyebrow chrome (D-07)", () => {
    const { getByText } = renderWithProviders(<RomBadge />);
    const span = getByText("Preliminary");
    expect(span.className).toMatch(/bg-amberSoft/);
    expect(span.className).toMatch(/text-ink/);
    expect(span.className).toMatch(/eyebrow/);
  });

  it("uses min-h-[28px] for the locked 28px touch-target chrome", () => {
    const { getByText } = renderWithProviders(<RomBadge />);
    const span = getByText("Preliminary");
    expect(span.className).toMatch(/min-h-\[28px\]/);
  });

  it("renders no banned ML-jargon tokens (DATA-03 belt-and-suspenders)", () => {
    renderWithProviders(<RomBadge />);
    const body = document.body.textContent ?? "";
    for (const re of BANNED_TOKENS) {
      expect(body, `[jargon-guard] RomBadge: ${re}`).not.toMatch(re);
    }
  });
});
