import { useEffect, useState } from "react";

/**
 * Subscribes to a media-query and returns whether it currently matches.
 *
 * In environments without `matchMedia` (older jsdom, some SSR contexts) or
 * when the hook hasn't yet mounted, returns `false` - callers should default
 * to the desktop/no-match layout and upgrade to the matched layout only
 * once the client has confirmed it.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * True when the viewport is narrower than Tailwind's `md` breakpoint (768px).
 * Defaults to `false` (desktop) before the effect runs, so SSR and jsdom tests
 * get the desktop layout unless they explicitly mock matchMedia.
 */
export function useIsNarrow(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
