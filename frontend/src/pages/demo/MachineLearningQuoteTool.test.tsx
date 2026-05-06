import "fake-indexeddb/auto";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { ProjectRecord } from "@/demo/realProjects";
import type { PyodideStatus } from "@/demo/pyodideClient";
import type { SavedQuote } from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Mock pyodideClient
// ---------------------------------------------------------------------------

type StatusListener = (status: PyodideStatus) => void;

const mockSubscribe = vi.fn((_cb: StatusListener) => () => undefined);
const mockEnsurePyodideReady = vi.fn(() => Promise.resolve());
const mockEnsureModelsReady = vi.fn(() => Promise.resolve());
const mockPredictQuote = vi.fn(() =>
  Promise.resolve({
    ops: {
      me10: { p10: 200, p50: 400, p90: 600, std: 100, rel_width: 1.0, confidence: "moderate" as const },
      pm200: { p10: 60, p50: 120, p90: 180, std: 30, rel_width: 1.0, confidence: "high" as const },
    },
    total_p10: 260,
    total_p50: 520,
    total_p90: 780,
    sales_buckets: {},
  }),
);
const mockGetFeatureImportances = vi.fn(() =>
  Promise.resolve({
    me10_actual_hours: [["station_count", 0.5], ["robot_count", 0.2]] as Array<[string, number]>,
    pm200_actual_hours: [["complexity_score_1_5", 0.3]] as Array<[string, number]>,
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
// Mock realProjects - useSyntheticPool returns a small pool.
// ---------------------------------------------------------------------------

const FAKE_POOL: ProjectRecord[] = [
  {
    project_id: "s1",
    project_name: "Synthetic Row 1",
    industry_segment: "Food & Beverage",
    system_category: "End of Line Automation",
    automation_level: "Semi-Automatic",
    plc_family: "AB Compact Logix",
    hmi_family: "AB PanelView Plus",
    vision_type: "None",
    stations_count: 3,
    complexity_score_1_5: 2,
    log_quoted_materials_cost: 6,
    me10_actual_hours: 400,
    pm200_actual_hours: 100,
  },
];

vi.mock("@/demo/realProjects", async () => {
  const actual = await vi.importActual<typeof import("@/demo/realProjects")>("@/demo/realProjects");
  return {
    ...actual,
    useSyntheticPool: () => ({ data: FAKE_POOL, isLoading: false, error: null }),
  };
});

// ---------------------------------------------------------------------------
// Mock modelMetrics
// ---------------------------------------------------------------------------

vi.mock("@/demo/modelMetrics", () => ({
  useModelMetrics: () => ({
    data: {
      models: [
        { target: "me10_actual_hours", rows: 500, mae: 80, r2: 0.72 },
        { target: "pm200_actual_hours", rows: 500, mae: 20, r2: 0.65 },
      ],
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock useSavedQuotes — P2 regression test asserts saveSavedQuote is called
// with restoredFromVersion=undefined when ?restoreVersion= is malformed.
// ---------------------------------------------------------------------------

const mockSaveMutateAsync = vi.fn((args: Record<string, unknown>) => {
  void args;
  return Promise.resolve({
    id: "test-quote-id",
    versions: [{ version: 1 }, { version: 2 }],
    status: "draft",
  } as unknown as SavedQuote);
});
const mockUseSavedQuote = vi.fn(() => ({
  data: undefined as SavedQuote | undefined,
  isLoading: false,
}));

vi.mock("@/hooks/useSavedQuotes", () => ({
  useSaveQuote: () => ({ mutateAsync: mockSaveMutateAsync, isPending: false }),
  useSetStatus: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSavedQuote: () => mockUseSavedQuote(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import component after mocks are registered.
// ---------------------------------------------------------------------------

const { MachineLearningQuoteTool } = await import("./MachineLearningQuoteTool");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MachineLearningQuoteTool - page header copy", () => {
  it("renders the updated eyebrow 'Synthetic Data · Quote'", () => {
    renderWithProviders(<MachineLearningQuoteTool />);
    expect(screen.getByText("Synthetic Data · Quote")).toBeInTheDocument();
  });

  it("renders the title 'Machine Learning Quote Tool'", () => {
    renderWithProviders(<MachineLearningQuoteTool />);
    expect(
      screen.getByRole("heading", { name: /machine learning quote tool/i }),
    ).toBeInTheDocument();
  });

  it("renders the updated narrative description", () => {
    renderWithProviders(<MachineLearningQuoteTool />);
    expect(
      screen.getByText(/hour estimates for a new project/i),
    ).toBeInTheDocument();
  });

  it("does NOT render the old ML jargon description about Gradient Boosting", () => {
    renderWithProviders(<MachineLearningQuoteTool />);
    expect(
      screen.queryByText(/gradient boosting models/i),
    ).not.toBeInTheDocument();
  });
});

describe("MachineLearningQuoteTool - model loading", () => {
  it("calls ensurePyodideReady on mount", () => {
    renderWithProviders(<MachineLearningQuoteTool />);
    expect(mockEnsurePyodideReady).toHaveBeenCalled();
  });

  it("calls ensureModelsReady('synthetic') after Pyodide is ready", async () => {
    renderWithProviders(<MachineLearningQuoteTool />);
    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic"),
    );
  });
});

describe("MachineLearningQuoteTool - form submit calls predictQuote('synthetic')", () => {
  beforeEach(() => {
    mockPredictQuote.mockClear();
    mockGetFeatureImportances.mockClear();
  });

  it("calls predictQuote with dataset='synthetic' on submit", async () => {
    renderWithProviders(<MachineLearningQuoteTool />);

    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic"),
    );

    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() =>
      expect(mockPredictQuote).toHaveBeenCalledWith(
        expect.any(Object),
        "synthetic",
      ),
    );
  });

  it("calls getFeatureImportances('synthetic') on submit", async () => {
    renderWithProviders(<MachineLearningQuoteTool />);

    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic"),
    );

    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() =>
      expect(mockGetFeatureImportances).toHaveBeenCalledWith("synthetic"),
    );
  });

  it("renders QuoteResultPanel hero estimate after submit (p50 sum: 400+120=520)", async () => {
    renderWithProviders(<MachineLearningQuoteTool />);

    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic"),
    );

    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() =>
      expect(screen.getByText(/520 hrs/i)).toBeInTheDocument(),
    );
  });

  it("renders 'Most similar training rows' label in QuoteResultPanel", async () => {
    renderWithProviders(<MachineLearningQuoteTool />);

    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic"),
    );

    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() =>
      expect(screen.getByText("Most similar training rows")).toBeInTheDocument(),
    );
  });

  it("does NOT render 'P50' text in the result panel", async () => {
    renderWithProviders(<MachineLearningQuoteTool />);

    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic"),
    );

    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() =>
      expect(screen.getByText(/520 hrs/i)).toBeInTheDocument(),
    );

    expect(screen.queryByText(/P50/)).not.toBeInTheDocument();
  });
});

describe("MachineLearningQuoteTool - loading state", () => {
  it("does not render the result panel before form submit", async () => {
    renderWithProviders(<MachineLearningQuoteTool />);
    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic"),
    );
    // Before submit, no hero estimate text present.
    expect(screen.queryByText(/Estimated hours/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// P2 regression: malformed ?restoreVersion= must NOT flow into save payload.
// Mirrors the ComparisonQuote regression test — same fix, both Quote tools.
// Without parse hardening, Number("foo") → NaN trips schema validation
// (z.number().int().min(1)) and surfaces as a generic save-error toast.
// ---------------------------------------------------------------------------

describe("MachineLearningQuoteTool - P2 malformed restoreVersion does not flow into save", () => {
  beforeEach(() => {
    mockSaveMutateAsync.mockClear();
    mockUseSavedQuote.mockReset();
    mockPredictQuote.mockClear();
    mockGetFeatureImportances.mockClear();
  });

  it("saveSavedQuote receives restoredFromVersion=undefined when ?restoreVersion= is non-integer", async () => {
    mockUseSavedQuote.mockReturnValue({
      data: {
        id: "test-quote-id",
        name: "Existing Quote",
        status: "draft",
      } as unknown as SavedQuote,
      isLoading: false,
    });

    renderWithProviders(<MachineLearningQuoteTool />, {
      route: "/quote-tool?fromQuote=test-quote-id&restoreVersion=foo",
    });

    await waitFor(() =>
      expect(mockEnsureModelsReady).toHaveBeenCalledWith("synthetic"),
    );

    const submitBtn = await screen.findByRole("button", {
      name: /regenerate estimate/i,
    });
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    await waitFor(() =>
      expect(screen.getByText(/Estimated hours/i)).toBeInTheDocument(),
    );

    const saveTrigger = await screen.findByRole("button", { name: /save quote/i });
    await act(async () => {
      fireEvent.click(saveTrigger);
    });

    const dialog = await screen.findByRole("dialog");
    const dialogSaveBtn = dialog.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    await act(async () => {
      fireEvent.click(dialogSaveBtn!);
    });

    await waitFor(() => expect(mockSaveMutateAsync).toHaveBeenCalled());
    const args = mockSaveMutateAsync.mock.calls[0]![0] as {
      id?: string;
      restoredFromVersion?: number;
    };
    expect(args.id).toBe("test-quote-id");
    expect(args.restoredFromVersion).toBeUndefined();
  });
});
