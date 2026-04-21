import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompareHeader } from "./CompareHeader";
import { SavedQuote } from "@/api/types";

function makeQuote(id: string, name: string, p50: number, p10: number, p90: number): SavedQuote {
  return {
    id,
    name,
    project_name: "Project",
    client_name: null,
    notes: null,
    created_by: "Tester",
    created_at: "2026-04-17T00:00:00Z",
    inputs: {
      industry_segment: "Automotive",
      system_category: "X",
      automation_level: "Robotic",
      plc_family: "",
      hmi_family: "",
      vision_type: "",
      stations_count: 4,
    },
    prediction: {
      ops: {},
      total_p50: p50,
      total_p10: p10,
      total_p90: p90,
      sales_buckets: {},
    },
  };
}

describe("CompareHeader", () => {
  it("renders 'Anchor' eyebrow and border-l-amber on the first column", () => {
    const quotes = [
      makeQuote("a", "Anchor Quote", 1000, 800, 1200),
      makeQuote("b", "Other Quote", 1200, 900, 1400),
    ];

    render(<CompareHeader quotes={quotes} />);

    expect(screen.getByText("Anchor")).toBeInTheDocument();
    const anchorEyebrow = screen.getByText("Anchor");
    expect(anchorEyebrow.className).toContain("text-amber");

    // The parent column wrapper has border-l-amber
    const anchorNameCol = anchorEyebrow.closest("div.py-2");
    expect(anchorNameCol?.className).toContain("border-l-amber");
  });

  it("applies text-amber and leading '+' to Δ cell when second p50 is higher than first", () => {
    // anchor p50=1000, second p50=1200 → d=+200 → text-amber
    const quotes = [
      makeQuote("a", "Anchor", 1000, 800, 1200),
      makeQuote("b", "Higher", 1200, 900, 1500),
    ];

    render(<CompareHeader quotes={quotes} />);

    // Δ row: anchor shows "—", second shows "+200 (+20.0%)"
    expect(screen.getByText("—")).toBeInTheDocument();

    // The delta cell should contain "+" and have text-amber
    const deltaDiv = screen.getByText(/\+200/);
    expect(deltaDiv.className).toContain("text-amber");
    expect(deltaDiv.textContent).toMatch(/^\+/);
  });

  it("applies text-teal and no leading '+' to Δ cell when second p50 is lower than first", () => {
    // anchor p50=1200, second p50=1000 → d=-200 → text-teal, no "+"
    const quotes = [
      makeQuote("a", "Anchor", 1200, 900, 1500),
      makeQuote("b", "Lower", 1000, 800, 1200),
    ];

    render(<CompareHeader quotes={quotes} />);

    expect(screen.getByText("—")).toBeInTheDocument();

    // The delta cell should have text-teal and no "+"
    const deltaDiv = screen.getByText(/-200/);
    expect(deltaDiv.className).toContain("text-teal");
    expect(deltaDiv.textContent).not.toMatch(/^\+/);
  });
});
