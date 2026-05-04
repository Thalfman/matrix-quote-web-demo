# Phase 2: Hover affordances — Discussion Log

**Discussed:** 2026-05-04
**Mode:** discuss (default), Auto Mode active

## Summary

User selected freeform direction: *"Whatever is next from Ben's feedback."* Interpreted as: anchor decisions to Ben's exact 2026-05-01 review asks (U4a + U4b), avoid framework debates, lock pragmatic choices and move to planning.

## Areas Presented

| Area | Description |
|---|---|
| Tooltip primitive choice | Native `title=` rejected by acceptance #3. Candidates: Radix, Floating UI, custom. |
| Glossary source & format | TS module vs JSON vs MDX; provenance tracked? |
| Drill-down list cap (UX-02) | Show all / top N / sidebar drawer? |
| Category-tooltip surface coverage | Charts only, or also tables / form / KPIs / breadcrumbs? |

## Areas Selected

User: *"Whatever is next from Ben's feedback."* — All four areas decided in CONTEXT.md by Claude grounded in Ben's email.

## Decisions Locked (see CONTEXT.md for full rationale)

- **D-01/D-02:** Radix UI Tooltip wrapped by `frontend/src/components/Tooltip.tsx`, 200ms delay.
- **D-03/D-04:** Glossary at `frontend/src/lib/glossary.ts`, TS module, initial coverage of 8 terms.
- **D-05/D-06:** Top-5 projects per complexity bucket with `+N more` overflow; extend `bucketByComplexity` to retain `{projectId, projectName, hours}`.
- **D-07/D-08:** Phase 2 covers chart axis/legend labels + recap section headings + matching form field labels. KPIs / table headers / breadcrumbs deferred.

## Claude's Discretion

- Tooltip visual styling within existing design tokens.
- Mobile/touch behavior — Radix default tap-to-open is sufficient.
- Test coverage strategy (data, render, accessibility, jargon-guard extension).

## Deferred Ideas

- Glossary admin/runtime editing.
- Tooltips on KPI eyebrows, breadcrumbs, form Selects, table headers.
- Click-to-pin tooltips.
- Glossary-driven onboarding.
- `bucketByComplexity` memoization (revisit when real data scales).

## Scope Creep Redirected

None — discussion stayed inside the UX-02 + UX-03 boundary from ROADMAP.md.

## Notes on Process

User invoked auto-mode + a freeform "decide for me grounded in Ben" answer in lieu of per-area drilldown questions. Decisions were made by Claude with explicit grounding in Ben's email quotes, the locked acceptance criteria in REQUIREMENTS.md, and the codebase reality from the Phase 1 implementation. CONTEXT.md is editable before `/gsd-plan-phase 2` if any decision needs tweaking.
