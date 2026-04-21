import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { AccuracyHeatmap } from "./AccuracyHeatmap";

describe("AccuracyHeatmap", () => {
  it("renders empty-state message when operations and quarters are empty", () => {
    renderWithProviders(
      <AccuracyHeatmap operations={[]} quarters={[]} matrix={[]} />,
    );
    expect(screen.getByText(/accuracy heatmap populates once/i)).toBeInTheDocument();
  });

  it("renders the table with operation rows and quarter columns when data is present", () => {
    const operations = ["welding", "machining"];
    const quarters = ["2025Q3", "2025Q4"];
    const matrix = [
      [12.5, 10.1],
      [null, 8.3],
    ];
    renderWithProviders(
      <AccuracyHeatmap operations={operations} quarters={quarters} matrix={matrix} />,
    );
    expect(screen.getByText("welding")).toBeInTheDocument();
    expect(screen.getByText("machining")).toBeInTheDocument();
    expect(screen.getByText("2025Q3")).toBeInTheDocument();
    expect(screen.getByText("2025Q4")).toBeInTheDocument();
  });

  it("renders 'no data' title attribute for null cells", () => {
    const operations = ["welding"];
    const quarters = ["2025Q3"];
    const matrix = [[null]];
    const { container } = renderWithProviders(
      <AccuracyHeatmap operations={operations} quarters={quarters} matrix={matrix} />,
    );
    const noDataCell = container.querySelector('[title="no data"]');
    expect(noDataCell).toBeInTheDocument();
  });

  it("renders formatted % title for non-null cells", () => {
    const operations = ["welding"];
    const quarters = ["2025Q3"];
    const matrix = [[15.75]];
    const { container } = renderWithProviders(
      <AccuracyHeatmap operations={operations} quarters={quarters} matrix={matrix} />,
    );
    const cell = container.querySelector('[title="15.8%"]');
    expect(cell).toBeInTheDocument();
  });

  it("renders 'low → high' in the legend strip when data is present", () => {
    const operations = ["welding", "machining"];
    const quarters = ["2025Q3", "2025Q4"];
    const matrix = [
      [12.5, 10.1],
      [null, 8.3],
    ];
    renderWithProviders(
      <AccuracyHeatmap operations={operations} quarters={quarters} matrix={matrix} />,
    );
    expect(screen.getByText(/low → high/i)).toBeInTheDocument();
  });

  it("renders 'no data' title on a null cell in a 2×3 matrix", () => {
    const operations = ["op-a", "op-b"];
    const quarters = ["Q1", "Q2", "Q3"];
    const matrix = [
      [5.0, null, 10.0],
      [8.0, 6.5, 12.0],
    ];
    const { container } = renderWithProviders(
      <AccuracyHeatmap operations={operations} quarters={quarters} matrix={matrix} />,
    );
    const noDataCells = container.querySelectorAll('[title="no data"]');
    expect(noDataCells).toHaveLength(1);
  });
});
