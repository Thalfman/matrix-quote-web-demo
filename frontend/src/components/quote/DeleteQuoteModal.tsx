/**
 * Hard-delete confirmation modal (D-17). Verbatim copy from UI-SPEC §"Delete
 * confirmation modal (D-17)". Quote name rendered through a React text node
 * inside a strong element — auto-escaped — so user-supplied content cannot
 * inject HTML (T-05-12 mitigation).
 *
 * Threats mitigated: T-05-11 (two-step confirm: row Trash icon → modal with
 * verbatim D-17 copy → primary danger button on right; Cancel on left), T-05-12
 * (no raw HTML insertion; React text node escaping is the boundary).
 */
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

import { useDeleteQuote } from "@/hooks/useSavedQuotes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DeleteQuoteModalProps {
  open: boolean;
  onClose: () => void;
  quoteId: string;
  quoteName: string;
  onDeleted?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeleteQuoteModal({
  open,
  onClose,
  quoteId,
  quoteName,
  onDeleted,
}: DeleteQuoteModalProps) {
  const deleteQuote = useDeleteQuote();

  // ESC closes (matches SaveQuoteDialog scaffold).
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, handleEsc]);

  if (!open) return null;

  const onConfirm = async () => {
    try {
      await deleteQuote.mutateAsync(quoteId);
      toast.success("Quote deleted.");
      onDeleted?.();
      onClose();
    } catch {
      toast.error("Couldn't delete that quote. Try again.");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Centered panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-quote-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="card max-w-md w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="delete-quote-title" className="text-lg font-medium">
            Delete this quote?
          </h2>
          {/* D-17 verbatim: "Delete '<name>' permanently? This removes its full version history." */}
          <p className="text-sm text-ink">
            Delete &apos;<strong>{quoteName}</strong>&apos;
            {" permanently? This removes its full version history."}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-ink px-4 py-2 hover:bg-paper/60 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleteQuote.isPending}
              className="text-sm text-white bg-danger px-4 py-2 rounded-sm hover:bg-danger/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
            >
              Delete permanently
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
