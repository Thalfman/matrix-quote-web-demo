import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { ProjectDetailDrawer } from "./ProjectDetailDrawer";
import type { RankedRow } from "./portfolioStats";

const FULL_ROW: RankedRow = {
  project_id: "p-001",
  project_name: "Omega Assembly Line",
  industry: "Automotive",
  system_category: "Assembly",
  stations: 8,
  total_hours: 12500,
  primary_bucket: "ME",
  complexity: 3,
  peerMedian: null,
  peerP10: null,
  peerP90: null,
  peerCount: 0,
  outlierZ: null,
  outlierDirection: null,
};

describe("ProjectDetailDrawer - renders visible fields", () => {
  it("renders the project_name in the drawer header", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.getByText("Omega Assembly Line")).toBeInTheDocument();
  });

  it("renders the project_id field", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.getByText("p-001")).toBeInTheDocument();
  });

  it("renders the industry field", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.getByText("Automotive")).toBeInTheDocument();
  });

  it("renders the system_category field", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.getByText("Assembly")).toBeInTheDocument();
  });

  it("renders the primary_bucket field", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.getByText("ME")).toBeInTheDocument();
  });

  it("renders the stations count", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders total_hours formatted", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.getByText("12,500")).toBeInTheDocument();
  });

  it("renders the Identity and Metrics section headings", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.getByText(/identity/i)).toBeInTheDocument();
    expect(screen.getByText(/metrics/i)).toBeInTheDocument();
  });
});

describe("ProjectDetailDrawer - peer benchmark (R7)", () => {
  it("does not render the Peer benchmark section when peer fields are null", () => {
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={vi.fn()} />);
    expect(screen.queryByText(/peer benchmark/i)).not.toBeInTheDocument();
  });

  it("renders Peer benchmark with median, p10–p90, and outlier chip when peers are present", () => {
    const row: RankedRow = {
      ...FULL_ROW,
      peerMedian: 9000,
      peerP10: 7500,
      peerP90: 11000,
      peerCount: 5,
      outlierZ: 2.1,
      outlierDirection: "high",
    };
    renderWithProviders(<ProjectDetailDrawer row={row} onClose={vi.fn()} />);
    expect(screen.getByText(/peer benchmark/i)).toBeInTheDocument();
    // The human-readable chip for the outlier
    expect(screen.getByText(/high outlier/i)).toBeInTheDocument();
    // Median renders as a formatted hours value
    expect(screen.getByText(/9,000 h/)).toBeInTheDocument();
    // Range renders as "p10–p90 h"
    expect(screen.getByText(/7,500–11,000 h/)).toBeInTheDocument();
  });
});

describe("ProjectDetailDrawer - null/undefined fields are omitted", () => {
  it("does not render a field row when stations is 0 (treated as falsy)", () => {
    const row: RankedRow = { ...FULL_ROW, stations: 0 };
    renderWithProviders(<ProjectDetailDrawer row={row} onClose={vi.fn()} />);
    // stations=0 is suppressed by the Field component (value === 0 returns null)
    expect(screen.queryByText("Stations")).not.toBeInTheDocument();
  });

  it("does not render Project ID label when project_id is empty string", () => {
    const row: RankedRow = { ...FULL_ROW, project_id: "" };
    renderWithProviders(<ProjectDetailDrawer row={row} onClose={vi.fn()} />);
    // Empty string is falsy → Field returns null for project_id
    expect(screen.queryByText("Project ID")).not.toBeInTheDocument();
  });
});

describe("ProjectDetailDrawer - close interactions", () => {
  it("calls onClose when the X button is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={onClose} />);
    const closeBtn = screen.getByRole("button", { name: /close project detail/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<ProjectDetailDrawer row={FULL_ROW} onClose={onClose} />);
    // The backdrop is aria-hidden=true; find it by its className pattern
    const backdrop = document.querySelector("[aria-hidden='true'][class*='fixed inset-0']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("ProjectDetailDrawer - when open={false} (row=null)", () => {
  it("does not show the project name when row is null", () => {
    renderWithProviders(<ProjectDetailDrawer row={null} onClose={vi.fn()} />);
    expect(screen.queryByText("Omega Assembly Line")).not.toBeInTheDocument();
  });

  it("does not call onClose spuriously when row is null", () => {
    const onClose = vi.fn();
    renderWithProviders(<ProjectDetailDrawer row={null} onClose={onClose} />);
    // No interactions - onClose should not have been called
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Escape key does NOT call onClose when row is null (no listener mounted)", () => {
    const onClose = vi.fn();
    renderWithProviders(<ProjectDetailDrawer row={null} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("drawer panel has translate-x-full class (hidden) when row is null", () => {
    renderWithProviders(<ProjectDetailDrawer row={null} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/translate-x-full/);
  });
});
