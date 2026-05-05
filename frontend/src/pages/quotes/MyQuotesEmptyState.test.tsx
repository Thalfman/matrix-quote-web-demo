/**
 * Tests for MyQuotesEmptyState — empty-list CTA component.
 *
 * Plan 05-06. TDD RED → GREEN.
 *
 * Coverage targets (per plan):
 *   - Renders Sparkles icon (lucide-react) sized 32 with text-amber/40.
 *   - Renders heading "No saved quotes yet" with display-hero class.
 *   - Renders body copy starting "Save your first quote from the Quote tool".
 *   - Renders two link CTAs:
 *       "Open Real-Data Quote tool"      → /compare/quote
 *       "Open Synthetic-Data Quote tool" → /ml/quote
 *   - Each link uses text-teal + hover:underline.
 *   - Container uses card p-12 flex flex-col items-center text-center gap-4.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { MyQuotesEmptyState } from "./MyQuotesEmptyState";

// ---------------------------------------------------------------------------
// MyQuotesEmptyState — copy + structure (UI-SPEC verbatim, jargon-guard scope)
// ---------------------------------------------------------------------------

describe("MyQuotesEmptyState - copy", () => {
  it("renders the heading 'No saved quotes yet'", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    expect(
      screen.getByRole("heading", { name: /No saved quotes yet/i }),
    ).toBeInTheDocument();
  });

  it("heading uses the display-hero class for the empty-state hero", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    const heading = screen.getByRole("heading", {
      name: /No saved quotes yet/i,
    });
    expect(heading.className).toMatch(/display-hero/);
  });

  it("renders the body copy starting 'Save your first quote from the Quote tool'", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    expect(
      screen.getByText(/Save your first quote from the Quote tool/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MyQuotesEmptyState — Sparkles icon
// ---------------------------------------------------------------------------

describe("MyQuotesEmptyState - Sparkles icon", () => {
  it("renders an aria-hidden Sparkles SVG sized 32 with text-amber/40", () => {
    const { container } = renderWithProviders(<MyQuotesEmptyState />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("class") ?? "").toMatch(/text-amber\/40/);
  });
});

// ---------------------------------------------------------------------------
// MyQuotesEmptyState — CTA links
// ---------------------------------------------------------------------------

describe("MyQuotesEmptyState - CTA links", () => {
  it("renders the 'Open Real-Data Quote tool' link with href /compare/quote", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    const link = screen.getByRole("link", {
      name: /Open Real-Data Quote tool/i,
    });
    expect(link.getAttribute("href")).toBe("/compare/quote");
  });

  it("renders the 'Open Synthetic-Data Quote tool' link with href /ml/quote", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    const link = screen.getByRole("link", {
      name: /Open Synthetic-Data Quote tool/i,
    });
    expect(link.getAttribute("href")).toBe("/ml/quote");
  });

  it("Real-Data link uses text-teal + hover:underline", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    const link = screen.getByRole("link", {
      name: /Open Real-Data Quote tool/i,
    });
    expect(link.className).toMatch(/text-teal/);
    expect(link.className).toMatch(/hover:underline/);
  });

  it("Synthetic-Data link uses text-teal + hover:underline", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    const link = screen.getByRole("link", {
      name: /Open Synthetic-Data Quote tool/i,
    });
    expect(link.className).toMatch(/text-teal/);
    expect(link.className).toMatch(/hover:underline/);
  });
});

// ---------------------------------------------------------------------------
// MyQuotesEmptyState — container layout
// ---------------------------------------------------------------------------

describe("MyQuotesEmptyState - container layout", () => {
  it("outer container uses card p-12 flex flex-col items-center text-center gap-4", () => {
    const { container } = renderWithProviders(<MyQuotesEmptyState />);
    const root = container.firstChild as HTMLElement;
    expect(root).not.toBeNull();
    const cls = root.getAttribute("class") ?? "";
    expect(cls).toMatch(/\bcard\b/);
    expect(cls).toMatch(/p-12/);
    expect(cls).toMatch(/flex/);
    expect(cls).toMatch(/flex-col/);
    expect(cls).toMatch(/items-center/);
    expect(cls).toMatch(/text-center/);
    expect(cls).toMatch(/gap-4/);
  });
});

// ---------------------------------------------------------------------------
// MyQuotesEmptyState — jargon-guard hygiene (D-19) — sanity check
// ---------------------------------------------------------------------------

describe("MyQuotesEmptyState - jargon hygiene (sanity)", () => {
  it("body copy does NOT contain ML-jargon strings", () => {
    renderWithProviders(<MyQuotesEmptyState />);
    const body = document.body.textContent ?? "";
    // Guard the obvious offenders; the canonical jargon-guard pass lives in
    // the global DATA-03 test (Plan 09 will add this surface there).
    expect(body).not.toMatch(/training data/i);
    expect(body).not.toMatch(/\bML model\b/i);
    expect(body).not.toMatch(/regression/i);
    expect(body).not.toMatch(/quantile/i);
  });
});
