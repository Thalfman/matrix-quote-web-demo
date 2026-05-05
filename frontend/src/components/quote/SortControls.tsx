/**
 * Three-button segmented control for sorting My Quotes — Date saved / Name /
 * Status (UI-SPEC §"Sort options"). No filter UI for v2.0 (D-11) — sort is
 * sufficient for the volume one Sales Engineer accumulates.
 *
 * Pattern reused from frontend/src/components/DemoLayout.tsx::MobileToolSwitch
 * — same active/inactive class shapes, same teal focus ring.
 */
import { cn } from "@/lib/utils";

export type SortKey = "date" | "name" | "status";

// ---------------------------------------------------------------------------
// Options table (UI-SPEC §"Sort options" — verbatim labels)
// ---------------------------------------------------------------------------

const SORT_OPTIONS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: "date",   label: "Date saved" },
  { key: "name",   label: "Name" },
  { key: "status", label: "Status" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SortControlsProps {
  value: SortKey;
  onChange: (next: SortKey) => void;
}

export function SortControls({ value, onChange }: SortControlsProps) {
  return (
    <div
      role="group"
      aria-label="Sort by"
      className="inline-flex items-center gap-1.5 flex-wrap"
    >
      <span className="text-xs eyebrow text-muted mr-1">Sort by:</span>
      {SORT_OPTIONS.map(({ key, label }) => {
        const isActive = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={isActive}
            className={cn(
              "text-xs eyebrow px-3 py-1.5 rounded-sm",
              "transition-colors duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-teal",
              isActive
                ? "bg-ink text-white"
                : "text-muted hover:text-ink hover:bg-paper/60",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
