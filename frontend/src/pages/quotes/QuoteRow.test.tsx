/**
 * Tests for QuoteRow — list-page row composing StatusChip + WorkspacePill.
 *
 * Plan 05-06. TDD RED → GREEN.
 *
 * Coverage targets (per plan):
 *   - Renders quote name, "Saved {YYYY-MM-DD}" derived from updatedAt.
 *   - Renders StatusChip with current status (Plan 02 component).
 *   - Renders WorkspacePill with workspace (Plan 02 component).
 *   - Renders salesBucket / visionLabel / materialsCost (mono).
 *   - Renders a Trash2 delete icon button.
 *   - Row body click navigates to /quotes/:id.
 *   - StatusChip click stops propagation; calls onAdvanceStatus(id, next); does NOT navigate.
 *   - Delete icon click stops propagation; calls onRequestDelete(id, name); does NOT navigate.
 *   - Row is keyboard-activatable (Enter / Space) and exposes role="button".
 *   - Row container has min-h-[56px] + border-b hairline + last:border-b-0.
 */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { SavedQuote, QuoteVersion } from "@/lib/savedQuoteSchema";
import { quoteFormDefaults, type QuoteFormValues } from "@/pages/single-quote/schema";

// ---------------------------------------------------------------------------
// useNavigate mock (canonical: keep all of react-router-dom intact except useNavigate)
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

// Import the SUT after the mock is registered.
import { QuoteRow } from "./QuoteRow";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PRODUCTION_UNIFIED_FIXTURE = {
  estimateHours: 1500,
  likelyRangeLow: 1200,
  likelyRangeHigh: 1800,
  overallConfidence: "high" as const,
  perCategory: [],
  topDrivers: [],
  supportingMatches: { label: "Most similar past projects", items: [] },
};

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
    ...over,
  };
}

function makeQuote(over: Partial<SavedQuote> = {}): SavedQuote {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    schemaVersion: 1,
    name: "Alpha quote",
    workspace: "real",
    status: "draft",
    createdAt: "2026-05-05T12:00:00.000Z",
    updatedAt: "2026-05-05T12:00:00.000Z",
    versions: [makeVersion()],
    salesBucket: "ME",
    visionLabel: "Vision",
    materialsCost: 245000,
    ...over,
  };
}

beforeEach(() => {
  mockNavigate.mockReset();
});

// ---------------------------------------------------------------------------
// QuoteRow — content rendering
// ---------------------------------------------------------------------------

describe("QuoteRow - content rendering", () => {
  it("renders the quote name as text-sm font-medium", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ name: "Alpha quote" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const name = screen.getByText("Alpha quote");
    expect(name.className).toMatch(/text-sm/);
    expect(name.className).toMatch(/font-medium/);
  });

  it("renders 'Saved YYYY-MM-DD' derived from updatedAt", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ updatedAt: "2026-05-05T12:00:00.000Z" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/Saved 2026-05-05/i)).toBeInTheDocument();
  });

  it("renders the StatusChip (Plan 02) with the current status text", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ status: "sent" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    // StatusChip renders the literal lowercase status string.
    expect(screen.getByText("sent")).toBeInTheDocument();
  });

  it("renders the WorkspacePill (Plan 02) with the current workspace text", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ workspace: "synthetic" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("synthetic")).toBeInTheDocument();
  });

  it("renders salesBucket text", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ salesBucket: "ME+EE" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("ME+EE")).toBeInTheDocument();
  });

  it("renders visionLabel text", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ visionLabel: "2D" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("2D")).toBeInTheDocument();
  });

  it("renders materialsCost as locale-formatted dollars in a mono span", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ materialsCost: 245000 })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const cost = screen.getByText("$245,000");
    expect(cost.tagName).toBe("SPAN");
    expect(cost.className).toMatch(/mono/);
  });

  it("renders a delete icon button with an aria-label including the quote name", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ name: "Alpha quote" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Delete quote Alpha quote/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// QuoteRow - row body click navigates
// ---------------------------------------------------------------------------

describe("QuoteRow - navigation", () => {
  it("clicking the row body navigates to /quotes/:id", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ id: "11111111-1111-4111-8111-111111111111" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: /Open saved quote/i });
    fireEvent.click(row);
    expect(mockNavigate).toHaveBeenCalledWith(
      "/quotes/11111111-1111-4111-8111-111111111111",
    );
  });

  it("Enter on the focused row navigates to /quotes/:id", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ id: "22222222-2222-4222-8222-222222222222" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: /Open saved quote/i });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith(
      "/quotes/22222222-2222-4222-8222-222222222222",
    );
  });

  it("Space on the focused row navigates to /quotes/:id", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ id: "33333333-3333-4333-8333-333333333333" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: /Open saved quote/i });
    fireEvent.keyDown(row, { key: " " });
    expect(mockNavigate).toHaveBeenCalledWith(
      "/quotes/33333333-3333-4333-8333-333333333333",
    );
  });
});

// ---------------------------------------------------------------------------
// QuoteRow - StatusChip click does NOT navigate; calls onAdvanceStatus
// ---------------------------------------------------------------------------

describe("QuoteRow - StatusChip click stops propagation", () => {
  it("clicking the StatusChip calls onAdvanceStatus(id, next) with the cycled status", () => {
    const onAdvanceStatus = vi.fn();
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({
          id: "11111111-1111-4111-8111-111111111111",
          status: "draft",
        })}
        onAdvanceStatus={onAdvanceStatus}
        onRequestDelete={vi.fn()}
      />,
    );
    const chip = screen.getByRole("button", {
      name: /Status: draft. Click to advance/i,
    });
    fireEvent.click(chip);
    expect(onAdvanceStatus).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "sent",
    );
  });

  it("clicking the StatusChip does NOT navigate (stopPropagation)", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote()}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const chip = screen.getByRole("button", {
      name: /Status: draft. Click to advance/i,
    });
    fireEvent.click(chip);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// QuoteRow - delete icon click does NOT navigate; calls onRequestDelete
// ---------------------------------------------------------------------------

describe("QuoteRow - delete icon click stops propagation", () => {
  it("clicking the delete icon calls onRequestDelete(id, name)", () => {
    const onRequestDelete = vi.fn();
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({
          id: "11111111-1111-4111-8111-111111111111",
          name: "Alpha quote",
        })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={onRequestDelete}
      />,
    );
    const deleteBtn = screen.getByRole("button", {
      name: /Delete quote Alpha quote/i,
    });
    fireEvent.click(deleteBtn);
    expect(onRequestDelete).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "Alpha quote",
    );
  });

  it("clicking the delete icon does NOT navigate (stopPropagation)", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ name: "Alpha quote" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const deleteBtn = screen.getByRole("button", {
      name: /Delete quote Alpha quote/i,
    });
    fireEvent.click(deleteBtn);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Enter on the focused delete icon does NOT navigate (keydown stopPropagation)", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ name: "Alpha quote" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const deleteBtn = screen.getByRole("button", {
      name: /Delete quote Alpha quote/i,
    });
    fireEvent.keyDown(deleteBtn, { key: "Enter" });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Space on the focused delete icon does NOT navigate (keydown stopPropagation)", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ name: "Alpha quote" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const deleteBtn = screen.getByRole("button", {
      name: /Delete quote Alpha quote/i,
    });
    fireEvent.keyDown(deleteBtn, { key: " " });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// QuoteRow - container layout / a11y
// ---------------------------------------------------------------------------

describe("QuoteRow - container layout", () => {
  it("row container exposes role='button' and the open-saved-quote aria-label", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote({ name: "Alpha quote" })}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", {
      name: /Open saved quote Alpha quote/i,
    });
    expect(row).toBeInTheDocument();
  });

  it("row container has min-h-[56px], border-b hairline, last:border-b-0", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote()}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: /Open saved quote/i });
    expect(row.className).toMatch(/min-h-\[56px\]/);
    expect(row.className).toMatch(/border-b/);
    expect(row.className).toMatch(/hairline/);
    expect(row.className).toMatch(/last:border-b-0/);
  });

  it("row container has tabIndex=0 (keyboard focusable)", () => {
    renderWithProviders(
      <QuoteRow
        quote={makeQuote()}
        onAdvanceStatus={vi.fn()}
        onRequestDelete={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: /Open saved quote/i });
    expect(row.getAttribute("tabIndex")).toBe("0");
  });
});
