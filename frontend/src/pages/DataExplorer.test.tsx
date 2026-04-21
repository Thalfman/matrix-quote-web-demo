import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import { DataExplorer } from "./DataExplorer";
import { SAMPLE_HISTOGRAM } from "./admin/fixtures";

describe("DataExplorer", () => {
  it("renders the search input with placeholder 'Search project or client'", () => {
    renderWithProviders(<DataExplorer />);
    expect(
      screen.getByPlaceholderText("Search project or client"),
    ).toBeInTheDocument();
  });

  it("renders all three filter labels (Industry, Automation, Year)", () => {
    renderWithProviders(<DataExplorer />);
    expect(screen.getByText("Industry")).toBeInTheDocument();
    expect(screen.getByText("Automation")).toBeInTheDocument();
    expect(screen.getByText("Year")).toBeInTheDocument();
  });

  it("renders exactly 20 histogram bar divs matching SAMPLE_HISTOGRAM.length", () => {
    const { container } = renderWithProviders(<DataExplorer />);
    // The histogram bars are aria-hidden divs inside the flex container
    const histogramContainer = container.querySelector(".flex.items-end.gap-1");
    expect(histogramContainer).toBeInTheDocument();
    const bars = histogramContainer!.querySelectorAll("div[aria-hidden='true']");
    expect(bars.length).toBe(SAMPLE_HISTOGRAM.length);
    expect(bars.length).toBe(20);
  });
});
