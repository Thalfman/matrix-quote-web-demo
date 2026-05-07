/**
 * One row in the My Quotes list. UI-SPEC §`/quotes (list page)` + §`QuoteRow`.
 *
 * Composes Plan 02 primitives: StatusChip (clickable, advances state) +
 * WorkspacePill (read-only badge). Pure presentational — emits onClick handlers
 * upward; no direct storage calls.
 *
 * Click model:
 *   - Row body click → navigate(`/quotes/${id}`).
 *   - StatusChip click → onAdvanceStatus(id, next), stopPropagation (no navigate).
 *   - Delete icon click → onRequestDelete(id, name), stopPropagation (no navigate).
 *
 * Container is a div with role="button" + tabIndex=0 instead of a real <button>:
 * the row contains nested interactive elements (StatusChip, Delete) and HTML
 * forbids buttons inside buttons. ARIA pattern + keyboard handlers cover Enter
 * and Space activation.
 */
import type { KeyboardEvent, MouseEvent } from "react";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { RomBadge } from "@/components/quote/RomBadge";
import { StatusChip } from "@/components/quote/StatusChip";
import { WorkspacePill } from "@/components/quote/WorkspacePill";
import { cn } from "@/lib/utils";
import type { SavedQuote, WorkflowStatus } from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface QuoteRowProps {
  quote: SavedQuote;
  onAdvanceStatus: (id: string, next: WorkflowStatus) => void;
  onRequestDelete: (id: string, name: string) => void;
}

export function QuoteRow({
  quote,
  onAdvanceStatus,
  onRequestDelete,
}: QuoteRowProps) {
  const navigate = useNavigate();
  const savedDate = quote.updatedAt.slice(0, 10);

  const handleRowClick = () => {
    navigate(`/quotes/${quote.id}`);
  };

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/quotes/${quote.id}`);
    }
  };

  const handleAdvanceStatus = (next: WorkflowStatus) => {
    onAdvanceStatus(quote.id, next);
  };

  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRequestDelete(quote.id, quote.name);
  };

  // Without this, Enter/Space on the focused delete button bubbles up to the
  // row's onKeyDown and triggers navigation before the button's native click
  // fires — keyboard users would be sent to /quotes/:id instead of opening
  // the delete flow.
  const handleDeleteKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
    }
  };

  // Inner wrapper around StatusChip swallows row-level click so the chip
  // advances state instead of navigating. StatusChip itself already stops
  // propagation on click, but the keydown path (Enter / Space on focused chip)
  // is also bubble-blocked here for safety.
  const stopRowEvent = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      aria-label={`Open saved quote ${quote.name}`}
      className={cn(
        "w-full text-left flex items-center gap-4 px-5 py-4",
        "border-b hairline last:border-b-0",
        "hover:bg-paper/60 focus-visible:bg-paper/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-inset",
        "min-h-[56px] cursor-pointer",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink truncate">
          {quote.name}
        </div>
        <div className="text-xs text-muted mt-0.5">Saved {savedDate}</div>
      </div>

      <div onClick={stopRowEvent} onKeyDown={stopRowEvent}>
        <StatusChip status={quote.status} onAdvance={handleAdvanceStatus} />
      </div>

      {quote.mode === "rom" && (
        <span title="This is a ROM (rough order of magnitude) quote.">
          <RomBadge />
        </span>
      )}

      <WorkspacePill workspace={quote.workspace} />

      <div className="hidden md:flex items-center gap-3 text-xs text-muted shrink-0">
        <span>{quote.salesBucket}</span>
        <span>{quote.visionLabel}</span>
        <span className="mono tnum">
          ${quote.materialsCost.toLocaleString()}
        </span>
      </div>

      <button
        type="button"
        onClick={handleDeleteClick}
        onKeyDown={handleDeleteKeyDown}
        aria-label={`Delete quote ${quote.name}`}
        className={cn(
          "p-2 rounded-sm text-muted hover:text-danger hover:bg-danger/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2",
        )}
      >
        <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
