import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { ProjectRecord } from "@/demo/realProjects";

import { BusinessInsightsView } from "./BusinessInsightsView";

// Recharts ResponsiveContainer needs a measured container; stub it in jsdom.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const FAKE_RECORDS: ProjectRecord[] = [
  {
    project_id: "r1",
    project_name: "Alpha Project",
    industry_segment: "Automotive",
    system_category: "Assembly",
    stations_count: 4,
    complexity_score_1_5: 2,
    log_quoted_materials_cost: Math.log(1000),
    me10_actual_hours: 150,
  },
  {
    project_id: "r2",
    project_name: "Beta Project",
    industry_segment: "Food & Bev",
    system_category: "Welding",
    stations_count: 6,
    complexity_score_1_5: 3,
    log_quoted_materials_cost: Math.log(2000),
    me10_actual_hours: 250,
  },
];

const BASE_PROPS = {
  records: FAKE_RECORDS,
  datasetLabel: "Test · Dataset",
  isLoading: false,
  error: null,
};

describe("BusinessInsightsView — happy path", () => {
  it("renders the datasetLabel in the page eyebrow", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    // PageHeader renders: eyebrow="Insights · Test · Dataset"
    expect(screen.getByText(/test · dataset/i)).toBeInTheDocument();
  });

  it("renders all six section headings", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    expect(screen.getByRole("heading", { name: /portfolio kpis/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by sales bucket/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by industry/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /system category mix/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /complexity vs hours/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /all projects/i })).toBeInTheDocument();
  });

  it("does not render any SectionEmptyCard when records have data", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    // SectionEmptyCard only appears for sections with no data; with valid records all
    // sections should have content.
    const emptyCards = screen.queryAllByText(/not available for this dataset\./i);
    expect(emptyCards).toHaveLength(0);
  });

  it("does not render an error alert when there is no error", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("BusinessInsightsView — loading state", () => {
  it("renders a skeleton with aria-busy when isLoading is true", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={undefined}
        datasetLabel="Loading Test"
        isLoading={true}
        error={null}
      />,
    );
    const skeleton = document.querySelector("[aria-busy='true']");
    expect(skeleton).not.toBeNull();
  });

  it("does not render a progressbar/spinner role during loading", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={undefined}
        datasetLabel="Loading Test"
        isLoading={true}
        error={null}
      />,
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("BusinessInsightsView — error state", () => {
  it("renders an element with role=alert when error is set", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={undefined}
        datasetLabel="Error Test"
        isLoading={false}
        error={new Error("boom")}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("error message does not contain raw file paths like synthetic-pool.json", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={undefined}
        datasetLabel="Error Test"
        isLoading={false}
        error={new Error("boom")}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).not.toMatch(/synthetic-pool\.json/);
    expect(alert.textContent).not.toMatch(/real-projects\.json/);
  });

  it("error message is user-facing copy, not a technical error string", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={undefined}
        datasetLabel="Error Test"
        isLoading={false}
        error={new Error("boom")}
      />,
    );
    // The component renders "Couldn't load the insights dataset."
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
  });
});

describe("BusinessInsightsView — empty records", () => {
  it("renders the empty message when records is an empty array", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={[]}
        datasetLabel="Empty Test"
        isLoading={false}
        error={null}
        emptyMessage="No projects found in this dataset."
      />,
    );
    expect(screen.getByText(/no projects found in this dataset/i)).toBeInTheDocument();
  });

  it("does not render section headings when records is empty", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={[]}
        datasetLabel="Empty Test"
        isLoading={false}
        error={null}
      />,
    );
    // Section headings are sr-only h2s inside portfolio sections — none should appear
    expect(screen.queryByRole("heading", { name: /portfolio kpis/i })).not.toBeInTheDocument();
  });
});
