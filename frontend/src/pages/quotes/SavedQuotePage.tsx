/**
 * RULE-3 STUB (Plan 05-09 integration wiring).
 *
 * This is a minimal stub to unblock DemoApp route registration in Plan 05-09.
 * Plan 05-08 (sibling, in-flight) will overwrite this file with the real
 * detail/edit/version-history implementation. The corresponding RED test file
 * (./SavedQuotePage.test.tsx) is ALSO from Plan 05-08 and is expected to fail
 * against this stub — that is the RED gate Plan 05-08 will satisfy.
 *
 * Do not extend this stub. If Plan 05-08 has not landed by the time you read
 * this, the route resolves to a stub that links back to /quotes.
 */
import { Link } from "react-router-dom";

export function SavedQuotePage() {
  return (
    <div className="space-y-4">
      <Link to="/quotes" className="text-sm text-muted hover:text-ink">
        Back to My Quotes
      </Link>
      <p className="text-sm text-muted">
        (Stub — Plan 05-08 will replace with the saved-quote detail page,
        version history, and Open in Quote tool action.)
      </p>
    </div>
  );
}
