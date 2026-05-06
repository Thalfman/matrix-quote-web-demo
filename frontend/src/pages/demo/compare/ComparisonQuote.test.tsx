import "fake-indexeddb/auto";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { ProjectRecord } from "@/demo/realProjects";
import type { PyodideStatus } from "@/demo/pyodideClient";
import type { SavedQuote } from "@/lib/savedQuoteSchema";

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
// Mock useSavedQuotes — BL-01 / WR-07 integration test asserts
// saveSavedQuote is called with `args.id` set when ?fromQuote= is in URL.
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

// ---------------------------------------------------------------------------
// BL-01 + WR-07 integration: re-saving an opened-from-list quote MUST pass
// `id` to saveSavedQuote so a new version is appended (not a duplicate
// quote), and `restoredFromVersion` MUST flow through when the URL carries
// ?restoreVersion=N.
// ---------------------------------------------------------------------------

describe("ComparisonQuote - BL-01 fromQuote= wires quoteId into Save", () => {
  beforeEach(() => {
    mockSaveMutateAsync.mockClear();
    mockUseSavedQuote.mockReset();
    mockPredictQuote.mockClear();
    mockGetFeatureImportances.mockClear();
  });

  it("saveSavedQuote is called with args.id set when arriving via ?fromQuote= (BL-01)", async () => {
    // Pretend the user opened /compare/quote?fromQuote=test-quote-id from the
    // My Quotes list — useSavedQuote returns the existing record so the
    // dialog can prefill name + status.
    mockUseSavedQuote.mockReturnValue({
      data: {
        id: "test-quote-id",
        name: "Existing Quote",
        status: "sent",
      } as unknown as SavedQuote,
      isLoading: false,
    });

    renderWithProviders(<ComparisonQuote />, {
      route: "/compare/quote?fromQuote=test-quote-id",
    });

    await waitFor(() => expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"));

    // Run an estimate to surface QuoteResultPanel + the Save button.
    const submitBtn = await screen.findByRole("button", {
      name: /regenerate estimate/i,
    });
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    await waitFor(() =>
      expect(screen.getByText(/Estimated hours/i)).toBeInTheDocument(),
    );

    // Open the Save dialog.
    const saveTrigger = await screen.findByRole("button", { name: /save quote/i });
    await act(async () => {
      fireEvent.click(saveTrigger);
    });

    // The submit button inside the dialog has aria-label "Save quote" too —
    // pick the one inside the dialog's <form>.
    const dialog = await screen.findByRole("dialog");
    const dialogSaveBtn = dialog.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(dialogSaveBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(dialogSaveBtn!);
    });

    await waitFor(() => expect(mockSaveMutateAsync).toHaveBeenCalled());
    const args = mockSaveMutateAsync.mock.calls[0]?.[0] as unknown as {
      id?: string;
    };
    // BL-01 contract: id MUST be set so storage layer appends v(N+1) instead
    // of generating a new uuid + creating a duplicate quote.
    expect(args.id).toBe("test-quote-id");
  });

  it("saveSavedQuote receives restoredFromVersion when ?restoreVersion=N is in URL (WR-07)", async () => {
    mockUseSavedQuote.mockReturnValue({
      data: {
        id: "test-quote-id",
        name: "Existing Quote",
        status: "draft",
      } as unknown as SavedQuote,
      isLoading: false,
    });

    renderWithProviders(<ComparisonQuote />, {
      route: "/compare/quote?fromQuote=test-quote-id&restoreVersion=2",
    });

    await waitFor(() => expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"));

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
    expect(args.restoredFromVersion).toBe(2);
  });

  it("saveSavedQuote receives restoredFromVersion=undefined when ?restoreVersion= is non-integer (P2 fix)", async () => {
    // Without parse hardening, Number("foo") → NaN flows through to schema
    // validation and the user sees a misleading generic save-error toast.
    mockUseSavedQuote.mockReturnValue({
      data: {
        id: "test-quote-id",
        name: "Existing Quote",
        status: "draft",
      } as unknown as SavedQuote,
      isLoading: false,
    });

    renderWithProviders(<ComparisonQuote />, {
      route: "/compare/quote?fromQuote=test-quote-id&restoreVersion=foo",
    });

    await waitFor(() => expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"));

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

  it("saveSavedQuote receives id=undefined when no ?fromQuote= (brand-new save path)", async () => {
    mockUseSavedQuote.mockReturnValue({ data: undefined, isLoading: false });

    renderWithProviders(<ComparisonQuote />);

    await waitFor(() => expect(mockEnsureModelsReady).toHaveBeenCalledWith("real"));

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
    const args = mockSaveMutateAsync.mock.calls[0]![0] as { id?: string };
    expect(args.id).toBeUndefined();
  });
});
