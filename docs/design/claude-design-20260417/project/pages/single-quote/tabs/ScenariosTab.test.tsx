import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Scenario } from "../Scenario";
import { ScenariosTab } from "./ScenariosTab";

const baseResult = {
  prediction: {
    ops: {},
    total_p50: 100,
    total_p10: 80,
    total_p90: 120,
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

function makeScenario(id: string, name: string, p50: number): Scenario {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    inputs: baseInputs,
    result: {
      ...baseResult,
      prediction: { ...baseResult.prediction, total_p50: p50 },
    },
  };
}

describe("ScenariosTab", () => {
  it("renders empty-state when scenarios list is empty", () => {
    render(
      <ScenariosTab scenarios={[]} onRemove={vi.fn()} onCompare={vi.fn()} />,
    );
    expect(screen.getByText(/No scenarios saved/i)).toBeInTheDocument();
  });

  it("disables Compare button when only one scenario exists", () => {
    const scenarios = [makeScenario("s1", "Scenario 1", 100)];
    render(
      <ScenariosTab scenarios={scenarios} onRemove={vi.fn()} onCompare={vi.fn()} />,
    );
    const btn = screen.getByRole("button", { name: /compare/i });
    expect(btn).toBeDisabled();
  });

  it("enables Compare button when two or more scenarios exist", () => {
    const scenarios = [
      makeScenario("s1", "Scenario 1", 100),
      makeScenario("s2", "Scenario 2", 150),
    ];
    render(
      <ScenariosTab scenarios={scenarios} onRemove={vi.fn()} onCompare={vi.fn()} />,
    );
    const btn = screen.getByRole("button", { name: /compare 2 scenarios/i });
    expect(btn).not.toBeDisabled();
  });

  it("shows 'need at least 2' hint when fewer than 2 scenarios", () => {
    const scenarios = [makeScenario("s1", "Solo", 100)];
    render(
      <ScenariosTab scenarios={scenarios} onRemove={vi.fn()} onCompare={vi.fn()} />,
    );
    expect(screen.getByText(/need at least 2/i)).toBeInTheDocument();
  });

  it("does NOT show 'need at least 2' hint when compare is enabled", () => {
    const scenarios = [
      makeScenario("s1", "A", 100),
      makeScenario("s2", "B", 200),
    ];
    render(
      <ScenariosTab scenarios={scenarios} onRemove={vi.fn()} onCompare={vi.fn()} />,
    );
    expect(screen.queryByText(/need at least 2/i)).not.toBeInTheDocument();
  });

  it("renders each scenario name", () => {
    const scenarios = [
      makeScenario("s1", "Base Case", 100),
      makeScenario("s2", "Optimistic", 80),
    ];
    render(
      <ScenariosTab scenarios={scenarios} onRemove={vi.fn()} onCompare={vi.fn()} />,
    );
    expect(screen.getByText("Base Case")).toBeInTheDocument();
    expect(screen.getByText("Optimistic")).toBeInTheDocument();
  });
});
