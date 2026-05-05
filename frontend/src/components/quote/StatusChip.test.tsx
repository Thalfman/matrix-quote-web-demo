import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { StatusChip } from "./StatusChip";

// ---------------------------------------------------------------------------
// StatusChip — interactive variant (button)
// ---------------------------------------------------------------------------

describe("StatusChip - interactive (button)", () => {
  it("renders a button containing the lowercase status label for 'draft'", () => {
    renderWithProviders(<StatusChip status="draft" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent("draft");
  });

  it("aria-label mentions the status and the click-to-advance hint", () => {
    renderWithProviders(<StatusChip status="draft" />);
    const btn = screen.getByRole("button");
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/draft/i);
    expect(label).toMatch(/click to advance/i);
  });

  it("click on 'draft' calls onAdvance with 'sent'", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="draft" onAdvance={fn} />);
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledWith("sent");
  });

  it("click on 'lost' calls onAdvance with 'revised'", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="lost" onAdvance={fn} />);
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledWith("revised");
  });

  it("click on 'revised' wraps around to 'draft'", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="revised" onAdvance={fn} />);
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledWith("draft");
  });

  it("Enter key advances to the next status", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="sent" onAdvance={fn} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(fn).toHaveBeenCalledWith("won");
  });

  it("Space key advances to the next status", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="won" onAdvance={fn} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: " " });
    expect(fn).toHaveBeenCalledWith("lost");
  });

  it("ArrowRight advances to the next status", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="draft" onAdvance={fn} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowRight" });
    expect(fn).toHaveBeenCalledWith("sent");
  });

  it("Shift+ArrowRight reverses to the previous status (sent → draft)", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="sent" onAdvance={fn} />);
    fireEvent.keyDown(screen.getByRole("button"), {
      key: "ArrowRight",
      shiftKey: true,
    });
    expect(fn).toHaveBeenCalledWith("draft");
  });

  it("Shift+ArrowRight on 'draft' wraps backwards to 'revised'", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="draft" onAdvance={fn} />);
    fireEvent.keyDown(screen.getByRole("button"), {
      key: "ArrowRight",
      shiftKey: true,
    });
    expect(fn).toHaveBeenCalledWith("revised");
  });

  it("Shift+click reverses to the previous status", () => {
    const fn = vi.fn();
    renderWithProviders(<StatusChip status="sent" onAdvance={fn} />);
    fireEvent.click(screen.getByRole("button"), { shiftKey: true });
    expect(fn).toHaveBeenCalledWith("draft");
  });

  it("does not throw when onAdvance is not provided", () => {
    renderWithProviders(<StatusChip status="draft" />);
    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });

  it("button has type='button' so it never submits forms", () => {
    renderWithProviders(<StatusChip status="draft" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

// ---------------------------------------------------------------------------
// StatusChip — read-only variant (span)
// ---------------------------------------------------------------------------

describe("StatusChip - read-only", () => {
  it("renders a span (NOT a button) when readOnly is true", () => {
    renderWithProviders(<StatusChip status="draft" readOnly />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("read-only aria-label mentions the status but NOT 'click to advance'", () => {
    renderWithProviders(<StatusChip status="won" readOnly />);
    const node = screen.getByLabelText(/Status: won/i);
    expect(node.getAttribute("aria-label") ?? "").not.toMatch(
      /click to advance/i,
    );
  });

  it("read-only does not call onAdvance even when click is fired", () => {
    const fn = vi.fn();
    // readOnly takes precedence — ignore onAdvance
    renderWithProviders(
      <StatusChip status="draft" readOnly onAdvance={fn} />,
    );
    const node = screen.getByLabelText(/Status: draft/i);
    fireEvent.click(node);
    expect(fn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// StatusChip — per-state styling
// ---------------------------------------------------------------------------

describe("StatusChip - per-state classes", () => {
  it("draft uses bg-line text-muted", () => {
    renderWithProviders(<StatusChip status="draft" />);
    const cls = screen.getByRole("button").className;
    expect(cls).toMatch(/bg-line/);
    expect(cls).toMatch(/text-muted/);
  });

  it("sent uses bg-tealSoft text-tealDark", () => {
    renderWithProviders(<StatusChip status="sent" />);
    const cls = screen.getByRole("button").className;
    expect(cls).toMatch(/bg-tealSoft/);
    expect(cls).toMatch(/text-tealDark/);
  });

  it("won uses bg-success text-success", () => {
    renderWithProviders(<StatusChip status="won" />);
    const cls = screen.getByRole("button").className;
    expect(cls).toMatch(/bg-success\/15/);
    expect(cls).toMatch(/text-success/);
  });

  it("lost uses bg-danger text-danger", () => {
    renderWithProviders(<StatusChip status="lost" />);
    const cls = screen.getByRole("button").className;
    expect(cls).toMatch(/bg-danger\/10/);
    expect(cls).toMatch(/text-danger/);
  });

  it("revised uses bg-amberSoft text-ink", () => {
    renderWithProviders(<StatusChip status="revised" />);
    const cls = screen.getByRole("button").className;
    expect(cls).toMatch(/bg-amberSoft/);
    expect(cls).toMatch(/text-ink/);
  });
});
