/**
 * Tests for SaveQuoteButton — the "Save quote" trigger that opens SaveQuoteDialog.
 *
 * Plan 05-09 Task 1. TDD RED → GREEN.
 *
 * Coverage targets:
 *   1. Renders a button labelled "Save quote".
 *   2. variant="primary" (default) → full-width teal classes.
 *   3. variant="compact" → compact pill classes.
 *   4. Click opens the dialog (dialog's `open` prop becomes true).
 *   5. Dialog receives a payload whose `suggestedName` was built from
 *      buildAutoSuggestedName(formValues, unifiedResult.estimateHours).
 *   6. existingName is forwarded to the dialog (overrides the suggested name).
 *   7. compareInputs is forwarded to the dialog when supplied.
 *   8. onSaved → navigate(`/quotes/${saved.id}`).
 */
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import {
  quoteFormDefaults,
  type QuoteFormValues,
} from "@/pages/single-quote/schema";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  capturedDialogProps: null as null | {
    open: boolean;
    payload: Record<string, unknown>;
    onSaved?: (s: { id: string }) => void;
  },
}));

const { mockNavigate } = hoisted;

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => hoisted.mockNavigate };
});

vi.mock("@/components/quote/SaveQuoteDialog", () => ({
  SaveQuoteDialog: (props: {
    open: boolean;
    onClose: () => void;
    payload: Record<string, unknown>;
    onSaved?: (s: { id: string }) => void;
  }) => {
    hoisted.capturedDialogProps = {
      open: props.open,
      payload: props.payload,
      onSaved: props.onSaved,
    };
    return props.open ? <div data-testid="dialog-open" /> : null;
  },
}));

// Late-bind the import so the hoisted mocks take effect.
import { SaveQuoteButton } from "./SaveQuoteButton";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return {
    ...quoteFormDefaults,
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    ...over,
  };
}

const FIXTURE_RESULT: UnifiedQuoteResult = {
  estimateHours: 800,
  likelyRangeLow: 640,
  likelyRangeHigh: 960,
  overallConfidence: "high",
  perCategory: [],
  topDrivers: [],
  supportingMatches: { label: "Most similar past projects", items: [] },
};

beforeEach(() => {
  hoisted.mockNavigate.mockReset();
  hoisted.capturedDialogProps = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SaveQuoteButton — render", () => {
  it("renders a button labelled 'Save quote'", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues()}
        unifiedResult={FIXTURE_RESULT}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^save quote$/i }),
    ).toBeInTheDocument();
  });

  it("variant='primary' (default) renders full-width teal classes", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues()}
        unifiedResult={FIXTURE_RESULT}
      />,
    );
    const btn = screen.getByRole("button", { name: /^save quote$/i });
    expect(btn.className).toMatch(/bg-teal/);
    expect(btn.className).toMatch(/w-full/);
    expect(btn.className).toMatch(/text-sm/);
  });

  it("variant='compact' renders the compact pill classes", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues()}
        unifiedResult={FIXTURE_RESULT}
        variant="compact"
      />,
    );
    const btn = screen.getByRole("button", { name: /^save quote$/i });
    expect(btn.className).toMatch(/bg-teal/);
    expect(btn.className).toMatch(/px-3/);
    expect(btn.className).not.toMatch(/w-full/);
  });
});

describe("SaveQuoteButton — click opens dialog", () => {
  it("dialog starts closed", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues()}
        unifiedResult={FIXTURE_RESULT}
      />,
    );
    expect(screen.queryByTestId("dialog-open")).toBeNull();
    expect(hoisted.capturedDialogProps?.open).toBe(false);
  });

  it("clicking the button opens the dialog", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues()}
        unifiedResult={FIXTURE_RESULT}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^save quote$/i }));
    expect(screen.getByTestId("dialog-open")).toBeInTheDocument();
    expect(hoisted.capturedDialogProps?.open).toBe(true);
  });
});

describe("SaveQuoteButton — payload forwarding", () => {
  it("forwards a suggestedName built from buildAutoSuggestedName", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues({ visionRows: [{ type: "2D", count: 1 }] })}
        unifiedResult={FIXTURE_RESULT}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^save quote$/i }));
    const payload = hoisted.capturedDialogProps?.payload as Record<
      string,
      unknown
    >;
    expect(payload.suggestedName).toMatch(/2D/);
    // Format check: hours present + ISO date trailing.
    expect(payload.suggestedName).toMatch(/800h/);
  });

  it("forwards existingName when supplied (overrides suggestion at dialog level)", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues()}
        unifiedResult={FIXTURE_RESULT}
        existingName="My Saved Project"
        quoteId="abc-123"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^save quote$/i }));
    const payload = hoisted.capturedDialogProps?.payload as Record<
      string,
      unknown
    >;
    expect(payload.existingName).toBe("My Saved Project");
    expect(payload.id).toBe("abc-123");
  });

  it("forwards compareInputs when supplied", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues()}
        unifiedResult={FIXTURE_RESULT}
        compareInputs={{ humanQuotedByBucket: { ME: 700 } }}
        variant="compact"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^save quote$/i }));
    const payload = hoisted.capturedDialogProps?.payload as Record<
      string,
      unknown
    >;
    expect(payload.compareInputs).toEqual({
      humanQuotedByBucket: { ME: 700 },
    });
  });
});

describe("SaveQuoteButton — onSaved navigation", () => {
  it("invoking onSaved navigates to /quotes/<id>", () => {
    renderWithProviders(
      <SaveQuoteButton
        workspace="real"
        formValues={makeFormValues()}
        unifiedResult={FIXTURE_RESULT}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^save quote$/i }));
    // Drive the dialog's onSaved manually — the dialog mock captured the prop.
    hoisted.capturedDialogProps?.onSaved?.({ id: "saved-id-abc" });
    expect(mockNavigate).toHaveBeenCalledWith("/quotes/saved-id-abc");
  });
});
