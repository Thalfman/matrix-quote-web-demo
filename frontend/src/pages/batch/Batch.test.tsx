import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { BATCH_SCHEMA, SAMPLE_RECENT_BATCHES } from "./fixtures";
import { BatchDropzone } from "./BatchDropzone";
import { BatchSchemaRef } from "./BatchSchemaRef";
import { BatchRecentList } from "./BatchRecentList";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ─── BatchDropzone ────────────────────────────────────────────────────────────

describe("BatchDropzone", () => {
  it("renders coming-soon heading", () => {
    render(<BatchDropzone />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it("renders as disabled (aria-disabled)", () => {
    const { container } = render(<BatchDropzone />);
    const dropzone = container.querySelector("[aria-disabled='true']");
    expect(dropzone).not.toBeNull();
  });

  it("does not render interactive file input or Select/Download buttons", () => {
    render(<BatchDropzone />);
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Select file/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Download template/i })).toBeNull();
  });

  it("does not emit any toast on drag-over or drop", () => {
    const { container } = render(<BatchDropzone />);
    const dropzone = container.firstChild as HTMLElement;

    const dataTransfer = { files: [] } as unknown as DataTransfer;
    fireEvent.dragOver(dropzone, { dataTransfer });
    fireEvent.drop(dropzone, { dataTransfer });

    expect(vi.mocked(toast.info)).not.toHaveBeenCalled();
  });
});

// ─── BatchSchemaRef ───────────────────────────────────────────────────────────

describe("BatchSchemaRef", () => {
  it("renders one row per BATCH_SCHEMA entry (22 rows)", () => {
    render(<BatchSchemaRef />);

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(BATCH_SCHEMA.length);
    expect(BATCH_SCHEMA.length).toBe(22);
  });

  it("header shows '22 fields' and '6 required'", () => {
    render(<BatchSchemaRef />);

    const requiredCount = BATCH_SCHEMA.filter((r) => r.required).length;
    expect(requiredCount).toBe(6);

    expect(screen.getByText(`${BATCH_SCHEMA.length} fields · ${requiredCount} required`)).toBeInTheDocument();
  });

  it("required rows display 'Required' label and optional rows display 'Optional' label", () => {
    render(<BatchSchemaRef />);

    // There should be at least one Required and at least one Optional
    const requiredLabels = screen.getAllByText("Required");
    const optionalLabels = screen.getAllByText("Optional");

    expect(requiredLabels.length).toBeGreaterThan(0);
    expect(optionalLabels.length).toBeGreaterThan(0);

    // Exact counts match the fixture
    expect(requiredLabels).toHaveLength(BATCH_SCHEMA.filter((r) => r.required).length);
    expect(optionalLabels).toHaveLength(BATCH_SCHEMA.filter((r) => !r.required).length);
  });
});

// ─── BatchRecentList ──────────────────────────────────────────────────────────

describe("BatchRecentList", () => {
  it("renders a row for each entry in SAMPLE_RECENT_BATCHES (3 rows)", () => {
    render(<BatchRecentList />);

    for (const batch of SAMPLE_RECENT_BATCHES) {
      expect(screen.getByText(batch.fileName)).toBeInTheDocument();
    }
  });

  it("renders relative-time labels matching \\d+[dwm]\\s*ago or 'yesterday' patterns", () => {
    render(<BatchRecentList />);

    // The fixtures are 2d, 5d, 9d ago relative to Date.now(), so all match Xd ago
    const relativePattern = /(\d+[dwm]\s*ago|yesterday|today)/i;
    const container = document.body;
    const text = container.textContent ?? "";

    // Check at least one relative label is present
    expect(relativePattern.test(text)).toBe(true);

    // More granular: each fixture row should produce a relative label
    // The 3 batches are 2d, 5d, 9d ago — find these specifically
    expect(screen.getByText("2d ago")).toBeInTheDocument();
    expect(screen.getByText("5d ago")).toBeInTheDocument();
    expect(screen.getByText("9d ago")).toBeInTheDocument();
  });

  it("each row has an Open button", () => {
    render(<BatchRecentList />);

    const openButtons = screen.getAllByRole("button", { name: /^Open$/i });
    expect(openButtons).toHaveLength(SAMPLE_RECENT_BATCHES.length);
  });
});
