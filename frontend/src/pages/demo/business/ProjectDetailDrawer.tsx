import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { RankedRow } from "./portfolioStats";

type Props = {
  row: RankedRow | null;
  onClose: () => void;
};

function Field({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  if (value == null || value === "" || value === 0) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b hairline last:border-b-0">
      <span className="text-[10px] eyebrow text-muted shrink-0">{label}</span>
      <span
        className={cn(
          "text-sm text-ink text-right break-words min-w-0",
          mono ? "mono tnum" : "",
        )}
      >
        {String(value)}
      </span>
    </div>
  );
}

export function ProjectDetailDrawer({ row, onClose }: Props) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!row) return;
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [row, handleEsc]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity duration-200",
          row ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={row ? `Project detail: ${row.project_name}` : "Project detail"}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] max-w-full bg-paper",
          "border-l hairline shadow-2xl overflow-y-auto",
          "transition-transform duration-200 ease-out",
          row ? "translate-x-0" : "translate-x-full",
        )}
      >
        {row && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 border-b hairline sticky top-0 bg-paper z-10">
              <div className="min-w-0">
                <div className="eyebrow text-[10px] text-muted mb-1">Project detail</div>
                <div className="display-hero text-lg leading-tight text-ink break-words">
                  {row.project_name}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "shrink-0 mt-0.5 p-1.5 rounded-sm text-muted hover:text-ink hover:bg-line",
                  "transition-colors duration-150 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
                )}
                aria-label="Close project detail (Esc)"
                title="Close (Esc)"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 space-y-6">
              {/* Identity */}
              <section>
                <div className="eyebrow text-[10px] text-muted mb-3">Identity</div>
                <div>
                  <Field label="Project ID" value={row.project_id} mono={false} />
                  <Field label="Industry" value={row.industry} mono={false} />
                  <Field label="System category" value={row.system_category} mono={false} />
                  <Field label="Primary bucket" value={row.primary_bucket} mono={false} />
                </div>
              </section>

              {/* Metrics */}
              <section>
                <div className="eyebrow text-[10px] text-muted mb-3">Metrics</div>
                <div>
                  <Field label="Stations" value={row.stations} />
                  <Field
                    label="Total hours"
                    value={row.total_hours.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  />
                </div>
              </section>
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t hairline text-[10px] eyebrow text-muted bg-paper/60">
              Press{" "}
              <kbd className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-line text-ink text-[9px] mono tracking-normal normal-case">
                Esc
              </kbd>{" "}
              to close
            </div>
          </div>
        )}
      </div>
    </>
  );
}
