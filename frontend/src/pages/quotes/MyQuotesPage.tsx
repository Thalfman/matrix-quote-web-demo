/**
 * RULE-3 STUB (Plan 05-09 integration wiring).
 *
 * This is a minimal stub to unblock DemoApp route registration in Plan 05-09.
 * Plan 05-07 (sibling, in-flight) will overwrite this file with the real
 * implementation. The corresponding RED test file
 * (./MyQuotesPage.test.tsx) is ALSO from Plan 05-07 and is expected to fail
 * against this stub — that is the RED gate Plan 05-07 will satisfy.
 *
 * Do not extend this stub. If Plan 05-07 has not landed by the time you read
 * this, the integration wiring still works (the route resolves to a placeholder
 * page) and the jargon-guard test in Plan 05-09 mocks the real hook to render
 * meaningful chrome.
 */
export function MyQuotesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-medium">My Quotes</h1>
        <p className="text-sm text-muted mt-1">
          Saved quotes from both Real and Synthetic workspaces. Open one to
          revise its inputs and re-estimate.
        </p>
      </header>
      <p className="text-sm text-muted">
        (Stub — Plan 05-07 will replace with the populated list, sort
        controls, and row-level interactions.)
      </p>
    </div>
  );
}
