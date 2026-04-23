import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { ProjectRecord } from "@/demo/realProjects";
import type { PyodideStatus } from "@/demo/pyodideClient";

// ---------------------------------------------------------------------------
// Mock pyodideClient - all exported functions become controlled stubs.
// ---------------------------------------------------------------------------

type StatusListener = (status: PyodideStatus) => void;

const mockSubscribe = vi.fn((_cb: StatusListener) => () => undefined);
const mockEnsurePyodideReady = vi.fn(() => Promise.resolve());
const mockEnsureModelsReady = vi.fn(() => Promise.resolve());
const mockPredictQuote = vi.fn(() =>
  Promise.resolve({
    ops: {
      me10: { p10: 100, p50: 200, p90: 300, std: 50, rel_width: 1.0, confidence: "high" as const },
      ee20: { p10: 50, p50: 100, p90: 150, std: 25, rel_width: 1.0, confidence: "moderate" as const },
    },
    total_p10: 150,
    total_p50: 300,
    total_p90: 450,
    sales_buckets: {},
  }),
);
const mockGetFeatureImportances = vi.fn(() =>
  Promise.resolve({
    me10_actual_hours: [["station_count", 0.4], ["robot_count", 0.3]] as Array<[string, number]>,
    ee20_actual_hours: [["panel_count", 0.2]] as Array<[string, number]>,
  }),
);

vi.mock("@/demo/pyodideClient", () => ({
  subscribe: mockSubscribe,
  ensurePyodideReady: mockEnsurePyodideReady,
  ensureModelsReady: mockEnsureModelsReady,
  predictQuote: mockPredictQuote,
  getFeatureImportances: mockGetFeatureImportances,
}));

// ---------------------------------------------------------------------------
// Mock realProjects - useRealProjects returns a small pool.
// ---------------------------------------------------------------------------

const FAKE_POOL: ProjectRecord[] = [
  {
    project_id: "r1",
    project_name: "Alpha Build Cell",
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    plc_family: "AB Compact Logix",
    hmi_family: "AB PanelView Plus",
    vision_type: "None",
    stations_count: 4,
    complexity_score_1_5: 3,
    log_quoted_materials_cost: 7,
    me10_actual_hours: 200,
    ee20_actual_hours: 100,
  },
];

vi.mock("@/demo/realProjects", async () => {
  const actual = await vi.importActual<typeof import("@/demo/realProjects")>("@/demo/realProjects");
  return {
    ...actual,
    useRealProjects: () => ({ data: FAKE_POOL, isLoading: false, error: null }),
  };
});

// ---------------------------------------------------------------------------
// Mock modelMetrics - useModelMetrics returns fake metrics.
// ---------------------------------------------------------------------------

vi.mock("@/demo/modelMetrics", () => ({
  useModelMetrics: () => ({
    data: {
      models: [
        { target: "me10_actual_hours", rows: 24, mae: 50, r2: 0.3 },
        { target: "ee20_actual_hours", rows: 24, mae: 30, r2: 0.4 },
      ],
    },
  }),
}));

// ---------------------------------------------------------------------------
// Import component after mocks are registered.
// ---------------------------------------------------------------------------

const { ComparisonQuote } = await import("./ComparisonQuote");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ComparisonQuote - page header copy", () => {
  it("renders the correct eyebrow text", () => {
    renderWithProviders(<ComparisonQuote />);
    expect(screen.getByText("Real Data · Quote")).toBeInTheDocument();
  });

  it("renders the correct title", () => {
    renderWithProviders(<ComparisonQuote />);
    expect(screen.getByRole("heading", { name: /real data quote/i })).toBeInTheDocument();
  });

  it("mentions that models are trained on the twenty-four completed projects", () => {
    renderWithProviders(<ComparisonQuote />);
    expect(
      screen.getByText(/models trained on twenty-four completed historical projects/i),
    ).toBeInTheDocument();
  });
});

describe("ComparisonQuote - model loading", () => {
  it("calls ensurePyodideReady on mount", () => {
    renderWithProviders(<ComparisonQuote />);
    expect(mockEnsurePyodideReady).toHaveBeenCalled();
  });

  it("calls ensureModelsReady('real') after Pyodide is ready", async () => {
    renderWithProviders(<ComparisonQuote />);
    await waitFor(() => expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"));
  });
});

describe("ComparisonQuote - form submit calls predictQuote('real')", () => {
  beforeEach(() => {
    mockPredictQuote.mockClear();
    mockGetFeatureImportances.mockClear();
  });

  it("calls predictQuote with dataset='real' on form submit", async () => {
    renderWithProviders(<ComparisonQuote />);

    // Wait for ready state (ensureModelsReady resolves)
    await waitFor(() => expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"));

    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() =>
      expect(mockPredictQuote).toHaveBeenCalledWith(
        expect.any(Object),
        "real",
      ),
    );
  });

  it("calls getFeatureImportances('real') on form submit", async () => {
    renderWithProviders(<ComparisonQuote />);

    await waitFor(() => expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"));

    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() =>
      expect(mockGetFeatureImportances).toHaveBeenCalledWith("real"),
    );
  });

  it("renders QuoteResultPanel hero estimate after submit", async () => {
    renderWithProviders(<ComparisonQuote />);

    // Wait for the form to appear (ready=true).
    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // The adapter sums p50 values: 200 + 100 = 300 hrs.
    // "Estimated hours" text is the eyebrow in the hero card.
    await waitFor(() =>
      expect(screen.getByText(/Estimated hours/i)).toBeInTheDocument(),
    );
  });

  it("renders 'Most similar past projects' label in QuoteResultPanel", async () => {
    renderWithProviders(<ComparisonQuote />);

    await waitFor(() => expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"));

    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() =>
      expect(screen.getByText("Most similar past projects")).toBeInTheDocument(),
    );
  });
});

describe("ComparisonQuote - loading state", () => {
  it("does not render the result panel before form submit", async () => {
    renderWithProviders(<ComparisonQuote />);
    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"),
    );
    // Before submit, no hero estimate text present.
    expect(screen.queryByText(/Estimated hours/i)).not.toBeInTheDocument();
  });
});
