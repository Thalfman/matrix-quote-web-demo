/**
 * "Save quote" trigger button + SaveQuoteDialog wrapper.
 *
 * Hosted on QuoteResultPanel (variant="primary", full-width teal) and
 * CompareBrowseTab (variant="compact", smaller pill). Owns the dialog open
 * state and the post-save navigation to /quotes/:id.
 *
 * UI-SPEC §"Save quote dialog (D-12, D-14)" / §"Trigger button placement".
 *
 * Threats mitigated: T-05-16 (existingName preserves user-supplied name on
 * re-save, preventing accidental overwrite with the auto-suggestion).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { SaveQuoteDialog } from "@/components/quote/SaveQuoteDialog";
import { cn } from "@/lib/utils";
import {
  buildAutoSuggestedName,
  type QuoteMode,
  type SavedQuote,
  type WorkflowStatus,
  type Workspace,
} from "@/lib/savedQuoteSchema";
import type { QuoteFormValues } from "@/pages/single-quote/schema";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SaveQuoteButtonProps {
  workspace: Workspace;
  formValues: QuoteFormValues;
  unifiedResult: UnifiedQuoteResult;
  /** Present when re-saving an opened quote — appends a new version. */
  quoteId?: string;
  /** Existing name when editing — overrides the auto-suggestion in the dialog. */
  existingName?: string;
  status?: WorkflowStatus;
  /** Set by the restore-fork flow (D-06) so v(N+1) records its lineage. */
  restoredFromVersion?: number;
  /** Compare-side payload (D-13). */
  compareInputs?: { humanQuotedByBucket: Record<string, number> };
  /** D-19: ROM vs full quote shape. Threaded into the saved record so the
   *  list-row badge and re-open routing can distinguish them. Omit for
   *  full-mode quotes (defaults to "full" downstream). */
  mode?: QuoteMode;
  /** Visual variant: full-width primary in QuoteResultPanel slot, compact pill in compare bar. */
  variant?: "primary" | "compact";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SaveQuoteButton({
  workspace,
  formValues,
  unifiedResult,
  quoteId,
  existingName,
  status,
  restoredFromVersion,
  compareInputs,
  mode,
  variant = "primary",
}: SaveQuoteButtonProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const suggestedName = buildAutoSuggestedName(
    formValues,
    unifiedResult.estimateHours,
    mode,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-sm bg-teal text-white font-medium",
          "hover:bg-tealDark transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2",
          variant === "primary"
            ? "no-print w-full px-4 py-2.5 text-sm"
            : "px-3 py-1.5 text-xs eyebrow",
        )}
      >
        Save quote
      </button>
      <SaveQuoteDialog
        open={open}
        onClose={() => setOpen(false)}
        payload={{
          id: quoteId,
          workspace,
          status,
          formValues,
          unifiedResult,
          compareInputs,
          restoredFromVersion,
          suggestedName,
          existingName,
          mode,
        }}
        onSaved={(saved: SavedQuote) => {
          navigate(`/quotes/${saved.id}`);
        }}
      />
    </>
  );
}
