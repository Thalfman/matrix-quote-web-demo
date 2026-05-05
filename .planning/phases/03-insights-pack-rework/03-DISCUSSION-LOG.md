# Phase 3 Discussion Log

**Date:** 2026-05-04
**Mode:** auto-decided (no `/gsd-discuss-phase` pass)
**Decider:** Claude, grounded in stakeholder feedback + ROADMAP success criteria.

The user invoked `/gsd-plan-phase 3` directly, choosing the "skip discussion, plan from feedback as PRD" path that was offered in the prior session's NEXT-SESSION-KICKOFF (memory observation S40). Decisions below were settled inline rather than gathered from the user, because the source-of-truth artifacts already provide enough signal:

- `.planning/feedback/2026-05-01-ben-bertsche-review.md` §U3 has Ben's literal feedback on the JSON, CSV, and notepad.
- `.planning/ROADMAP.md` §Phase 3 spells out the four success criteria and even names the four-sheet shape (`Summary / Drivers / Raw / README`).
- `.planning/REQUIREMENTS.md` §INSIGHTS-01/02 locks the acceptance criteria.

Where ROADMAP gave a binary fork ("either drop JSON or move to a 'for engineers' download path"), Claude picked the keep-JSON-but-relabel path because it's strictly less destructive — engineers who consumed `portfolio.json` keep working without breaking changes, and Ben's UX requirement is satisfied by relocating it out of the default bundle.

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Default bundle = `summary.md` + `business-insights.xlsx` + `README.md`. Drop CSV + JSON from default. | Hits INSIGHTS-01 (zero JSON) and INSIGHTS-02 (XLSX columns + bundled README). XLSX `Raw` sheet supersedes CSV. |
| D-02 | XLSX writer: `xlsx` (SheetJS, MIT). Wrap inside `exportPack.ts`. | Most established browser-friendly XLSX writer; accepts JSON-array → sheet; multi-sheet via `book_append_sheet`. |
| D-03 | Sheet layout: `Summary` / `Drivers` / `Raw` / `README` — matches ROADMAP suggestion verbatim. | ROADMAP already named this shape; we honor it. |
| D-04 | Plain-English sentence-case headers everywhere. `project_id` → `Project ID`, etc. | INSIGHTS-02 acceptance: "columns either renamed to plain English OR a one-page README". We do both for redundancy. |
| D-05 | `buildSummaryMarkdown()` and `summary.md` are byte-identical to today. | INSIGHTS-02 + ROADMAP success #3: "Notepad-style narrative content (which Ben praised) is preserved unchanged." |
| D-06 | Top-level `README.md` (~15 lines) inside the zip. Hand-written template, two substitutions. | Single source of truth for "where do I start". Don't dynamically generate — structure is fixed. |
| D-07 | Engineer-side JSON path: secondary button "Download raw JSON (for engineers)" next to primary. | Satisfies "moved to a separate 'for engineers' download path" alternative in ROADMAP success #1. Strictly additive; no behavior break for engineers who already use JSON. |
| D-08 | `buildInsightsPack()` payload changes; helper functions split (workbook builder, json builder, readme builder). | Pure functions are easier to test in isolation than a single megafunction; mirrors the existing `buildSummaryMarkdown()` shape. |
| D-09 | Test strategy: `exportPack.test.ts` extends; new unit tests per pure helper; `BusinessInsightsView.test.tsx` covers both buttons; jargon-guard extends to `exportPack.ts` + `BusinessInsightsView.tsx`. | Acceptance criteria cover content shape, file shape, and jargon — three distinct test layers. |

## Open questions resolved by ROADMAP / requirements (no user input needed)

- **"Drop JSON or move it?"** — ROADMAP allowed either; chose move-it (D-07) for backward compatibility.
- **"What XLSX schema?"** — ROADMAP named `Summary / Drivers / Raw / README`. Locked (D-03).
- **"Are the 7 current CSV columns enough, or expand?"** — Expand to 12 (D-04 + D-09). Adding peer-benchmark columns + outlier flag is strictly more value with no cost; the existing 7 stay, plain-English-renamed.

## Things explicitly NOT touched in Phase 3

- `buildSummaryMarkdown` body. Locked.
- The on-screen Business Insights tables and charts. (Visual UI is not the deliverable; the *download* is.)
- The other workspaces (Single Quote, Batch Quotes, Compare). Out of scope.
- Backend / Pyodide / model bundles. Static-SPA architecture is not in scope here.

## Pre-plan gate

Context written. No outstanding questions for the user. Ready to spawn `gsd-planner` with the CONTEXT.md above as the locked source of truth.
