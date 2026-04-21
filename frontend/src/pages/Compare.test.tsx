import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Routes, Route } from "react-router-dom";

import { renderWithProviders } from "@/test/render";

import { Compare } from "./Compare";

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

import { api } from "@/api/client";

const mockGet = vi.mocked(api.get);

const quoteA = {
  id: "a",
  name: "A",
  project_name: "P",
  client_name: null,
  notes: null,
  created_by: "T",
  created_at: "2026-04-01T00:00:00Z",
  inputs: {
    industry_segment: "Automotive",
    system_category: "X",
    automation_level: "Robotic",
    plc_family: "",
    hmi_family: "",
    vision_type: "",
    stations_count: 4,
  },
  prediction: {
    ops: {},
    total_p50: 1000,
    total_p10: 800,
    total_p90: 1200,
    sales_buckets: {
      mechanical: { p50: 500, p10: 400, p90: 600, rel_width: 0.2, confidence: "medium" },
    },
  },
};

const quoteB = {
  ...quoteA,
  id: "b",
  name: "B",
  inputs: { ...quoteA.inputs, stations_count: 8 },
};

describe("Compare", () => {
  it("renders headline Hours label and input diff for differing stations_count", async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === "/quotes/a") return { data: quoteA };
      if (url === "/quotes/b") return { data: quoteB };
      throw new Error(`Unexpected GET ${url}`);
    });

    renderWithProviders(
      <Routes>
        <Route path="/quotes/compare" element={<Compare />} />
      </Routes>,
      { route: "/quotes/compare?ids=a,b" },
    );

    await waitFor(() => expect(screen.getByText("Hours")).toBeInTheDocument());
    expect(screen.getByText("stations_count")).toBeInTheDocument();
  });
});
