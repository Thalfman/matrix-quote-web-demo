import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { renderWithProviders } from "@/test/render";

import { ModelPerformance } from "./ModelPerformance";

vi.mock("@/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  getAdminToken: () => null,
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
}));

// Stub Recharts ResponsiveContainer to avoid jsdom layout issues.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

import { api } from "@/api/client";

const mockGet = vi.mocked(api.get);

const emptyGetMock = async (url: string) => {
  if (url === "/metrics") return { data: { models_ready: false, metrics: [] } };
  if (url === "/metrics/headline") return { data: { overall_mape: null, within_10_pct: null, within_20_pct: null, last_trained_at: null, rows_at_train: null } };
  if (url === "/metrics/calibration") return { data: [] };
  if (url === "/metrics/history") return { data: [] };
  throw new Error(`Unexpected GET ${url}`);
};

const populatedGetMock = async (url: string) => {
  if (url === "/metrics") {
    return {
      data: {
        models_ready: true,
        metrics: [
          { target: "welding_hours", mae: 5.2, r2: 0.92, rows: 120, version: "v1", model_path: null },
        ],
      },
    };
  }
  if (url === "/metrics/headline") {
    return {
      data: {
        overall_mape: 12.5,
        within_10_pct: 68.3,
        within_20_pct: 89.1,
        last_trained_at: "2026-03-01T00:00:00Z",
        rows_at_train: 120,
      },
    };
  }
  if (url === "/metrics/calibration") {
    return {
      data: [
        { predicted_low: 100, predicted_high: 150, actual: 120, inside_band: true },
      ],
    };
  }
  if (url === "/metrics/history") {
    return {
      data: [
        { run_id: "r1", trained_at: "2026-03-01T00:00:00Z", rows: 120, overall_mape: 12.5 },
      ],
    };
  }
  throw new Error(`Unexpected GET ${url}`);
};

describe("ModelPerformance", () => {
  afterEach(() => {
    mockGet.mockReset();
  });

  it("mounts without crashing and renders page heading in empty state", async () => {
    mockGet.mockImplementation(emptyGetMock);
    renderWithProviders(<ModelPerformance />);
    await waitFor(() =>
      expect(screen.getByText(/estimate accuracy/i)).toBeInTheDocument(),
    );
    // All three sub-components render their empty-state messages
    expect(screen.getByText(/no training metrics yet/i)).toBeInTheDocument();
    expect(screen.getByText(/calibration data isn't available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/training history isn't persisted yet/i)).toBeInTheDocument();
  });

  it("mounts and renders populated data from all four hooks", async () => {
    mockGet.mockImplementation(populatedGetMock);
    renderWithProviders(<ModelPerformance />);
    await waitFor(() =>
      expect(screen.getByText("12.5%")).toBeInTheDocument(),
    );
    expect(screen.getByText("68.3%")).toBeInTheDocument();
    expect(screen.getByText("89.1%")).toBeInTheDocument();
    // MAPE by operation chart heading
    expect(screen.getByText(/mae.*by operation/i)).toBeInTheDocument();
    // Calibration and history chart headings
    expect(screen.getByText(/confidence calibration/i)).toBeInTheDocument();
    expect(screen.getByText(/training history/i)).toBeInTheDocument();
  });
});
