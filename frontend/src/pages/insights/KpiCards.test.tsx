import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { KpiCards } from "./KpiCards";

describe("KpiCards", () => {
  it("renders zero/dash values when data is undefined (loading state)", () => {
    renderWithProviders(<KpiCards data={undefined} />);
    expect(screen.getByText(/active quotes/i)).toBeInTheDocument();
    // Models trained shows separate value span and suffix "/ 12"
    // (active_quotes_30d also renders "0" so use getAllByText)
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("/ 12")).toBeInTheDocument();
    // Overall MAPE and calibration show em-dashes
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders populated values from InsightsOverview data", () => {
    const data = {
      active_quotes_30d: 7,
      models_trained: 8,
      models_target: 12,
      overall_mape: 13.6,
      calibration_within_band_pct: 82.5,
      quotes_activity: [],
      latest_quotes: [],
      accuracy_heatmap: [],
      operations: [],
      quarters: [],
    };
    renderWithProviders(<KpiCards data={data} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("/ 12")).toBeInTheDocument();
    expect(screen.getByText("13.6")).toBeInTheDocument();
    expect(screen.getByText("82.5")).toBeInTheDocument();
  });

  it("renders all four card labels", () => {
    renderWithProviders(<KpiCards data={undefined} />);
    expect(screen.getByText(/active quotes/i)).toBeInTheDocument();
    expect(screen.getByText(/models trained/i)).toBeInTheDocument();
    expect(screen.getByText(/overall mape/i)).toBeInTheDocument();
    expect(screen.getByText(/confidence calibration/i)).toBeInTheDocument();
  });

  it("renders the amber stripe span (aria-hidden) only on the Confidence calibration card", () => {
    const { container } = renderWithProviders(<KpiCards data={undefined} />);
    // There should be exactly one aria-hidden stripe across all four cards
    const stripes = container.querySelectorAll('[aria-hidden="true"]');
    expect(stripes).toHaveLength(1);
    // That stripe's closest card should contain the "Confidence calibration" label
    const cardEl = stripes[0].closest(".card");
    expect(cardEl).not.toBeNull();
    expect(cardEl!.textContent).toMatch(/confidence calibration/i);
  });

  it("renders the '/ 12' suffix on the Models trained card with custom target", () => {
    const data = {
      active_quotes_30d: 0,
      models_trained: 5,
      models_target: 15,
      overall_mape: null,
      calibration_within_band_pct: null,
      quotes_activity: [],
      latest_quotes: [],
      accuracy_heatmap: [],
      operations: [],
      quarters: [],
    };
    renderWithProviders(<KpiCards data={data} />);
    expect(screen.getByText("/ 15")).toBeInTheDocument();
  });
});
