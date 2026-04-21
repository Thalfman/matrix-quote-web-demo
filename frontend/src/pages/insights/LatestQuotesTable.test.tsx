import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { LatestQuotesTable } from "./LatestQuotesTable";

describe("LatestQuotesTable", () => {
  it("renders empty-state message when rows is empty", () => {
    renderWithProviders(<LatestQuotesTable rows={[]} />);
    expect(screen.getByText(/no saved quotes yet/i)).toBeInTheDocument();
  });

  it("renders quote rows and 'See all saved quotes' link when rows are present", () => {
    const rows = [
      {
        id: "q1",
        name: "Line 3 Retrofit",
        project_name: "Acme Co",
        client_name: null,
        industry_segment: "Automotive",
        hours: 1500,
        range_low: 1200,
        range_high: 1800,
        created_at: "2026-03-15T00:00:00Z",
        created_by: "T",
      },
      {
        id: "q2",
        name: "Line 5 New",
        project_name: "Beta Inc",
        client_name: null,
        industry_segment: "Food & Bev",
        hours: 800,
        range_low: 650,
        range_high: 950,
        created_at: "2026-04-01T00:00:00Z",
        created_by: "T",
      },
    ];
    renderWithProviders(<LatestQuotesTable rows={rows} />);
    expect(screen.getByText("Line 3 Retrofit")).toBeInTheDocument();
    expect(screen.getByText("Line 5 New")).toBeInTheDocument();
    expect(screen.getByText("Acme Co")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all saved quotes/i })).toBeInTheDocument();
  });

  it("formats hours with Intl number formatting", () => {
    const rows = [
      {
        id: "q1",
        name: "Big Project",
        project_name: "Corp",
        client_name: null,
        industry_segment: "Auto",
        hours: 1500,
        range_low: 1000,
        range_high: 2000,
        created_at: "2026-01-01T00:00:00Z",
        created_by: "T",
      },
    ];
    renderWithProviders(<LatestQuotesTable rows={rows} />);
    // Intl formats 1500 as "1,500"
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("renders a row-count badge showing the number of rows", () => {
    const makeRow = (id: string, name: string) => ({
      id,
      name,
      project_name: "Proj",
      client_name: null,
      industry_segment: "Auto",
      hours: 100,
      range_low: 80,
      range_high: 120,
      created_at: "2026-01-01T00:00:00Z",
      created_by: "T",
    });
    const rows = [makeRow("a", "A"), makeRow("b", "B"), makeRow("c", "C")];
    renderWithProviders(<LatestQuotesTable rows={rows} />);
    expect(screen.getByText("3 rows")).toBeInTheDocument();
  });

  it("the 'See all saved quotes' link points to /quotes", () => {
    const rows = [
      {
        id: "q1",
        name: "Project X",
        project_name: "Corp",
        client_name: null,
        industry_segment: "Auto",
        hours: 200,
        range_low: 160,
        range_high: 240,
        created_at: "2026-01-01T00:00:00Z",
        created_by: "T",
      },
    ];
    renderWithProviders(<LatestQuotesTable rows={rows} />);
    const link = screen.getByRole("link", { name: /see all saved quotes/i });
    expect(link).toHaveAttribute("href", "/quotes");
  });
});
