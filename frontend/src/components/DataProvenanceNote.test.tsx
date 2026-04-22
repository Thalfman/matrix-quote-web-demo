import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { DataProvenanceNote } from "./DataProvenanceNote";

describe("DataProvenanceNote — real variant", () => {
  it("renders the 'What this is trained on' eyebrow", () => {
    renderWithProviders(<DataProvenanceNote variant="real" />);
    expect(screen.getByText(/what this is trained on/i)).toBeInTheDocument();
  });

  it("renders the real-variant body copy about twenty-four projects", () => {
    renderWithProviders(<DataProvenanceNote variant="real" />);
    expect(
      screen.getByText(/twenty-four of your real, completed projects/i),
    ).toBeInTheDocument();
  });

  it("mentions lower confidence for less-common projects in the real variant", () => {
    renderWithProviders(<DataProvenanceNote variant="real" />);
    expect(
      screen.getByText(/expect lower confidence ratings/i),
    ).toBeInTheDocument();
  });

  it("does NOT render synthetic copy in the real variant", () => {
    renderWithProviders(<DataProvenanceNote variant="real" />);
    expect(
      screen.queryByText(/five hundred generated training projects/i),
    ).not.toBeInTheDocument();
  });
});

describe("DataProvenanceNote — synthetic variant", () => {
  it("renders the same 'What this is trained on' eyebrow", () => {
    renderWithProviders(<DataProvenanceNote variant="synthetic" />);
    expect(screen.getByText(/what this is trained on/i)).toBeInTheDocument();
  });

  it("renders the synthetic-variant body copy about five hundred generated projects", () => {
    renderWithProviders(<DataProvenanceNote variant="synthetic" />);
    expect(
      screen.getByText(/five hundred generated training projects/i),
    ).toBeInTheDocument();
  });

  it("mentions wider coverage and tighter likely ranges in the synthetic variant", () => {
    renderWithProviders(<DataProvenanceNote variant="synthetic" />);
    expect(
      screen.getByText(/wider coverage, tighter likely ranges/i),
    ).toBeInTheDocument();
  });

  it("does NOT render real-variant copy in the synthetic variant", () => {
    renderWithProviders(<DataProvenanceNote variant="synthetic" />);
    expect(
      screen.queryByText(/twenty-four of your real, completed projects/i),
    ).not.toBeInTheDocument();
  });
});

describe("DataProvenanceNote — structure", () => {
  it("renders a <details> element with a <summary> trigger", () => {
    const { container } = renderWithProviders(<DataProvenanceNote variant="real" />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    const summary = details!.querySelector("summary");
    expect(summary).not.toBeNull();
  });

  it("does not leak ML jargon (P50 / P10 / P90 / gradient / Pyodide / R²) in the real copy", () => {
    renderWithProviders(<DataProvenanceNote variant="real" />);
    expect(screen.queryByText(/P50/)).not.toBeInTheDocument();
    expect(screen.queryByText(/P10/)).not.toBeInTheDocument();
    expect(screen.queryByText(/P90/)).not.toBeInTheDocument();
    expect(screen.queryByText(/gradient/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pyodide/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/R²/)).not.toBeInTheDocument();
  });

  it("does not leak ML jargon in the synthetic copy", () => {
    renderWithProviders(<DataProvenanceNote variant="synthetic" />);
    expect(screen.queryByText(/P50/)).not.toBeInTheDocument();
    expect(screen.queryByText(/gradient/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pyodide/i)).not.toBeInTheDocument();
  });
});
