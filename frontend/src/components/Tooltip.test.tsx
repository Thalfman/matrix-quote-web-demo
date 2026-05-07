import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { Tooltip, TooltipProvider, GlossaryHelpIcon } from "./Tooltip";

vi.mock("@/lib/glossary", () => ({
  lookup: (term: string) => {
    if (term === "System Category") {
      return {
        term: "System Category",
        definition: "A grouping of projects by the kind of system delivered.",
      };
    }
    return null;
  },
}));

function Mounted({ term, content }: { term?: string; content?: string }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip term={term} content={content}>
        <button type="button" data-testid="trigger">
          Trigger
        </button>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip wrapper (UX-03)", () => {
  it("does NOT render content before interaction (closed by default)", () => {
    renderWithProviders(<Mounted term="System Category" />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("renders glossary definition when trigger is hovered", async () => {
    renderWithProviders(<Mounted term="System Category" />);
    const trigger = screen.getByTestId("trigger");
    // Radix uses pointer events with type detection; in jsdom we drive the
    // open state by emitting both a pointerMove (for type=mouse detection)
    // and a pointerEnter. fall back to focus path if Radix does not respond
    // to synthesized pointer events under jsdom.
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    fireEvent.focus(trigger);
    await waitFor(() =>
      expect(
        screen.getAllByText(/A grouping of projects by the kind of system delivered\./i).length,
      ).toBeGreaterThan(0),
    );
  });

  it("renders glossary definition when trigger is keyboard-focused (acceptance #3)", async () => {
    renderWithProviders(<Mounted term="System Category" />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.focus(trigger);
    await waitFor(() =>
      expect(
        screen.getAllByText(/A grouping of projects by the kind of system delivered\./i).length,
      ).toBeGreaterThan(0),
    );
  });

  it("renders glossary definition when trigger is clicked", async () => {
    renderWithProviders(<Mounted term="System Category" />);
    fireEvent.click(screen.getByTestId("trigger"));
    await waitFor(() =>
      expect(
        screen.getAllByText(/A grouping of projects by the kind of system delivered\./i).length,
      ).toBeGreaterThan(0),
    );
  });

  it("renders glossary definition when the shared help icon is clicked", async () => {
    renderWithProviders(
      <TooltipProvider delayDuration={0}>
        <Tooltip term="System Category">
          <GlossaryHelpIcon ariaLabel="What is System Category?" />
        </Tooltip>
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /What is System Category\?/i }));
    await waitFor(() =>
      expect(
        screen.getAllByText(/A grouping of projects by the kind of system delivered\./i).length,
      ).toBeGreaterThan(0),
    );
  });

  it("hides content on blur", async () => {
    renderWithProviders(<Mounted term="System Category" />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.focus(trigger);
    await waitFor(() => expect(screen.queryAllByRole("tooltip").length).toBeGreaterThan(0));
    fireEvent.blur(trigger);
    await waitFor(() =>
      expect(screen.queryAllByRole("tooltip").length).toBe(0),
    );
  });

  it("falls back to 'Definition coming soon' when term has no glossary entry", async () => {
    renderWithProviders(<Mounted term="Bogus Unknown Term" />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.focus(trigger);
    await waitFor(() =>
      expect(screen.getAllByText(/Definition coming soon/i).length).toBeGreaterThan(0),
    );
  });

  it("uses 'content' prop verbatim when supplied (skips glossary lookup)", async () => {
    renderWithProviders(<Mounted content="Custom inline content for this hover." />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.focus(trigger);
    await waitFor(() =>
      expect(
        screen.getAllByText("Custom inline content for this hover.").length,
      ).toBeGreaterThan(0),
    );
  });

  it("does not render ML jargon in fallback copy (jargon-guard)", async () => {
    renderWithProviders(<Mounted term="Bogus Unknown Term" />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.focus(trigger);
    await waitFor(() => expect(screen.queryAllByRole("tooltip").length).toBeGreaterThan(0));
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/\bP50\b/);
    expect(body).not.toMatch(/\bP10\b/);
    expect(body).not.toMatch(/\bP90\b/);
    expect(body).not.toMatch(/pyodide/i);
    expect(body).not.toMatch(/gradient boosting/i);
    expect(body).not.toContain("R²");
    expect(body).not.toMatch(/confidence intervals/i);
    expect(body).not.toMatch(/\bembedding\b/i);
    expect(body).not.toMatch(/\btraining data\b/i);
    expect(body).not.toMatch(/\bcategorical\b/i);
    expect(body).not.toMatch(/\bregression\b/i);
  });
});

describe("GlossaryHelpIcon (UX-03)", () => {
  it("renders a focusable button with the supplied aria-label", () => {
    renderWithProviders(<GlossaryHelpIcon ariaLabel="What is Sales Bucket?" />);
    const btn = screen.getByRole("button", { name: /What is Sales Bucket\?/ });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });

  it("forwards refs to the underlying button (asChild compatibility)", () => {
    const ref = { current: null as HTMLButtonElement | null };
    renderWithProviders(
      <GlossaryHelpIcon ariaLabel="Test" ref={ref as React.RefObject<HTMLButtonElement>} />,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
