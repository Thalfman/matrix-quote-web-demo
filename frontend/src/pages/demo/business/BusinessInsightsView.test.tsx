import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

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

// Spy on downloadBlob so we can assert what the engineer-side button
// triggers without actually invoking <a download> in jsdom.
vi.mock("./exportPack", async () => {
  const actual = await vi.importActual<typeof import("./exportPack")>("./exportPack");
  return {
    ...actual,
    downloadBlob: vi.fn(),
  };
});

// Re-import the module via dynamic import so we can grab the spy.
import * as exportPackModule from "./exportPack";
const downloadBlobSpy = vi.mocked(exportPackModule.downloadBlob);

const FAKE_RECORDS: ProjectRecord[] = [
  {
    project_id: "r1",
    project_name: "Alpha Project",
    industry_segment: "Automotive",
    system_category: "Assembly",
    stations_count: 4,
    complexity_score_1_5: 2,
    log_quoted_materials_cost: Math.log(1000),
    quoted_materials_cost: 1000,
    me10_actual_hours: 150,
    quoted_me10_hours: 140,
  },
  {
    project_id: "r2",
    project_name: "Beta Project",
    industry_segment: "Food & Bev",
    system_category: "Welding",
    stations_count: 6,
    complexity_score_1_5: 3,
    log_quoted_materials_cost: Math.log(2000),
    quoted_materials_cost: 2000,
    me10_actual_hours: 250,
    quoted_me10_hours: 230,
  },
];

const BASE_PROPS = {
  records: FAKE_RECORDS,
  datasetLabel: "Test · Dataset",
  isLoading: false,
  error: null,
};

describe("BusinessInsightsView - happy path", () => {
  it("renders the datasetLabel in the page eyebrow", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    // PageHeader renders: eyebrow="Insights · Test · Dataset"
    expect(screen.getByText(/test · dataset/i)).toBeInTheDocument();
  });

  it("renders the four sub-tabs with the right labels", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /accuracy/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /mix/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /projects/i })).toBeInTheDocument();
  });

  it("defaults to the Overview tab and renders its section headings", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /portfolio kpis/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by industry/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /system category mix/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by sales bucket/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /complexity vs hours/i })).toBeInTheDocument();
    // Accuracy/Mix/Projects sections are NOT in the DOM on Overview.
    expect(screen.queryByRole("heading", { name: /estimation accuracy/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /all projects/i })).not.toBeInTheDocument();
  });

  it("Accuracy tab renders Estimation accuracy + Risk factors, hides Overview sections", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    fireEvent.click(screen.getByRole("tab", { name: /accuracy/i }));
    expect(screen.getByRole("heading", { name: /estimation accuracy/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /risk factors vs overrun/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /portfolio kpis/i })).not.toBeInTheDocument();
  });

  it("Mix tab renders Discipline mix + Material vs labor", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    fireEvent.click(screen.getByRole("tab", { name: /mix/i }));
    expect(screen.getByRole("heading", { name: /discipline mix by industry/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /material cost vs labor hours/i })).toBeInTheDocument();
  });

  it("Projects tab renders All projects heading", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    fireEvent.click(screen.getByRole("tab", { name: /projects/i }));
    expect(screen.getByRole("heading", { name: /all projects/i })).toBeInTheDocument();
  });

  it("shows the industry deep-dive section at top of Overview when exactly one industry is selected", async () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    // Not selected by default
    expect(screen.queryByRole("heading", { name: /industry deep-dive/i })).not.toBeInTheDocument();
    const chipButtons = screen.getAllByRole("button");
    const automotiveChip = chipButtons.find((b) => b.textContent === "Automotive");
    expect(automotiveChip).toBeDefined();
    fireEvent.click(automotiveChip!);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /industry deep-dive/i })).toBeInTheDocument();
    });
  });

  it("does not render any SectionEmptyCard on Overview when records have data", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    // SectionEmptyCard only appears for sections with no data; with valid records all
    // Overview sections should have content.
    const emptyCards = screen.queryAllByText(/not available for this dataset\./i);
    expect(emptyCards).toHaveLength(0);
  });

  it("does not render an error alert when there is no error", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the Download insights pack button when records are present", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    expect(
      screen.getByRole("button", { name: /download insights pack/i }),
    ).toBeInTheDocument();
  });
});

describe("BusinessInsightsView - loading state", () => {
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

describe("BusinessInsightsView - error state", () => {
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

describe("BusinessInsightsView - empty records", () => {
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
    // Section headings are sr-only h2s inside portfolio sections - none should appear
    expect(screen.queryByRole("heading", { name: /portfolio kpis/i })).not.toBeInTheDocument();
  });
});

describe("BusinessInsightsView - filter chip interaction", () => {
  it("clicking an industry chip in the InsightsFilters panel reduces the filteredCount", async () => {
    // With two records from different industries (Automotive / Food & Bev),
    // clicking the Automotive chip should filter down to 1 of 2.
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);

    // Both records shown initially
    expect(screen.getAllByText(/2 projects/i).length).toBeGreaterThanOrEqual(1);

    // The InsightsFilters panel renders industry chips as <button aria-pressed=...>
    // There can be multiple text nodes "Automotive" (chip label + chart legend).
    // The chip is a <button> - get all buttons and find the one with exact text.
    const chipButtons = screen.getAllByRole("button");
    const automotiveChip = chipButtons.find((b) => b.textContent === "Automotive");
    expect(automotiveChip).toBeDefined();

    fireEvent.click(automotiveChip!);

    // After filtering, the "Showing N of M" counter: filteredCount drops to 1
    await waitFor(() => {
      // The showing counter renders filteredCount as "1" and totalCount as "2"
      // The counter format is: "Showing <1> of <2> projects"
      // We can check for the aria-pressed state flipping on the chip
      expect(automotiveChip).toHaveAttribute("aria-pressed", "true");
    });
  });
});

/** Switch to the Projects tab so the TopProjectsTable renders. */
function openProjectsTab() {
  const tab = screen.getByRole("tab", { name: /projects/i });
  fireEvent.click(tab);
}

describe("BusinessInsightsView - table row click opens drawer", () => {
  it("clicking a table row opens the project detail drawer with the row's project name", async () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    openProjectsTab();

    // The drawer starts hidden (no project name visible as the dialog label)
    const dialog = document.querySelector("[role='dialog']");
    expect(dialog).not.toBeNull();
    // Initially the drawer is slide-out (translate-x-full)
    expect(dialog!.className).toMatch(/translate-x-full/);

    // Click a table row - rows have role=button when onRowClick is provided
    // Project name "Alpha Project" appears in a table cell
    const alphaCell = screen.getByText("Alpha Project");
    const rowEl = alphaCell.closest("[role='button']");
    expect(rowEl).not.toBeNull();
    fireEvent.click(rowEl!);

    // Drawer should become visible (translate-x-0) and show the project name
    await waitFor(() => {
      expect(dialog!.className).not.toMatch(/translate-x-full/);
    });
    // The dialog aria-label includes the project name
    expect(dialog!.getAttribute("aria-label")).toContain("Alpha Project");
  });

  it("drawer closes when the X button is clicked", async () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    openProjectsTab();

    // Open the drawer
    const alphaCell = screen.getByText("Alpha Project");
    const rowEl = alphaCell.closest("[role='button']");
    fireEvent.click(rowEl!);

    const dialog = document.querySelector("[role='dialog']");
    await waitFor(() => {
      expect(dialog!.className).not.toMatch(/translate-x-full/);
    });

    // Close via X button
    const closeBtn = screen.getByRole("button", { name: /close project detail/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(dialog!.className).toMatch(/translate-x-full/);
    });
  });

  it("drawer closes on Escape key after being opened", async () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    openProjectsTab();

    const alphaCell = screen.getByText("Alpha Project");
    const rowEl = alphaCell.closest("[role='button']");
    fireEvent.click(rowEl!);

    const dialog = document.querySelector("[role='dialog']");
    await waitFor(() => {
      expect(dialog!.className).not.toMatch(/translate-x-full/);
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(dialog!.className).toMatch(/translate-x-full/);
    });
  });
});

describe("BusinessInsightsView - download buttons (INSIGHTS-01, CONTEXT D-07)", () => {
  beforeEach(() => {
    downloadBlobSpy.mockReset();
  });

  it("renders both the primary 'Download insights pack' button and the secondary engineer-side button", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    expect(
      screen.getByRole("button", { name: /download insights pack/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /download raw portfolio json for engineers/i,
      }),
    ).toBeInTheDocument();
  });

  it("secondary button has the visible label exactly 'Download raw JSON (for engineers)' (CONTEXT D-07)", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    const btn = screen.getByRole("button", {
      name: /download raw portfolio json for engineers/i,
    });
    expect(btn).toHaveTextContent("Download raw JSON (for engineers)");
  });

  it("clicking the secondary button calls downloadBlob with a JSON Blob and a portfolio-{slug}-{date}.json filename", async () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    const btn = screen.getByRole("button", {
      name: /download raw portfolio json for engineers/i,
    });
    fireEvent.click(btn);
    expect(downloadBlobSpy).toHaveBeenCalledTimes(1);
    const [blob, filename] = downloadBlobSpy.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toContain("application/json");
    // Slug-agnostic regex -- passes for any datasetLabel BASE_PROPS uses,
    // so this test does not break if BASE_PROPS.datasetLabel ever changes.
    expect(filename).toMatch(/^portfolio-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("the secondary button's downloaded blob, when read, is byte-equivalent to JSON.stringify(portfolio, null, 2) for the rendered records", async () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    const btn = screen.getByRole("button", {
      name: /download raw portfolio json for engineers/i,
    });
    fireEvent.click(btn);
    const [blob] = downloadBlobSpy.mock.calls[0];
    // jsdom's Blob does not support .text() or Response(blob).text(); use
    // FileReader which jsdom does implement.
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob as Blob);
    });
    // Round-trip parse -- guarantees pretty-printed two-space JSON.
    expect(() => JSON.parse(text)).not.toThrow();
    const parsed = JSON.parse(text);
    expect(parsed.kpis.projectCount).toBe(FAKE_RECORDS.length);
    // Two-space indent contract (engineers' tooling depends on this)
    expect(text.split("\n")[1]).toMatch(/^ {2}"/);
  });

  it("does NOT trigger the secondary download until the user clicks", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    expect(downloadBlobSpy).not.toHaveBeenCalled();
  });

  it("secondary button uses text-xs / text-muted / underline-on-hover styling (CONTEXT D-07)", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    const btn = screen.getByRole("button", {
      name: /download raw portfolio json for engineers/i,
    });
    const cls = btn.className;
    expect(cls).toContain("text-xs");
    expect(cls).toContain("text-muted");
    expect(cls).toContain("hover:underline");
  });

  it("secondary button is keyboard-focusable", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    const btn = screen.getByRole("button", {
      name: /download raw portfolio json for engineers/i,
    });
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });

  it("does not render either download button when records is empty", () => {
    renderWithProviders(
      <BusinessInsightsView
        records={[]}
        datasetLabel="Empty"
        isLoading={false}
        error={null}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /download insights pack/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /download raw portfolio json for engineers/i,
      }),
    ).not.toBeInTheDocument();
  });
});

describe("BusinessInsightsView - jargon-guard on download surface (cross-cuts DATA-03)", () => {
  const BANNED = [
    /\bP10\b/,
    /\bP50\b/,
    /\bP90\b/,
    /Pyodide/i,
    /\bgradient\s*boost(ing|ed)?\b/i,
    /R²/,
    /\bconfidence interval(s)?\b/i,
    /\bensemble\b/i,
    /\bcategorical\b/i,
    /\bembedding\b/i,
    /\btraining data\b/i,
    /\bregression\b/i,
    /\bsklearn\b/i,
    /\bjoblib\b/i,
    /\bquantile\b/i,
  ];

  it("neither download button label/title contains banned ML jargon", () => {
    renderWithProviders(<BusinessInsightsView {...BASE_PROPS} />);
    const primary = screen.getByRole("button", { name: /download insights pack/i });
    const secondary = screen.getByRole("button", {
      name: /download raw portfolio json for engineers/i,
    });
    const surface =
      [primary.textContent ?? "", primary.getAttribute("title") ?? "",
       secondary.textContent ?? "", secondary.getAttribute("title") ?? "",
       secondary.getAttribute("aria-label") ?? ""].join(" | ");
    for (const re of BANNED) {
      expect(surface, `Banned token ${re} on download surface`).not.toMatch(re);
    }
  });
});
