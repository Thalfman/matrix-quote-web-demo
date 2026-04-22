import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import type { ProjectRecord } from "@/demo/realProjects";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

// Mutable hook return so individual tests can control the state.
let mockHookReturn: {
  data: ProjectRecord[] | undefined;
  isLoading: boolean;
  error: Error | null;
} = { data: undefined, isLoading: false, error: null };

vi.mock("@/demo/realProjects", async () => {
  const actual = await vi.importActual<typeof import("@/demo/realProjects")>(
    "@/demo/realProjects",
  );
  return {
    ...actual,
    useSyntheticPool: () => mockHookReturn,
  };
});

const FAKE_RECORDS: ProjectRecord[] = [
  {
    project_id: "s1",
    project_name: "Synthetic Alpha",
    industry_segment: "Automotive",
    system_category: "Assembly",
    stations_count: 5,
    complexity_score_1_5: 3,
    log_quoted_materials_cost: Math.log(1500),
    me10_actual_hours: 200,
  },
  {
    project_id: "s2",
    project_name: "Synthetic Beta",
    industry_segment: "Pharma",
    system_category: "Packaging",
    stations_count: 8,
    complexity_score_1_5: 4,
    log_quoted_materials_cost: Math.log(3000),
    me10_actual_hours: 320,
  },
];

// Import after mocks are registered
const { MachineLearningInsights } = await import("./MachineLearningInsights");

describe("MachineLearningInsights — happy path", () => {
  it("renders the dataset label 'Synthetic Data · Training projects'", () => {
    mockHookReturn = { data: FAKE_RECORDS, isLoading: false, error: null };
    renderWithProviders(<MachineLearningInsights />);
    expect(
      screen.getByText(/synthetic data · training projects/i),
    ).toBeInTheDocument();
  });

  it("renders all six section headings when data is loaded", () => {
    mockHookReturn = { data: FAKE_RECORDS, isLoading: false, error: null };
    renderWithProviders(<MachineLearningInsights />);
    expect(screen.getByRole("heading", { name: /portfolio kpis/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by sales bucket/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by industry/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /system category mix/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /complexity vs hours/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /all projects/i })).toBeInTheDocument();
  });

  it("does not render an error alert when data loads successfully", () => {
    mockHookReturn = { data: FAKE_RECORDS, isLoading: false, error: null };
    renderWithProviders(<MachineLearningInsights />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("MachineLearningInsights — loading state", () => {
  it("renders a skeleton with aria-busy=true when isLoading is true", () => {
    mockHookReturn = { data: undefined, isLoading: true, error: null };
    renderWithProviders(<MachineLearningInsights />);
    const skeleton = document.querySelector("[aria-busy='true']");
    expect(skeleton).not.toBeNull();
  });

  it("does not render a progressbar/spinner role during loading", () => {
    mockHookReturn = { data: undefined, isLoading: true, error: null };
    renderWithProviders(<MachineLearningInsights />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("MachineLearningInsights — error state", () => {
  it("renders role=alert when useSyntheticPool returns an error", () => {
    mockHookReturn = { data: undefined, isLoading: false, error: new Error("network error") };
    renderWithProviders(<MachineLearningInsights />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("error copy does not expose raw file paths like synthetic-pool.json", () => {
    mockHookReturn = { data: undefined, isLoading: false, error: new Error("network error") };
    renderWithProviders(<MachineLearningInsights />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).not.toMatch(/synthetic-pool\.json/);
    expect(alert.textContent).not.toMatch(/real-projects\.json/);
  });

  it("error copy is user-facing (contains 'couldn't load')", () => {
    mockHookReturn = { data: undefined, isLoading: false, error: new Error("network error") };
    renderWithProviders(<MachineLearningInsights />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
  });
});
