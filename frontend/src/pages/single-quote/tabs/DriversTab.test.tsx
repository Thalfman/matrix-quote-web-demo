import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OperationDrivers } from "@/api/types";

import { DriversTab } from "./DriversTab";

const stubDrivers: OperationDrivers[] = [
  {
    operation: "me10",
    available: true,
    drivers: [
      { feature: "stations_count", contribution: 20, value: "4" },
      { feature: "robot_count", contribution: -5, value: "2" },
    ],
  },
  {
    operation: "ee20",
    available: true,
    drivers: [
      { feature: "panel_count", contribution: 8, value: "3" },
    ],
  },
];

describe("DriversTab", () => {
  it("shows empty-state when drivers prop is null", () => {
    render(<DriversTab drivers={null} />);
    expect(screen.getByText(/driver analysis is not available/i)).toBeInTheDocument();
  });

  it("shows empty-state when drivers prop is an empty array", () => {
    render(<DriversTab drivers={[]} />);
    expect(screen.getByText(/driver analysis is not available/i)).toBeInTheDocument();
  });

  it("renders all-operations aggregate by default", () => {
    render(<DriversTab drivers={stubDrivers} />);
    // stations_count has the largest absolute contribution and should appear.
    expect(screen.getByText("stations_count")).toBeInTheDocument();
  });

  it("filters to a single operation when the select changes", () => {
    render(<DriversTab drivers={stubDrivers} />);

    // Switch to ee20 operation only.
    fireEvent.change(screen.getByRole("combobox", { name: /operation/i }), {
      target: { value: "ee20" },
    });

    // panel_count belongs to ee20.
    expect(screen.getByText("panel_count")).toBeInTheDocument();
    // stations_count belongs only to me10 - must not appear.
    expect(screen.queryByText("stations_count")).not.toBeInTheDocument();
  });

  it("filters to me10 operation when selected", () => {
    render(<DriversTab drivers={stubDrivers} />);

    fireEvent.change(screen.getByRole("combobox", { name: /operation/i }), {
      target: { value: "me10" },
    });

    expect(screen.getByText("stations_count")).toBeInTheDocument();
    expect(screen.queryByText("panel_count")).not.toBeInTheDocument();
  });
});
