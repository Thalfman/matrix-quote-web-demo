import { screen, fireEvent } from "@testing-library/react";
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
  it("renders the section heading with 'total' metric by default", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    expect(screen.getByText(/total p50 hours · by sales bucket/i)).toBeInTheDocument();
  });

  it("renders empty-state text when data is empty", () => {
    renderWithProviders(<HoursBySalesBucket data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it("does not render empty-state when data is populated", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });

  it("clicking the Avg button changes the heading to avg p50 hours", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    const avgBtn = screen.getByRole("button", { name: /^avg$/i });
    fireEvent.click(avgBtn);
    expect(screen.getByText(/avg p50 hours · by sales bucket/i)).toBeInTheDocument();
  });

  it("clicking the Share % button changes the heading to share of total hours", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    const shareBtn = screen.getByRole("button", { name: /share %/i });
    fireEvent.click(shareBtn);
    expect(screen.getByText(/share of total hours · by sales bucket/i)).toBeInTheDocument();
  });

  it("clicking Total after switching back restores total heading", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    fireEvent.click(screen.getByRole("button", { name: /^avg$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^total$/i }));
    expect(screen.getByText(/total p50 hours · by sales bucket/i)).toBeInTheDocument();
  });

  it("Total button has aria-pressed=true by default", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    expect(screen.getByRole("button", { name: /^total$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("Avg button has aria-pressed=false by default", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    expect(screen.getByRole("button", { name: /^avg$/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("Share % button has aria-pressed=true after clicking it", () => {
    renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
    const shareBtn = screen.getByRole("button", { name: /share %/i });
    fireEvent.click(shareBtn);
    expect(shareBtn).toHaveAttribute("aria-pressed", "true");
  });
});
