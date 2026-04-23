import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { Overview } from "./Overview";

vi.mock("@/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn() },
  getAdminToken: () => null,
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
}));

import { api } from "@/api/client";
const mockGet = vi.mocked(api.get);

describe("Overview", () => {
  it("renders the 'System Overview' title", () => {
    mockGet.mockResolvedValue({ data: { status: "ok", models_ready: true } });
    renderWithProviders(<Overview />);
    expect(screen.getByText("System Overview")).toBeInTheDocument();
  });

  it("renders all four KPI eyebrow labels", () => {
    mockGet.mockResolvedValue({ data: { status: "ok", models_ready: true } });
    renderWithProviders(<Overview />);
    expect(screen.getByText("Models ready")).toBeInTheDocument();
    expect(screen.getByText("Training rows")).toBeInTheDocument();
    expect(screen.getByText("API uptime · 30d")).toBeInTheDocument();
    expect(screen.getByText("Open flags")).toBeInTheDocument();
  });

  it("shows '1' in the Open flags KPI (one non-info alert in SAMPLE_ALERTS)", () => {
    mockGet.mockResolvedValue({ data: { status: "ok", models_ready: true } });
    const { container } = renderWithProviders(<Overview />);
    // Open flags card is the last KPI card; its hero value is "1"
    const flagsCard = Array.from(
      container.querySelectorAll(".display-hero.text-3xl"),
    ).find((el) => el.textContent === "1");
    expect(flagsCard).toBeInTheDocument();
  });

  it("shows '1,284' rows and '11.8%' MAPE for the first training run (r12)", () => {
    mockGet.mockResolvedValue({ data: { status: "ok", models_ready: true } });
    renderWithProviders(<Overview />);
    // "11.8%" is unique; "1,284" appears in both KPI card and training run row - use getAllByText
    const instances = screen.getAllByText("1,284");
    expect(instances.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("11.8%")).toBeInTheDocument();
  });

  it("lists both sample data source file names", () => {
    mockGet.mockResolvedValue({ data: { status: "ok", models_ready: true } });
    renderWithProviders(<Overview />);
    expect(screen.getByText("2026-Q1-master.xlsx")).toBeInTheDocument();
    expect(screen.getByText("2025-Q4-Atlas-archive.csv")).toBeInTheDocument();
  });
});
