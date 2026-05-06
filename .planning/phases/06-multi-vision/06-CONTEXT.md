# Phase 6: Multi-vision per project - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

A Sales Engineer can describe a project that has more than one vision system on it (the realistic case Ben Bertsche flagged 2026-05-01: *"On some projects we use multiple vision types ... How could it work to list visions; cameras can all vary in hours required?"*) and get a single coherent ML estimate whose drivers, range, and confidence reflect the full vision set rather than only the first row.

The current single-vision shape (`vision_type: "None"|"2D"|"3D"` + `vision_systems_count: int`, two flat fields on the QuoteForm — `frontend/src/pages/single-quote/QuoteForm.tsx:181/197` and `schema.ts:36/41`) is replaced by a multi-row picker. The persisted Phase 5 quote shape evolves (schemaVersion 1 → 2). `QuoteResultPanel` adds a per-vision drivers breakdown so the SE — and the customer reading the quote — can see how each vision system contributes to the estimate.

**In scope:** multi-row vision picker on the SingleQuote form; ML aggregation across vision rows; per-vision drivers breakdown on `QuoteResultPanel`; Phase 5 quote round-trip (a saved multi-vision quote reopens with all rows intact and re-runs to the same aggregated estimate); v1 → v2 schema migration on read.

**Not in scope (belong elsewhere):** ROM-mode quote shape (Phase 7); multi-vision in the Compare tool's input form (Ben never raised it; Compare-tool save still works but stores a single-row v2 shape); model retraining for multi-vision-aware features (would force a `core/` change which is read-only — defer to v3 if Ben validates the per-vision delta approach in v2.0); per-row hours INPUT (Ben's "hours required" is a model OUTPUT per row, not a manual override); drag-to-reorder of vision rows (defer until Ben asks); multi-vision presets / templates.

</domain>

<decisions>
## Implementation Decisions

> **Decision-making mode:** User delegated all four gray areas with the directive *"Pick the closest solution to Ben's comment"* (2026-05-05 discuss step). Every decision below is grounded in Ben's verbatim 2026-05-01 review §U2 (`.planning/feedback/2026-05-01-ben-bertsche-review.md:123-133`) and the carry-forward locks from Phase 5 (`.planning/phases/05-quote-persistence/05-CONTEXT.md` D-01..D-19).

### Vision row shape & picker UX

- **D-01:** **A vision row is `{ type: "2D" | "3D", count: int >= 1, label?: string }`.** Type domain drops `"None"` — "no vision" is now expressed as an empty rows array, not a row with type `"None"`. `count` defaults to `1` per row. `label` is optional free-text for "I have two different 2D systems with different roles" (Ben's "list visions" intent without forcing a heavy schema). Stored as `visionRows: VisionRow[]` on the persisted quote and on the form state.
- **D-02:** **Picker layout: inline rows inside the existing "Vision" subsection of `QuoteForm.tsx`.** Each row renders a type Select + count Input + optional label Input + a Remove button. An "Add vision system" button sits below the rows. First row added defaults to `{ type: "2D", count: 1 }`. Empty state (zero rows) shows "No vision systems on this project" + the Add button — equivalent to today's `vision_type: "None", count: 0`.
- **D-03:** **Add / Remove only for v2.0. No reorder.** Drag-and-drop or up/down buttons add UX surface area Ben did not request. Defer until Ben asks. Add and Remove demonstrably work (success criterion 1 — "at least add/remove of a second and third row demonstrably working").
- **D-04:** **`vision_type` and `vision_systems_count` are removed from `quoteFormSchema` and `quoteFormDefaults`.** They are replaced by `visionRows: z.array(VisionRowSchema)`. `transformToQuoteInput` no longer copies these flat fields — instead it derives whatever the model needs from `visionRows` (see D-06). Downstream consumers in `frontend/src/demo/realProjects.ts::recordToPrediction` and `nearestNeighbor.ts` (similar-projects matching) read `visionRows[0]?.type` / `sum(row.count for row in visionRows)` for legacy-compat numeric features.

### Aggregation strategy & location

- **D-05:** **Delta-from-baseline aggregation, TS-side only.** Closest to Ben's *"cameras can all vary in hours required"* without retraining or patching the input collapse:
  1. **Baseline predict:** run `predictQuote` once with all current inputs but `vision_type: "None"`, `vision_systems_count: 0`. Captures the project's hours absent any vision system.
  2. **Per-row predict:** for each `row` in `visionRows`, run `predictQuote` with all current inputs and `vision_type: row.type`, `vision_systems_count: row.count`. All non-vision inputs identical across the call.
  3. **Per-row delta:** `delta_row = perRowResult - baselineResult` (per-target hours, per sales bucket, and feature-importance shifts).
  4. **Aggregated total:** `total = baseline + sum(delta_row for row in visionRows)`. Per-target and per-bucket sums are linear so the existing `UnifiedQuoteResult` shape rebuilds cleanly.
- **D-06:** **No `core/` change. No `scripts/build_demo_static.py::_PREDICT_SHIM` change.** Aggregation lives entirely in TypeScript at `frontend/src/demo/multiVisionAggregator.ts` (new file) — exports `aggregateMultiVisionEstimate(formInput, dataset): Promise<MultiVisionResult>` that orchestrates the N+1 calls and returns a `UnifiedQuoteResult` plus an attached `perVisionContributions: PerVisionContribution[]`. ARCHITECTURE.md §"Editing core/ for a frontend feature" anti-pattern holds: a true model change belongs in the parent app and a re-vendor, not here.
- **D-07:** **Range/confidence aggregation rule:** headline `p50 = baseline.p50 + sum(delta.p50)`. Half-widths combine via root-sum-square preserving asymmetry: `upperHalfWidth = sqrt(baselineUpper² + sum(deltaUpper²))`, `lowerHalfWidth = sqrt(baselineLower² + sum(deltaLower²))`. Confidence (high / moderate / lower) per target = the **minimum** confidence observed across baseline + per-row predicts (worst-case, honest signal — same posture as v1.0 jargon-guard's "lower confidence is a feature, not a bug to hide").
- **D-08:** **Per-vision driver extraction:** for each row, the top-2 features whose contribution magnitude shifted most between baseline and per-row predict become that row's drivers. Reuses `getFeatureImportances(dataset)` cached output × the per-target prediction-share weighting already in `quoteAdapter.ts::toUnifiedResult`. The aggregated quote's global top-3 drivers (the existing UnifiedQuoteResult shape) reflect the *aggregated* prediction, not any single row.

### Per-vision drivers UI (Ben verbatim 2026-05-01: *"Result panel (per-vision drivers in the breakdown)"*)

- **D-09:** **`QuoteResultPanel` adds a new "Per-vision contribution" section** between the existing top-3 drivers area and the per-category H/M/L breakdown. One stacked card per vision row, in row order. Each card renders:
  - Row label (auto-generated from row data, e.g., `"Vision 1: 2D × 2"` or `"Vision 1 — pick-and-place: 2D × 2"` if `label` is set);
  - Hours delta from baseline (`+38h` or `+18% of total`);
  - Top-2 drivers for that row's delta (using D-08).
  - Section is hidden entirely when `visionRows` is empty (no vision systems on this project).
- **D-10:** **Existing global top-3 drivers stay, sourced from the aggregated prediction.** The new section is additive — does not replace or compete with the existing drivers area. Order on the result panel: Hero estimate → Top-3 drivers (aggregated) → Per-vision contribution (new) → Per-category H/M/L breakdown → Supporting matches.
- **D-11:** **`QuoteResultPanel.tsx:235/240` — the inputs echo block** ("Vision type / Vision systems count" rows in the inputs summary) is replaced by a single "Vision systems" row that lists each row's label. e.g., `"2D × 2; 3D × 1"`. Empty rows render as `"—"` (matching today's empty pattern).

### Phase 5 quote migration (D-18 from Phase 5 — schemaVersion bump)

- **D-12:** **Bump `schemaVersion: 1 → 2`.** v2 quote shape replaces top-level `vision_type` and `vision_systems_count` with `visionRows: VisionRow[]`. All other persisted fields (status, name, dates, version history, restoredFromVersion, workspace) are unchanged.
- **D-13:** **v1 → v2 auto-migrate on read.** Migration runs in IndexedDB `onupgradeneeded` (when the DB schema bumps to v2) AND defensively on each list / detail read (in case a v1 record slips through, e.g., from a tab open before the migration ran). Migration rule:
  - `vision_type === "None" && vision_systems_count === 0` → `visionRows: []`
  - `vision_type === "None" && count > 0` (degenerate v1 state) → `visionRows: []` (treat as no vision)
  - `vision_type ∈ {"2D", "3D"} && count >= 0` → `visionRows: [{ type: vision_type, count: Math.max(1, count) }]` (single-row array)
  - The legacy `vision_type` and `vision_systems_count` keys are **deleted** from the migrated record (clean cutover).
- **D-14:** **New saves always write v2.** Phase 5's `saveSavedQuote` and version-history writes are updated to require `schemaVersion === 2` and to validate via the v2 zod schema before writing. The existing `listSavedQuotes` resilience for future-schema records (Phase 5 WR-02) is reused — a future schemaVersion 3 quote does not crash the v2 list view.
- **D-15:** **Round-trip test:** Vitest covers both directions — (a) save a multi-vision quote → reopen → re-run estimate produces the same aggregated p50 (success criterion 4); (b) write a hand-crafted v1 record into a fake IndexedDB → open in the My Quotes list → confirm migration to v2 single-row shape and successful re-estimate.

### Compare tool scope

- **D-16:** **Multi-vision is SingleQuote-only for v2.0.** The Compare tool's input form does not get the multi-row picker. Compare-tool save (Phase 5 D-13) still writes a v2-shape saved quote, with `visionRows` being a single-row array (or empty) derived from the existing Compare inputs. If a multi-vision quote saved from SingleQuote is later opened from the My Quotes list with `workspace: "real"`, it routes to `/compare/quote?fromQuote={id}` which renders the SingleQuote form's multi-row picker and the aggregated `UnifiedQuoteResult` — the existing `recordToPrediction` flow on the Compare tool's BROWSE side is unchanged.

### Customer-trust hygiene (D-19 from Phase 5)

- **D-17:** **Jargon-guard scans every new customer-facing string** introduced by this phase: vision-row picker labels ("Add vision system", "Remove", "Vision type", row-label format), the per-vision contribution section heading, the empty-state copy in the picker, the `QuoteResultPanel` "Vision systems" inputs-echo line, hours-delta phrasing in the per-vision cards, any error toasts on aggregation failure. The guard already covers `QuoteResultPanel` + Insights pages + Phase 5 surfaces; extending to these new strings is a tracked task. Plain language only — no "uncertainty band", no "ML aggregation", no "delta from baseline" in user-facing copy. The honest-signal posture from v1.0 holds: per-vision contribution wording surfaces what each system adds in plain hours, not in modeling jargon.

### Specialist routing (carry from Phase 5 — unchanged)

- **D-18:** **`frontend-specialist` + `ui-ux-specialist` + `test-writer` only.** No `auth-admin-specialist`, `backend-specialist`, `storage-specialist`. The static-SPA / browser-only / IndexedDB posture from Phase 5 D-01 holds. `core/` and `service/` remain read-only. No retraining.

### Claude's Discretion

These are decided but the exact letter is at the executor's discretion as long as the spirit holds:

- Field component naming (`VisionRowsField` vs `VisionPicker` vs `MultiVisionPicker` — pick what reads natural in the QuoteForm tree).
- "Add vision system" button visual treatment (icon, position, copy "+ Add vision system" vs "Add another vision system" — jargon-guard-clean variants only).
- Per-vision contribution card visual shape (border, fill, spacing) — match the existing `QuoteResultPanel` card language; no new visual primitives unless `ui-ux-specialist` recommends one.
- Whether the per-vision contribution section gets its own section heading + subtitle, or just inherits the breakdown subtree's styling.
- The `delta_row` data structure internals in `multiVisionAggregator.ts` — the public output is a `UnifiedQuoteResult` plus `perVisionContributions: PerVisionContribution[]`; the internal representation is up to the implementer.
- N+1 predict UX: the existing PyodideLoader / skeleton handles boot; for the per-call wait (a few tens of ms each on warm Pyodide), no new loading state is required. If the executor measures it as user-noticeable, add a minimal skeleton on the per-vision section.
- Whether the optional `label` field on `VisionRow` ships in v2.0 picker UI or only in the schema (to avoid empty-input UX clutter — it's fine to ship the schema field but not render the input until Ben asks).
- The exact `VisionRowSchema` zod definition (positive integer count clamps, type enum literal vs string union — pick what's idiomatic with the rest of `single-quote/schema.ts`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements

- `.planning/PROJECT.md` — milestone v2.0 framing, Ben as primary reviewer, "Manager out of the loop" north star.
- `.planning/REQUIREMENTS.md` §"Multi-vision per project" — DATA-04 (multi-row picker) and DATA-06 (aggregation correctness) verbatim.
- `.planning/ROADMAP.md` §"Phase 6: Multi-vision per project" — goal statement and 4 success criteria. Note phase notes flag the three-layer touch (persisted schema / Pyodide path / picker UI) and the `core/` read-only constraint that drives D-06.
- `.planning/STATE.md` — milestone progress and Decisions Log (esp. 2026-05-05 row: "Quote persistence = browser-only via IndexedDB" — multi-vision inherits that posture).

### Customer feedback (the PRD-express source — Ben's verbatim drives every D-01..D-17)

- `.planning/feedback/2026-05-01-ben-bertsche-review.md` §U2 (lines 48-54 implications + 123-133 verbatim quote and recommendation) — Ben's *"How could it work to list visions; cameras can all vary in hours required?"* and the implication list. The recommendation *"Treat as a first-class data-model evolution; do not patch around it"* is the reason D-05 chose delta-from-baseline aggregation over the cheaper "collapse to single (max-type, total-count) input" patch.

### Phase 5 carry-forward (do not re-decide)

- `.planning/phases/05-quote-persistence/05-CONTEXT.md` — entire doc. Specifically:
  - D-01 / D-02 (IndexedDB / `matrix-quotes` DB / single `quotes` store) — Phase 6 only adds an `onupgradeneeded` migration step.
  - D-04 (unified `/quotes` route, both workspaces) — multi-vision quotes appear there with no list-row UI change.
  - D-05 / D-06 / D-07 (versioning + restore + history list) — restore of an older multi-vision version clones `visionRows` back into the picker.
  - D-13 (Compare tool is also a save source) — D-16 above scopes Compare to single-row v2 shape only.
  - D-18 (`schemaVersion: 1` reserves room for Phase 6) — D-12 / D-13 above execute the bump.
  - D-19 (jargon-guard extension pattern) — D-17 above carries it forward.

### Codebase architecture (binding constraints)

- `.planning/codebase/ARCHITECTURE.md` — entire doc; especially §"Editing `core/` for a frontend feature" (the anti-pattern that locks D-06 to TS-side aggregation), §"Data Flow / Single Quote" (the predictQuote → quoteAdapter → QuoteResultPanel chain that aggregator extends), §"Architectural Constraints / Pyodide pinning is load-bearing" (no model retraining without re-pickling), §"Anti-Patterns / Adding HTTP calls back to a phantom backend" (no `frontend/src/api/*` calls — types only).
- `.planning/codebase/STRUCTURE.md` §"Where to Add New Code / New Pyodide-side logic" (TS-only extension goes in `frontend/src/demo/`, not `core/`), §"Where to Add New Code / New form field on the Quote form" (schema + render path).
- `.planning/codebase/CONVENTIONS.md` — TS / React / form patterns. `react-hook-form` field-array pattern (`useFieldArray`) is the standard multi-row picker primitive.
- `.planning/codebase/TESTING.md` — Vitest patterns, including the Pyodide-mock fixture used in Phase 5 (`frontend/src/test/`-side mocks rather than real Pyodide for unit tests).

### Customer-trust hygiene (DATA-03 ratchet)

- `frontend/src/lib/jargonGuard.ts` and `frontend/tests/jargon-guard.test.tsx` — extend coverage to every new user-facing string (D-17).

### Implementation touchpoints (existing files this phase will read or extend)

- `frontend/src/pages/single-quote/QuoteForm.tsx:172-198` — current "Vision" subsection inside the Controls / Product card. Lines 181 (vision_type Select) and 197 (vision_systems_count Input) are replaced by the multi-row picker.
- `frontend/src/pages/single-quote/schema.ts:36, 41, 88, 93, 121, 151` — current vision schema fields, defaults, and `transformToQuoteInput` mapping. All six call sites change in this phase.
- `frontend/src/components/quote/QuoteResultPanel.tsx:235, 240` — current "Vision type" / "Vision systems count" rows in the inputs-echo block. Replaced per D-11. The new "Per-vision contribution" section is added per D-09.
- `frontend/src/demo/quoteAdapter.ts::toUnifiedResult` — current driver-extraction logic. The new aggregator wraps this; per-vision drivers extract from per-row deltas via the same feature-importance logic.
- `frontend/src/demo/pyodideClient.ts::predictQuote / getFeatureImportances` — building blocks the aggregator orchestrates. No changes; just N+1 invocations per quote.
- `frontend/src/demo/multiVisionAggregator.ts` — **NEW FILE.** TS-only multi-vision aggregator (D-05 / D-06 / D-07 / D-08).
- `frontend/src/demo/realProjects.ts::recordToPrediction` and `frontend/src/lib/nearestNeighbor.ts` — read `visionRows[0]?.type` and `sum(row.count for row in visionRows)` for legacy-compat numeric features used by the supporting-matches algorithm.
- `core/config.py:79, 96` (read-only) — `vision_systems_count` ∈ `QUOTE_NUM_FEATURES`, `vision_type` ∈ `QUOTE_CAT_FEATURES`. Fixed by the trained joblibs; we feed the model these flat fields per-row in the aggregator.
- `core/features.py:75, 80` (read-only) — `stations_robot_index` derived index uses `vision_systems_count`. The aggregator's per-row predict respects this — each row's count flows into that derived index for that row's prediction.
- `core/schemas.py:19, 46` (read-only) — pydantic `QuoteInput` shape; documentation reference only since runtime is Pyodide.

### Past-phase precedents (reuse, don't reinvent)

- `.planning/milestones/v1.0-phases/04-build-quality-hardening/` — DATA-03 jargon-guard extension pattern. Same pattern applies for the new strings.
- `.planning/phases/05-quote-persistence/` — IndexedDB write/read patterns, schemaVersion handling, BroadcastChannel cross-tab sync, version-history restore. Multi-vision changes the persisted shape; everything else is unchanged.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`UnifiedQuoteResult`** (`frontend/src/demo/quoteResult.ts`) — canonical result shape. Aggregated multi-vision quote returns this same shape; `perVisionContributions: PerVisionContribution[]` is added as an optional sibling field that `QuoteResultPanel` reads for the new section. v1 single-vision quotes that lack this field render the existing layout unchanged.
- **`predictQuote` + `getFeatureImportances` + `ensureModelsReady`** (`frontend/src/demo/pyodideClient.ts`) — the building blocks the aggregator orchestrates. The dual-bundle cache (`LOADED["real"]`, `LOADED["synthetic"]`) means N+1 calls in the same workspace are warm-cache hits after the first. Per-call cost is a few tens of ms; for typical 1-3 vision rows this is imperceptible.
- **`react-hook-form` `useFieldArray`** — already a peer dep (`react-hook-form@7` in package.json). Standard primitive for the multi-row picker. No new dep needed.
- **`zod` arrays** — already idiomatic in `single-quote/schema.ts`. `VisionRowSchema = z.object({ type: z.enum(["2D", "3D"]), count: z.coerce.number().int().min(1), label: z.string().optional() })`. `visionRows: z.array(VisionRowSchema)` slots in cleanly.
- **Phase 5 IndexedDB wrapper + `saveSavedQuote` / `listSavedQuotes` / `getSavedQuote`** (`frontend/src/lib/quoteStorage.ts` per Phase 5 D-01/D-02) — extended with the `onupgradeneeded` v1→v2 migration. The Phase 5 WR-02 resilience for unknown schema versions handles forward-compat.
- **`sonner` toaster** — already used for save/restore confirmations (Phase 5 D-10/D-15). No new toast surface needed for multi-vision; the Add / Remove are silent UI changes.
- **Phase 5 versioning + restore (D-05/D-06/D-07)** — restore of an older `vN` clones the saved `visionRows` into the form's `useFieldArray` state. No new restore logic.

### Established Patterns

- **No HTTP calls from demo pages** (ARCHITECTURE.md anti-pattern — carry-forward from Phase 5). The aggregator must never reach `frontend/src/api/*`. Types only.
- **Module-level singletons** for cross-component state (`pyodideClient.ts`'s `pyodidePromise` / `modelPromises`). The aggregator does not need its own singleton; it's a pure function over the existing `predictQuote` machinery.
- **Lazy-load heavy work** (Pyodide is lazy; recharts is lazy). The aggregator is light TS — eager-import is fine.
- **Boolean coercion at the form boundary** (`transformToQuoteInput`) — extends to `visionRows` deconstruction at the per-row predict call site (each call still gets flat `vision_type` + `vision_systems_count` for the model).
- **Shared `QuoteResultPanel`** between Real and Synthetic Quote tabs — apply the same to the per-vision contribution section. No workspace-specific copy.
- **`useFieldArray` pattern** — establish it here for vision rows; future phases (e.g., a hypothetical "list of robot cells" row picker) can reuse the visual primitive.

### Integration Points

- **Form field array:** `QuoteForm.tsx`'s "Vision" subsection swaps in `<VisionRowsField name="visionRows" control={...} />` (or whatever name reads natural — Claude's discretion D-18). The component owns its `useFieldArray`.
- **Aggregator hook-up:** the existing `handleSubmit` in `MachineLearningQuoteTool.tsx` (and the Real-Data `ComparisonQuote.tsx`) calls `aggregateMultiVisionEstimate(input, dataset)` instead of `predictQuote` directly. Inside, the aggregator does the N+1 calls and returns `{ result: UnifiedQuoteResult, perVisionContributions: PerVisionContribution[] }`. If `visionRows.length === 0` the aggregator falls through to a single baseline call and returns `perVisionContributions: []` — the section is hidden in `QuoteResultPanel`.
- **Result panel:** `QuoteResultPanel.tsx` reads `result.perVisionContributions` (optional) and renders the stacked cards. Inputs-echo block updates per D-11.
- **IndexedDB migration:** `quoteStorage.ts` `onupgradeneeded` for `oldVersion < 2`: enumerate all rows, run migration rule from D-13, write back as v2. Defensive on-read migrator covers tabs open during the upgrade.
- **Cross-tab sync:** `BroadcastChannel('matrix-quotes')` (Phase 5 D-15) needs no changes — a v2-shape save broadcasts the same way.
- **Jargon-guard:** `frontend/tests/jargon-guard.test.tsx` test extension lists each new surface (the picker, the per-vision contribution section, the inputs-echo update). Same pattern as Phase 5 D-19.

### Constraints (carry-forward)

- **No editing `core/`** — vendored from parent app, anti-pattern in ARCHITECTURE.md. Aggregation is TS-side only.
- **No live retraining** — durable v1.0 decision; the trained joblib bundles are reused as-is. Multi-vision is a TS-side aggregation over the existing flat-input model.
- **Pyodide pinning at 0.27.1** — unchanged.
- **Jargon-guard table-stakes** (DATA-03) — every new customer-facing string is scanned.
- **IS_DEMO is always true** — the aggregator must work under that flag. No `IS_DEMO === false` branch that "would talk to a backend".
- **Static-SPA / browser-only / IndexedDB** posture from Phase 5 D-01 — multi-vision inherits this. No backend introduced.

</code_context>

<specifics>
## Specific Ideas

- **Ben's verbatim direction (PRD-express source for every decision in this phase):**
  > *"On some projects we use multiple vision types. That's a limitation of how I recorded the data, but I was trying to keep data entry simple. How could it work to list visions; cameras can all vary in hours required?"* — `.planning/feedback/2026-05-01-ben-bertsche-review.md` §U2 (line 125)
- **Ben's verbatim ask for the result panel:**
  > *"Result panel (per-vision drivers in the breakdown)"* — same file, line 131
- **The implication list from the same feedback file (line 127-131) — used to scope this phase:**
  - "Master Parquet schema (a quote's vision becomes a list of `{type, count, hours}`)" — drives D-01 row shape (we adopt `{type, count, label?}`; `hours` is OUTPUT, not input).
  - "ML feature engineering (need per-vision-type features, or a learned aggregation)" — D-05 / D-06 deliver a TS-side learned aggregation without retraining; "per-vision-type features" would require a `core/` change which is out of scope.
  - "Quote input form (multi-row vision picker)" — D-02 delivers.
  - "Result panel (per-vision drivers in the breakdown)" — D-09 delivers.
- **The recommendation in the same file (line 133):**
  > *"Treat as a first-class data-model evolution; do not patch around it."*
  This drove D-05 choosing delta-from-baseline aggregation over the patch alternative of "collapse to (max-type, total-count) and predict once" — the patch would not give honest per-vision drivers.
- **Carry-forward customer-trust hygiene (durable across all v2.0 phases):** non-technical-audience copy, no ML jargon, honest confidence framing. Per-vision contribution text uses plain hour deltas, not "delta from baseline" or "uncertainty band".

</specifics>

<deferred>
## Deferred Ideas

- **Per-row hours INPUT** — Ben's "hours required" is a model OUTPUT per row, not a manual override. If Ben later asks for manual per-row hour entry (e.g., to override the model when he disagrees), that becomes its own phase.
- **Reordering vision rows (drag-and-drop / up-down)** — Add and Remove are sufficient for v2.0. Defer until Ben asks.
- **Multi-vision in the Compare tool's input form** — Compare-tool save still works (D-16 single-row v2 shape). True multi-vision in Compare would require expanding the comparator's mental model and was not requested.
- **Retraining the model with multi-vision-aware features** — would touch `core/features.py` (currently read-only) and require re-pickling the joblibs. Significantly bigger lift than v2.0; reconsider in v3 if Ben validates the per-vision delta approach in v2.0.
- **Per-vision confidence dots (high / moderate / lower per row separately)** on the result panel — start with a single global confidence per target (worst-case across rows per D-07). Enrich if Ben asks.
- **Vision presets / templates** (e.g., "standard pick-and-place 2D") — premature; not requested. May surface naturally if a Manager-question library is built in v3 (AI-01).
- **Per-vision support for the "Find similar" / supporting-matches feature** — current `nearestNeighbor.ts` matches on a single `vision_type` + `vision_systems_count`; multi-vision currently surfaces matches based on `visionRows[0]` and `sum(count)` (D-04 legacy-compat fallback). A "match by vision SET" similarity metric is its own design exercise; defer until Ben asks.
- **Optional row label as a UI-rendered field** — the schema permits `label?: string` (D-01) but the picker may not surface a label input in v2.0 to keep data entry simple (Ben's *"trying to keep data entry simple"* posture). Ship the schema slot; defer the input rendering until Ben asks.
- **Auto-numbering vs manual labeling on row labels** ("Vision 1: 2D × 2" auto vs "Pick-and-place: 2D × 2" custom) — v2.0 uses auto-numbering with optional override via the `label` field if Ben asks for it.
- **Cross-tab race UX** for two tabs editing the same multi-vision quote — Phase 5 D-15 last-write-wins applies; no per-row merge logic.

</deferred>

---

*Phase: 6-multi-vision*
*Context gathered: 2026-05-05*
