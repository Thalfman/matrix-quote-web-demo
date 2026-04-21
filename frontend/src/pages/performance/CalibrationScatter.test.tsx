import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { CalibrationScatter } from "./CalibrationScatter";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

describe("CalibrationScatter", () => {
  it("renders empty-state message when points is empty", () => {
    renderWithProviders(<CalibrationScatter points={[]} />);
    expect(screen.getByText(/calibration data isn't available yet/i)).toBeInTheDocument();
  });

  it("renders the chart heading when points are present", () => {
    const points = [
      { predicted_low: 100, predicted_high: 150, actual: 120, inside_band: true },
      { predicted_low: 200, predicted_high: 250, actual: 280, inside_band: false },
    ];
    renderWithProviders(<CalibrationScatter points={points} />);
    expect(screen.getByText(/confidence calibration/i)).toBeInTheDocument();
  });

  it("renders 'Inside band', 'Outside band', and 'y = x reference' in the legend strip", () => {
    const points = [
      { predicted_low: 100, predicted_high: 150, actual: 120, inside_band: true },
      { predicted_low: 200, predicted_high: 250, actual: 280, inside_band: false },
    ];
    renderWithProviders(<CalibrationScatter points={points} />);
    expect(screen.getByText(/inside band/i)).toBeInTheDocument();
    expect(screen.getByText(/outside band/i)).toBeInTheDocument();
    expect(screen.getByText(/y = x reference/i)).toBeInTheDocument();
  });
});
