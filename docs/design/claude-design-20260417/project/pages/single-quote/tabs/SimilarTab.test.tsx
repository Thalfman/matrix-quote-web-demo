import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NeighborProject } from "@/api/types";

import { SimilarTab } from "./SimilarTab";

const baseNeighbor: NeighborProject = {
  project_name: "Alpha Project",
  year: 2023,
  industry_segment: "Automotive",
  automation_level: "Robotic",
  stations: 4,
  actual_hours: 110,
  similarity: 0.92,
};

describe("SimilarTab", () => {
  it("shows empty-state when neighbors is null", () => {
    render(<SimilarTab neighbors={null} estimate={100} />);
    expect(screen.getByText(/no similar historical projects/i)).toBeInTheDocument();
  });

  it("shows empty-state when neighbors is an empty array", () => {
    render(<SimilarTab neighbors={[]} estimate={100} />);
    expect(screen.getByText(/no similar historical projects/i)).toBeInTheDocument();
  });

  it("renders neighbour name and actual hours", () => {
    render(<SimilarTab neighbors={[baseNeighbor]} estimate={100} />);
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    // actual_hours 110 formatted → "110"
    expect(screen.getByText("110")).toBeInTheDocument();
  });

  it("shows a positive delta when actual > estimate", () => {
    // actual=110, estimate=100 → delta=+10, pct=+10.0%
    render(<SimilarTab neighbors={[baseNeighbor]} estimate={100} />);
    expect(screen.getByText(/\+10/)).toBeInTheDocument();
    expect(screen.getByText(/\+10\.0%/)).toBeInTheDocument();
  });

  it("shows a negative delta when actual < estimate", () => {
    // actual=90, estimate=100 → delta=-10, pct=-10.0%
    render(<SimilarTab neighbors={[{ ...baseNeighbor, actual_hours: 90 }]} estimate={100} />);
    expect(screen.getByText(/-10/)).toBeInTheDocument();
    expect(screen.getByText(/-10\.0%/)).toBeInTheDocument();
  });

  it("shows zero delta when actual equals estimate", () => {
    render(<SimilarTab neighbors={[{ ...baseNeighbor, actual_hours: 100 }]} estimate={100} />);
    // delta = 0, pct = +0.0%
    expect(screen.getByText(/\+0\.0%/)).toBeInTheDocument();
  });
});
