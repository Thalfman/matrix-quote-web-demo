import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { renderWithProviders } from "@/test/render";
import { quoteFormDefaults, type QuoteFormValues } from "@/pages/single-quote/schema";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import type { SavedQuote } from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockSaveMutateAsync = vi.fn();
const mockSetStatusMutateAsync = vi.fn();

vi.mock("@/hooks/useSavedQuotes", () => ({
  useSaveQuote: () => ({
    mutateAsync: mockSaveMutateAsync,
    isPending: false,
  }),
  useSetStatus: () => ({
    mutateAsync: mockSetStatusMutateAsync,
    isPending: false,
  }),
}));

import { SaveQuoteDialog } from "./SaveQuoteDialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_RESULT: UnifiedQuoteResult = {
  estimateHours: 800,
  likelyRangeLow: 600,
  likelyRangeHigh: 1000,
  overallConfidence: "high",
  perCategory: [],
  topDrivers: [],
  supportingMatches: { label: "Most similar past projects", items: [] },
};

function makePayload(over: Partial<{
  id?: string;
  workspace: "real" | "synthetic";
  status?: "draft" | "sent" | "won" | "lost" | "revised";
  formValues: QuoteFormValues;
  unifiedResult: UnifiedQuoteResult;
  suggestedName: string;
  existingName?: string;
  mode?: "rom" | "full";
}> = {}) {
  return {
    workspace: "real" as const,
    formValues: quoteFormDefaults,
    unifiedResult: FAKE_RESULT,
    suggestedName: "ME 800h · Vision · 2026-05-05",
    ...over,
  };
}

/**
 * Loose over type — the zod-inferred SavedQuote shape's passthrough types
 * trip strict assignment from UnifiedQuoteResult fixtures, but tests don't
 * exercise the schema. Using Record<string, unknown> here keeps fixtures
 * readable.
 */
type SavedQuoteOver = Record<string, unknown>;

function makeSavedQuote(over: SavedQuoteOver = {}): SavedQuote {
  return {
    id: "abc-123",
    schemaVersion: 1,
    name: "ME 800h · Vision · 2026-05-05",
    workspace: "real",
    status: "draft",
    createdAt: "2026-05-05T12:00:00.000Z",
    updatedAt: "2026-05-05T12:00:00.000Z",
    versions: [
      {
        version: 1,
        savedAt: "2026-05-05T12:00:00.000Z",
        statusAtTime: "draft",
        formValues: quoteFormDefaults,
        unifiedResult: FAKE_RESULT,
      },
    ],
    salesBucket: "ME",
    visionLabel: "Vision",
    materialsCost: 0,
    ...over,
  } as unknown as SavedQuote;
}

beforeEach(() => {
  mockSaveMutateAsync.mockReset();
  mockSetStatusMutateAsync.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Visibility + scaffold
// ---------------------------------------------------------------------------

describe("SaveQuoteDialog - scaffold", () => {
  it("renders nothing when open is false", () => {
    const { container } = renderWithProviders(
      <SaveQuoteDialog open={false} onClose={vi.fn()} payload={makePayload()} />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("renders a role='dialog' aria-modal panel when open is true", () => {
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("title 'Save this quote' is rendered", () => {
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    expect(screen.getByText("Save this quote")).toBeInTheDocument();
  });

  it("name input is prefilled with suggestedName", () => {
    renderWithProviders(
      <SaveQuoteDialog
        open
        onClose={vi.fn()}
        payload={makePayload({ suggestedName: "EE 240h · No vision · 2026-05-05" })}
      />,
    );
    const input = screen.getByLabelText(/quote name/i) as HTMLInputElement;
    expect(input.value).toBe("EE 240h · No vision · 2026-05-05");
  });

  it("name input is prefilled with existingName when provided (overrides suggestedName)", () => {
    renderWithProviders(
      <SaveQuoteDialog
        open
        onClose={vi.fn()}
        payload={makePayload({ suggestedName: "auto-name", existingName: "My custom name" })}
      />,
    );
    const input = screen.getByLabelText(/quote name/i) as HTMLInputElement;
    expect(input.value).toBe("My custom name");
  });
});

// ---------------------------------------------------------------------------
// ESC + backdrop close
// ---------------------------------------------------------------------------

describe("SaveQuoteDialog - close behaviour", () => {
  it("ESC key calls onClose", () => {
    const onClose = vi.fn();
    renderWithProviders(
      <SaveQuoteDialog open onClose={onClose} payload={makePayload()} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop calls onClose", () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(
      <SaveQuoteDialog open onClose={onClose} payload={makePayload()} />,
    );
    const backdrop = container.querySelector('[role="presentation"]') as HTMLElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking Cancel calls onClose", () => {
    const onClose = vi.fn();
    renderWithProviders(
      <SaveQuoteDialog open onClose={onClose} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("SaveQuoteDialog - validation", () => {
  it("submitting an empty name shows the verbatim required-error message", () => {
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    const input = screen.getByLabelText(/quote name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    expect(
      screen.getByText("Please give this quote a name before saving."),
    ).toBeInTheDocument();
    expect(mockSaveMutateAsync).not.toHaveBeenCalled();
  });

  it("submitting a name longer than 80 chars shows the verbatim too-long error", () => {
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    const input = screen.getByLabelText(/quote name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "x".repeat(81) } });
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    expect(
      screen.getByText("That name is too long — keep it under 80 characters."),
    ).toBeInTheDocument();
    expect(mockSaveMutateAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Submit happy path
// ---------------------------------------------------------------------------

describe("SaveQuoteDialog - submit success", () => {
  it("submitting with a valid name calls useSaveQuote.mutateAsync", async () => {
    mockSaveMutateAsync.mockResolvedValueOnce(makeSavedQuote());
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    await waitFor(() =>
      expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1),
    );
    expect(mockSaveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ME 800h · Vision · 2026-05-05",
        workspace: "real",
      }),
    );
  });

  it("on success fires toast.success('Quote saved.') with NO action when versions.length === 1", async () => {
    mockSaveMutateAsync.mockResolvedValueOnce(makeSavedQuote());
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    await waitFor(() =>
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Quote saved."),
    );
  });

  it("on success of v2+ save fires toast.success with 'Mark as revised?' action", async () => {
    const v2Saved = makeSavedQuote({
      versions: [
        {
          version: 1,
          savedAt: "2026-05-05T11:00:00.000Z",
          statusAtTime: "draft",
          formValues: quoteFormDefaults,
          unifiedResult: FAKE_RESULT,
        },
        {
          version: 2,
          savedAt: "2026-05-05T12:00:00.000Z",
          statusAtTime: "draft",
          formValues: quoteFormDefaults,
          unifiedResult: FAKE_RESULT,
        },
      ],
      status: "draft",
    });
    mockSaveMutateAsync.mockResolvedValueOnce(v2Saved);
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        "Quote saved.",
        expect.objectContaining({
          action: expect.objectContaining({ label: "Mark as revised?" }),
        }),
      );
    });
  });

  it("v2+ saved with status === 'revised' does NOT show the revised assist", async () => {
    const v2Revised = makeSavedQuote({
      versions: [
        {
          version: 1,
          savedAt: "2026-05-05T11:00:00.000Z",
          statusAtTime: "draft",
          formValues: quoteFormDefaults,
          unifiedResult: FAKE_RESULT,
        },
        {
          version: 2,
          savedAt: "2026-05-05T12:00:00.000Z",
          statusAtTime: "revised",
          formValues: quoteFormDefaults,
          unifiedResult: FAKE_RESULT,
        },
      ],
      status: "revised",
    });
    mockSaveMutateAsync.mockResolvedValueOnce(v2Revised);
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    await waitFor(() =>
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Quote saved."),
    );
    // Confirm we did NOT call with action.
    const calls = vi.mocked(toast.success).mock.calls;
    const callsWithAction = calls.filter(
      (c) =>
        typeof c[1] === "object" &&
        c[1] !== null &&
        "action" in (c[1] as object),
    );
    expect(callsWithAction).toHaveLength(0);
  });

  it("on success calls onSaved with the SavedQuote and then onClose", async () => {
    const saved = makeSavedQuote();
    mockSaveMutateAsync.mockResolvedValueOnce(saved);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <SaveQuoteDialog open onClose={onClose} onSaved={onSaved} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledWith(saved);
  });
});

// ---------------------------------------------------------------------------
// Submit failure path
// ---------------------------------------------------------------------------

describe("SaveQuoteDialog - submit failure", () => {
  it("on save rejection fires the verbatim error toast and does NOT call onClose", async () => {
    mockSaveMutateAsync.mockRejectedValueOnce(new Error("quota exceeded"));
    const onClose = vi.fn();
    renderWithProviders(
      <SaveQuoteDialog open onClose={onClose} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        "Couldn't save this quote. Browser storage might be full or blocked. Try again, or free up some space.",
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Revised-assist click invokes useSetStatus
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Phase 7 — D-19: mode threads through to saveQuote.mutateAsync
// ---------------------------------------------------------------------------

describe("SaveQuoteDialog — Phase 7 mode threading (D-19)", () => {
  it("threads payload.mode === 'rom' into saveQuote.mutateAsync", async () => {
    mockSaveMutateAsync.mockResolvedValueOnce(makeSavedQuote());
    renderWithProviders(
      <SaveQuoteDialog
        open
        onClose={vi.fn()}
        payload={makePayload({ mode: "rom" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    await waitFor(() => expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockSaveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "rom" }),
    );
  });

  it("threads mode: undefined when payload.mode is not provided", async () => {
    mockSaveMutateAsync.mockResolvedValueOnce(makeSavedQuote());
    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));
    await waitFor(() => expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockSaveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mode: undefined }),
    );
  });
});

describe("SaveQuoteDialog - revised assist", () => {
  it("clicking the 'Mark as revised?' action invokes useSetStatus.mutateAsync", async () => {
    const v2Saved = makeSavedQuote({
      id: "qid-77",
      versions: [
        {
          version: 1,
          savedAt: "2026-05-05T11:00:00.000Z",
          statusAtTime: "draft",
          formValues: quoteFormDefaults,
          unifiedResult: FAKE_RESULT,
        },
        {
          version: 2,
          savedAt: "2026-05-05T12:00:00.000Z",
          statusAtTime: "draft",
          formValues: quoteFormDefaults,
          unifiedResult: FAKE_RESULT,
        },
      ],
      status: "draft",
    });
    mockSaveMutateAsync.mockResolvedValueOnce(v2Saved);

    renderWithProviders(
      <SaveQuoteDialog open onClose={vi.fn()} payload={makePayload()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save quote/i }));

    await waitFor(() =>
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        "Quote saved.",
        expect.objectContaining({
          action: expect.objectContaining({ label: "Mark as revised?" }),
        }),
      ),
    );

    // Pull the action callback out of the toast call and invoke it as the user would.
    const call = vi.mocked(toast.success).mock.calls.find((c) =>
      typeof c[1] === "object" && c[1] !== null && "action" in (c[1] as object),
    );
    expect(call).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const action = (call![1] as any).action as { onClick: () => void };
    action.onClick();

    expect(mockSetStatusMutateAsync).toHaveBeenCalledWith({
      id: "qid-77",
      status: "revised",
    });
  });
});
