/** "What this is trained on" disclosure popover - variant="real" describes 24 historical projects, variant="synthetic" describes the 500-row generated training pool. */
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "real" | "synthetic";

const COPY: Record<Variant, { eyebrow: string; body: string }> = {
  real: {
    eyebrow: "What this is trained on",
    body:
      "With a training set this small the engine can overfit. It tends to echo patterns from past projects rather than learn general rules, so confidence drops on projects that don't closely resemble those past projects.",
  },
  synthetic: {
    eyebrow: "What this is trained on",
    body:
      "Five hundred generated training projects provide wide coverage. Illustrates how the engine sharpens at scale: wider coverage, tighter ranges, steadier confidence.",
  },
};

/**
 * DataProvenanceNote - small native <details> disclosure that mounts one line
 * below the <PageHeader> on each demo page. Its copy is variant-driven so the
 * Real-Data and Synthetic-Data pages each tell their own honest story about
 * what the engine was trained on, in business language.
 */
export function DataProvenanceNote({ variant }: { variant: Variant }) {
  const copy = COPY[variant];
  return (
    <details
      className={cn(
        "group -mt-4 mb-6 rounded-sm border hairline bg-surface/60 text-sm",
        "transition-colors duration-150 ease-out",
      )}
    >
      <summary
        className={cn(
          "list-none cursor-pointer select-none flex items-center gap-2 px-3 py-2",
          "text-muted hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
          "rounded-sm",
        )}
      >
        <Info
          size={14}
          strokeWidth={1.75}
          className="shrink-0 text-teal"
          aria-hidden="true"
        />
        <span className="eyebrow text-xs text-ink">{copy.eyebrow}</span>
        <span
          aria-hidden="true"
          className={cn(
            "ml-auto text-xs text-muted transition-transform duration-150 ease-out",
            "group-open:rotate-180",
          )}
        >
          ▾
        </span>
      </summary>
      <p className="px-3 pb-3 pt-0 text-sm leading-relaxed text-muted max-w-3xl">
        {copy.body}
      </p>
    </details>
  );
}
