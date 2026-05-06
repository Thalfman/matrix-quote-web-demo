/**
 * Workflow-status pill for saved quotes. Click / Enter / Space / ArrowRight
 * advances through the five Ben-verbatim states; Shift reverses one step.
 *
 * The five states (Phase 5 D-08, UI-SPEC §"Status-pill palette") are exactly:
 *   draft → sent → won → lost → revised → draft (cycle).
 *
 * The `readOnly` variant renders a plain <span> with no advance affordance —
 * used in the per-quote version-history list.
 */
import type { KeyboardEvent, MouseEvent } from "react";

import { cn } from "@/lib/utils";
import { STATUS_CYCLE, type WorkflowStatus } from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Variant table (UI-SPEC §"Status-pill palette")
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<WorkflowStatus, string> = {
  draft:   "bg-line text-muted",
  sent:    "bg-tealSoft text-tealDark",
  won:     "bg-success/15 text-success",
  lost:    "bg-danger/10 text-danger",
  revised: "bg-amberSoft text-ink",
};

const BASE_CLASSES =
  "inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-sm " +
  "text-xs eyebrow";

const INTERACTIVE_CLASSES =
  "hover:opacity-90 transition-opacity " +
  "focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-teal focus-visible:ring-offset-2";

// ---------------------------------------------------------------------------
// Helpers — STATUS_CYCLE wrap-around in both directions
// ---------------------------------------------------------------------------

function nextStatus(current: WorkflowStatus): WorkflowStatus {
  const i = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

function previousStatus(current: WorkflowStatus): WorkflowStatus {
  const i = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(i - 1 + STATUS_CYCLE.length) % STATUS_CYCLE.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface StatusChipProps {
  status: WorkflowStatus;
  onAdvance?: (next: WorkflowStatus) => void;
  readOnly?: boolean;
}

export function StatusChip({ status, onAdvance, readOnly }: StatusChipProps) {
  if (readOnly) {
    return (
      <span
        className={cn(BASE_CLASSES, STATUS_CLASSES[status])}
        aria-label={`Status: ${status}`}
      >
        {status}
      </span>
    );
  }

  const advance = (reverse: boolean) => {
    if (!onAdvance) return;
    onAdvance(reverse ? previousStatus(status) : nextStatus(status));
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    advance(e.shiftKey);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
      e.preventDefault();
      advance(e.shiftKey);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(BASE_CLASSES, INTERACTIVE_CLASSES, STATUS_CLASSES[status])}
      aria-label={`Status: ${status}. Click to advance.`}
      title="Click to advance status"
    >
      {status}
    </button>
  );
}
