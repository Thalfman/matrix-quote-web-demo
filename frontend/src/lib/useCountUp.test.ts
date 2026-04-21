import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { useCountUp } from "./useCountUp";

describe("useCountUp", () => {
  // Each test starts with matchMedia undefined (the jsdom default).
  beforeEach(() => {
    // @ts-expect-error — deliberately removing jsdom stub between tests
    delete window.matchMedia;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("animates from 0 to target when reduced motion is not set", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "performance"] });
    const { result } = renderHook(() => useCountUp(1000, { durationMs: 500 }));

    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(500); });
    expect(Math.round(result.current)).toBe(1000);
    vi.useRealTimers();
  });

  it("returns the target immediately when prefers-reduced-motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as typeof window.matchMedia;

    const { result } = renderHook(() => useCountUp(1000));
    expect(result.current).toBe(1000);
  });

  it("cancels the pending rAF on unmount so no state update fires after removal", () => {
    // matchMedia is undefined here (see beforeEach), so prefersReducedMotion=false
    // and the hook will schedule a real rAF frame.
    const cancelledIds: number[] = [];
    let lastId = 0;

    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = (_cb: FrameRequestCallback) => {
      lastId++;
      return lastId;
    };
    globalThis.cancelAnimationFrame = (id: number) => {
      cancelledIds.push(id);
    };

    const { unmount } = renderHook(() => useCountUp(500, { durationMs: 300 }));

    // The effect scheduled at least one frame.
    expect(lastId).toBeGreaterThan(0);
    const scheduledId = lastId;

    // Unmount without ever firing the callback — cleanup should cancel it.
    act(() => { unmount(); });

    expect(cancelledIds).toContain(scheduledId);

    globalThis.requestAnimationFrame = origRaf;
    globalThis.cancelAnimationFrame = origCaf;
  });
});
