import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExplainedQuoteResponse } from "@/api/types";

import { HeroEstimate } from "./HeroEstimate";

function makeResult(p10: number, p50: number, p90: number): ExplainedQuoteResponse {
  return {
    prediction: {
      ops: {},
      total_p50: p50,
      total_p10: p10,
      total_p90: p90,
      sales_buckets: {},
    },
    drivers: null,
    neighbors: null,
  };
}

// HeroEstimate rel = (p90 - p10) / Math.max(1, p50)
// confidenceDots: <=0.10→5, <=0.20→4, <=0.35→3, <=0.55→2, else→1
// confidenceLabel: [_, "Weak", "Moderate", "Strong", "Very Strong", "Very Strong"]
//   dots=5→"Very Strong", dots=4→"Very Strong", dots=3→"Strong", dots=2→"Moderate", dots=1→"Weak"

describe("HeroEstimate – confidence dots + label", () => {
  it("shows Very Strong when rel_width <= 0.10 (5 dots)", () => {
    // p10=950, p50=1000, p90=1050 → rel = 100/1000 = 0.10 → dots=5
    render(<HeroEstimate result={makeResult(950, 1000, 1050)} />);
    expect(screen.getByText("Very Strong")).toBeInTheDocument();
  });

  it("shows Very Strong when 0.10 < rel_width <= 0.20 (4 dots)", () => {
    // p10=900, p50=1000, p90=1100 → rel = 200/1000 = 0.20 → dots=4
    render(<HeroEstimate result={makeResult(900, 1000, 1100)} />);
    expect(screen.getByText("Very Strong")).toBeInTheDocument();
  });

  it("shows Strong when 0.20 < rel_width <= 0.35 (3 dots)", () => {
    // p10=850, p50=1000, p90=1150 → rel = 300/1000 = 0.30 → dots=3
    render(<HeroEstimate result={makeResult(850, 1000, 1150)} />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("shows Moderate when 0.35 < rel_width <= 0.55 (2 dots)", () => {
    // p10=800, p50=1000, p90=1200 → rel = 400/1000 = 0.40 → dots=2
    render(<HeroEstimate result={makeResult(800, 1000, 1200)} />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("shows Weak when rel_width > 0.55 (1 dot)", () => {
    // p10=500, p50=1000, p90=1500 → rel = 1000/1000 = 1.0 → dots=1
    render(<HeroEstimate result={makeResult(500, 1000, 1500)} />);
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("renders the hrs label", () => {
    render(<HeroEstimate result={makeResult(900, 1234, 1500)} />);
    expect(screen.getByText(/hrs/i)).toBeInTheDocument();
  });

  it("renders p10 and p90 labels in the CI rail", () => {
    render(<HeroEstimate result={makeResult(100, 500, 900)} />);
    expect(screen.getByText(/p10/i)).toBeInTheDocument();
    expect(screen.getByText(/p90/i)).toBeInTheDocument();
  });
});
