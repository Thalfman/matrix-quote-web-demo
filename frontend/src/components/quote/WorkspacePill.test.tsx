import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import { WorkspacePill } from "./WorkspacePill";

describe("WorkspacePill", () => {
  it("renders 'real' as a span containing the lowercase workspace label", () => {
    renderWithProviders(<WorkspacePill workspace="real" />);
    const node = screen.getByText("real");
    expect(node.tagName).toBe("SPAN");
  });

  it("renders 'synthetic' as a span containing the lowercase workspace label", () => {
    renderWithProviders(<WorkspacePill workspace="synthetic" />);
    const node = screen.getByText("synthetic");
    expect(node.tagName).toBe("SPAN");
  });

  it("real variant uses bg-ink/5 + text-ink", () => {
    renderWithProviders(<WorkspacePill workspace="real" />);
    const cls = screen.getByText("real").className;
    expect(cls).toMatch(/bg-ink\/5/);
    expect(cls).toMatch(/text-ink/);
  });

  it("synthetic variant uses bg-amber/15 + text-ink", () => {
    renderWithProviders(<WorkspacePill workspace="synthetic" />);
    const cls = screen.getByText("synthetic").className;
    expect(cls).toMatch(/bg-amber\/15/);
    expect(cls).toMatch(/text-ink/);
  });

  it("is not a button (no role=button)", () => {
    renderWithProviders(<WorkspacePill workspace="real" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses the eyebrow + text-xs typography from UI-SPEC", () => {
    renderWithProviders(<WorkspacePill workspace="synthetic" />);
    const cls = screen.getByText("synthetic").className;
    expect(cls).toMatch(/text-xs/);
    expect(cls).toMatch(/eyebrow/);
  });
});
