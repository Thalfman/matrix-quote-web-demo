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

// The hook mock is configured via this mutable variable so individual tests
// can override the return value without re-hoisting.
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
    useRealProjects: () => mockHookReturn,
  };
});

const FAKE_RECORDS: ProjectRecord[] = [
  {
    project_id: "r1",
    project_name: "Alpha Project",
    industry_segment: "Automotive",
    system_category: "Assembly",
    stations_count: 4,
    complexity_score_1_5: 2,
    log_quoted_materials_cost: Math.log(1000),
    me10_actual_hours: 150,
  },
  {
    project_id: "r2",
    project_name: "Beta Project",
    industry_segment: "Food & Bev",
    system_category: "Welding",
    stations_count: 6,
    complexity_score_1_5: 3,
    log_quoted_materials_cost: Math.log(2000),
    me10_actual_hours: 250,
  },
];

// Import after mocks are registered
const { ComparisonInsights } = await import("./ComparisonInsights");

describe("ComparisonInsights — happy path", () => {
  it("renders the dataset label 'Comparison · Real projects'", () => {
    mockHookReturn = { data: FAKE_RECORDS, isLoading: false, error: null };
    renderWithProviders(<ComparisonInsights />);
    expect(screen.getByText(/comparison · real projects/i)).toBeInTheDocument();
  });

  it("renders all six section headings when data is loaded", () => {
    mockHookReturn = { data: FAKE_RECORDS, isLoading: false, error: null };
    renderWithProviders(<ComparisonInsights />);
    expect(screen.getByRole("heading", { name: /portfolio kpis/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by sales bucket/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hours by industry/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /system category mix/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /complexity vs hours/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /all projects/i })).toBeInTheDocument();
  });

  it("does not render an error alert when data loads successfully", () => {
    mockHookReturn = { data: FAKE_RECORDS, isLoading: false, error: null };
    renderWithProviders(<ComparisonInsights />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ComparisonInsights — loading state", () => {
  it("renders a skeleton with aria-busy=true when isLoading is true", () => {
    mockHookReturn = { data: undefined, isLoading: true, error: null };
    renderWithProviders(<ComparisonInsights />);
    const skeleton = document.querySelector("[aria-busy='true']");
    expect(skeleton).not.toBeNull();
  });

  it("does not render a progressbar/spinner role during loading", () => {
    mockHookReturn = { data: undefined, isLoading: true, error: null };
    renderWithProviders(<ComparisonInsights />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ComparisonInsights — error state", () => {
  it("renders role=alert when useRealProjects returns an error", () => {
    mockHookReturn = { data: undefined, isLoading: false, error: new Error("fetch failed") };
    renderWithProviders(<ComparisonInsights />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("error copy does not expose raw file paths", () => {
    mockHookReturn = { data: undefined, isLoading: false, error: new Error("fetch failed") };
    renderWithProviders(<ComparisonInsights />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).not.toMatch(/real-projects\.json/);
    expect(alert.textContent).not.toMatch(/synthetic-pool\.json/);
  });

  it("error copy is user-facing (contains 'couldn't load')", () => {
    mockHookReturn = { data: undefined, isLoading: false, error: new Error("fetch failed") };
    renderWithProviders(<ComparisonInsights />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
  });
});
