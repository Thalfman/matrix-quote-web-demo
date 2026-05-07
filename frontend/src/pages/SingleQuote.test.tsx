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
  // Match the trained model's actual vision_type vocabulary so the picker
  // surfaces real categories, not the placeholder "2D" / "3D" literals.
  vision_type: ["None", "Cognex 2D", "3D Vision", "Keyence IV3"],
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

  // Phase 5 (D-16): the UX-01 "Populate with last quote" sessionStorage recall
  // was deprecated. The behaviour is now provided by `?fromQuote=<id>`
  // rehydration tested in QuoteForm.test.tsx (Plan 05-09 Task 2).

  it("Save scenario shows toast.error when current form values fail schema parsing", async () => {
    vi.spyOn(window, "prompt")
      .mockReturnValueOnce("Scenario with invalid form")
      .mockReturnValueOnce("Project Name");

    const { container } = await renderWithResult();

    const addBtn = await screen.findByRole("button", { name: /add vision system/i });
    fireEvent.click(addBtn);
    const count = container.querySelector<HTMLInputElement>(
      'input[name="visionRows.0.count"]',
    );
    expect(count).not.toBeNull();
    fireEvent.change(count!, { target: { value: "0" } });
    fireEvent.blur(count!);

    fireEvent.click(screen.getByRole("button", { name: /save scenario/i }));

    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Could not save scenario"),
    );
    expect(mockPost).not.toHaveBeenCalledWith(
      "/quotes",
      expect.anything(),
    );
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

  it("Export PDF shows toast.error when current form values fail schema parsing", async () => {
    localStorage.setItem("matrix.displayName", "Test User");
    mockDownloadAdHocPdf.mockResolvedValue(undefined);
    vi.spyOn(window, "prompt").mockReturnValueOnce("My Project");

    const { container, exportBtn } = await renderWithResult();

    const addBtn = await screen.findByRole("button", { name: /add vision system/i });
    fireEvent.click(addBtn);
    const count = container.querySelector<HTMLInputElement>(
      'input[name="visionRows.0.count"]',
    );
    expect(count).not.toBeNull();
    fireEvent.change(count!, { target: { value: "0" } });
    fireEvent.blur(count!);

    fireEvent.click(exportBtn);

    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Could not generate PDF"),
    );
    expect(mockDownloadAdHocPdf).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Phase 6 regression: visionRows MUST surface in the production wire payload
  //
  // Pre-fix bug: transformToQuoteInput hard-coded vision_type:"None" /
  // vision_systems_count:0, on the assumption that every call site would
  // overlay per-row values. The multi-vision aggregator (demo paths) does that
  // overlay; SingleQuote's production paths (POST /quote/single,
  // useSaveScenario, downloadAdHocPdf) do not. Without this regression test
  // the dropped-rows bug recurs whenever the wire-format defaults shift.
  // ---------------------------------------------------------------------------

  it("populated visionRows surfaces vision_type + vision_systems_count in the /quote/single payload", async () => {
    mockPost.mockResolvedValue({ data: explainedResponse });

    const { container } = await renderAndWaitForForm();

    // The picker uses dropdownsData.vision_type minus "None" as its options;
    // clicking Add inserts the first option ("Cognex 2D") with count:1.
    const addBtn = await screen.findByRole("button", { name: /add vision system/i });
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    // Bump the second row's count from 1 -> 3.
    const counts = container.querySelectorAll<HTMLInputElement>(
      'input[name="visionRows.1.count"]',
    );
    expect(counts.length).toBe(1);
    fireEvent.change(counts[0], { target: { value: "3" } });
    fireEvent.blur(counts[0]);

    submitForm(container);

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    const [url, payload] = mockPost.mock.calls[0];
    expect(url).toBe("/quote/single");
    // Wire payload MUST carry the first row's type and the SUM of counts.
    // Pre-fix this was always vision_type:"None" / vision_systems_count:0.
    expect(payload).toMatchObject({
      vision_type: "Cognex 2D",
      vision_systems_count: 4, // row 0 (count 1) + row 1 (count 3)
    });
  });

  it("empty visionRows wires vision_type:'None' and vision_systems_count:0", async () => {
    mockPost.mockResolvedValue({ data: explainedResponse });

    const { container } = await renderAndWaitForForm();
    submitForm(container);

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    const [, payload] = mockPost.mock.calls[0];
    expect(payload).toMatchObject({
      vision_type: "None",
      vision_systems_count: 0,
    });
  });

  it("visionRows surface in the downloadAdHocPdf body (PDF export path)", async () => {
    localStorage.setItem("matrix.displayName", "Test User");
    mockPost.mockResolvedValue({ data: explainedResponse });
    mockDownloadAdHocPdf.mockResolvedValue(undefined);
    vi.spyOn(window, "prompt").mockReturnValueOnce("My Project");

    const { container } = await renderAndWaitForForm();

    // Add a row before the result is generated so the export path inherits it.
    const addBtn = await screen.findByRole("button", { name: /add vision system/i });
    fireEvent.click(addBtn);
    submitForm(container);
    await screen.findByText(/ESTIMATED HOURS/i);
    const exportBtn = await screen.findByRole("button", { name: /export pdf/i });
    fireEvent.click(exportBtn);

    await waitFor(() => expect(mockDownloadAdHocPdf).toHaveBeenCalledTimes(1));
    const callArg = mockDownloadAdHocPdf.mock.calls[0][0];
    expect(callArg.inputs).toMatchObject({
      vision_type: "Cognex 2D",
      vision_systems_count: 1,
    });
  });
});
