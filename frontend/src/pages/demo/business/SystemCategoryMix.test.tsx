import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { SystemCategoryMix } from "./SystemCategoryMix";
import type { CategoryRow } from "./portfolioStats";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const CATEGORY_DATA: CategoryRow[] = [
  { category: "Assembly", count: 12 },
  { category: "Welding", count: 6 },
  { category: "Palletizing", count: 3 },
];

describe("SystemCategoryMix", () => {
  it("renders the section heading", () => {
    renderWithProviders(<SystemCategoryMix data={CATEGORY_DATA} />);
    expect(screen.getByText(/share of projects · by system type/i)).toBeInTheDocument();
  });

  it("renders empty-state text when data is empty", () => {
    renderWithProviders(<SystemCategoryMix data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it("does not render empty-state when data is populated", () => {
    renderWithProviders(<SystemCategoryMix data={CATEGORY_DATA} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });
});
