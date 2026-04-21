import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExplainedQuoteResponse } from "@/api/types";

import { EstimateTab } from "./EstimateTab";

const stubResult: ExplainedQuoteResponse = {
  prediction: {
    ops: {},
    total_p50: 500,
    total_p10: 400,
    total_p90: 600,
    sales_buckets: {
      mechanical: { p50: 200, p10: 160, p90: 240, rel_width: 0.4, confidence: "medium" as const },
      electrical: { p50: 300, p10: 240, p90: 360, rel_width: 0.4, confidence: "medium" as const },
    },
  },
  drivers: null,
  neighbors: null,
};

describe("EstimateTab", () => {
  it("renders all bucket codes in hours mode by default", () => {
    render(<EstimateTab result={stubResult} />);
    expect(screen.getByTitle("Mechanical")).toBeInTheDocument();
    expect(screen.getByTitle("Electrical")).toBeInTheDocument();
  });

  it("shows the hours toggle button as active initially", () => {
    render(<EstimateTab result={stubResult} />);
    const hoursBtn = screen.getByRole("button", { name: /hours/i });
    expect(hoursBtn).toHaveClass("bg-ink");
  });

  it("switches to % split mode when the toggle is clicked", () => {
    render(<EstimateTab result={stubResult} />);
    const pctBtn = screen.getByRole("button", { name: /% split/i });

    fireEvent.click(pctBtn);

    // After switching, the % split button should be active (bg-ink)
    expect(pctBtn).toHaveClass("bg-ink");
    // And hours button should no longer be active
    const hoursBtn = screen.getByRole("button", { name: /hours/i });
    expect(hoursBtn).not.toHaveClass("bg-ink");
  });

  it("switches back to hours mode when the hours button is re-clicked", () => {
    render(<EstimateTab result={stubResult} />);

    fireEvent.click(screen.getByRole("button", { name: /% split/i }));
    fireEvent.click(screen.getByRole("button", { name: /hours/i }));

    expect(screen.getByRole("button", { name: /hours/i })).toHaveClass("bg-ink");
    expect(screen.getByRole("button", { name: /% split/i })).not.toHaveClass("bg-ink");
  });

  it("renders empty buckets gracefully", () => {
    const emptyResult: ExplainedQuoteResponse = {
      ...stubResult,
      prediction: { ...stubResult.prediction, sales_buckets: {} },
    };
    render(<EstimateTab result={emptyResult} />);
    expect(screen.getByText(/0 buckets/i)).toBeInTheDocument();
  });
});
