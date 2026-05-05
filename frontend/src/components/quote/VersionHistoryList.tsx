/**
 * Vertical version-history list for the saved-quote detail page (PERSIST-06).
 *
 * Renders newest-first regardless of input order. Storage convention is
 * newest-LAST inside SavedQuote.versions; we sort descending by version
 * number for display (D-06: linear, monotonic — no branching).
 *
 * Row format (D-07 verbatim):
 *   "v{N} · {YYYY-MM-DD} · {status} · Restore"
 * with THREE middle-dot (U+00B7) textual separators, each with surrounding
 * spaces. The verbatim text is enforced both by the source layout below
 * and by the regex assertion in VersionHistoryList.test.tsx.
 *
 * Status-at-time is shown via the read-only variant of <StatusChip /> — no
 * click-to-advance affordance inside a version row (the chip in the detail
 * page header is the editable surface).
 *
 * No ML jargon (D-19): "Version history" / single-version helper copy /
 * "Restore" / "v{N}" / `·`. Plan 09 will scan via jargon-guard.
 */
import { StatusChip } from "@/components/quote/StatusChip";
import type { QuoteVersion } from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface VersionHistoryListProps {
  versions: QuoteVersion[];
  onRestore: (version: number) => void;
}

export function VersionHistoryList({
  versions,
  onRestore,
}: VersionHistoryListProps) {
  // Always render newest-first regardless of input order. Storage convention
  // appends new versions LAST; we sort descending so v3, v2, v1 is the DOM
  // order even when callers pass [v1, v2, v3] or any permutation.
  const newestFirst = [...versions].sort((a, b) => b.version - a.version);

  return (
    <aside
      aria-labelledby="version-history-title"
      className="card p-5 space-y-3"
    >
      <h3
        id="version-history-title"
        className="eyebrow text-xs text-muted"
      >
        Version history
      </h3>

      {newestFirst.length === 0 && (
        <p className="text-sm text-muted">No versions saved yet.</p>
      )}

      {newestFirst.length === 1 && (
        <p className="text-sm text-muted">
          Only one version saved so far. Edit and re-save to add a version.
        </p>
      )}

      {newestFirst.length >= 1 && (
        <ul role="list" className="space-y-2">
          {newestFirst.map((v) => (
            <li
              key={v.version}
              className="flex items-center gap-3 py-2 border-b hairline last:border-b-0"
            >
              {/*
                D-07 verbatim row format: "vN · ISO date · status-at-time · Restore"
                with THREE textual middle-dot separators (U+00B7), each surrounded
                by spaces. Each ` · ` lives in its own aria-hidden <span> so screen
                readers don't announce the dot character — the row's semantic content
                is captured via the version number, the chip's aria-label, and the
                Restore button label.
              */}
              <span className="text-sm text-ink mono">
                v{v.version}
              </span>
              <span aria-hidden="true" className="text-sm text-muted">
                {" · "}
              </span>
              <span className="text-sm text-ink mono">
                {v.savedAt.slice(0, 10)}
              </span>
              <span aria-hidden="true" className="text-sm text-muted">
                {" · "}
              </span>
              <StatusChip status={v.statusAtTime} readOnly />
              <span aria-hidden="true" className="text-sm text-muted">
                {" · "}
              </span>
              <button
                type="button"
                onClick={() => onRestore(v.version)}
                className="ml-auto text-sm text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
