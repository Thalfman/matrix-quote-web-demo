import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { renderWithProviders } from "@/test/render";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockDeleteMutateAsync = vi.fn();

vi.mock("@/hooks/useSavedQuotes", () => ({
  useDeleteQuote: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

import { DeleteQuoteModal } from "./DeleteQuoteModal";

beforeEach(() => {
  mockDeleteMutateAsync.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Visibility + scaffold
// ---------------------------------------------------------------------------

describe("DeleteQuoteModal - scaffold", () => {
  it("renders nothing when open is false", () => {
    const { container } = renderWithProviders(
      <DeleteQuoteModal
        open={false}
        onClose={vi.fn()}
        quoteId="q1"
        quoteName="Alpha"
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("renders a role='dialog' aria-modal panel when open", () => {
    renderWithProviders(
      <DeleteQuoteModal open onClose={vi.fn()} quoteId="q1" quoteName="Alpha" />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("title 'Delete this quote?' is rendered", () => {
    renderWithProviders(
      <DeleteQuoteModal open onClose={vi.fn()} quoteId="q1" quoteName="Alpha" />,
    );
    expect(screen.getByText("Delete this quote?")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Body copy + verbatim D-17 with quote name
// ---------------------------------------------------------------------------

describe("DeleteQuoteModal - body copy", () => {
  it("renders the verbatim D-17 body with the quote name interpolated inside <strong>", () => {
    renderWithProviders(
      <DeleteQuoteModal open onClose={vi.fn()} quoteId="q1" quoteName="Alpha" />,
    );
    // The quote name is wrapped in <strong> (T-05-12 mitigation: React text node escapes).
    const strong = screen.getByText("Alpha");
    expect(strong.tagName).toBe("STRONG");
    // Surrounding D-17 text fragments must be present.
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent ?? "").toContain("Delete '");
    expect(dialog.textContent ?? "").toContain(
      "permanently? This removes its full version history.",
    );
  });

  it("renders the user-supplied name verbatim — no escaping into HTML", () => {
    renderWithProviders(
      <DeleteQuoteModal
        open
        onClose={vi.fn()}
        quoteId="q1"
        quoteName="Alpha <script>"
      />,
    );
    // React text nodes auto-escape; the literal angle brackets must appear as text.
    const strong = screen.getByText("Alpha <script>");
    expect(strong.tagName).toBe("STRONG");
  });
});

// ---------------------------------------------------------------------------
// Button labels + order
// ---------------------------------------------------------------------------

describe("DeleteQuoteModal - buttons", () => {
  it("Cancel button label is 'Keep it'", () => {
    renderWithProviders(
      <DeleteQuoteModal open onClose={vi.fn()} quoteId="q1" quoteName="Alpha" />,
    );
    expect(screen.getByRole("button", { name: "Keep it" })).toBeInTheDocument();
  });

  it("Confirm button label is 'Delete permanently'", () => {
    renderWithProviders(
      <DeleteQuoteModal open onClose={vi.fn()} quoteId="q1" quoteName="Alpha" />,
    );
    expect(
      screen.getByRole("button", { name: "Delete permanently" }),
    ).toBeInTheDocument();
  });

  it("Cancel ('Keep it') is on the LEFT, Confirm ('Delete permanently') on the RIGHT", () => {
    renderWithProviders(
      <DeleteQuoteModal open onClose={vi.fn()} quoteId="q1" quoteName="Alpha" />,
    );
    const buttons = screen.getAllByRole("button");
    const keepIdx = buttons.findIndex((b) => b.textContent === "Keep it");
    const deleteIdx = buttons.findIndex(
      (b) => b.textContent === "Delete permanently",
    );
    expect(keepIdx).toBeGreaterThanOrEqual(0);
    expect(deleteIdx).toBeGreaterThan(keepIdx);
  });
});

// ---------------------------------------------------------------------------
// Close behaviour
// ---------------------------------------------------------------------------

describe("DeleteQuoteModal - close behaviour", () => {
  it("ESC calls onClose without deletion", () => {
    const onClose = vi.fn();
    renderWithProviders(
      <DeleteQuoteModal
        open
        onClose={onClose}
        quoteId="q1"
        quoteName="Alpha"
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it("backdrop click calls onClose without deletion", () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(
      <DeleteQuoteModal
        open
        onClose={onClose}
        quoteId="q1"
        quoteName="Alpha"
      />,
    );
    const backdrop = container.querySelector('[role="presentation"]') as HTMLElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it("'Keep it' click calls onClose; useDeleteQuote NOT called", () => {
    const onClose = vi.fn();
    renderWithProviders(
      <DeleteQuoteModal
        open
        onClose={onClose}
        quoteId="q1"
        quoteName="Alpha"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Confirm — happy path
// ---------------------------------------------------------------------------

describe("DeleteQuoteModal - confirm success", () => {
  it("'Delete permanently' calls useDeleteQuote.mutateAsync(quoteId)", async () => {
    mockDeleteMutateAsync.mockResolvedValueOnce(undefined);
    renderWithProviders(
      <DeleteQuoteModal open onClose={vi.fn()} quoteId="q-77" quoteName="Alpha" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() =>
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith("q-77"),
    );
  });

  it("on success fires toast.success('Quote deleted.')", async () => {
    mockDeleteMutateAsync.mockResolvedValueOnce(undefined);
    renderWithProviders(
      <DeleteQuoteModal open onClose={vi.fn()} quoteId="q1" quoteName="Alpha" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() =>
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Quote deleted."),
    );
  });

  it("on success calls onDeleted then onClose (in that order)", async () => {
    mockDeleteMutateAsync.mockResolvedValueOnce(undefined);
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <DeleteQuoteModal
        open
        onClose={onClose}
        onDeleted={onDeleted}
        quoteId="q1"
        quoteName="Alpha"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onDeleted).toHaveBeenCalledTimes(1);
    // onDeleted invoked before onClose — assert via call order.
    expect(onDeleted.mock.invocationCallOrder[0]).toBeLessThan(
      onClose.mock.invocationCallOrder[0],
    );
  });
});

// ---------------------------------------------------------------------------
// Confirm — failure path
// ---------------------------------------------------------------------------

describe("DeleteQuoteModal - confirm failure", () => {
  it("on rejection fires verbatim error toast and does NOT call onClose", async () => {
    mockDeleteMutateAsync.mockRejectedValueOnce(new Error("write blocked"));
    const onClose = vi.fn();
    renderWithProviders(
      <DeleteQuoteModal
        open
        onClose={onClose}
        quoteId="q1"
        quoteName="Alpha"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        "Couldn't delete that quote. Try again.",
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
