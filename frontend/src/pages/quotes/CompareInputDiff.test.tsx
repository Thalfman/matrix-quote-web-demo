import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompareInputDiff } from "./CompareInputDiff";
import { SavedQuote } from "@/api/types";

function makeQuote(id: string, name: string, stationsCount: number): SavedQuote {
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
      system_category: "Assembly",
      automation_level: "Robotic",
      plc_family: "",
      hmi_family: "",
      vision_type: "",
      stations_count: stationsCount,
    },
    prediction: {
      ops: {},
      total_p50: 1000,
      total_p10: 800,
      total_p90: 1200,
      sales_buckets: {},
    },
  };
}

describe("CompareInputDiff", () => {
  it("renders the 'identical inputs' empty state when all inputs match", () => {
    const quotes = [
      makeQuote("a", "Quote A", 4),
      makeQuote("b", "Quote B", 4),
    ];

    render(<CompareInputDiff quotes={quotes} />);

    expect(
      screen.getByText("These scenarios have identical inputs."),
    ).toBeInTheDocument();
  });

  it("highlights changed non-anchor cell with text-amber; anchor cell does not get text-amber", () => {
    // stations_count differs: anchor=4, second=8
    const quoteA = makeQuote("a", "Anchor", 4);
    const quoteB = makeQuote("b", "Second", 8);

    render(<CompareInputDiff quotes={[quoteA, quoteB]} />);

    // "stations_count" field row should appear
    expect(screen.getByText("stations_count")).toBeInTheDocument();

    // The changed value "8" in second column should have text-amber
    const changedCell = screen.getByText("8");
    expect(changedCell.className).toContain("text-amber");

    // The anchor value "4" should NOT have text-amber
    const anchorCell = screen.getByText("4");
    expect(anchorCell.className).not.toContain("text-amber");
  });
});
