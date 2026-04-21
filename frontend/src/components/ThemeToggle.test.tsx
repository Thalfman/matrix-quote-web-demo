import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders in LIGHT by default", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(btn).toHaveTextContent(/LIGHT/);
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("flips to DARK on click and persists in localStorage", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    fireEvent.click(btn);
    expect(btn).toHaveTextContent(/DARK/);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("matrix-theme")).toBe("dark");
  });

  it("restores DARK from localStorage on mount", () => {
    localStorage.setItem("matrix-theme", "dark");
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(btn).toHaveTextContent(/DARK/);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
