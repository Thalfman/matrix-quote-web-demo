/**
 * Tests for SavedQuotePage — the /quotes/:id detail / edit / version-history route.
 *
 * Plan 05-08. PERSIST-03/04/05/06.
 *
 * Coverage targets (per plan <behavior>):
 *  1. Loading state when useSavedQuote is loading.
 *  2. Not-found state when useSavedQuote returns null + back link to /quotes.
 *  3. Renders quote.name as <h1> (text-lg font-medium).
 *  4. Renders StatusChip with current status, click advances + calls useSetStatus.
 *  5. "Open in Quote tool" link with href "/compare/quote?fromQuote={id}" when workspace="real".
 *  6. "Open in Quote tool" link with href "/ml/quote?fromQuote={id}" when workspace="synthetic".
 *  7. Renders QuoteResultPanel with the latest version's unifiedResult and formValues.
 *  8. Renders VersionHistoryList with all versions.
 *  9. Click Restore on v2 calls useRestoreVersion + navigates to "?fromQuote={id}&restoreVersion=2".
 * 10. Restore on synthetic workspace navigates to /ml/quote?... with restoreVersion.
 * 11. "Delete quote" button opens DeleteQuoteModal with the quote name.
 * 12. DeleteQuoteModal onDeleted navigates back to "/quotes".
 * 13. "Back to My Quotes" link points to /quotes.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";
import type { QuoteVersion, SavedQuote } from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "test-id-123" }),
  };
});

const mockUseSavedQuote = vi.fn();
const mockMutateSetStatus = vi.fn();
const mockMutateRestore = vi.fn();
const mockMutateDelete = vi.fn();
vi.mock("@/hooks/useSavedQuotes", () => ({
  useSavedQuote: () => mockUseSavedQuote(),
  useSetStatus: () => ({ mutateAsync: mockMutateSetStatus, isPending: false }),
  useRestoreVersion: () => ({
    mutateAsync: mockMutateRestore,
    isPending: false,
  }),
  useDeleteQuote: () => ({
    mutateAsync: mockMutateDelete,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Stub QuoteResultPanel — keep test isolated from its glossary/tooltip wiring.
vi.mock("@/components/quote/QuoteResultPanel", () => ({
  QuoteResultPanel: ({
    result,
    input,
  }: {
    result: { estimateHours: number };
    input: { vision_type: string };
  }) => (
    <div data-testid="quote-result-panel">
      <span data-testid="result-hours">{result.estimateHours}</span>
      <span data-testid="input-vision">{input.vision_type}</span>
    </div>
  ),
}));

import { SavedQuotePage } from "./SavedQuotePage";

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
  return { ...quoteFormDefaults, vision_type: "Vision", ...over };
}

function makeVersion(over: Partial<QuoteVersion> = {}): QuoteVersion {
  return {
    version: 1,
    savedAt: "2026-05-05T12:00:00.000Z",
    statusAtTime: "draft",
    formValues: makeFormValues(),
    unifiedResult: MINIMAL_UNIFIED_RESULT,
    ...over,
  };
}

function makeSavedQuote(over: Partial<SavedQuote> = {}): SavedQuote {
  return {
    id: "test-id-123",
    schemaVersion: 1,
    name: "ME 800h · Vision · 2026-05-05",
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
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseSavedQuote.mockReset();
  mockMutateSetStatus.mockReset();
  mockMutateRestore.mockReset();
  mockMutateDelete.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Loading + not-found states
// ---------------------------------------------------------------------------

describe("SavedQuotePage - loading state", () => {
  it("renders 'Loading…' when useSavedQuote is loading", () => {
    mockUseSavedQuote.mockReturnValueOnce({ data: undefined, isLoading: true });
    renderWithProviders(<SavedQuotePage />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});

describe("SavedQuotePage - not-found state", () => {
  it("renders 'Quote not found.' when data is null", () => {
    mockUseSavedQuote.mockReturnValueOnce({ data: null, isLoading: false });
    renderWithProviders(<SavedQuotePage />);
    expect(screen.getByText("Quote not found.")).toBeInTheDocument();
  });

  it("not-found state shows the back link to /quotes", () => {
    mockUseSavedQuote.mockReturnValueOnce({ data: null, isLoading: false });
    renderWithProviders(<SavedQuotePage />);
    const backLink = screen.getByRole("link", { name: /Back to My Quotes/i });
    expect(backLink.getAttribute("href")).toBe("/quotes");
  });
});

// ---------------------------------------------------------------------------
// Loaded — page header
// ---------------------------------------------------------------------------

describe("SavedQuotePage - page header (loaded)", () => {
  it("renders the quote name as a heading", () => {
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ name: "Alpha line 4" }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Alpha line 4" }),
    ).toBeInTheDocument();
  });

  it("loaded view renders the back link to /quotes", () => {
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote(),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    const backLink = screen.getByRole("link", { name: /Back to My Quotes/i });
    expect(backLink.getAttribute("href")).toBe("/quotes");
  });

  it("renders the 'Click to advance' status hint", () => {
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote(),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    expect(screen.getByText(/Click to advance/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Status chip (D-08/D-09)
// ---------------------------------------------------------------------------

describe("SavedQuotePage - status chip", () => {
  it("renders StatusChip with current status (clickable)", () => {
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ status: "sent" }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    const chip = screen.getByRole("button", { name: /Status: sent/i });
    expect(chip).toBeInTheDocument();
  });

  it("clicking chip advances status via useSetStatus.mutateAsync", () => {
    mockMutateSetStatus.mockResolvedValueOnce(makeSavedQuote());
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ status: "draft" }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    const chip = screen.getByRole("button", { name: /Status: draft/i });
    fireEvent.click(chip);
    // draft → sent (next in STATUS_CYCLE)
    expect(mockMutateSetStatus).toHaveBeenCalledWith({
      id: "test-id-123",
      status: "sent",
    });
  });
});

// ---------------------------------------------------------------------------
// Open in Quote tool (workspace-aware routing)
// ---------------------------------------------------------------------------

describe("SavedQuotePage - Open in Quote tool link", () => {
  it("real workspace → href is /compare/quote?fromQuote={id}", () => {
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ workspace: "real" }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    const link = screen.getByRole("link", { name: /Open in Quote tool/i });
    expect(link.getAttribute("href")).toBe(
      "/compare/quote?fromQuote=test-id-123",
    );
  });

  it("synthetic workspace → href is /ml/quote?fromQuote={id}", () => {
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ workspace: "synthetic" }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    const link = screen.getByRole("link", { name: /Open in Quote tool/i });
    expect(link.getAttribute("href")).toBe(
      "/ml/quote?fromQuote=test-id-123",
    );
  });
});

// ---------------------------------------------------------------------------
// Estimate panel (latest version)
// ---------------------------------------------------------------------------

describe("SavedQuotePage - estimate panel", () => {
  it("renders QuoteResultPanel with the LATEST version's unifiedResult", () => {
    const v1 = makeVersion({
      version: 1,
      unifiedResult: { ...MINIMAL_UNIFIED_RESULT, estimateHours: 500 },
    });
    const v2 = makeVersion({
      version: 2,
      savedAt: "2026-05-06T12:00:00.000Z",
      unifiedResult: { ...MINIMAL_UNIFIED_RESULT, estimateHours: 700 },
    });
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ versions: [v1, v2] }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    // Latest is v2 (last element of versions array, per storage convention).
    expect(screen.getByTestId("result-hours").textContent).toBe("700");
  });

  it("renders QuoteResultPanel with the LATEST version's formValues", () => {
    const v1 = makeVersion({
      version: 1,
      formValues: makeFormValues({ vision_type: "None" }),
    });
    const v2 = makeVersion({
      version: 2,
      savedAt: "2026-05-06T12:00:00.000Z",
      formValues: makeFormValues({ vision_type: "2D" }),
    });
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ versions: [v1, v2] }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    expect(screen.getByTestId("input-vision").textContent).toBe("2D");
  });
});

// ---------------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------------

describe("SavedQuotePage - version history sidebar", () => {
  it("renders VersionHistoryList with all the versions", () => {
    const v1 = makeVersion({ version: 1 });
    const v2 = makeVersion({
      version: 2,
      savedAt: "2026-05-06T12:00:00.000Z",
    });
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ versions: [v1, v2] }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    expect(screen.getByText("Version history")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("Restore on v2 calls useRestoreVersion + navigates to ?fromQuote=&restoreVersion=2 (real)", async () => {
    const v1 = makeVersion({ version: 1 });
    const v2 = makeVersion({
      version: 2,
      savedAt: "2026-05-06T12:00:00.000Z",
    });
    mockMutateRestore.mockResolvedValueOnce({ formValues: v2.formValues });
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ versions: [v1, v2], workspace: "real" }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    // VersionHistoryList sorts newest-first, so the FIRST listitem is v2.
    const firstRow = screen.getAllByRole("listitem")[0];
    const restore = within(firstRow).getByRole("button", { name: /Restore/i });
    fireEvent.click(restore);
    // Wait for the async chain (mutateAsync resolves, then navigate).
    await vi.waitFor(() => {
      expect(mockMutateRestore).toHaveBeenCalledWith({
        id: "test-id-123",
        version: 2,
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        "/compare/quote?fromQuote=test-id-123&restoreVersion=2",
      );
    });
  });

  it("Restore on synthetic workspace navigates to /ml/quote?fromQuote=&restoreVersion=N", async () => {
    const v1 = makeVersion({ version: 1 });
    const v2 = makeVersion({
      version: 2,
      savedAt: "2026-05-06T12:00:00.000Z",
    });
    mockMutateRestore.mockResolvedValueOnce({ formValues: v2.formValues });
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ versions: [v1, v2], workspace: "synthetic" }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    const firstRow = screen.getAllByRole("listitem")[0];
    const restore = within(firstRow).getByRole("button", { name: /Restore/i });
    fireEvent.click(restore);
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/ml/quote?fromQuote=test-id-123&restoreVersion=2",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Delete flow
// ---------------------------------------------------------------------------

describe("SavedQuotePage - delete flow", () => {
  it("renders 'Delete quote' button (top-right)", () => {
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote(),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    expect(
      screen.getByRole("button", { name: /Delete quote/i }),
    ).toBeInTheDocument();
  });

  it("clicking 'Delete quote' opens DeleteQuoteModal with the quote name", () => {
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote({ name: "Alpha line 4" }),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    fireEvent.click(screen.getByRole("button", { name: /Delete quote/i }));
    // The modal title appears.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete this quote?")).toBeInTheDocument();
    // The quote name is rendered in <strong> inside the modal body.
    const strong = screen.getByText("Alpha line 4");
    expect(strong.tagName).toBe("STRONG");
  });

  it("on delete confirm, navigates back to /quotes", async () => {
    mockMutateDelete.mockResolvedValueOnce(undefined);
    mockUseSavedQuote.mockReturnValueOnce({
      data: makeSavedQuote(),
      isLoading: false,
    });
    renderWithProviders(<SavedQuotePage />);
    fireEvent.click(screen.getByRole("button", { name: /Delete quote/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Delete permanently/i }),
    );
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/quotes");
    });
  });
});
