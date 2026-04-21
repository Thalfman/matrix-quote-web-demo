import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useHotkey } from "./useHotkey";

function fireKeydown(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", init));
}

describe("useHotkey", () => {
  it("fires handler when key + modifier match", () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: "Enter", ctrl: true }, handler));

    fireKeydown({ key: "Enter", ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire when required modifier is missing", () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: "Enter", ctrl: true }, handler));

    // No ctrlKey — should be ignored.
    fireKeydown({ key: "Enter", ctrlKey: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it("does NOT fire when a different key is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: "s", meta: true }, handler));

    fireKeydown({ key: "Enter", metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it("fires handler for meta key combo", () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: "Enter", meta: true }, handler));

    fireKeydown({ key: "Enter", metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("removes listener on unmount so handler no longer fires", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey({ key: "Enter", ctrl: true }, handler));

    unmount();

    fireKeydown({ key: "Enter", ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
