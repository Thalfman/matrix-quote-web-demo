import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";

// ---------------------------------------------------------------------------
// Mock pyodideClient so the component renders in a stable initial state
// without actually bootstrapping Pyodide.
// ---------------------------------------------------------------------------

vi.mock("@/demo/pyodideClient", () => ({
  subscribe: vi.fn((cb: (s: { stage: string; message: string; percent?: number }) => void) => {
    // Fire the initial status immediately so the component renders with known state.
    cb({ stage: "script", message: "Not started" });
    return () => {};
  }),
  getStatus: vi.fn(() => ({ stage: "script", message: "Not started" })),
}));

const { PyodideLoader } = await import("./PyodideLoader");

describe("PyodideLoader - stage labels", () => {
  it("renders the 'Warming up' stage label", () => {
    renderWithProviders(<PyodideLoader />);
    expect(screen.getByText("Warming up")).toBeInTheDocument();
  });

  it("renders the 'Python' stage label", () => {
    renderWithProviders(<PyodideLoader />);
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("renders the 'Libraries' stage label", () => {
    renderWithProviders(<PyodideLoader />);
    expect(screen.getByText("Libraries")).toBeInTheDocument();
  });

  it("renders the 'Shim' stage label", () => {
    renderWithProviders(<PyodideLoader />);
    expect(screen.getByText("Shim")).toBeInTheDocument();
  });

  it("renders the 'Real data' stage label (models_real stage)", () => {
    renderWithProviders(<PyodideLoader />);
    expect(screen.getByText("Real data")).toBeInTheDocument();
  });

  it("renders the 'Synthetic' stage label (models_synthetic stage)", () => {
    renderWithProviders(<PyodideLoader />);
    expect(screen.getByText("Synthetic")).toBeInTheDocument();
  });

  it("renders the 'Ready' stage label", () => {
    renderWithProviders(<PyodideLoader />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders a progress bar element", () => {
    renderWithProviders(<PyodideLoader />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows the loading heading when not in error/ready state", () => {
    renderWithProviders(<PyodideLoader />);
    expect(
      screen.getByRole("heading", { name: /loading the python runtime/i }),
    ).toBeInTheDocument();
  });
});
