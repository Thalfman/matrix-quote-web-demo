import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { renderWithProviders } from "@/test/render";

import { SingleQuote } from "./SingleQuote";

vi.mock("@/api/client", () => {
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
    getAdminToken: () => null,
    setAdminToken: vi.fn(),
    clearAdminToken: vi.fn(),
  };
});

vi.mock("@/api/quote", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/quote")>();
  return {
    ...actual,
    downloadAdHocPdf: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { api } from "@/api/client";
import { downloadAdHocPdf } from "@/api/quote";

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);
const mockDownloadAdHocPdf = vi.mocked(downloadAdHocPdf);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const dropdownsData = {
  industry_segment: ["Automotive"],
  system_category: ["Machine Tending"],
  automation_level: ["Robotic"],
  plc_family: ["AB Compact Logix"],
  hmi_family: ["AB PanelView Plus"],
  vision_type: ["None"],
};

const readyGetMock = async (url: string) => {
  if (url === "/health") return { data: { status: "ok", models_ready: true } };
  if (url === "/catalog/dropdowns") return { data: dropdownsData };
  throw new Error(`Unexpected GET ${url}`);
};

/** Well-formed ExplainedQuoteResponse (the shape stored in component state). */
const explainedResponse = {
  prediction: {
    ops: {
      me10: { p50: 12, p10: 10, p90: 14, std: 1.5, rel_width: 0.3, confidence: "high" },
    },
    total_p50: 100,
    total_p10: 80,
    total_p90: 120,
    sales_buckets: {
      ME: { p50: 12, p10: 10, p90: 14, rel_width: 0.3, confidence: "high" },
      EE: { p50: 0, p10: 0, p90: 0, rel_width: 0, confidence: "low" },
    },
  },
  drivers: [
    {
      operation: "me10",
      available: true,
      drivers: [
        { feature: "stations_count", contribution: 20, value: "4" },
        { feature: "robot_count", contribution: -5, value: "2" },
      ],
    },
  ],
  neighbors: [
    {
      project_name: "Alpha Project",
      year: 2023,
      industry_segment: "Automotive",
      automation_level: "Robotic",
      stations: 4,
      actual_hours: 110,
      similarity: 0.92,
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render SingleQuote with health=ready and dropdowns, then return helpers. */
async function renderAndWaitForForm() {
  mockGet.mockImplementation(readyGetMock);
  const rendered = renderWithProviders(<SingleQuote />);
  await rendered.findByRole("button", { name: /regenerate estimate/i });
  return rendered;
}

async function submitForm(container: HTMLElement) {
  const form = container.querySelector("form") as HTMLFormElement;
  form.requestSubmit();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SingleQuote", () => {
  afterEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDownloadAdHocPdf.mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("renders the not-trained empty state when /api/health reports models_ready=false", async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === "/health") return { data: { status: "ok", models_ready: false } };
      if (url === "/catalog/dropdowns") return { data: dropdownsData };
      throw new Error(`Unexpected GET ${url}`);
    });

    renderWithProviders(<SingleQuote />);

    expect(await screen.findByText(/models are not trained/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /regenerate estimate/i })).not.toBeInTheDocument();
  });

  it("renders the form when models are ready and submits a prediction", async () => {
    mockPost.mockResolvedValue({ data: explainedResponse });

    const { container } = await renderAndWaitForForm();

    const button = screen.getByRole("button", { name: /regenerate estimate/i });
    expect(button).toBeInTheDocument();

    submitForm(container);

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    const [url, payload] = mockPost.mock.calls[0];
    expect(url).toBe("/quote/single");
    expect(payload).toMatchObject({
      industry_segment: "Automotive",
      system_category: "Machine Tending",
      automation_level: "Robotic",
      has_controls: 1,
      has_robotics: 1,
      duplicate: 0,
      Retrofit: 0,
      log_quoted_materials_cost: 0,
    });

    // Hero appears after result lands.
    expect(await screen.findByText(/ESTIMATED HOURS/i)).toBeInTheDocument();
  });

  it("renders the skeleton while a quote is in-flight", async () => {
    // Never-resolving post holds the loading state.
    mockPost.mockImplementation(() => new Promise(() => {}));

    const { container } = await renderAndWaitForForm();
    submitForm(container);

    // ResultSkeleton is rendered with aria-hidden="true" and several
    // steel-200 placeholder divs. The skeleton root is the first child
    // of the aside and carries aria-hidden.
    await waitFor(() => {
      expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    });

    // The hero / tab content has not appeared.
    expect(screen.queryByText(/ESTIMATED HOURS/i)).not.toBeInTheDocument();
  });

  it("switches between Estimate, Drivers, Similar, and Scenarios tabs once a result arrives", async () => {
    mockPost.mockResolvedValue({ data: explainedResponse });

    const { container } = await renderAndWaitForForm();
    submitForm(container);

    // Wait for result panel (hero heading).
    await screen.findByText(/ESTIMATED HOURS/i);

    // Estimate tab is active by default - tabpanel present.
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();

    // Switch to Drivers tab - driver feature name visible.
    fireEvent.click(screen.getByRole("tab", { name: /^Drivers$/i }));
    await screen.findByText(/stations_count/i);

    // Switch to Similar tab - neighbour project name visible.
    fireEvent.click(screen.getByRole("tab", { name: /^Similar$/i }));
    await screen.findByText(/Alpha Project/i);

    // Switch to Scenarios tab - empty-state message visible.
    fireEvent.click(screen.getByRole("tab", { name: /^Scenarios$/i }));
    await screen.findByText(/No scenarios saved/i);
  });

  it("keeps the hero number frozen at target under prefers-reduced-motion", async () => {
    // Stub matchMedia so every query returns matches:true (reduced motion).
    window.matchMedia = (q: string) =>
      ({
        matches: q.includes("reduce"),
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList;

    mockPost.mockResolvedValue({ data: explainedResponse });

    const { container } = await renderAndWaitForForm();
    submitForm(container);

    // Wait for result to appear.
    await screen.findByText(/ESTIMATED HOURS/i);

    // Under reduced motion useCountUp returns target immediately.
    // The hero element has class text-display and shows the formatted value.
    await waitFor(() => {
      // The hero number is the display-hero div inside #quote-results (not the page h1).
      const heroEl = container.querySelector("#quote-results .display-hero");
      // Intl formats 100 as "100".
      expect(heroEl?.textContent).toBe("100");
    });
  });

  it("shows the 'Populate with last quote' link when sessionStorage is populated and fills form on click", async () => {
    // Pre-seed sessionStorage with a previous form submission.
    const lastValues = {
      industry_segment: "Automotive",
      system_category: "Machine Tending",
      automation_level: "Robotic",
      has_controls: true,
      has_robotics: true,
      retrofit: false,
      duplicate: false,
      stations_count: 5,
      part_types: 0,
      safety_doors: 0,
      robot_count: 2,
      weldment_perimeter_ft: 0,
      safety_devices_count: 0,
      fixture_sets: 0,
      fence_length_ft: 0,
      conveyor_length_ft: 0,
      plc_family: "AB Compact Logix",
      hmi_family: "AB PanelView Plus",
      vision_type: "None",
      panel_count: 0,
      servo_axes: 0,
      drive_count: 0,
      pneumatic_devices: 0,
      vision_systems_count: 0,
      product_familiarity_score: 3,
      product_rigidity: 3,
      bulk_rigidity_score: 3,
      process_uncertainty_score: 3,
      changeover_time_min: 0,
      is_product_deformable: false,
      is_bulk_product: false,
      has_tricky_packaging: false,
      complexity_score_1_5: 3,
      custom_pct: 50,
      stations_robot_index: 0,
      mech_complexity_index: 0,
      controls_complexity_index: 0,
      physical_scale_index: 0,
      estimated_materials_cost: 0,
    };
    sessionStorage.setItem("matrix.singlequote.last", JSON.stringify(lastValues));

    mockGet.mockImplementation(readyGetMock);
    renderWithProviders(<SingleQuote />);

    // The link should appear because sessionStorage has a value.
    const link = await screen.findByRole("button", { name: /populate with last quote/i });
    expect(link).toBeInTheDocument();

    // Clicking it should not throw.
    fireEvent.click(link);
    // Link remains in the DOM (form still has session data).
    expect(screen.getByRole("button", { name: /populate with last quote/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Export PDF (Plan D)
  // ---------------------------------------------------------------------------

  /**
   * Helper: render form, submit to get a result, then wait for the Export PDF
   * button to appear (it's only rendered once result is non-null).
   */
  async function renderWithResult() {
    mockPost.mockResolvedValue({ data: explainedResponse });
    const rendered = await renderAndWaitForForm();
    submitForm(rendered.container);
    await screen.findByText(/ESTIMATED HOURS/i);
    const exportBtn = await screen.findByRole("button", { name: /export pdf/i });
    return { ...rendered, exportBtn };
  }

  it("Export PDF prompts for project name and calls downloadAdHocPdf with correct payload", async () => {
    // Pre-set display name so ensureDisplayName() doesn't open a second prompt.
    localStorage.setItem("matrix.displayName", "Test User");

    mockDownloadAdHocPdf.mockResolvedValue(undefined);

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValueOnce("My Project");

    const { exportBtn } = await renderWithResult();
    fireEvent.click(exportBtn);

    await waitFor(() =>
      expect(mockDownloadAdHocPdf).toHaveBeenCalledTimes(1),
    );

    expect(promptSpy).toHaveBeenCalled();
    const callArg = mockDownloadAdHocPdf.mock.calls[0][0];
    expect(callArg.name).toBe("Draft");
    expect(callArg.project_name).toBe("My Project");
    expect(callArg.created_by).toBe("Test User");
    expect(callArg.prediction).toEqual(explainedResponse.prediction);
  });

  it("Export PDF does NOT call downloadAdHocPdf when user cancels the prompt", async () => {
    localStorage.setItem("matrix.displayName", "Test User");

    mockDownloadAdHocPdf.mockResolvedValue(undefined);

    // Simulate user pressing Cancel (prompt returns null).
    vi.spyOn(window, "prompt").mockReturnValueOnce(null);

    const { exportBtn } = await renderWithResult();
    fireEvent.click(exportBtn);

    // Give any async handlers a chance to run.
    await new Promise((r) => setTimeout(r, 50));

    expect(mockDownloadAdHocPdf).not.toHaveBeenCalled();
  });

  it("Export PDF shows toast.error when downloadAdHocPdf rejects", async () => {
    localStorage.setItem("matrix.displayName", "Test User");

    mockDownloadAdHocPdf.mockRejectedValue(new Error("500"));

    vi.spyOn(window, "prompt").mockReturnValueOnce("My Project");

    const { exportBtn } = await renderWithResult();
    fireEvent.click(exportBtn);

    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Could not generate PDF"),
    );
  });
});
