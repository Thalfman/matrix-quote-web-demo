import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import { Drivers } from "./Drivers";

describe("Drivers", () => {
  it("renders all four operation buttons", () => {
    renderWithProviders(<Drivers />);
    expect(screen.getByRole("button", { name: "mechanical" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "electrical" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "controls" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "robotics" })).toBeInTheDocument();
  });

  it("renders the 'Global importance' eyebrow", () => {
    renderWithProviders(<Drivers />);
    expect(screen.getByText("Global importance")).toBeInTheDocument();
  });

  it("renders the first SAMPLE_IMPORTANCE feature name 'stations_count'", () => {
    renderWithProviders(<Drivers />);
    // stations_count appears in both global importance list and partial dependence eyebrow
    const matches = screen.getAllByText(/stations_count/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("renders the 'Partial dependence' eyebrow", () => {
    renderWithProviders(<Drivers />);
    expect(
      screen.getByText(/Partial dependence/i),
    ).toBeInTheDocument();
  });
});
