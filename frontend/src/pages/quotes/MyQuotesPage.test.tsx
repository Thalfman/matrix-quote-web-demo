/**
 * Tests for MyQuotesPage — /quotes route page.
 *
 * Plan 05-07. TDD RED → GREEN.
 *
 * Coverage targets:
 *   - Heading "My Quotes" + verbatim subhead.
 *   - Loading state ("Loading saved quotes…").
 *   - Error state ("Couldn't open your saved quotes" + body copy).
 *   - Empty state (<MyQuotesEmptyState />).
 *   - Populated state — list of QuoteRow.
 *   - SortControls default = "date" and reorders on change.
 *   - Sort by name = locale-aware case-insensitive.
 *   - Sort by status = draft → revised → sent → won → lost.
 *   - Status chip click → useSetStatus().mutateAsync({id, status: next}).
 *   - Delete icon click → DeleteQuoteModal opens with quote name.
 *   - DeleteQuoteModal close → modal disappears.
 *   - No ML jargon in any rendered text.
 */
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { QuoteVersion, SavedQuote } from "@/lib/savedQuoteSchema";
import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";

// ---------------------------------------------------------------------------
// Hoisted mocks for hook + sonner
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => ({
  mockUseSavedQuotes: vi.fn(),
  mockMutateSetStatus: vi.fn(),
  mockMutateDelete: vi.fn(),
}));

const { mockUseSavedQuotes, mockMutateSetStatus, mockMutateDelete } = hoisted;

vi.mock("@/hooks/useSavedQuotes", () => ({
  useSavedQuotes: () => hoisted.mockUseSavedQuotes(),
  useSetStatus: () => ({
    mutateAsync: hoisted.mockMutateSetStatus,
    isPending: false,
  }),
  useDeleteQuote: () => ({
    mutateAsync: hoisted.mockMutateDelete,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// useNavigate spy — QuoteRow uses it; we don't navigate during these tests but
// we must keep the rest of react-router-dom intact (Link from MyQuotesEmptyState).
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { MyQuotesPage } from "./MyQuotesPage";

// ---------------------------------------------------------------------------
// Fixture helpers
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

// ---------------------------------------------------------------------------
// Default isLoading = false / error = null / data = []
// ---------------------------------------------------------------------------

function setHookState(state: {
  data?: SavedQuote[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
}) {
  mockUseSavedQuotes.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
  });
}

beforeEach(() => {
  mockUseSavedQuotes.mockReset();
  mockMutateSetStatus.mockReset();
  mockMutateDelete.mockReset();
  mockNavigate.mockReset();
  // Default: empty list, not loading, no error.
  setHookState({ data: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Page heading + subhead
// ---------------------------------------------------------------------------

describe("MyQuotesPage - heading + subhead", () => {
  it("renders the 'My Quotes' page heading", () => {
    setHookState({ data: [] });
    renderWithProviders(<MyQuotesPage />);
    expect(
      screen.getByRole("heading", { name: /my quotes/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders the verbatim subhead from UI-SPEC", () => {
    setHookState({ data: [] });
    renderWithProviders(<MyQuotesPage />);
    expect(
      screen.getByText(
        /Saved quotes from both Real and Synthetic workspaces\. Open one to revise its inputs and re-estimate\./,
      ),
    ).toBeInTheDocument();
  });

  it("renders the SortControls 'Sort by:' group", () => {
    setHookState({ data: [] });
    renderWithProviders(<MyQuotesPage />);
    expect(screen.getByRole("group", { name: /sort by/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /date saved/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("MyQuotesPage - loading state", () => {
  it("renders 'Loading saved quotes…' when isLoading=true", () => {
    setHookState({ isLoading: true, data: undefined });
    renderWithProviders(<MyQuotesPage />);
    expect(screen.getByText(/loading saved quotes/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe("MyQuotesPage - error state", () => {
  it("renders the error heading + body when error is set", () => {
    setHookState({ error: new Error("boom"), data: undefined });
    renderWithProviders(<MyQuotesPage />);
    expect(
      screen.getByText(/couldn[’']t open your saved quotes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/browser storage didn[’']t respond/i),
    ).toBeInTheDocument();
  });

  it("error container exposes role='alert' for screen readers", () => {
    setHookState({ error: new Error("boom"), data: undefined });
    renderWithProviders(<MyQuotesPage />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("MyQuotesPage - empty state", () => {
  it("renders <MyQuotesEmptyState /> when data is empty", () => {
    setHookState({ data: [] });
    renderWithProviders(<MyQuotesPage />);
    expect(
      screen.getByRole("heading", { name: /no saved quotes yet/i }),
    ).toBeInTheDocument();
    // CTA links from MyQuotesEmptyState.
    expect(
      screen.getByRole("link", { name: /open real-data quote tool/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Populated state — three rows
// ---------------------------------------------------------------------------

describe("MyQuotesPage - populated state", () => {
  it("renders one QuoteRow per saved quote", () => {
    setHookState({
      data: [
        makeQuote({ id: "id-1", name: "Alpha quote" }),
        makeQuote({ id: "id-2", name: "Bravo quote" }),
        makeQuote({ id: "id-3", name: "Charlie quote" }),
      ],
    });
    renderWithProviders(<MyQuotesPage />);
    expect(
      screen.getByRole("button", { name: /open saved quote alpha quote/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open saved quote bravo quote/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open saved quote charlie quote/i }),
    ).toBeInTheDocument();
  });

  it("rows live inside a single .card container", () => {
    setHookState({
      data: [
        makeQuote({ id: "id-1", name: "Alpha quote" }),
        makeQuote({ id: "id-2", name: "Bravo quote" }),
      ],
    });
    const { container } = renderWithProviders(<MyQuotesPage />);
    const cards = container.querySelectorAll("div.card");
    // One .card from the list wrapper. (Empty/error states render no list card.)
    const listCards = Array.from(cards).filter((c) =>
      c.querySelectorAll('[role="button"][aria-label^="Open saved quote"]')
        .length > 0,
    );
    expect(listCards).toHaveLength(1);
    expect(
      listCards[0].querySelectorAll(
        '[role="button"][aria-label^="Open saved quote"]',
      ),
    ).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Sort behaviour
// ---------------------------------------------------------------------------

describe("MyQuotesPage - sort", () => {
  function getRowOrder(): string[] {
    const rows = screen.getAllByRole("button", {
      name: /open saved quote/i,
    });
    return rows.map((r) => r.getAttribute("aria-label") ?? "");
  }

  it("defaults to date-desc (newest updatedAt first)", () => {
    setHookState({
      data: [
        makeQuote({
          id: "old",
          name: "Old quote",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
        makeQuote({
          id: "new",
          name: "New quote",
          updatedAt: "2026-05-05T00:00:00.000Z",
        }),
        makeQuote({
          id: "mid",
          name: "Mid quote",
          updatedAt: "2026-03-03T00:00:00.000Z",
        }),
      ],
    });
    renderWithProviders(<MyQuotesPage />);
    const order = getRowOrder();
    expect(order[0]).toMatch(/new quote/i);
    expect(order[1]).toMatch(/mid quote/i);
    expect(order[2]).toMatch(/old quote/i);
  });

  it("clicking 'Name' sorts case-insensitively A→Z", () => {
    setHookState({
      data: [
        makeQuote({ id: "1", name: "charlie" }),
        makeQuote({ id: "2", name: "Alpha" }),
        makeQuote({ id: "3", name: "Bravo" }),
      ],
    });
    renderWithProviders(<MyQuotesPage />);
    fireEvent.click(screen.getByRole("button", { name: /^name$/i }));
    const order = getRowOrder();
    expect(order[0]).toMatch(/alpha/i);
    expect(order[1]).toMatch(/bravo/i);
    expect(order[2]).toMatch(/charlie/i);
  });

  it("clicking 'Status' sorts draft → revised → sent → won → lost", () => {
    setHookState({
      data: [
        makeQuote({ id: "won", name: "Won quote", status: "won" }),
        makeQuote({ id: "draft", name: "Draft quote", status: "draft" }),
        makeQuote({ id: "lost", name: "Lost quote", status: "lost" }),
        makeQuote({ id: "revised", name: "Revised quote", status: "revised" }),
        makeQuote({ id: "sent", name: "Sent quote", status: "sent" }),
      ],
    });
    renderWithProviders(<MyQuotesPage />);
    fireEvent.click(screen.getByRole("button", { name: /^status$/i }));
    const order = getRowOrder();
    expect(order[0]).toMatch(/draft quote/i);
    expect(order[1]).toMatch(/revised quote/i);
    expect(order[2]).toMatch(/sent quote/i);
    expect(order[3]).toMatch(/won quote/i);
    expect(order[4]).toMatch(/lost quote/i);
  });
});

// ---------------------------------------------------------------------------
// Status-chip click → useSetStatus mutation
// ---------------------------------------------------------------------------

describe("MyQuotesPage - status chip click", () => {
  it("clicking a row's status chip calls setStatus.mutateAsync({id, status: next})", () => {
    setHookState({
      data: [
        makeQuote({
          id: "11111111-1111-4111-8111-111111111111",
          name: "Alpha quote",
          status: "draft",
        }),
      ],
    });
    renderWithProviders(<MyQuotesPage />);
    const chip = screen.getByRole("button", {
      name: /status: draft\. click to advance/i,
    });
    fireEvent.click(chip);
    expect(mockMutateSetStatus).toHaveBeenCalledWith({
      id: "11111111-1111-4111-8111-111111111111",
      status: "sent",
    });
  });
});

// ---------------------------------------------------------------------------
// Delete-flow — open modal, then close on cancel
// ---------------------------------------------------------------------------

describe("MyQuotesPage - delete flow", () => {
  it("clicking a row's delete icon opens DeleteQuoteModal with the quote name", () => {
    setHookState({
      data: [
        makeQuote({
          id: "11111111-1111-4111-8111-111111111111",
          name: "Alpha quote",
        }),
      ],
    });
    renderWithProviders(<MyQuotesPage />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const deleteBtn = screen.getByRole("button", {
      name: /delete quote alpha quote/i,
    });
    fireEvent.click(deleteBtn);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // The verbatim D-17 body interpolates the quote name in <strong>.
    const strong = screen.getByText("Alpha quote", { selector: "strong" });
    expect(strong).toBeInTheDocument();
  });

  it("clicking 'Keep it' closes the DeleteQuoteModal", () => {
    setHookState({
      data: [
        makeQuote({
          id: "11111111-1111-4111-8111-111111111111",
          name: "Alpha quote",
        }),
      ],
    });
    renderWithProviders(<MyQuotesPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /delete quote alpha quote/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /keep it/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Jargon-guard hygiene (sanity — Plan 09 owns the canonical scan)
// ---------------------------------------------------------------------------

describe("MyQuotesPage - jargon hygiene (sanity)", () => {
  it("rendered chrome contains no ML-jargon strings", () => {
    setHookState({
      data: [
        makeQuote({ id: "id-1", name: "Alpha quote" }),
      ],
    });
    renderWithProviders(<MyQuotesPage />);
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/training data/i);
    expect(body).not.toMatch(/\bML model\b/i);
    expect(body).not.toMatch(/regression/i);
    expect(body).not.toMatch(/quantile/i);
    expect(body).not.toMatch(/\bP10\b|\bP50\b|\bP90\b/);
    expect(body).not.toMatch(/confidence interval/i);
  });
});
