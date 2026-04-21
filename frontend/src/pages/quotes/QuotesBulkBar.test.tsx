import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuotesBulkBar } from "./QuotesBulkBar";

describe("QuotesBulkBar", () => {
  it("renders nothing when selectedCount is 0", () => {
    const { container } = render(
      <QuotesBulkBar
        selectedCount={0}
        onCompare={vi.fn()}
        onClear={vi.fn()}
        canCompare={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'Pick 2 or 3 to compare' and disables button when selectedCount=1 and canCompare=false", () => {
    render(
      <QuotesBulkBar
        selectedCount={1}
        onCompare={vi.fn()}
        onClear={vi.fn()}
        canCompare={false}
      />,
    );
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Pick 2 or 3 to compare/i });
    expect(btn).toBeDisabled();
  });

  it("shows 'Compare →' and enables button when selectedCount=2 and canCompare=true", () => {
    const onCompare = vi.fn();
    render(
      <QuotesBulkBar
        selectedCount={2}
        onCompare={onCompare}
        onClear={vi.fn()}
        canCompare={true}
      />,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Compare →/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  it("calls onClear when X button is clicked", () => {
    const onClear = vi.fn();
    render(
      <QuotesBulkBar
        selectedCount={2}
        onCompare={vi.fn()}
        onClear={onClear}
        canCompare={true}
      />,
    );
    const clearBtn = screen.getByRole("button", { name: /clear selection/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
