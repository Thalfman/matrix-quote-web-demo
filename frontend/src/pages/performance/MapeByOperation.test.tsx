import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { MapeByOperation } from "./MapeByOperation";

// Stub Recharts to avoid ResponsiveContainer layout issues in jsdom.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

describe("MapeByOperation", () => {
  it("renders empty-state message when rows is empty", () => {
    renderWithProviders(<MapeByOperation rows={[]} />);
    expect(screen.getByText(/no training metrics yet/i)).toBeInTheDocument();
  });

  it("renders MAE label when rows have no mape field", () => {
    const rows = [
      { target: "welding_hours", mae: 5.2, r2: 0.9, rows: 50, version: null, model_path: null },
    ];
    renderWithProviders(<MapeByOperation rows={rows} />);
    expect(screen.getByText(/mae.*by operation/i)).toBeInTheDocument();
  });

  it("renders MAPE label when rows have a mape field", () => {
    const rows = [
      { target: "welding_hours", mae: 5.2, r2: 0.9, rows: 50, version: null, model_path: null, mape: 12.4 } as unknown as import("@/api/types").MetricRow,
    ];
    renderWithProviders(<MapeByOperation rows={rows} />);
    expect(screen.getByText(/mape.*by operation/i)).toBeInTheDocument();
  });
});
