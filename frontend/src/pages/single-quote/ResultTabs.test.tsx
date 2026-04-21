import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExplainedQuoteResponse } from "@/api/types";

import { Scenario } from "./Scenario";
import { ResultTabs } from "./ResultTabs";

const baseResult: ExplainedQuoteResponse = {
  prediction: {
    ops: {},
    total_p50: 500,
    total_p10: 400,
    total_p90: 600,
    sales_buckets: {},
  },
  drivers: null,
  neighbors: null,
};

const baseInputs = {
  industry_segment: "Automotive",
  system_category: "Machine Tending",
  automation_level: "Robotic",
  plc_family: "AB Compact Logix",
  hmi_family: "AB PanelView Plus",
  vision_type: "None",
};

function makeScenario(id: string): Scenario {
  return {
    id,
    name: `Scenario ${id}`,
    createdAt: new Date().toISOString(),
    inputs: baseInputs,
    result: baseResult,
  };
}

describe("ResultTabs – scenarios count badge", () => {
  it("does NOT show the count badge when scenarios list is empty", () => {
    render(
      <ResultTabs
        result={baseResult}
        scenarios={[]}
        onRemoveScenario={vi.fn()}
        onCompare={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/saved/i)).not.toBeInTheDocument();
  });

  it("shows the count badge with correct number when scenarios exist", () => {
    const scenarios = [makeScenario("1"), makeScenario("2")];
    render(
      <ResultTabs
        result={baseResult}
        scenarios={scenarios}
        onRemoveScenario={vi.fn()}
        onCompare={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("2 saved")).toBeInTheDocument();
  });

  it("badge count increments correctly with a single scenario", () => {
    render(
      <ResultTabs
        result={baseResult}
        scenarios={[makeScenario("1")]}
        onRemoveScenario={vi.fn()}
        onCompare={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("1 saved")).toBeInTheDocument();
  });

  it("renders all four tab buttons", () => {
    render(
      <ResultTabs
        result={baseResult}
        scenarios={[]}
        onRemoveScenario={vi.fn()}
        onCompare={vi.fn()}
      />,
    );
    expect(screen.getByRole("tab", { name: /estimate/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /drivers/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /similar/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /scenarios/i })).toBeInTheDocument();
  });
});
