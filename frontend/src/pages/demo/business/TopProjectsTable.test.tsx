import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { TopProjectsTable } from "./TopProjectsTable";
import type { RankedRow } from "./portfolioStats";

const ROWS: RankedRow[] = [
  {
    project_id: "p1",
    project_name: "Delta System",
    industry: "Automotive",
    system_category: "Assembly",
    stations: 8,
    total_hours: 400,
    primary_bucket: "ME",
  },
  {
    project_id: "p2",
    project_name: "Alpha Line",
    industry: "Food & Bev",
    system_category: "Palletizing",
    stations: 4,
    total_hours: 200,
    primary_bucket: "Build",
  },
];

describe("TopProjectsTable", () => {
  it("renders empty-state when rows is empty", () => {
    renderWithProviders(<TopProjectsTable rows={[]} />);
    expect(screen.getByText(/no projects to display/i)).toBeInTheDocument();
  });

  it("renders all column header cells", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Industry")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("Stations")).toBeInTheDocument();
    expect(screen.getByText("Total hours")).toBeInTheDocument();
    expect(screen.getByText("Primary bucket")).toBeInTheDocument();
  });

  it("renders at least one row with expected project name", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    expect(screen.getByText("Delta System")).toBeInTheDocument();
    expect(screen.getByText("Alpha Line")).toBeInTheDocument();
  });

  it("renders the correct industry for each row", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    expect(screen.getByText("Automotive")).toBeInTheDocument();
    expect(screen.getByText("Food & Bev")).toBeInTheDocument();
  });

  it("renders total_hours formatted with commas", () => {
    const rows: RankedRow[] = [
      {
        project_id: "big",
        project_name: "Big Project",
        industry: "Auto",
        system_category: "Assembly",
        stations: 10,
        total_hours: 12500,
        primary_bucket: "ME",
      },
    ];
    renderWithProviders(<TopProjectsTable rows={rows} />);
    expect(screen.getByText("12,500")).toBeInTheDocument();
  });

  it("renders a row-count badge", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    expect(screen.getByText("2 projects")).toBeInTheDocument();
  });

  it("renders primary_bucket value for each row", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    expect(screen.getByText("ME")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
  });
});
