/**
 * Empty-state for /quotes when no quotes have been saved yet.
 *
 * UI-SPEC §`/quotes (list page)` Empty list rows + §`MyQuotesEmptyState`.
 *
 * Copy is verbatim from UI-SPEC and is jargon-guard scoped — Plan 09 will
 * extend the DATA-03 jargon-guard test to include this surface.
 */
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function MyQuotesEmptyState() {
  return (
    <div className="card p-12 flex flex-col items-center text-center gap-4">
      <Sparkles
        size={32}
        strokeWidth={1.75}
        className="text-amber/40"
        aria-hidden="true"
      />
      <h2 className="display-hero text-3xl text-ink">No saved quotes yet</h2>
      <p className="text-sm text-muted max-w-md">
        Save your first quote from the Quote tool — open the Quote tab in
        either workspace, run an estimate, and click &quot;Save quote&quot; on
        the result panel.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <Link
          to="/compare/quote"
          className="text-sm text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
        >
          Open Real-Data Quote tool
        </Link>
        <Link
          to="/ml/quote"
          className="text-sm text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
        >
          Open Synthetic-Data Quote tool
        </Link>
      </div>
    </div>
  );
}
