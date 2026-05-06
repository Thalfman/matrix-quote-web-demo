import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { SortControls } from "./SortControls";

describe("SortControls - layout", () => {
  it("renders three buttons with the UI-SPEC verbatim labels", () => {
    renderWithProviders(<SortControls value="date" onChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /Date saved/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Name/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Status/i }),
    ).toBeInTheDocument();
  });

  it("shows the 'Sort by:' eyebrow label", () => {
    renderWithProviders(<SortControls value="date" onChange={vi.fn()} />);
    expect(screen.getByText(/Sort by:/i)).toBeInTheDocument();
  });

  it("wraps the buttons in a role='group' with aria-label", () => {
    renderWithProviders(<SortControls value="date" onChange={vi.fn()} />);
    const group = screen.getByRole("group", { name: /sort by/i });
    expect(group).toBeInTheDocument();
  });
});

describe("SortControls - active state", () => {
  it("active button when value='date' has bg-ink + text-white", () => {
    renderWithProviders(<SortControls value="date" onChange={vi.fn()} />);
    const active = screen.getByRole("button", { name: /Date saved/i });
    expect(active.className).toMatch(/bg-ink/);
    expect(active.className).toMatch(/text-white/);
    expect(active).toHaveAttribute("aria-pressed", "true");
  });

  it("inactive buttons when value='date' do not have bg-ink", () => {
    renderWithProviders(<SortControls value="date" onChange={vi.fn()} />);
    const name = screen.getByRole("button", { name: /Name/i });
    const status = screen.getByRole("button", { name: /Status/i });
    expect(name.className).not.toMatch(/bg-ink(?!\/)/);
    expect(status.className).not.toMatch(/bg-ink(?!\/)/);
    expect(name).toHaveAttribute("aria-pressed", "false");
    expect(status).toHaveAttribute("aria-pressed", "false");
  });

  it("active button moves to 'Name' when value='name'", () => {
    renderWithProviders(<SortControls value="name" onChange={vi.fn()} />);
    const name = screen.getByRole("button", { name: /Name/i });
    expect(name.className).toMatch(/bg-ink/);
    expect(name).toHaveAttribute("aria-pressed", "true");
  });
});

describe("SortControls - interaction", () => {
  it("clicking 'Name' calls onChange('name')", () => {
    const fn = vi.fn();
    renderWithProviders(<SortControls value="date" onChange={fn} />);
    fireEvent.click(screen.getByRole("button", { name: /Name/i }));
    expect(fn).toHaveBeenCalledWith("name");
  });

  it("clicking 'Status' calls onChange('status')", () => {
    const fn = vi.fn();
    renderWithProviders(<SortControls value="date" onChange={fn} />);
    fireEvent.click(screen.getByRole("button", { name: /Status/i }));
    expect(fn).toHaveBeenCalledWith("status");
  });

  it("clicking 'Date saved' calls onChange('date')", () => {
    const fn = vi.fn();
    renderWithProviders(<SortControls value="name" onChange={fn} />);
    fireEvent.click(screen.getByRole("button", { name: /Date saved/i }));
    expect(fn).toHaveBeenCalledWith("date");
  });
});

describe("SortControls - safety + a11y", () => {
  it("every button has type='button' (no implicit form submit)", () => {
    renderWithProviders(<SortControls value="date" onChange={vi.fn()} />);
    screen
      .getAllByRole("button")
      .forEach((btn) =>
        expect(btn).toHaveAttribute("type", "button"),
      );
  });

  it("every button has focus-visible:ring-teal", () => {
    renderWithProviders(<SortControls value="date" onChange={vi.fn()} />);
    screen
      .getAllByRole("button")
      .forEach((btn) =>
        expect(btn.className).toMatch(/focus-visible:ring-teal/),
      );
  });
});
