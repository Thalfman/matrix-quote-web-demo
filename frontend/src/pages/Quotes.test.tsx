import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { renderWithProviders } from "@/test/render";

import { Quotes } from "./Quotes";

vi.mock("@/api/client", () => {
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
    getAdminToken: () => null,
    setAdminToken: vi.fn(),
    clearAdminToken: vi.fn(),
  };
});

vi.mock("@/api/quote", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/quote")>();
  return {
    ...actual,
    downloadScenarioPdf: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { api } from "@/api/client";
import { downloadScenarioPdf } from "@/api/quote";

const mockGet = vi.mocked(api.get);
const mockDownloadScenarioPdf = vi.mocked(downloadScenarioPdf);

const rows = [
  {
    id: "a",
    name: "Option A",
    project_name: "Line 3",
    client_name: null,
    industry_segment: "Automotive",
    hours: 1200,
    range_low: 1000,
    range_high: 1400,
    created_at: "2026-04-01T00:00:00Z",
    created_by: "Tester",
  },
  {
    id: "b",
    name: "Option B",
    project_name: "Line 3",
    client_name: null,
    industry_segment: "Automotive",
    hours: 980,
    range_low: 800,
    range_high: 1150,
    created_at: "2026-04-02T00:00:00Z",
    created_by: "Tester",
  },
];

const setupListMock = () => {
  mockGet.mockImplementation(async (url: string) => {
    if (url === "/quotes") return { data: { total: rows.length, rows } };
    throw new Error(`Unexpected GET ${url}`);
  });
};

describe("Quotes", () => {
  afterEach(() => {
    mockGet.mockReset();
    mockDownloadScenarioPdf.mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
  });
  it("lists saved quotes from /quotes mock", async () => {
    setupListMock();

    renderWithProviders(<Quotes />);

    await waitFor(() => expect(screen.getByText("Option A")).toBeInTheDocument());
    expect(screen.getByText("Option B")).toBeInTheDocument();
  });

  it("bulk bar hidden initially, shows after 1 row selected, Compare → enabled after 2", async () => {
    setupListMock();

    renderWithProviders(<Quotes />);

    await screen.findByText("Option A");

    // Bulk bar is not rendered until at least 1 row is selected.
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");

    // Select first row — bar appears, but Compare → still disabled (need 2).
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    const compareBtn = screen.getByRole("button", { name: /Pick 2 or 3 to compare/i });
    expect(compareBtn).toBeDisabled();

    // Select second row — Compare → becomes enabled.
    fireEvent.click(checkboxes[1]);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compare →/i })).not.toBeDisabled();
  });

  it("PDF row action calls downloadScenarioPdf with the correct row id", async () => {
    setupListMock();
    mockDownloadScenarioPdf.mockResolvedValue(undefined);

    renderWithProviders(<Quotes />);
    await screen.findByText("Option A");

    // Click the Export PDF button on the first row (id = "a").
    const pdfButtons = screen.getAllByRole("button", { name: /^Export PDF$/i });
    fireEvent.click(pdfButtons[0]);

    await waitFor(() =>
      expect(mockDownloadScenarioPdf).toHaveBeenCalledWith("a"),
    );
  });

  it("shows toast.error when downloadScenarioPdf rejects", async () => {
    setupListMock();
    mockDownloadScenarioPdf.mockRejectedValue(new Error("network"));

    renderWithProviders(<Quotes />);
    await screen.findByText("Option A");

    const pdfButtons = screen.getAllByRole("button", { name: /^Export PDF$/i });
    fireEvent.click(pdfButtons[0]);

    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Could not generate PDF"),
    );
  });
});
