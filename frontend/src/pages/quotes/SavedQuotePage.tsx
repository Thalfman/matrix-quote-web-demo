/**
 * /quotes/:id detail / edit / version-history route. Plan 05-08.
 *
 * Composes Wave 2 primitives end-to-end:
 *   - StatusChip — live-clickable, cycles draft/sent/won/lost/revised (D-08, D-09).
 *   - VersionHistoryList — newest-first version list with Restore (D-06, D-07).
 *   - DeleteQuoteModal — D-17 verbatim hard-delete confirmation.
 *   - QuoteResultPanel — renders the saved estimate WITHOUT re-running Pyodide
 *     (re-uses the stored unifiedResult on the latest version).
 *
 * Mitigates: PERSIST-03 (open-and-revise), PERSIST-04 (delete from detail),
 * PERSIST-05 (status chip live), PERSIST-06 (version history + restore).
 *
 * Threats mitigated (T-05-15): the URL :id parameter is read via useParams and
 * passed straight through useSavedQuote → quoteStorage.getSavedQuote, which
 * validates via savedQuoteSchema. A malformed/forged :id cannot expose data
 * outside this browser's IndexedDB (no cross-origin storage). On parse failure
 * we render the not-found state.
 *
 * Routing:
 *   - Open in Quote tool: workspace==="real" → /compare/quote?fromQuote={id}
 *                         workspace==="synthetic" → /ml/quote?fromQuote={id}
 *   - Restore vN: navigates to the same path with &restoreVersion=N appended,
 *     so Plan 09's QuoteForm reader rehydrates with that version's inputs.
 */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { DeleteQuoteModal } from "@/components/quote/DeleteQuoteModal";
import { QuoteResultPanel } from "@/components/quote/QuoteResultPanel";
import { StatusChip } from "@/components/quote/StatusChip";
import { VersionHistoryList } from "@/components/quote/VersionHistoryList";
import { useSavedQuote, useSetStatus } from "@/hooks/useSavedQuotes";
import type { Workspace } from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the Quote-tool URL for a saved quote, optionally with a restoreVersion
 * query param so the form rehydrates with that version's inputs (D-06).
 *
 * Real workspace → /compare/quote (Compare tool's Quote tab)
 * Synthetic workspace → /ml/quote (Synthetic Data Quote tool)
 */
function quoteToolPath(
  workspace: Workspace,
  id: string,
  version?: number,
): string {
  const base = workspace === "real" ? "/compare/quote" : "/ml/quote";
  const params = new URLSearchParams({ fromQuote: id });
  if (version !== undefined) params.set("restoreVersion", String(version));
  return `${base}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SavedQuotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSavedQuote(id);
  const setStatusMutation = useSetStatus();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (isLoading || !id) {
    return (
      <div className="text-sm text-muted text-center py-12">Loading…</div>
    );
  }

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  if (data === null || data === undefined) {
    return (
      <div className="space-y-4">
        <Link
          to="/quotes"
          className={
            "inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink" +
            " transition-colors duration-150 ease-out" +
            " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
          }
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Back to My Quotes
        </Link>
        <div className="card p-8 text-center">
          <p className="text-sm text-ink">Quote not found.</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Loaded
  // -------------------------------------------------------------------------

  // Storage convention: newest version is appended LAST in versions[].
  const latest = data.versions[data.versions.length - 1];
  const linkHref = quoteToolPath(data.workspace, data.id);

  // D-06: Restore is a fork. We navigate to the Quote tool with both
  // fromQuote and restoreVersion in the URL; QuoteForm's reader (and the
  // ComparisonQuote / MachineLearningQuoteTool entry-points) rehydrate
  // with that version's inputs and the next save commits as v(N+1) with
  // restoredFromVersion: N. No pre-navigate IDB round-trip — the form
  // hydration path already reads from IDB.
  const handleRestore = (version: number) => {
    navigate(quoteToolPath(data.workspace, data.id, version));
  };

  return (
    <>
      <div className="space-y-4">
        <Link
          to="/quotes"
          className={
            "inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink" +
            " transition-colors duration-150 ease-out" +
            " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
          }
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Back to My Quotes
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-lg font-medium truncate">{data.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="eyebrow text-xs text-muted">Status</span>
              <StatusChip
                status={data.status}
                onAdvance={(next) =>
                  void setStatusMutation.mutateAsync({
                    id: data.id,
                    status: next,
                  })
                }
              />
              <span className="text-xs text-muted">Click to advance</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className={
              "text-sm text-danger hover:underline px-2 py-1 rounded-sm" +
              " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
            }
          >
            Delete quote
          </button>
        </div>

        <Link
          to={linkHref}
          className={
            "inline-flex items-center justify-center gap-2 px-4 py-2.5" +
            " bg-teal text-white text-sm font-medium rounded-sm" +
            " hover:bg-tealDark transition-colors" +
            " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          }
        >
          Open in Quote tool
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <QuoteResultPanel
            result={latest.unifiedResult}
            input={latest.formValues}
          />
        </div>
        <aside className="lg:sticky lg:top-6 self-start">
          <VersionHistoryList
            versions={data.versions}
            onRestore={handleRestore}
          />
        </aside>
      </div>

      <DeleteQuoteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        quoteId={data.id}
        quoteName={data.name}
        onDeleted={() => navigate("/quotes")}
      />
    </>
  );
}
