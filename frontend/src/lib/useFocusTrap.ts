/**
 * useFocusTrap — confine keyboard focus inside a panel while it is mounted.
 *
 * Mandated by UI-SPEC §"Save quote dialog (D-12, D-14)" / Behaviour:
 *   "Focus trap: tab cycles between field → Cancel → Save → field.
 *    (Implementation: standard `react-aria` focus-trap or a 12-line custom
 *    one — researcher's discretion, but trap MUST exist.)"
 * PATTERNS §`SaveQuoteDialog` reiterates the trap-must-exist requirement.
 *
 * Tab cycles forward through focusable elements; Shift+Tab cycles backward.
 * When focus is on the LAST focusable element and user presses Tab, focus
 * loops to the FIRST. When focus is on the FIRST and user presses Shift+Tab,
 * focus loops to the LAST. Other keys are untouched (ESC handling stays in
 * the consumer, mirroring the existing SaveQuoteDialog/DeleteQuoteModal
 * pattern).
 *
 * Pattern mirrors useHotkey.ts: imperative ref, document-level keydown
 * listener, returns nothing (the dialog already manages its own focus on
 * mount via the existing autofocus useEffect).
 */
import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "button",
  "[href]",
  "input",
  "select",
  "textarea",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(
  active: boolean,
  panelRef: RefObject<HTMLElement>,
): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const els = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      // If focus has escaped the panel entirely (e.g., via programmatic
      // .focus() outside, or initial state before autofocus runs), pull it
      // back to the first focusable.
      if (!activeEl || !panel.contains(activeEl)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, panelRef]);
}
