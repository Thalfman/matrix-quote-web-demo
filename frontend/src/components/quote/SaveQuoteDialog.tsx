/**
 * Centered modal for saving a quote with name input + zod validation + sonner toast.
 *
 * Owns ALL Save UX (modal scaffold, ESC + backdrop close, focus management,
 * zod validation, success/error toasts, "Mark as revised?" assist for v2+).
 * Consumers render <SaveQuoteDialog open ... payload={...} /> with the
 * pre-built payload and react via onSaved.
 *
 * UI-SPEC §"Save quote dialog (D-12, D-14)" — strings verbatim.
 * Threats mitigated: T-05-10 (zod re-validation defense-in-depth at the
 * client boundary; storage layer re-validates).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useSaveQuote, useSetStatus } from "@/hooks/useSavedQuotes";
import {
  savedQuoteNameSchema,
  type SavedQuote,
  type WorkflowStatus,
  type Workspace,
} from "@/lib/savedQuoteSchema";
import { cn } from "@/lib/utils";
import type { QuoteFormValues } from "@/pages/single-quote/schema";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SaveQuoteDialogProps {
  open: boolean;
  onClose: () => void;
  payload: {
    /** Present when re-saving an opened quote (commits a new version on the same record). */
    id?: string;
    workspace: Workspace;
    /** Optional override; defaults to "draft" for brand-new records. */
    status?: WorkflowStatus;
    formValues: QuoteFormValues;
    unifiedResult: UnifiedQuoteResult;
    compareInputs?: { humanQuotedByBucket: Record<string, number> };
    /** Set by the restore-fork flow (D-06) so v(N+1) records its lineage. */
    restoredFromVersion?: number;
    /** Auto-suggested name seed; the dialog prefills the input with this. */
    suggestedName: string;
    /** Existing name when editing (overrides suggestedName for re-save). */
    existingName?: string;
  };
  onSaved?: (saved: SavedQuote) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SaveQuoteDialog({
  open,
  onClose,
  payload,
  onSaved,
}: SaveQuoteDialogProps) {
  const [name, setName] = useState<string>(
    payload.existingName ?? payload.suggestedName,
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveQuote = useSaveQuote();
  const setStatusMutation = useSetStatus();

  // Reset state every time the modal opens with a new payload.
  useEffect(() => {
    if (open) {
      setName(payload.existingName ?? payload.suggestedName);
      setError(null);
    }
  }, [open, payload.existingName, payload.suggestedName]);

  // ESC closes (mirrors ProjectDetailDrawer:38-49 pattern).
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

  // Autofocus + select-all the prefill so typing replaces it.
  useEffect(() => {
    if (open) {
      const handle = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => window.clearTimeout(handle);
    }
  }, [open]);

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // T-05-10 mitigation: zod re-validation at the UI boundary.
    const parsed = savedQuoteNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }

    try {
      const saved = await saveQuote.mutateAsync({
        id: payload.id,
        name: parsed.data,
        workspace: payload.workspace,
        status: payload.status,
        formValues: payload.formValues,
        unifiedResult: payload.unifiedResult,
        compareInputs: payload.compareInputs,
        restoredFromVersion: payload.restoredFromVersion,
      });

      // D-10: only show "Mark as revised?" assist when committing v2+ AND status
      // isn't already "revised". One-tap convenience for the common workflow:
      // first save = draft, second save = revised after customer feedback.
      const showRevisedAssist =
        saved.versions.length >= 2 && saved.status !== "revised";
      if (showRevisedAssist) {
        toast.success("Quote saved.", {
          action: {
            label: "Mark as revised?",
            onClick: () => {
              void setStatusMutation.mutateAsync({
                id: saved.id,
                status: "revised",
              });
            },
          },
        });
      } else {
        toast.success("Quote saved.");
      }

      onSaved?.(saved);
      onClose();
    } catch {
      toast.error(
        "Couldn't save this quote. Browser storage might be full or blocked. Try again, or free up some space.",
      );
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
        aria-labelledby="save-quote-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <form
          onSubmit={onSubmit}
          className="card max-w-md w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="save-quote-title" className="text-lg font-medium">
            Save this quote
          </h2>
          <p className="text-sm text-muted">
            Give it a name you&apos;ll recognize later. You can change the name
            anytime by reopening the quote.
          </p>
          <div>
            <label
              htmlFor="quote-name"
              className="eyebrow text-xs text-muted"
            >
              Quote name
            </label>
            <input
              id="quote-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className={cn(
                "w-full mt-1 px-3 py-2 text-sm border rounded-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
                error ? "border-danger" : "border-line",
              )}
              maxLength={120}
            />
            {error && (
              <p className="text-xs text-danger mt-1" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-ink px-4 py-2 hover:bg-paper/60 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveQuote.isPending}
              className="text-sm text-white bg-teal px-4 py-2 rounded-sm hover:bg-tealDark disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
            >
              Save quote
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
