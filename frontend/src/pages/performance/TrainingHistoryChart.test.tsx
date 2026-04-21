import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { TrainingHistoryChart } from "./TrainingHistoryChart";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

describe("TrainingHistoryChart", () => {
  it("renders empty-state message when rows is empty", () => {
    renderWithProviders(<TrainingHistoryChart rows={[]} />);
    expect(screen.getByText(/training history isn't persisted yet/i)).toBeInTheDocument();
  });

  it("renders chart heading when rows are present", () => {
    const rows = [
      { run_id: "run-1", trained_at: "2026-01-10T00:00:00Z", rows: 200, overall_mape: 14.5 },
      { run_id: "run-2", trained_at: "2026-02-14T00:00:00Z", rows: 250, overall_mape: 11.2 },
    ];
    renderWithProviders(<TrainingHistoryChart rows={rows} />);
    expect(screen.getByText(/mape.*over time/i)).toBeInTheDocument();
  });
});
