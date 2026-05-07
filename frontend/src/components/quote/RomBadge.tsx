/**
 * Phase 7 — D-07 / D-08. The "Preliminary" badge primitive.
 *
 * Renders a 28px-tall non-interactive amber chip with the visible text
 * "Preliminary" and aria-label "Preliminary estimate". Two render sites
 * (consumed by later Phase 7 plans):
 *   - QuoteResultPanel hero card (replaces the confidence chip in ROM mode)
 *   - QuoteRow on /quotes (next to the WorkspacePill, for ROM-mode rows)
 *
 * No props. The badge is always "Preliminary" — never "Low confidence",
 * never "Wide range", never any ML-flavored synonym (D-08 anti-pattern).
 *
 * Color contract (D-07): bg-amberSoft text-ink — same token as the
 * `revised` workflow status pill. Amber = "in motion / not final" — visually
 * rhymes with the revised pill but reads as a distinct label.
 */
import { cn } from "@/lib/utils";

export function RomBadge() {
  return (
    <span
      className={cn(
        "inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-sm",
        "text-xs eyebrow",
        "bg-amberSoft text-ink",
      )}
      aria-label="Preliminary estimate"
    >
      Preliminary
    </span>
  );
}
