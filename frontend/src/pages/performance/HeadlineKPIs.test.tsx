import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { HeadlineKPIs } from "./HeadlineKPIs";

describe("HeadlineKPIs", () => {
  it("renders em-dashes when data is undefined (loading state)", () => {
    renderWithProviders(<HeadlineKPIs head={undefined} />);
    const dashes = screen.getAllByText("-");
    expect(dashes).toHaveLength(3);
  });

  it("renders em-dashes when all values are null", () => {
    renderWithProviders(
      <HeadlineKPIs
        head={{ overall_mape: null, within_10_pct: null, within_20_pct: null, last_trained_at: null, rows_at_train: null }}
      />,
    );
    const dashes = screen.getAllByText("-");
    expect(dashes).toHaveLength(3);
  });

  it("renders formatted values with % suffix when data is populated", () => {
    renderWithProviders(
      <HeadlineKPIs
        head={{ overall_mape: 12.5, within_10_pct: 68.3, within_20_pct: 89.1, last_trained_at: null, rows_at_train: null }}
      />,
    );
    expect(screen.getByText("12.5%")).toBeInTheDocument();
    expect(screen.getByText("68.3%")).toBeInTheDocument();
    expect(screen.getByText("89.1%")).toBeInTheDocument();
  });

  it("renders the three KPI labels", () => {
    renderWithProviders(<HeadlineKPIs head={undefined} />);
    expect(screen.getByText(/overall mape/i)).toBeInTheDocument();
    expect(screen.getByText(/within ±10%/i)).toBeInTheDocument();
    expect(screen.getByText(/within ±20%/i)).toBeInTheDocument();
  });

  it("renders the amber stripe span (aria-hidden) only on the Overall MAPE card", () => {
    const { container } = renderWithProviders(<HeadlineKPIs head={undefined} />);
    // Exactly one aria-hidden stripe across the three cards
    const stripes = container.querySelectorAll('[aria-hidden="true"]');
    expect(stripes).toHaveLength(1);
    // That stripe belongs to the MAPE card
    const cardEl = stripes[0].closest(".card");
    expect(cardEl).not.toBeNull();
    expect(cardEl!.textContent).toMatch(/overall mape/i);
  });
});
