# Phase 3: Insights pack rework - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the downloadable Business Insights bundle self-explanatory to a non-technical reviewer (Ben Bertsche, 2026-05-01 review). Today the zip ships `projects.csv` + `portfolio.json` + `summary.md`; Ben specifically said:

> "How do I open a JSON file? I haven't heard of this before."
> "The .csv is just a few columns. Not sure what I'm looking at here."
> (and explicitly praised the notepad-style summary.md.)

This phase delivers two requirements:

1. **INSIGHTS-01 — drop JSON from the default download.** Default bundle a non-technical reviewer pulls down contains zero `.json` files. JSON-for-engineers is preserved behind a separate, clearly-labeled affordance.
2. **INSIGHTS-02 — every column is explained.** Every column in every tabular file has a plain-English header, and the bundle ships with a README that documents every sheet/column. Notepad narrative (`summary.md`) is preserved verbatim.

Phase 3 only touches `frontend/src/pages/demo/business/` (the Business Insights surface) and the `BusinessInsightsView` download UI. No model/build/Pyodide changes; no other workspaces.

**Out of scope for Phase 3** (deferred):
- Localizing the bundle to non-English audiences. Ben is English-speaking; copy stays en-US.
- A bundle preview UI ("see what you'll get before downloading"). The two-button affordance is the whole UX.
- Replacing the per-table CSV download buttons elsewhere in the page (those are scoped, technical, and Ben didn't flag them).
- Switching the on-screen tables to XLSX rendering. We're rewriting the *download*, not the in-page tables.

</domain>

<decisions>
## Implementation Decisions

### Bundle composition (INSIGHTS-01, INSIGHTS-02)

- **D-01: Default bundle = 3 files, zero `.json`.**
  Default `business-insights-{slug}-{date}.zip` contains:
  1. `summary.md` — unchanged (Ben praised this; do not touch the markdown structure)
  2. `business-insights.xlsx` — multi-sheet replacement of CSV + JSON + on-bundle dictionary
  3. `README.md` — short top-level guide ("Open `business-insights.xlsx` in Excel/Numbers/Sheets. Each tab has its own column dictionary in the README tab.")
  Drop `projects.csv` from the default zip — XLSX `Raw` sheet supersedes it. Drop `portfolio.json` from the default zip — see D-09 for engineers' path.

- **D-02: Use SheetJS (`xlsx`) as the XLSX writer.**
  `xlsx` (community edition, MIT license, ~100kB minified, browser-friendly, accepts JSON-array → sheet, generates multi-sheet workbooks via `XLSX.utils.book_append_sheet`). Add as a frontend dep. Alternative `exceljs` is heavier and offers features (rich formatting, formulas) we don't need for a column-headered pack.
  Wrap the SheetJS calls inside `frontend/src/pages/demo/business/exportPack.ts` (existing module) so the import surface stays one file. No `xlsx` import bleeding into other modules.

### XLSX schema

- **D-03: Sheet layout exactly matches the ROADMAP shape — `Summary` / `Drivers` / `Raw` / `README`.**
  - **`Summary`** — KPI block (Project count, Total hours, Avg hours, Median hours, Avg materials cost) + Accuracy headline (Projects with quote+actual, Portfolio overrun %, Median overrun %, Total quoted, Total actual). One row per metric: `Metric | Value | Notes`. Mirrors the headline of `summary.md` so the XLSX is self-contained for someone who only opens the workbook.
  - **`Drivers`** — Risk-factor correlations (Factor name, Pearson r, n, Reading) + Hours by industry block (Industry, Projects, Avg hours, Total hours), separated by a blank row and a section header cell. Combines two of `summary.md`'s body sections in one tab.
  - **`Raw`** — every project, one row each. Columns: `Project ID`, `Project name`, `Industry`, `System category`, `Stations`, `Total hours`, `Sales bucket`, `Complexity`, `Peer median (h)`, `Peer p10 (h)`, `Peer p90 (h)`, `Outlier flag`. Plain-English headers throughout. Adds `Outlier flag` (HIGH/LOW/—) so a reviewer can sort and see outliers without doing math. Drops nothing the current CSV exposes; promotes peer benchmarks to first-class columns.
  - **`README`** — three blocks:
    1. *How to read this workbook* (3-sentence intro: "This workbook has four tabs…")
    2. *Sheet guide* (one row per non-README sheet: `Sheet | What it shows | When to use it`)
    3. *Column dictionary* (one row per column on `Summary`/`Drivers`/`Raw`: `Sheet | Column | Plain-English meaning`)

- **D-04: Plain-English headers, sentence case, no underscores.**
  `project_id` → `Project ID`. `project_name` → `Project name`. `system_category` → `System category`. `total_hours` → `Total hours`. `primary_bucket` → `Sales bucket`. `peerMedian` → `Peer median (h)`. `peerP10` → `Peer p10 (h)`. `peerP90` → `Peer p90 (h)`. `outlierDirection` → `Outlier flag` (rendered `HIGH` / `LOW` / `—`).
  These header strings are the canonical labels — use the same strings in the XLSX `Raw` sheet, the bundled `README.md`, and the README sheet's column dictionary, so cross-references stay 1:1.

### `summary.md` preservation

- **D-05: Do not touch `buildSummaryMarkdown()`.**
  Ben explicitly praised the notepad. Acceptance criterion #3 in ROADMAP requires it preserved unchanged. The XLSX `Summary` sheet pulls from the same `PortfolioStats` numbers but the markdown rendering stays byte-for-byte identical (assert via existing `exportPack.test.ts` snapshot expectation if present, or add one).

### `README.md` (top-level, in zip)

- **D-06: Top-level `README.md` is short (~15 lines) and points at the workbook.**
  ```markdown
  # Business Insights Pack — {datasetLabel}

  Generated: {ISO date}

  ## What's inside
  - `summary.md` — One-page narrative summary of this dataset.
  - `business-insights.xlsx` — Spreadsheet with four tabs: Summary, Drivers, Raw, README.
  - `README.md` — This file.

  ## Where to start
  - Open `summary.md` in any text editor or your browser. (Try VS Code, Notepad, or just double-click.)
  - Open `business-insights.xlsx` in Excel, Apple Numbers, or Google Sheets.
    Start with the **README** tab — it explains what every column means.

  ## Need the raw data?
  A separate "Download raw JSON (for engineers)" button in the app
  produces a `portfolio.json` file with the full structured dataset.
  ```
  Hand-written; templated only at `{datasetLabel}` and `{ISO date}` substitution. No need to dynamically generate from data — the structure is fixed.

### Engineer-side JSON path (INSIGHTS-01)

- **D-07: Keep `portfolio.json` available via a *second*, distinctly-styled affordance.**
  Add a small secondary button (or text-link) underneath the primary "Download insights pack" button labeled exactly **"Download raw JSON (for engineers)"**. Triggers a download of `portfolio.json` only (not zipped — single file). The `for engineers` parenthetical is the disclaimer that signals to non-technical users this isn't for them, satisfying ROADMAP success criterion 1's "moved to a separate 'for engineers' download path" alternative.
  The secondary button:
  - Is `text-xs` / `text-muted` / underline-on-hover styling to visually de-emphasize vs the primary button.
  - Shares the same disabled state semantics (no race with the primary build).
  - Filename: `portfolio-{slug}-{date}.json`.

### Existing exportPack call sites

- **D-08: `buildInsightsPack()` signature changes.**
  Current: returns `Promise<Blob>` of a 3-entry zip (csv/json/md).
  New: returns `Promise<Blob>` of a 3-entry zip (`summary.md`, `business-insights.xlsx`, `README.md`).
  - `buildInsightsPackZip()` (the JSZip-returning helper) follows the same shape change.
  - Keep `buildSummaryMarkdown()` exported (no change to it).
  - Add `buildPortfolioJson(portfolio: PortfolioStats): string` — pure stringify with the same `JSON.stringify(portfolio, null, 2)` semantics. Used by the engineer-side button. Public so tests assert byte equivalence with the prior bundle's `portfolio.json`.
  - Add `buildPortfolioWorkbook(portfolio, datasetLabel, generatedAt): ArrayBuffer` — pure SheetJS workbook builder. Used by `buildInsightsPackZip()`; tested directly so the zip integration test stays small.
  - Add `buildBundleReadme(datasetLabel, generatedAt): string` — pure markdown formatter for the top-level README.
  - Add `jsonFilename(datasetLabel, generatedAt): string` — slug-aware filename for the engineer-side JSON download. Mirrors `packFilename`'s slug rule (lowercase, non-alphanum → `-`, trim leading/trailing `-`, `"pack"` fallback for empty input). Used by `BusinessInsightsView` for the secondary "Download raw JSON (for engineers)" button. Public so `BusinessInsightsView.test.tsx` can assert the filename pattern. *(Added 2026-05-04 during plan-checker triage to keep plan 03-04 file-disjoint from plan 03-03 in Wave 2.)*

### Tests (acceptance instrumentation)

- **D-09: Test plan inputs (planner derives concrete file additions):**
  - `exportPack.test.ts` extends to cover: zip contains exactly `summary.md`, `business-insights.xlsx`, `README.md` and **does not** contain `*.json` or `*.csv`.
  - `buildPortfolioWorkbook` unit tests: workbook has exactly four sheets named `Summary`, `Drivers`, `Raw`, `README`; `Raw` row count == `portfolio.ranked.length`; `Raw` header row matches the canonical labels in D-04; `README` sheet has rows for every column listed.
  - `buildBundleReadme` snapshot — small enough to inline.
  - `buildPortfolioJson` byte-identical to the previous behavior (regression guard for engineers' workflow).
  - `BusinessInsightsView` renders both buttons; engineer-side button triggers a `.json` download (assert filename + blob mime/type via the `downloadBlob` mock).
  - Jargon-guard extension (coordinates with DATA-03 in Phase 4): the new copy in `BusinessInsightsView` (button labels, helper text), `README.md` template, and `buildPortfolioWorkbook` cell strings must pass the existing banned-term list. Extend `frontend/src/test/jargon-guard.test.ts` to scan `exportPack.ts` and `BusinessInsightsView.tsx` if not already covered. Phase 2 already extended jargon-guard to the `Tooltip.tsx` and `glossary.ts` surfaces; this phase adds insights-export surfaces to that growing list.

### Claude's Discretion

- Workbook column widths, freeze-pane on header row, and minor cell-format niceties (e.g. percent format on overrun cells) — Claude's call inside SheetJS defaults. Don't over-design; keep it readable.
- Whether to bold the README/section header rows in `Summary`/`Drivers`. Default: bold via the SheetJS `s` cell style. Skip if SheetJS community edition makes styling painful.
- Internal UI copy ("Building…" vs "Preparing pack…"). Don't change — current wording is fine.
- Whether to gate the new XLSX behind a feature flag during the phase. Default: no flag — XLSX-only, the test suite is the safety net.
- Bundle filename: keep `business-insights-{slug}-{date}.zip` exactly as today (`packFilename`), no UI surprise.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Customer feedback (north star for this phase)
- `.planning/feedback/2026-05-01-ben-bertsche-review.md` §U3 — Ben's exact words on JSON ("How do I open a JSON file?") and CSV ("Not sure what I'm looking at"). Notepad praise also lives here.

### Project framing
- `.planning/REQUIREMENTS.md` §INSIGHTS-01, §INSIGHTS-02 — locked acceptance criteria. INSIGHTS-02 explicitly: "Notepad data is praised — keep it."
- `.planning/ROADMAP.md` §Phase 3 — four success criteria including the four-sheet shape suggestion (`Summary / Drivers / Raw / README`) and the "for engineers" alternative phrasing.
- `.planning/PROJECT.md` — non-technical-audience demo posture, no-jargon constraint.

### Codebase reality
- `.planning/codebase/STRUCTURE.md` §`frontend/src/pages/demo/business/` — Business Insights surface owners.
- `.planning/codebase/STACK.md` — confirms `jszip` already in deps; `xlsx` not yet present (added by this phase).
- `.planning/codebase/TESTING.md` — Vitest + jsdom; jargon-guard scope.

### Files this phase will touch (read-first map)
- `frontend/src/pages/demo/business/exportPack.ts` — bundle composition rewrite + new helpers (`buildPortfolioWorkbook`, `buildPortfolioJson`, `buildBundleReadme`).
- `frontend/src/pages/demo/business/exportPack.test.ts` — extended assertions per D-09.
- `frontend/src/pages/demo/business/csv.ts` — drop from the bundle path; the on-screen "Download CSV" button (if any) keeps using it. Audit during planning.
- `frontend/src/pages/demo/business/BusinessInsightsView.tsx` — add the secondary "Download raw JSON (for engineers)" button next to the primary one; extend `handleDownloadPack` only if needed.
- `frontend/src/pages/demo/business/BusinessInsightsView.test.tsx` — assert both buttons render and trigger the right downloads.
- `frontend/package.json` — add `xlsx` dep, lock to a tested version.
- `frontend/src/test/jargon-guard.test.ts` — extend file glob to scan `exportPack.ts` + the new copy strings, dovetailing with DATA-03 in Phase 4.

### Reference for narrative (do not modify)
- `frontend/src/pages/demo/business/exportPack.ts:27-120` — `buildSummaryMarkdown()`. Treat as locked; assert preservation in the test plan.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`buildSummaryMarkdown()`** (`exportPack.ts:27`) — already produces the praised notepad. Reuse verbatim.
- **`packFilename()`** (`exportPack.ts:154`) — slug + date filename builder. Reuse for the engineer-side JSON filename (`portfolio-{slug}-{date}.json`) by sharing the slugifier.
- **`downloadBlob()`** (`exportPack.ts:163`) — generic blob → download trigger. Reuse for the JSON button.
- **`PortfolioStats` shape** (`portfolioStats.ts:11`) — already typed. SheetJS sheets project from the same source, so the workbook stays in sync with on-screen aggregates.
- **`JSZip`** is already in deps (`package.json:24`). XLSX-in-zip composition reuses it.

### Established Patterns
- **`exportPack.test.ts` is the integration-test home** for bundle composition. Extending it is the expected pattern.
- **Vitest + `renderWithProviders`** for `BusinessInsightsView.test.tsx`; mock `downloadBlob` to assert filename + blob.
- **Jargon guard** (Phase 2 extended this to `Tooltip.tsx` + `glossary.ts`). Phase 3 adds `exportPack.ts` + `BusinessInsightsView.tsx` (download button copy + README template) + the README sheet text. Coordinate with DATA-03 in Phase 4 — extending the guard's surface list is the same kind of change.
- **No XLSX library in `package.json` today.** Adding `xlsx` is the first XLSX-write dependency the project takes — same posture as Phase 2 adding `@radix-ui/react-tooltip`.

### Integration Points
- `BusinessInsightsView.tsx:230-239` — `handleDownloadPack` currently calls `buildInsightsPack` once; behavior unchanged, payload changes.
- `BusinessInsightsView.tsx:332-353` — primary button DOM. Secondary button slots immediately below, sharing the same `<div className="ml-auto pb-2">` container.
- The ZIP entry order in `buildInsightsPackZip()` (`exportPack.ts:131-135`) — order matters for deterministic test snapshots; pick `summary.md` first, `business-insights.xlsx` second, `README.md` third.

</code_context>

<specifics>
## Specific Ideas

- Ben's framing on the bundle: *"How do I open a JSON file?"* — answer should be "you don't have to". Default bundle has zero JSON. The engineers' button is the explicit escape hatch.
- Ben's framing on CSV: *"the .csv is just a few columns. Not sure what I'm looking at here."* — XLSX `Raw` sheet uses sentence-case plain-English headers AND the README sheet/file documents each one. Two layers of explanation, redundancy on purpose.
- Ben's framing on summary: *"Notepad data is praised — keep it."* — `summary.md` byte-identical, period. No "improvements" to it in this phase.
- Manual UAT (success criterion #4 in ROADMAP) — Tom or another non-technical proxy opens every file in the bundle and answers "what does this column mean?" without external help. The `README` sheet inside the XLSX is the load-bearing artifact for that test.

</specifics>

<deferred>
## Deferred Ideas

- **Bundle versioning / changelog** — out of scope for v1. If the schema evolves over time, revisit.
- **Multi-language bundles (en + es + …)** — Ben is English-only; deferred indefinitely.
- **PDF render of `summary.md`** — markdown is a markdown reader's job. Adding a PDF builder is bundle-bloat. Deferred.
- **Inline-comments on the XLSX cells** (e.g. native Excel cell comments explaining `Pearson r`) — SheetJS community edition supports this but it's gold-plating; the README sheet is the documented path.
- **On-screen "preview the pack" UI** — out of scope. The two-button affordance is the whole UX.
- **Replacing the per-table CSV download buttons** scattered across BusinessInsights subviews — those are technical-user affordances and Ben didn't flag them.
- **JSON-as-a-prettier-shape** (e.g. flattened, removing nulls) — engineers' button preserves the existing `JSON.stringify(portfolio, null, 2)` exactly so tooling that consumed it before still works.

</deferred>

---

*Phase: 3-Insights pack rework*
*Context gathered: 2026-05-04 — auto-decided by Claude grounded in `.planning/feedback/2026-05-01-ben-bertsche-review.md` and ROADMAP.md Phase 3 success criteria. No discuss-phase pass; user invoked `/gsd-plan-phase 3` directly per memory observation S40.*
