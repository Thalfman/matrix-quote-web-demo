import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { HoursBySalesBucket } from "./HoursBySalesBucket";
import type { BucketRow } from "./portfolioStats";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const BUCKET_DATA: BucketRow[] = [
  { bucket: "ME", hours: 400 },
  { bucket: "Build", hours: 300 },
  { bucket: "Install", hours: 200 },
];

describe("HoursBySalesBucket", () => {
  it("renders the section heading", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    expect(screen.getByText(/total p50 hours · all 24 projects/i)).toBeInTheDocument();
  });

  it("renders empty-state text when data is empty", () => {
    renderWithProviders(<HoursBySalesBucket data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it("does not render empty-state when data is populated", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });
});
