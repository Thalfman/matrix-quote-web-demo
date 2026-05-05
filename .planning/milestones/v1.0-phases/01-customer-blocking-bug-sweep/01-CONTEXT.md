# Phase 1: Customer-blocking bug sweep — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning
**Source:** PRD Express Path — `.planning/feedback/2026-05-01-ben-bertsche-review.md` + `.planning/ROADMAP.md`

<domain>
## Phase Boundary

Stop the demo from crashing on Ben's input flow; correct the wrong Total/Avg signal in Hours by Sales Bucket; surface the user's inputs in the result panel.

**Requirements:** BUG-01, BUG-02, UX-01.
**Customer trigger:** Ben Bertsche reproduced the Compare crash twice on the deployed demo (https://matrix-quote-web-demo.vercel.app). His verbatim feedback set the priority.
**UI hint:** yes — UX-01 is a customer-facing change to `QuoteResultPanel`; BUG-01 fix touches an input component; BUG-02 fix touches a chart's data path but does not change visual layout.

</domain>

<decisions>
## Implementation Decisions

### BUG-01 — Compare crash on `2,000` (LOCKED)

- **Root cause (confirmed by source read):** `frontend/src/pages/single-quote/QuoteForm.tsx:316-341` — the "Optional: compare to your quoted hours" panel uses `<Input type="number">` with `onChange={(e) => setQuotedHours((p) => ({ ...p, [bucket]: Number(e.currentTarget.value) }))}`. `Number("")` is `0` and `Number("2,000")` is `NaN`. NaN flows into `quotedHours[bucket]`, then back into `value={quotedHours[bucket] ?? 0}` (NaN is not nullish, so the input gets `value={NaN}`), and React 18's controlled-input contract escalates the bad value into a render-time exception caught by `RootErrorBoundary`.
- **Fix surface (LOCKED):** keep the input as-is visually, but parse safely. Replace the inline `Number(e.currentTarget.value)` with a `parseQuotedHours(raw: string): number | null` helper that strips commas/whitespace, returns `null` on empty/non-numeric, and clamps negative to `null`. Store `quotedHours[bucket]` as `number | undefined` (drop the `?? 0` rendering trick); render `value={quotedHours[bucket] ?? ""}`. Filter `null/undefined` in the submit path.
- **Test contract (LOCKED):** Vitest test in `frontend/src/pages/single-quote/QuoteForm.test.tsx` (new file) drives the input via `fireEvent.change` with each of: `"2,000"`, `"2000"`, `"2,000.5"`, `""`, `"abc"`, `"-50"`. Asserts: (a) no React error boundary triggers (no thrown errors during render); (b) `2,000` → input is parsed to `2000`; (c) `""` and `"abc"` and `"-50"` → bucket is excluded from the submit payload.
- **Test contract (LOCKED):** Add a unit test for the `parseQuotedHours` helper covering the same input set so the parser logic stands alone (cheap regression).
- **Out of scope:** the panel's visual design, the SALES_BUCKETS list, and the `<Input>` component shape are unchanged.

### BUG-02 — Hours by Sales Bucket Total = Avg (LOCKED)

- **Root cause (confirmed by source read):** `frontend/src/pages/demo/business/portfolioStats.ts:80-105,165-168` builds `BucketRow = {bucket, hours}` by summing `pred.sales_buckets[bName].p50` across all records, but never tracks the per-bucket project count. `frontend/src/pages/demo/business/HoursBySalesBucket.tsx:24,38-41` declares an `ExtendedBucketRow & { projectCount: number }` and computes avg via `d.hours / pc`, but with `projectCount` always `undefined`, the avg path falls back to `d.hours` — so Total === Avg in the deployed build.
- **Fix surface (LOCKED):** in `portfolioStats.ts`, change `bucketsTotal: Record<string, number>` to `bucketsAccum: Record<string, { hours: number; projects: number }>`. Increment `projects` once per record per bucket *only when that bucket's p50 > 0* (so a bucket with zero hours for a project doesn't dilute the average). Emit `BucketRow = { bucket, hours, projectCount }`. In `HoursBySalesBucket.tsx`, drop the `ExtendedBucketRow` type alias; use `BucketRow.projectCount` directly. `avg = hours / projectCount` when `projectCount > 0`, else `0`.
- **Test contract (LOCKED):** extend `frontend/src/pages/demo/business/portfolioStats.test.ts` with a fixture that has 3 records contributing different non-zero p50s to the same bucket; assert `bucket.hours = sum`, `bucket.projectCount = 3`, and a separate computation `bucket.hours / bucket.projectCount` differs from `bucket.hours`.
- **Test contract (LOCKED):** extend `frontend/src/pages/demo/business/HoursBySalesBucket.test.tsx` — add `projectCount` to the `BUCKET_DATA` fixture, click Avg, assert displayed value differs from total. Existing tests stay green (heading copy, empty-state, button states).
- **Decision: zero-hours buckets.** A bucket whose summed hours is 0 is filtered out by `buildPortfolio` already (see `.filter(([, h]) => h > 0)`); preserve that behavior — `projectCount` for such buckets is 0 by definition and they never reach the chart.

### UX-01 — Quote inputs visible in result panel (LOCKED)

- **Fix surface (LOCKED):** carry the user's `QuoteInput` through to `QuoteResultPanel` and render a "Your inputs" card at the top of the result column (above "Estimated hours" hero). The panel already lives inside both `frontend/src/pages/demo/compare/ComparisonQuote.tsx` and `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` (Synthetic side); both call sites pass the `result` prop.
- **API change (LOCKED):** add `input: QuoteInput` to the `QuoteResultPanel` props. Both call sites already have the input in scope (`transformToQuoteInput(form.getValues())`); they pass it alongside `result`.
- **Render contract (LOCKED):** group fields by the same six sections the QuoteForm uses (Project classification / Physical scale / Controls & automation / Product & process / Complexity & indices / Cost). Skip empty/zero/false fields *only* when their default rendering would be visually noisy (decision: render *all* QuoteForm fields the user submitted, even zeros, because the customer's complaint is information loss; suppressing zero-valued "Pneumatic devices" would re-introduce the same loss). Booleans render as "Yes/No". Materials cost renders as the dollar amount the user typed (use a stored copy of `QuoteFormValues.estimated_materials_cost`, not the `log1p` wire form).
- **Open subdecision (LOCKED — Claude's discretion):** since `QuoteInput` is the post-transform wire format with `log_quoted_materials_cost` and 0/1 booleans, and we want the user's *original* form values in the recap, pass the form values *plus* the wire input. Concretely: extend the call sites to pass `input: QuoteFormValues` (pre-transform) into the panel; the panel formats from form values. This avoids reverse-engineering booleans from 0/1 and reverse-engineering dollars from log1p.
- **Test contract (LOCKED):** Vitest test in `frontend/src/components/quote/QuoteResultPanel.test.tsx` (extend existing) — render with a fixture `QuoteFormValues` that has a recognizable industry, system category, stations count, and materials cost; assert each of those values appears in the rendered DOM by accessible text.
- **Jargon-guard parity (NON-BLOCKING for this phase):** the recap will introduce new copy in `QuoteResultPanel`. The roadmap defers QuoteResultPanel jargon-guard coverage to Phase 4 (DATA-03). For Phase 1, keep new copy plain (no ML jargon, no `_index`/`_score` raw field names — use the same human labels the form uses). DATA-03 will lock this with a test.

### Test execution & regression (LOCKED)

- All new tests run via `cd frontend && npm test`. Plan execution must end with `npm test` green.
- No backend tests change (this repo's `tests/` covers `scripts/build_demo_static.py` only).
- No build / Vercel / LFS work in this phase — those concerns belong to Phase 4 (DATA-01, DATA-02).

### Claude's Discretion

- File names for new helpers (`parseQuotedHours.ts` co-located with QuoteForm or extracted to `frontend/src/lib/`). Decision: co-locate inside `QuoteForm.tsx` first; extract if reused. Keeps the diff small.
- Exact section layout / styling of the "Your inputs" recap card. Should reuse the `card p-5 eyebrow` pattern already in `QuoteResultPanel.tsx`.
- Whether to add a `QuoteFormValues` import to `QuoteResultPanel.tsx` directly, or define a thin `QuoteRecap` value-type at the panel boundary. Decision: import `QuoteFormValues` from `@/pages/single-quote/schema` — it is already canonical and used at both call sites.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before implementing.**

### Codebase intel (from `.planning/codebase/`)
- `.planning/codebase/STRUCTURE.md` — layout, ownership, testing conventions
- `.planning/codebase/CONVENTIONS.md` — naming, file patterns, imports
- `.planning/codebase/TESTING.md` — Vitest patterns, jsdom polyfills
- `.planning/codebase/ARCHITECTURE.md` — static SPA reality, Pyodide path
- `.planning/codebase/CONCERNS.md` — known build/quality risks (jargon-guard scope is in here)

### Customer feedback (drives priority)
- `.planning/feedback/2026-05-01-ben-bertsche-review.md` — verbatim crash trace, U1 input-recap quote, north-star reframe

### Phase requirements
- `.planning/REQUIREMENTS.md` — BUG-01, BUG-02, UX-01 acceptance text
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 items)

### Source files implementers will edit (LOCKED list)
- `frontend/src/pages/single-quote/QuoteForm.tsx` — BUG-01 input parsing
- `frontend/src/pages/demo/business/portfolioStats.ts` — BUG-02 aggregation
- `frontend/src/pages/demo/business/HoursBySalesBucket.tsx` — BUG-02 chart consumption
- `frontend/src/components/quote/QuoteResultPanel.tsx` — UX-01 recap rendering
- `frontend/src/pages/demo/compare/ComparisonQuote.tsx` — UX-01 wiring (Real side)
- `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` — UX-01 wiring (Synthetic side)

### Source files implementers will read but not edit
- `frontend/src/pages/single-quote/schema.ts` — `QuoteFormValues`, `SALES_BUCKETS`, `transformToQuoteInput`
- `frontend/src/demo/quoteResult.ts` — `UnifiedQuoteResult` shape
- `frontend/src/demo/quoteAdapter.ts` — `toUnifiedResult` (no edit; only read for shape understanding)

</canonical_refs>

<specifics>
## Specific Ideas

- The crash trace in the customer email points at `quoteAdapter-DkGTk6kG.js`, but Vite chunk-naming put `QuoteForm` and `quoteAdapter` into the same chunk. The actual crash site is `QuoteForm.tsx`. Source-read confirmed.
- The Compare *workspace* is the Real-Data side at `/compare/quote`; the Synthetic side at `/ml/quote` uses the same `QuoteForm` and the same SALES_BUCKETS panel — so the BUG-01 fix lands once and both sides benefit.
- UX-01 lands once in `QuoteResultPanel.tsx`, but two call sites need updating to pass `input` alongside `result`. Both already have `form.getValues()` in scope.

</specifics>

<deferred>
## Deferred Ideas

- **Quote persistence (PERSIST-01).** Customer's "right" fix for U1 is a backend-backed quote entity with versioning. Deferred to v2 milestone. Phase 1 ships only the same-day-patch input recap (UX-01). PROJECT.md decision documented.
- **Hover affordances (UX-02, UX-03).** Tooltip work belongs to Phase 2; do not pre-build hover infrastructure during this phase.
- **Insights pack rework (INSIGHTS-01, INSIGHTS-02).** Phase 3.
- **Build / quality hardening (DATA-01, DATA-02, DATA-03).** Phase 4. Specifically, the jargon-guard extension to cover `QuoteResultPanel` is DATA-03's job; Phase 1 must add the recap copy *plainly* (no ML jargon, no raw feature names) so DATA-03 has nothing to retroactively scrub.

</deferred>

---

*Phase: 01-customer-blocking-bug-sweep*
*Context gathered: 2026-05-04 via PRD Express Path on Bertsche review + ROADMAP success criteria*
