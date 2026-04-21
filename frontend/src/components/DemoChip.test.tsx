import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { renderWithProviders } from "@/test/render";
import { DemoChip } from "./DemoChip";

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

import { api } from "@/api/client";

const mockGet = vi.mocked(api.get);

describe("DemoChip", () => {
  afterEach(() => {
    mockGet.mockReset();
  });

  it("renders nothing when is_demo is false", async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === "/demo/status")
        return {
          data: { is_demo: false, enabled_env: false, has_real_data: false },
        };
      throw new Error(`Unexpected GET ${url}`);
    });

    const { container } = renderWithProviders(<DemoChip />);

    // Wait for the query to settle then assert nothing is rendered.
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/demo/status"),
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders chip with 'Demo mode' text when is_demo is true", async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === "/demo/status")
        return {
          data: { is_demo: true, enabled_env: true, has_real_data: false },
        };
      throw new Error(`Unexpected GET ${url}`);
    });

    renderWithProviders(<DemoChip />);

    await waitFor(() =>
      expect(screen.getByText("Demo mode")).toBeInTheDocument(),
    );
  });

  it("renders nothing when query data is undefined (loading state)", () => {
    // Never resolves so data stays undefined.
    mockGet.mockImplementation(async () => new Promise(() => {}));

    const { container } = renderWithProviders(<DemoChip />);

    // Component returns null when data is undefined.
    expect(container.firstChild).toBeNull();
  });
});
