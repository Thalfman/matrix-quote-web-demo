// frontend/src/lib/useHotkey.ts
import { useEffect } from "react";

type Combo = { key: string; meta?: boolean; ctrl?: boolean; shift?: boolean };

export function useHotkey(combo: Combo, handler: (ev: KeyboardEvent) => void) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key.toLowerCase() !== combo.key.toLowerCase()) return;
      if (combo.meta !== undefined  && combo.meta  !== ev.metaKey)  return;
      if (combo.ctrl !== undefined  && combo.ctrl  !== ev.ctrlKey)  return;
      if (combo.shift !== undefined && combo.shift !== ev.shiftKey) return;
      handler(ev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo.key, combo.meta, combo.ctrl, combo.shift, handler]);
}
