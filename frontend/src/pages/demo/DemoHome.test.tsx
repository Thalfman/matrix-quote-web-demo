import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { DemoManifest } from "@/demo/realProjects";

// ---------------------------------------------------------------------------
// Mock useDemoManifest → controlled value so tests can assert on counts.
// ---------------------------------------------------------------------------

const FAKE_MANIFEST: DemoManifest = {
  built_at: "2026-04-22T00:00:00Z",
  real_count: 24,
  synthetic_count: 500,
  feature_stats: {},
};

vi.mock("@/demo/realProjects", async () => {
  const actual = await vi.importActual<typeof import("@/demo/realProjects")>(
    "@/demo/realProjects",
  );
  return {
    ...actual,
    useDemoManifest: () => ({
      data: FAKE_MANIFEST,
      isLoading: false,
      error: null,
    }),
  };
});

// Import after mocks are registered.
const { DemoHome } = await import("./DemoHome");

describe("DemoHome — two-card layout", () => {
  it("renders the 'Real Data' eyebrow", () => {
    renderWithProviders(<DemoHome />);
    expect(screen.getByText("Real Data")).toBeInTheDocument();
  });

  it("renders the 'Synthetic Data' eyebrow", () => {
    renderWithProviders(<DemoHome />);
    expect(screen.getByText("Synthetic Data")).toBeInTheDocument();
  });

  it("renders the 'Today's book' title for the Real Data card", () => {
    renderWithProviders(<DemoHome />);
    expect(
      screen.getByRole("heading", { name: /today's book/i }),
    ).toBeInTheDocument();
  });

  it("renders the 'At scale' title for the Synthetic Data card", () => {
    renderWithProviders(<DemoHome />);
    expect(
      screen.getByRole("heading", { name: /at scale/i }),
    ).toBeInTheDocument();
  });

  it("renders the Real Data description mentioning 'billed projects'", () => {
    renderWithProviders(<DemoHome />);
    expect(
      screen.getByText(/twenty-four of your real, billed projects/i),
    ).toBeInTheDocument();
  });

  it("renders the Synthetic Data description mentioning 'generated training projects'", () => {
    renderWithProviders(<DemoHome />);
    expect(
      screen.getByText(/five hundred generated training projects/i),
    ).toBeInTheDocument();
  });

  it("renders the Real Data count chip from the manifest (24 projects)", () => {
    renderWithProviders(<DemoHome />);
    expect(screen.getByText("24 projects")).toBeInTheDocument();
  });

  it("renders the Synthetic Data count chip from the manifest (500 training rows)", () => {
    renderWithProviders(<DemoHome />);
    expect(screen.getByText("500 training rows")).toBeInTheDocument();
  });

  it("renders NO ML jargon (gradient, P10, P50, P90, confidence intervals) in card copy", () => {
    renderWithProviders(<DemoHome />);
    expect(screen.queryByText(/gradient boosting/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/P10–P90/)).not.toBeInTheDocument();
    expect(screen.queryByText(/confidence intervals/i)).not.toBeInTheDocument();
  });
});

describe("DemoHome — three-chip sub-tab strip per card", () => {
  it("renders a '/compare/quote' link labelled 'Quote'", () => {
    renderWithProviders(<DemoHome />);
    const links = screen.getAllByRole("link");
    const chip = links.find(
      (l) =>
        l.textContent?.trim().startsWith("Quote") &&
        (l as HTMLAnchorElement).getAttribute("href") === "/compare/quote",
    );
    expect(chip).toBeTruthy();
  });

  it("renders a '/compare/compare' link labelled 'Compare'", () => {
    renderWithProviders(<DemoHome />);
    const links = screen.getAllByRole("link");
    const chip = links.find(
      (l) =>
        l.textContent?.trim().startsWith("Compare") &&
        (l as HTMLAnchorElement).getAttribute("href") === "/compare/compare",
    );
    expect(chip).toBeTruthy();
  });

  it("renders a '/compare/insights' link labelled 'Business Insights'", () => {
    renderWithProviders(<DemoHome />);
    const links = screen.getAllByRole("link");
    const chip = links.find(
      (l) =>
        l.textContent?.trim().startsWith("Business Insights") &&
        (l as HTMLAnchorElement).getAttribute("href") === "/compare/insights",
    );
    expect(chip).toBeTruthy();
  });

  it("renders a '/ml/quote' link labelled 'Quote'", () => {
    renderWithProviders(<DemoHome />);
    const links = screen.getAllByRole("link");
    const chip = links.find(
      (l) =>
        l.textContent?.trim().startsWith("Quote") &&
        (l as HTMLAnchorElement).getAttribute("href") === "/ml/quote",
    );
    expect(chip).toBeTruthy();
  });

  it("renders a '/ml/compare' link labelled 'Compare'", () => {
    renderWithProviders(<DemoHome />);
    const links = screen.getAllByRole("link");
    const chip = links.find(
      (l) =>
        l.textContent?.trim().startsWith("Compare") &&
        (l as HTMLAnchorElement).getAttribute("href") === "/ml/compare",
    );
    expect(chip).toBeTruthy();
  });

  it("renders a '/ml/insights' link labelled 'Business Insights'", () => {
    renderWithProviders(<DemoHome />);
    const links = screen.getAllByRole("link");
    const chip = links.find(
      (l) =>
        l.textContent?.trim().startsWith("Business Insights") &&
        (l as HTMLAnchorElement).getAttribute("href") === "/ml/insights",
    );
    expect(chip).toBeTruthy();
  });

  it("renders exactly two 'Quote' chips (one per card)", () => {
    renderWithProviders(<DemoHome />);
    const links = screen.getAllByRole("link");
    const quoteChips = links.filter(
      (l) => l.textContent?.trim() === "Quote",
    );
    expect(quoteChips).toHaveLength(2);
  });

  it("renders exactly two 'Business Insights' chips (one per card)", () => {
    renderWithProviders(<DemoHome />);
    const links = screen.getAllByRole("link");
    const insightsChips = links.filter(
      (l) => l.textContent?.trim() === "Business Insights",
    );
    expect(insightsChips).toHaveLength(2);
  });
});

describe("DemoHome — the old three-card layout is gone", () => {
  it("does not render 'Real Data Quote Tool' (old card title)", () => {
    renderWithProviders(<DemoHome />);
    expect(
      screen.queryByRole("heading", { name: /real data quote tool/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render 'Synthetic Data Quote Tool' (old card title)", () => {
    renderWithProviders(<DemoHome />);
    expect(
      screen.queryByRole("heading", { name: /synthetic data quote tool/i }),
    ).not.toBeInTheDocument();
  });
});
