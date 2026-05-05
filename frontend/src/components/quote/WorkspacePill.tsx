/**
 * Read-only workspace badge — "real" or "synthetic" — for saved-quote list
 * rows and the SavedQuotePage detail header. Non-clickable; conveys which
 * workspace produced the underlying estimate.
 *
 * Per Phase 5 D-04: workspace is informational, not navigational. The pill
 * is always visible on every list row (no absence-conditional rendering).
 */
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Variant table (UI-SPEC §"Workspace-pill palette")
// ---------------------------------------------------------------------------

const WORKSPACE_CLASSES: Record<Workspace, string> = {
  real:      "bg-ink/5 text-ink",
  synthetic: "bg-amber/15 text-ink",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface WorkspacePillProps {
  workspace: Workspace;
}

export function WorkspacePill({ workspace }: WorkspacePillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-sm",
        "text-xs eyebrow",
        WORKSPACE_CLASSES[workspace],
      )}
    >
      {workspace}
    </span>
  );
}
