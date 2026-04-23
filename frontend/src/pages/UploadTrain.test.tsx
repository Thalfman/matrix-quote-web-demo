import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { UploadTrain } from "./UploadTrain";

vi.mock("@/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn() },
  getAdminToken: () => null,
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { api } from "@/api/client";
const mockGet = vi.mocked(api.get);

describe("UploadTrain", () => {
  it("renders all four step labels", async () => {
    mockGet.mockResolvedValue({ data: { is_demo: false, enabled_env: true, has_real_data: false } });
    renderWithProviders(<UploadTrain />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Validate")).toBeInTheDocument();
    expect(screen.getByText("Train")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("disables Load demo data button and shows warning when has_real_data is true", async () => {
    mockGet.mockResolvedValue({ data: { is_demo: false, enabled_env: true, has_real_data: true } });
    renderWithProviders(<UploadTrain />);
    // Wait for the warning text to appear - that confirms the query has resolved
    expect(
      await screen.findByText(/real data is already present/i),
    ).toBeInTheDocument();
    // Button should now be disabled
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /load demo data/i });
      expect(btn).toBeDisabled();
    });
  });

  it("enables Load demo data button when has_real_data is false", async () => {
    mockGet.mockResolvedValue({ data: { is_demo: true, enabled_env: true, has_real_data: false } });
    renderWithProviders(<UploadTrain />);
    const btn = await screen.findByRole("button", { name: /load demo data/i });
    expect(btn).not.toBeDisabled();
  });
});
