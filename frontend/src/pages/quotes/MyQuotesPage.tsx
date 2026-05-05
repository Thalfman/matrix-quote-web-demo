/**
 * /quotes route — the My Quotes list page. Composes the Wave 2 pieces:
 *   - useSavedQuotes()           (Plan 04 — TanStack Query over IndexedDB)
 *   - SortControls               (Plan 02 — Date / Name / Status segmented control)
 *   - QuoteRow                   (Plan 06 — clickable row with chip + workspace + delete)
 *   - MyQuotesEmptyState         (Plan 06 — empty list CTAs)
 *   - DeleteQuoteModal           (Plan 05 — verbatim D-17 confirmation)
 *
 * Delivers PERSIST-02 (list view), PERSIST-04 (delete from list), PERSIST-05
 * (status cycling on chip).
 *
 * Threats mitigated:
 *   T-05-14 (Information Disclosure): all rendering of quote.name flows through
 *   React text nodes inside QuoteRow + DeleteQuoteModal. The jargon-guard scan
 *   from Plan 09 will scope this surface.
 */
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { DeleteQuoteModal } from "@/components/quote/DeleteQuoteModal";
import { SortControls, type SortKey } from "@/components/quote/SortControls";
import { useSavedQuotes, useSetStatus } from "@/hooks/useSavedQuotes";
import type { SavedQuote, WorkflowStatus } from "@/lib/savedQuoteSchema";

import { MyQuotesEmptyState } from "./MyQuotesEmptyState";
import { QuoteRow } from "./QuoteRow";

// ---------------------------------------------------------------------------
// Constants — sort tables (UI-SPEC §"Sort options")
// ---------------------------------------------------------------------------

/** Workflow's natural reading order (UI-SPEC §"Sort options"): draft → revised
 * → sent → won → lost. Note this differs from the chip-cycle order in
 * STATUS_CYCLE (which is draft → sent → won → lost → revised). */
const STATUS_SORT_ORDER: Record<WorkflowStatus, number> = {
  draft: 0,
  revised: 1,
  sent: 2,
  won: 3,
  lost: 4,
};

const SUBHEAD =
  "Saved quotes from both Real and Synthetic workspaces. Open one to revise its inputs and re-estimate.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortQuotes(quotes: SavedQuote[], key: SortKey): SavedQuote[] {
  const arr = [...quotes];
  if (key === "date") {
    return arr.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }
  if (key === "name") {
    return arr.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }
  // key === "status"
  return arr.sort(
    (a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status],
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MyQuotesPage() {
  const { data, isLoading, error } = useSavedQuotes();
  const setStatusMutation = useSetStatus();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const sorted = useMemo(
    () => (data ? sortQuotes(data, sortKey) : []),
    [data, sortKey],
  );

  const handleAdvanceStatus = (id: string, next: WorkflowStatus) => {
    void setStatusMutation.mutateAsync({ id, status: next });
  };

  const handleRequestDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  return (
    <>
      <PageHeader title="My Quotes" description={SUBHEAD} />

      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-end">
          <SortControls value={sortKey} onChange={setSortKey} />
        </div>

        {isLoading && (
          <div className="text-sm text-muted text-center py-12">
            Loading saved quotes…
          </div>
        )}

        {error && (
          <div
            className="card p-5 flex items-start gap-3 text-sm text-danger"
            role="alert"
          >
            <AlertTriangle
              size={18}
              strokeWidth={1.75}
              className="shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                Couldn&apos;t open your saved quotes
              </div>
              <div className="text-muted mt-1">
                Browser storage didn&apos;t respond. Try refreshing this page.
                If it keeps happening, your browser might be blocking site
                storage.
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && sorted.length === 0 && <MyQuotesEmptyState />}

        {!isLoading && !error && sorted.length > 0 && (
          <div className="card">
            {sorted.map((q) => (
              <QuoteRow
                key={q.id}
                quote={q}
                onAdvanceStatus={handleAdvanceStatus}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteQuoteModal
          open
          onClose={() => setDeleteTarget(null)}
          quoteId={deleteTarget.id}
          quoteName={deleteTarget.name}
        />
      )}
    </>
  );
}
