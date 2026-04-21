// frontend/src/lib/useCountUp.ts
import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  { durationMs = 500 }: { durationMs?: number } = {},
): number {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [value, setValue] = useState<number>(prefersReducedMotion ? target : 0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }
    startRef.current = null;
    const step = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(target * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs, prefersReducedMotion]);

  return value;
}
