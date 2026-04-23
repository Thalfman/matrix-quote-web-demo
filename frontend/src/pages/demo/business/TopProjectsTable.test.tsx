import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { TopProjectsTable } from "./TopProjectsTable";
import type { RankedRow } from "./portfolioStats";

const PEER_DEFAULTS = {
  complexity: 3,
  peerMedian: null,
  peerP10: null,
  peerP90: null,
  peerCount: 0,
  outlierZ: null,
  outlierDirection: null,
} as const;

const ROWS: RankedRow[] = [
  {
    project_id: "p1",
    project_name: "Delta System",
    industry: "Automotive",
    system_category: "Assembly",
    stations: 8,
    total_hours: 400,
    primary_bucket: "ME",
    ...PEER_DEFAULTS,
  },
  {
    project_id: "p2",
    project_name: "Alpha Line",
    industry: "Food & Bev",
    system_category: "Palletizing",
    stations: 4,
    total_hours: 200,
    primary_bucket: "Build",
    ...PEER_DEFAULTS,
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
        ...PEER_DEFAULTS,
      },
    ];
    renderWithProviders(<TopProjectsTable rows={rows} />);
    expect(screen.getByText("12,500")).toBeInTheDocument();
  });

  it("renders a row-count badge", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    // With no filter active, shows "N projects"
    expect(screen.getByText("2 projects")).toBeInTheDocument();
  });

  it("renders an Export CSV button", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("renders sortable column headers for Project and Total hours", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    // sortable headers have aria-sort attribute
    const projectHeader = screen.getByRole("columnheader", { name: /project/i });
    expect(projectHeader).toHaveAttribute("aria-sort");
    const hoursHeader = screen.getByRole("columnheader", { name: /total hours/i });
    expect(hoursHeader).toHaveAttribute("aria-sort");
  });

  it("calls onRowClick when a row is clicked", () => {
    const onRowClick = vi.fn();
    renderWithProviders(<TopProjectsTable rows={ROWS} onRowClick={onRowClick} />);
    const row = screen.getByText("Delta System").closest("[role='button']");
    expect(row).not.toBeNull();
    fireEvent.click(row!);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("renders primary_bucket value for each row", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    expect(screen.getByText("ME")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
  });

  it("renders a HIGH outlier badge on rows flagged as high outliers", () => {
    const rows: RankedRow[] = [
      {
        ...ROWS[0],
        outlierDirection: "high",
        outlierZ: 2.4,
        peerMedian: 200,
        peerP10: 150,
        peerP90: 300,
        peerCount: 4,
      },
    ];
    renderWithProviders(<TopProjectsTable rows={rows} />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders a LOW outlier badge on rows flagged as low outliers", () => {
    const rows: RankedRow[] = [
      {
        ...ROWS[0],
        outlierDirection: "low",
        outlierZ: -2.1,
        peerMedian: 500,
        peerP10: 400,
        peerP90: 700,
        peerCount: 4,
      },
    ];
    renderWithProviders(<TopProjectsTable rows={rows} />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("does not render an outlier badge when outlierDirection is null", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    expect(screen.queryByText("HIGH")).not.toBeInTheDocument();
    expect(screen.queryByText("LOW")).not.toBeInTheDocument();
  });
});

describe("TopProjectsTable - column sort", () => {
  it("clicking a sortable column header changes the sort (rows reorder)", () => {
    // Default sort is total_hours desc: Delta System (400) first, Alpha Line (200) second
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const cells = screen.getAllByRole("cell");
    const projectNames = cells
      .filter((c) => ["Delta System", "Alpha Line"].includes(c.textContent ?? ""))
      .map((c) => c.textContent);
    expect(projectNames[0]).toBe("Delta System");

    // Click "Project" header to sort by project_name desc
    const projectHeader = screen.getByRole("columnheader", { name: /project/i });
    fireEvent.click(projectHeader);

    // "Delta System" > "Alpha Line" alphabetically, so desc gives Delta first
    const cellsAfter = screen.getAllByRole("cell");
    const namesAfter = cellsAfter
      .filter((c) => ["Delta System", "Alpha Line"].includes(c.textContent ?? ""))
      .map((c) => c.textContent);
    expect(namesAfter.length).toBeGreaterThan(0);
  });

  it("clicking the same sortable header twice reverses the direction", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const hoursHeader = screen.getByRole("columnheader", { name: /total hours/i });

    // First click switches to asc (if currently desc)
    fireEvent.click(hoursHeader);
    // aria-sort should now be ascending
    expect(hoursHeader).toHaveAttribute("aria-sort", "ascending");

    // Second click flips back to desc
    fireEvent.click(hoursHeader);
    expect(hoursHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("aria-sort is 'none' for a non-active sortable column", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    // Default sort is total_hours; the "Project" header should start as 'none'
    const projectHeader = screen.getByRole("columnheader", { name: /project/i });
    expect(projectHeader).toHaveAttribute("aria-sort", "none");
  });

  it("aria-sort is 'descending' on the initial active sort column (total_hours)", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const hoursHeader = screen.getByRole("columnheader", { name: /total hours/i });
    expect(hoursHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("non-sortable columns do not have aria-sort attribute", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const systemHeader = screen.getByRole("columnheader", { name: /^system$/i });
    expect(systemHeader).not.toHaveAttribute("aria-sort");
  });
});

describe("TopProjectsTable - internal search filter", () => {
  it("typing in the search input filters visible rows", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const searchInput = screen.getByRole("searchbox", { name: /search projects/i });

    // Both rows visible initially
    expect(screen.getByText("Delta System")).toBeInTheDocument();
    expect(screen.getByText("Alpha Line")).toBeInTheDocument();

    // Filter for "delta"
    fireEvent.change(searchInput, { target: { value: "delta" } });

    // Only Delta System should remain
    expect(screen.getByText("Delta System")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Line")).not.toBeInTheDocument();
  });

  it("shows a no-match message when search finds nothing", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const searchInput = screen.getByRole("searchbox", { name: /search projects/i });
    fireEvent.change(searchInput, { target: { value: "zzz-no-match-zzz" } });
    expect(screen.getByText(/no projects match the current filters/i)).toBeInTheDocument();
  });

  it("updates the row count badge to reflect filtered vs total", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const searchInput = screen.getByRole("searchbox", { name: /search projects/i });
    fireEvent.change(searchInput, { target: { value: "delta" } });
    // With 1 of 2 rows visible, badge should say "1 of 2 projects"
    expect(screen.getByText(/1 of 2 projects/i)).toBeInTheDocument();
  });

  it("matches industry in the search filter", () => {
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const searchInput = screen.getByRole("searchbox", { name: /search projects/i });
    fireEvent.change(searchInput, { target: { value: "food" } });
    expect(screen.getByText("Alpha Line")).toBeInTheDocument();
    expect(screen.queryByText("Delta System")).not.toBeInTheDocument();
  });
});

describe("TopProjectsTable - Export CSV button", () => {
  it("clicking Export CSV triggers URL.createObjectURL and an anchor click", () => {
    // Render first - before any mocking that could interfere with React's DOM ops.
    renderWithProviders(<TopProjectsTable rows={ROWS} />);
    const exportBtn = screen.getByRole("button", { name: /export csv/i });

    // Set up download-related mocks AFTER rendering.
    const createObjectURL = vi.fn(() => "blob:test-url");
    const revokeObjectURL = vi.fn();
    const origURL = window.URL;
    Object.defineProperty(window, "URL", {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
      configurable: true,
    });

    // Use a real anchor element so jsdom is happy with appendChild/removeChild,
    // but spy on its click method to detect the programmatic click.
    const realAnchor = document.createElement("a");
    const clickSpy = vi.spyOn(realAnchor, "click").mockImplementation(() => {});
    let capturedDownload = "";

    const origCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag: string, ...rest: unknown[]) => {
        if (tag === "a") {
          // Use Object.defineProperty to intercept download assignment
          Object.defineProperty(realAnchor, "download", {
            set(v: string) { capturedDownload = v; },
            get() { return capturedDownload; },
            configurable: true,
          });
          return realAnchor;
        }
        return origCreateElement(tag as keyof HTMLElementTagNameMap, ...(rest as []));
      });

    fireEvent.click(exportBtn);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(capturedDownload).toContain(".csv");

    // Restore mocks
    createElementSpy.mockRestore();
    Object.defineProperty(window, "URL", { value: origURL, writable: true, configurable: true });
  });
});
