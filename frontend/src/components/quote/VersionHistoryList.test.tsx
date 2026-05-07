/**
 * Tests for VersionHistoryList — the saved-quote version-history sidebar.
 *
 * Coverage targets (Plan 05-03 <behavior>):
 *  1. Empty state heading + paragraph copy.
 *  2. Single-version copy verbatim (D-07 §"Version history empty").
 *  3. Multi-version newest-first ordering (input order is irrelevant).
 *  4. Each row shows "v{N}" + ISO date.
 *  5. D-07 verbatim row format with three middle-dot separators.
 *  6. StatusChip rendered as read-only span (no button) inside each row.
 *  7. Restore button per row.
 *  8. Restore click dispatches onRestore(versionNumber).
 *  9. <aside> wrapper with aria-labelledby="version-history-title".
 * 10. Heading id is "version-history-title".
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";
import type { QuoteVersion } from "@/lib/savedQuoteSchema";
import { VersionHistoryList } from "./VersionHistoryList";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_UNIFIED_RESULT = {
  estimateHours: 800,
  likelyRangeLow: 640,
  likelyRangeHigh: 960,
  overallConfidence: "high" as const,
  perCategory: [],
  topDrivers: [],
  supportingMatches: { label: "Most similar past projects", items: [] },
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
    unifiedResult: MINIMAL_UNIFIED_RESULT,
    mode: "full",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// VersionHistoryList — empty state
// ---------------------------------------------------------------------------

describe("VersionHistoryList - empty state", () => {
  it("renders the 'Version history' heading even when versions is empty", () => {
    renderWithProviders(
      <VersionHistoryList versions={[]} onRestore={vi.fn()} />,
    );
    expect(screen.getByText("Version history")).toBeInTheDocument();
  });

  it("shows a paragraph (not a list) when versions is empty", () => {
    renderWithProviders(
      <VersionHistoryList versions={[]} onRestore={vi.fn()} />,
    );
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// VersionHistoryList — single-version state (UI-SPEC verbatim)
// ---------------------------------------------------------------------------

describe("VersionHistoryList - single version", () => {
  it("renders the verbatim single-version copy from UI-SPEC", () => {
    renderWithProviders(
      <VersionHistoryList versions={[makeVersion()]} onRestore={vi.fn()} />,
    );
    expect(
      screen.getByText(
        "Only one version saved so far. Edit and re-save to add a version.",
      ),
    ).toBeInTheDocument();
  });

  it("still renders the single version row alongside the single-version copy", () => {
    renderWithProviders(
      <VersionHistoryList
        versions={[makeVersion({ version: 1 })]}
        onRestore={vi.fn()}
      />,
    );
    // The row exists (so Restore is reachable), and so does the helper copy.
    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /restore/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// VersionHistoryList - newest-first ordering
// ---------------------------------------------------------------------------

describe("VersionHistoryList - newest-first ordering", () => {
  it("renders three versions newest-first regardless of input order", () => {
    const versions = [
      makeVersion({ version: 1, savedAt: "2026-05-01T12:00:00.000Z" }),
      makeVersion({ version: 3, savedAt: "2026-05-03T12:00:00.000Z" }),
      makeVersion({ version: 2, savedAt: "2026-05-02T12:00:00.000Z" }),
    ];
    renderWithProviders(
      <VersionHistoryList versions={versions} onRestore={vi.fn()} />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    // DOM order should be v3, v2, v1 (newest version number first).
    expect(rows[0].textContent ?? "").toContain("v3");
    expect(rows[1].textContent ?? "").toContain("v2");
    expect(rows[2].textContent ?? "").toContain("v1");
  });

  it("each row displays vN and the ISO date (YYYY-MM-DD)", () => {
    const versions = [
      makeVersion({ version: 2, savedAt: "2026-05-12T08:30:00.000Z" }),
    ];
    renderWithProviders(
      <VersionHistoryList versions={versions} onRestore={vi.fn()} />,
    );
    const row = screen.getByRole("listitem");
    expect(row.textContent ?? "").toContain("v2");
    expect(row.textContent ?? "").toContain("2026-05-12");
  });
});

// ---------------------------------------------------------------------------
// VersionHistoryList - D-07 verbatim row format
// ---------------------------------------------------------------------------

describe("VersionHistoryList - D-07 row format", () => {
  it("each row matches the verbatim D-07 pattern with three middle-dot separators", () => {
    const versions = [
      makeVersion({
        version: 2,
        statusAtTime: "sent",
        savedAt: "2026-05-05T12:00:00.000Z",
      }),
    ];
    renderWithProviders(
      <VersionHistoryList versions={versions} onRestore={vi.fn()} />,
    );
    const row = screen.getByRole("listitem");
    // Collapse any whitespace inside the row to a single space — the row's
    // inner spans introduce normal-space whitespace between segments. The
    // separator itself is U+00B7 (middle dot) with surrounding spaces.
    const text = (row.textContent ?? "").replace(/\s+/g, " ").trim();
    expect(text).toMatch(/^v2 · 2026-05-05 · sent · Restore$/);
  });

  it("row contains exactly three middle-dot (U+00B7) separator characters", () => {
    const versions = [makeVersion({ version: 1, statusAtTime: "won" })];
    renderWithProviders(
      <VersionHistoryList versions={versions} onRestore={vi.fn()} />,
    );
    const row = screen.getByRole("listitem");
    const dotCount = (row.textContent ?? "").match(/·/g)?.length ?? 0;
    expect(dotCount).toBe(3);
  });

  it("the status label inside the row is one of Ben's verbatim five", () => {
    // Smoke-checks all five states render without crashing and each contains
    // the lowercase status text. (Per-class styling is StatusChip.test.tsx's
    // job; here we only verify the read-only chip renders the label.)
    const states = ["draft", "sent", "won", "lost", "revised"] as const;
    for (const s of states) {
      const { unmount } = renderWithProviders(
        <VersionHistoryList
          versions={[makeVersion({ version: 1, statusAtTime: s })]}
          onRestore={vi.fn()}
        />,
      );
      const row = screen.getByRole("listitem");
      expect(row.textContent ?? "").toContain(s);
      unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// VersionHistoryList - StatusChip read-only inside row
// ---------------------------------------------------------------------------

describe("VersionHistoryList - read-only StatusChip", () => {
  it("the status indicator inside a row is NOT a button (read-only chip)", () => {
    const versions = [makeVersion({ version: 1, statusAtTime: "draft" })];
    renderWithProviders(
      <VersionHistoryList versions={versions} onRestore={vi.fn()} />,
    );
    const row = screen.getByRole("listitem");
    // Only the Restore button should be a <button> inside the row — the chip
    // is a <span> in read-only mode (StatusChip's readOnly variant).
    const buttons = within(row).getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toMatch(/restore/i);
  });
});

// ---------------------------------------------------------------------------
// VersionHistoryList - Restore button + onRestore callback
// ---------------------------------------------------------------------------

describe("VersionHistoryList - Restore button", () => {
  it("clicking Restore on v2 invokes onRestore(2)", () => {
    const fn = vi.fn();
    const versions = [
      makeVersion({ version: 1 }),
      makeVersion({ version: 2 }),
    ];
    renderWithProviders(
      <VersionHistoryList versions={versions} onRestore={fn} />,
    );
    // newest-first: v2 is the first row.
    const rows = screen.getAllByRole("listitem");
    fireEvent.click(within(rows[0]).getByRole("button", { name: /restore/i }));
    expect(fn).toHaveBeenCalledWith(2);
  });

  it("clicking Restore on v1 invokes onRestore(1)", () => {
    const fn = vi.fn();
    const versions = [
      makeVersion({ version: 1 }),
      makeVersion({ version: 2 }),
    ];
    renderWithProviders(
      <VersionHistoryList versions={versions} onRestore={fn} />,
    );
    // newest-first: v1 is the SECOND row.
    const rows = screen.getAllByRole("listitem");
    fireEvent.click(within(rows[1]).getByRole("button", { name: /restore/i }));
    expect(fn).toHaveBeenCalledWith(1);
  });

  it("each row's Restore button has type='button' so it never submits forms", () => {
    const versions = [
      makeVersion({ version: 1 }),
      makeVersion({ version: 2 }),
    ];
    renderWithProviders(
      <VersionHistoryList versions={versions} onRestore={vi.fn()} />,
    );
    const buttons = screen.getAllByRole("button", { name: /restore/i });
    for (const b of buttons) {
      expect(b).toHaveAttribute("type", "button");
    }
  });
});

// ---------------------------------------------------------------------------
// VersionHistoryList - landmark + heading wiring
// ---------------------------------------------------------------------------

describe("VersionHistoryList - landmark wiring", () => {
  it("wraps the list in <aside aria-labelledby='version-history-title'>", () => {
    renderWithProviders(
      <VersionHistoryList
        versions={[makeVersion()]}
        onRestore={vi.fn()}
      />,
    );
    // Use the accessible name "Version history" (which the heading provides
    // via aria-labelledby) to find the complementary landmark.
    const aside = screen.getByRole("complementary", {
      name: /version history/i,
    });
    expect(aside.tagName).toBe("ASIDE");
    expect(aside).toHaveAttribute("aria-labelledby", "version-history-title");
  });

  it("heading element has id='version-history-title'", () => {
    renderWithProviders(
      <VersionHistoryList versions={[]} onRestore={vi.fn()} />,
    );
    const heading = screen.getByText("Version history");
    expect(heading).toHaveAttribute("id", "version-history-title");
  });
});
