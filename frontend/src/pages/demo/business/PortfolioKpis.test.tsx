import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { PortfolioKpis } from "./PortfolioKpis";
import type { PortfolioKpis as PortfolioKpisType } from "./portfolioStats";

const BASE_KPIS: PortfolioKpisType = {
  projectCount: 24,
  totalHours: 12345,
  avgHours: 514,
  medianHours: 490,
  avgMaterialsCost: 5000,
};

describe("PortfolioKpis", () => {
  it("renders all four card labels", () => {
    renderWithProviders(<PortfolioKpis kpis={BASE_KPIS} />);
    // "Projects" appears as the exact eyebrow label AND as part of "billed projects" meta
    expect(screen.getByText(/^projects$/i)).toBeInTheDocument();
    expect(screen.getByText(/total hours/i)).toBeInTheDocument();
    expect(screen.getByText(/avg hours \/ project/i)).toBeInTheDocument();
    expect(screen.getByText(/avg materials cost/i)).toBeInTheDocument();
  });

  it("renders projectCount as a plain number", () => {
    renderWithProviders(<PortfolioKpis kpis={BASE_KPIS} />);
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("renders totalHours formatted with commas", () => {
    renderWithProviders(<PortfolioKpis kpis={BASE_KPIS} />);
    expect(screen.getByText("12,345")).toBeInTheDocument();
  });

  it("renders avgMaterialsCost formatted as USD with $ sign", () => {
    renderWithProviders(<PortfolioKpis kpis={BASE_KPIS} />);
    expect(screen.getByText(/\$5,000/)).toBeInTheDocument();
  });

  it("renders N/A when avgMaterialsCost is null", () => {
    const kpis: PortfolioKpisType = { ...BASE_KPIS, avgMaterialsCost: null };
    renderWithProviders(<PortfolioKpis kpis={kpis} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders medianHours in the meta line below avgHours card", () => {
    renderWithProviders(<PortfolioKpis kpis={BASE_KPIS} />);
    // medianHours = 490, meta text is "median 490"
    expect(screen.getByText(/median 490/i)).toBeInTheDocument();
  });

  it("renders 'billed projects' meta on Projects card when source is real (default)", () => {
    renderWithProviders(<PortfolioKpis kpis={BASE_KPIS} />);
    expect(screen.getByText("billed projects")).toBeInTheDocument();
  });

  it("renders 'training projects' meta on Projects card when source is synthetic", () => {
    renderWithProviders(<PortfolioKpis kpis={BASE_KPIS} source="synthetic" />);
    expect(screen.getByText("training projects")).toBeInTheDocument();
  });

  it("renders accent stripe only on the Projects card", () => {
    const { container } = renderWithProviders(<PortfolioKpis kpis={BASE_KPIS} />);
    const stripes = container.querySelectorAll('[aria-hidden="true"]');
    expect(stripes).toHaveLength(1);
    const card = stripes[0].closest(".card");
    expect(card).not.toBeNull();
    expect(card!.textContent).toMatch(/projects/i);
  });
});
