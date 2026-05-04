# Phase 2: Hover affordances - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Make charts and category labels interrogable in place — Ben Bertsche's "small wins" from the 2026-05-01 review. Two specific affordances:

1. **UX-02 / U4a — Complexity vs Hours drill-down.** Hovering or focusing a bar in `ComplexityVsHours` reveals which projects make up that complexity level (project name + hours, sorted descending).
2. **UX-03 / U4b — Category-name definitions.** Hovering or focusing a category-name label (System Category, Sales Bucket, Vision Type, and the other category labels in the recap and charts) shows a 1–2 sentence definition.

Both must be **keyboard-triggered and focus-visible**, not pure mouse hover (acceptance criterion #3 in ROADMAP.md). Definitions live in a single project glossary file so they stay consistent. The jargon-guard test extends to cover the new tooltip copy (dovetails with DATA-03 in Phase 4).

**Out of scope for Phase 2** (deferred):
- Tooltips on form Select option labels, KPI eyebrows, table column headers, breadcrumbs. Ben specifically called out chart and category-name surfaces; broadening to "everywhere" risks scope creep.
- Glossary admin UI / runtime editing. Glossary is build-time only.

</domain>

<decisions>
## Implementation Decisions

### Tooltip primitive (UX-03 + UX-02)
- **D-01:** Use **Radix UI Tooltip** (`@radix-ui/react-tooltip`). One small dep (~7kB gzipped), accessible by default (focus-visible, keyboard, ARIA-described, escape-to-close, portal-rendered). Custom-rolled tooltip would re-implement these correctly in ~100 lines and is not worth the maintenance burden on a demo. Wrap it in `frontend/src/components/Tooltip.tsx` so the rest of the app imports our wrapper, not Radix directly — keeps the Radix dependency swap-friendly.
- **D-02:** **Trigger pattern** — `<Tooltip>` wraps a child `<TooltipTrigger asChild>` so callers wrap existing elements (axis label, chart legend, span) without restructuring DOM. Default `delayDuration` 200ms (Radix default is 700ms — too laggy for a demo where Ben is exploring).

### Glossary
- **D-03:** **Glossary location** — single TS module at `frontend/src/lib/glossary.ts`. Shape:
  ```ts
  export type GlossaryEntry = { term: string; definition: string; source?: string };
  export const GLOSSARY: Readonly<Record<string, GlossaryEntry>> = { ... };
  export function lookup(term: string): GlossaryEntry | null;
  ```
  TS module (not JSON) so ESLint catches typos at lookup sites and the IDE auto-completes term keys. Definitions are 1–2 plain-English sentences, business-language sweep-compliant (no ML jargon — covered by the jargon-guard extension).
- **D-04:** **Initial term coverage** — at minimum: `System Category`, `Sales Bucket`, `Vision Type`, `Industry Segment`, `Automation Level`, `Complexity (1–5)`, `PLC Family`, `HMI Family`. Sourced from existing copy in `DemoHome` + `DataProvenanceNote` + the recap section labels in `QuoteResultPanel`. Missing terms — render a subtle "?" with a "Definition coming soon" tooltip rather than crash the build; planner decides whether to ship that fallback or block on full coverage.

### UX-02 drill-down behavior
- **D-05:** **List cap** — top 5 projects by hours per complexity bucket, sorted descending. If the bucket has more than 5 projects, append a `+N more` row (e.g. `+12 more`). Five rows fit comfortably inside the existing Recharts tooltip footprint without scrolling. Users wanting the full list have the BusinessInsights ranked table.
- **D-06:** **Data plumbing** — extend `bucketByComplexity()` in `ComplexityVsHours.tsx` to retain `{ projectId, projectName, hours }` triples per bucket (today it discards everything except `hours`). Mirror Phase 1's BUG-02 pattern of pushing a richer per-bucket payload into the row type rather than recomputing. Sort projects descending by hours inside the bucketing function so the tooltip can take `slice(0, 5)` cheaply.

### Surface coverage (where category tooltips appear)
- **D-07:** **Phase 2 covers**:
  - Recharts `XAxis` labels (e.g., `Complexity (1–5)` axis title) — wrap the label text with our `<Tooltip>` wrapper.
  - Recharts category labels in legends and tick labels for: `ComplexityVsHours`, `HoursBySalesBucket`, `HoursByIndustry`, `SystemCategoryMix`.
  - Section headings inside `QuoteResultPanel`'s "Your inputs" recap (the six headings: "Project classification", "Physical scale", "Controls & automation", "Product & process", "Complexity & indices", "Cost") — these are where Ben sees category names alongside the model output.
  - Field labels in `QuoteForm.tsx` for the eight fields whose names match glossary terms (Industry segment, System category, Automation level, PLC family, HMI family, Vision type, Sales Bucket inputs, Complexity slider).
- **D-08:** **Deferred to v1.x or later phase**: KPI eyebrows on cards, breadcrumb chips, BusinessInsights ranked-table column headers, full Field-component overhaul. These are not in Ben's specific feedback and would balloon the phase.

### Claude's Discretion
- Visual styling of the tooltip (background, padding, max-width, arrow indicator) is Claude's call within the existing `card` / `hairline` design tokens. Match the chart `TOOLTIP_STYLE` (in `chartTheme.ts`) for visual consistency where the two appear adjacent.
- Mobile/touch behavior — Radix's default tap-to-open is acceptable. No need to engineer a custom long-press.
- Test coverage strategy — Vitest tests for: (a) `lookup()` returns expected entries, (b) `<Tooltip>` renders trigger and content, (c) `bucketByComplexity()` retains and sorts project triples, (d) jargon-guard now covers `Tooltip.tsx` + `glossary.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Customer feedback (north star for this phase)
- `.planning/feedback/2026-05-01-ben-bertsche-review.md` §U4a — drill-down on Complexity vs Hours bars; Ben's exact words.
- `.planning/feedback/2026-05-01-ben-bertsche-review.md` §U4b — category-name definitions on hover; Ben's exact words.

### Project framing
- `.planning/REQUIREMENTS.md` §UX-02, §UX-03 — locked acceptance criteria.
- `.planning/ROADMAP.md` §Phase 2 — success criteria (4 items, includes accessibility + jargon-guard extension).
- `.planning/PROJECT.md` — non-technical-audience demo posture, no-jargon constraint.

### Codebase reality
- `.planning/codebase/STRUCTURE.md` §`frontend/src/components/quote/` — `QuoteResultPanel.tsx` recap surface.
- `.planning/codebase/STACK.md` — confirms no tooltip lib in package.json today; Recharts 2 already imported.
- `.planning/codebase/TESTING.md` — Vitest + jsdom; jargon-guard test pattern.

### Files this phase will touch (read-first map)
- `frontend/src/pages/demo/business/ComplexityVsHours.tsx` — extend `bucketByComplexity` + `<CustomTooltip>`.
- `frontend/src/pages/demo/business/HoursBySalesBucket.tsx`, `HoursByIndustry.tsx`, `SystemCategoryMix.tsx` — wrap axis/legend labels.
- `frontend/src/components/quote/QuoteResultPanel.tsx` — wrap section headings.
- `frontend/src/pages/single-quote/QuoteForm.tsx` — wrap matching field labels.
- `frontend/src/lib/glossary.ts` (new), `frontend/src/components/Tooltip.tsx` (new).
- `frontend/src/test/jargon-guard.test.ts` (or wherever DATA-03 will land in Phase 4) — extend coverage to glossary copy.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Recharts `<Tooltip>` + `CustomTooltip`** in `ComplexityVsHours.tsx` — the chart-tooltip pattern is already wired; UX-02 extends it (richer payload + project list).
- **`chartTheme.ts`** (`frontend/src/pages/insights/chartTheme.ts`) — exports `TOOLTIP_STYLE` and `TOOLTIP_CURSOR`. Match these in our new `<Tooltip>` wrapper for visual consistency at chart edges.
- **`QuoteResultPanel`'s `SECTIONS` constant** (Phase 1 deliverable) — already provides the six section titles that need glossary tooltips. Source labels already exist; just wrap with `<Tooltip>`.
- **Phase 1's `BucketRow.projectCount` precedent** (`portfolioStats.ts`) — same pattern of enriching the per-bucket aggregation; UX-02 follows it.

### Established Patterns
- **No tooltip library in `package.json` today.** Native `title=` is the only existing pattern (used in `DemoChip.tsx`, `QuoteResultPanel.tsx` chips). Adding Radix is the first tooltip-primitive choice the project makes.
- **Lucide icons** are already in the dep tree (used everywhere). Re-use `<HelpCircle>` or `<Info>` (or omit icon entirely) for the glossary "?" affordance — don't add a second icon library.
- **Vitest + `renderWithProviders`** is the standard test pattern. Glossary lookups are pure data; tooltip render tests use `renderWithProviders` + `userEvent.tab()` for keyboard focus.
- **Jargon guard** (`frontend/src/test/jargon-guard.test.ts` if present) currently covers `DemoHome` and `DataProvenanceNote`. DATA-03 in Phase 4 extends it to `QuoteResultPanel.tsx` and Insights pages — this phase coordinates by adding `Tooltip.tsx` and `glossary.ts` to the next-extension list.

### Integration Points
- `ComplexityVsHours.tsx` — `bucketByComplexity()` payload extended; `<CustomTooltip>` reads `row.topProjects` + `row.overflow` and renders the new list.
- `BusinessInsightsView.tsx` (and the other business charts) — wrap chart section titles + axis label text spans with `<Tooltip term="...">`.
- `QuoteResultPanel.tsx` — change the literal section headings (`<div className="text-[11px] eyebrow text-muted mb-1.5">`) to `<Tooltip term={section.title}>`-wrapped spans where the term has a glossary entry; non-glossary section titles stay plain text.
- `QuoteForm.tsx` — wrap `<Field label="...">` label text via a small label-prop variant or a new `Field` `glossaryTerm?` prop; prefer the prop addition so `Field` callers opt in explicitly rather than every label auto-tooltipping.

</code_context>

<specifics>
## Specific Ideas

- Ben's framing of these as "small wins" — don't ship a tooltip-engineering project. Radix in, glossary populated for the in-scope surfaces, drill-down extended on the existing Recharts tooltip, done.
- Ben's exact words on UX-02: *"If I want to hover over a column to see which projects make up each level, is that an easy feature to add?"* — keep the answer obviously yes-shaped (top 5 + overflow). Don't over-engineer pagination or a sidebar.
- Ben's exact words on UX-03: *"It's a nice to have, but would there be a way to include definitions for each category when you hover over the name?"* — definitions are short, plain-English, no ML jargon. Provenance/attribution on the source field is internal-only; the user-visible tooltip is just the definition.

</specifics>

<deferred>
## Deferred Ideas

- **Glossary admin / runtime editing** — out of scope for the static SPA architecture. If a future phase adds a backend, revisit.
- **Tooltips on table column headers, KPI eyebrows, breadcrumbs, form Select options** — broaden in a v1.x cleanup phase if Ben's next review still finds them confusing. Not specifically asked for.
- **Click-to-pin tooltips** — power-user affordance, defer.
- **Glossary-driven inline help in onboarding** — out of scope; v3 territory.
- **`bucketByComplexity` performance optimization** — current synthetic dataset is small; if real data ingest pushes counts to 5000+ projects per bucket, revisit memoization. Not now.

</deferred>

---

*Phase: 2-Hover affordances*
*Context gathered: 2026-05-04*
