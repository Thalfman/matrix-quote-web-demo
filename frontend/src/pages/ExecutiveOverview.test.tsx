import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { renderWithProviders } from "@/test/render";

import { ExecutiveOverview } from "./ExecutiveOverview";

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

const emptyOverview = {
  active_quotes_30d: 0,
  models_trained: 0,
  models_target: 12,
  overall_mape: null,
  calibration_within_band_pct: null,
  quotes_activity: [],
  latest_quotes: [],
  accuracy_heatmap: [],
  operations: [],
  quarters: [],
};

const populatedOverview = {
  active_quotes_30d: 5,
  models_trained: 8,
  models_target: 12,
  overall_mape: 13.6,
  calibration_within_band_pct: 82.5,
  quotes_activity: [["2026-W14", 2], ["2026-W15", 3]] as [string, number][],
  latest_quotes: [
    {
      id: "q1",
      name: "Line 3",
      project_name: "Acme",
      client_name: null,
      industry_segment: "Automotive",
      hours: 1200,
      range_low: 1000,
      range_high: 1400,
      created_at: "2026-04-10T00:00:00Z",
      created_by: "T",
    },
  ],
  accuracy_heatmap: [[10.5, null]],
  operations: ["welding"],
  quarters: ["2025Q4", "2026Q1"],
};

describe("ExecutiveOverview", () => {
  afterEach(() => {
    mockGet.mockReset();
  });

  it("mounts without crashing and renders empty-state children when overview returns zeros", async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === "/insights/overview") return { data: emptyOverview };
      throw new Error(`Unexpected GET ${url}`);
    });

    renderWithProviders(<ExecutiveOverview />);
    await waitFor(() =>
      expect(screen.getByText(/executive overview/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("/ 12")).toBeInTheDocument();
    expect(screen.getByText(/no saved quotes yet/i)).toBeInTheDocument();
    expect(screen.getByText(/accuracy heatmap populates once/i)).toBeInTheDocument();
  });

  it("renders populated data from useInsightsOverview", async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === "/insights/overview") return { data: populatedOverview };
      throw new Error(`Unexpected GET ${url}`);
    });

    renderWithProviders(<ExecutiveOverview />);
    await waitFor(() =>
      expect(screen.getByText("5")).toBeInTheDocument(),
    );
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("/ 12")).toBeInTheDocument();
    expect(screen.getByText("13.6")).toBeInTheDocument();
    expect(screen.getByText("82.5")).toBeInTheDocument();
    expect(screen.getByText("Line 3")).toBeInTheDocument();
    expect(screen.getByText("welding")).toBeInTheDocument();
    expect(screen.getByText("2025Q4")).toBeInTheDocument();
  });
});
