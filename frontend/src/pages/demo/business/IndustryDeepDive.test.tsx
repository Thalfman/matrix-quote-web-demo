import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { IndustryDeepDive } from "./IndustryDeepDive";
import type { IndustryDetail } from "./portfolioStats";

const DETAIL: IndustryDetail = {
  industry: "Automotive",
  projectCount: 6,
  avgHours: 820,
  medianOverrunPct: 0.12,
  portfolioMedianOverrunPct: 0.08,
  avgProductFamiliarity: 3.2,
  avgProcessUncertainty: 2.1,
  avgCustomPct: 0.35,
  trickyPackagingShare: 0.17,
  retrofitShare: 0.33,
  duplicateShare: 0.5,
  costPerHour: 250,
  buckets: { ME: 300, EE: 120, Robot: 200 },
  bucketsShare: { ME: 0.48, EE: 0.19, Robot: 0.33 },
};

const EMPTY: IndustryDetail = {
  industry: "Unknown",
  projectCount: 0,
  avgHours: 0,
  medianOverrunPct: null,
  portfolioMedianOverrunPct: null,
  avgProductFamiliarity: null,
  avgProcessUncertainty: null,
  avgCustomPct: null,
  trickyPackagingShare: null,
  retrofitShare: null,
  duplicateShare: null,
  costPerHour: null,
  buckets: {},
  bucketsShare: {},
};

describe("IndustryDeepDive", () => {
  it("renders the industry name and KPI row", () => {
    renderWithProviders(<IndustryDeepDive detail={DETAIL} />);
    expect(screen.getByText("Automotive")).toBeInTheDocument();
    expect(screen.getByText("6 projects")).toBeInTheDocument();
    expect(screen.getByText("820")).toBeInTheDocument();
  });

  it("shows median overrun with baseline delta meta", () => {
    renderWithProviders(<IndustryDeepDive detail={DETAIL} />);
    // delta = 0.12 - 0.08 = +4.0%; industry above baseline
    expect(screen.getByText(/above portfolio/i)).toBeInTheDocument();
  });

  it("renders risk-factor and discipline-mix sections", () => {
    renderWithProviders(<IndustryDeepDive detail={DETAIL} />);
    expect(screen.getByText(/risk & scope factors/i)).toBeInTheDocument();
    expect(screen.getByText(/discipline mix/i)).toBeInTheDocument();
    expect(screen.getByText(/product familiarity/i)).toBeInTheDocument();
  });

  it("falls back to empty message when projectCount is zero", () => {
    renderWithProviders(<IndustryDeepDive detail={EMPTY} />);
    expect(
      screen.getByText(/no projects in this industry match/i),
    ).toBeInTheDocument();
  });
});
