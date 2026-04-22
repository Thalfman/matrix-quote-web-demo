import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

import { useModelMetrics } from "./modelMetrics";
import type { ModelMetric } from "./modelMetrics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

const FAKE_METRICS: ModelMetric[] = [
  { target: "me10_actual_hours", rows: 24, mae: 120.5, r2: 0.42 },
  { target: "ee20_actual_hours", rows: 24, mae: 80.1, r2: 0.61 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useModelMetrics", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string) =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ models: FAKE_METRICS }),
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the correct queryKey for the 'real' dataset", async () => {
    const { result } = renderHook(() => useModelMetrics("real"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Confirm fetch was called with the real URL
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("model_metrics_real.json"),
    );
  });

  it("uses the correct queryKey for the 'synthetic' dataset", async () => {
    const { result } = renderHook(() => useModelMetrics("synthetic"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("model_metrics_synthetic.json"),
    );
  });

  it("returns the parsed models array", async () => {
    const { result } = renderHook(() => useModelMetrics("real"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.models).toHaveLength(2);
    expect(result.current.data?.models[0].target).toBe("me10_actual_hours");
    expect(result.current.data?.models[0].r2).toBe(0.42);
  });

  it("surfaces an error when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }),
      ),
    );
    const { result } = renderHook(() => useModelMetrics("real"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/404/);
  });
});
