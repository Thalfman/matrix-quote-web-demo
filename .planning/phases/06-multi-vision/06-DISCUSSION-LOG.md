# Phase 6: Multi-vision per project - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 06-multi-vision
**Areas discussed:** vision row shape & picker UX, aggregation strategy & location, per-vision drivers breakdown, Phase 5 quote migration

---

## Discussion mode

User invoked `/gsd-discuss-phase 6` and was presented a multiSelect AskUserQuestion with the four phase-specific gray areas as options. Instead of selecting individual areas, the user replied with the freeform directive:

> **"Pick the closest solution to Ben's commment"**

Interpreted as: delegate every decision to the agent with the constraint that every choice must be grounded in Ben Bertsche's verbatim 2026-05-01 stakeholder review (`.planning/feedback/2026-05-01-ben-bertsche-review.md` §U2 — lines 48-54 and 123-133). Agent re-read Ben's section §U2 and made each decision against his verbatim guidance + the four implication bullets + the recommendation *"Treat as a first-class data-model evolution; do not patch around it."*

---

## Area 1: Multi-row vision picker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Just `{type, count}` (minimal) | Two-field row matching today's flat fields, just listed | ✓ (with optional label slot) |
| `{type, count, complexity_score?, label?}` (rich) | Add optional per-row complexity/label inputs | (label slot only — value not rendered in v2.0) |
| One row per system, count derives from list length | List of N rows of single-system entries | (rejected — Ben wrote "cameras CAN ALL vary in hours required" implying type+count remains primary) |

**Selection rationale:** Ben wrote *"How could it work to list visions"* and *"trying to keep data entry simple"* in the same paragraph. The minimal `{type, count}` row matches both. The optional `label?` field is added to the schema (not rendered in v2.0) so Ben's *"cameras can all vary in hours required"* — which implies he may later want to distinguish vision systems by role — has a slot ready when he asks.

**Picker shape:** inline rows under the existing "Vision" subsection of `QuoteForm.tsx`. Add and Remove only — no reorder. First added row defaults to `{type: "2D", count: 1}`. Empty state = "No vision systems on this project" with an Add button (equivalent to today's `vision_type: "None", count: 0`).

---

## Area 2: Aggregation strategy & location

| Option | Description | Selected |
|--------|-------------|----------|
| Collapse to single (max-type, total-count) input → predict once | Cheapest. One predict per quote. No retraining. | (rejected — Ben said "do not patch around it") |
| **Delta-from-baseline, TS-side** | Baseline predict + per-row predict, take delta per row, sum onto baseline. Lives in `frontend/src/demo/multiVisionAggregator.ts`. | ✓ |
| Per-row predict + sum (no baseline) | Run prediction per row with full inputs, sum results. | (rejected — over-counts non-vision drivers) |
| Extend `_PREDICT_SHIM` with a Python helper | Aggregation in Python at build-time-emitted shim, not TS. | (rejected — TS-side keeps `core/` untouched and simplifies testing) |
| Retrain model with per-vision-type features | A "real" multi-vision model. | (rejected — would force `core/features.py` change, which is read-only; deferred to v3) |

**Selection rationale:** Ben's recommendation in the feedback file (line 133) — *"Treat as a first-class data-model evolution; do not patch around it"* — explicitly rejects the cheap "collapse to single input" patch. Delta-from-baseline is the closest TS-only shape that gives honest per-vision attribution without retraining: each row's hours contribution = `(predict with this row's vision) − (predict with no vision)`. The aggregated estimate = baseline + sum(deltas). Per-vision drivers fall out for free as the top features whose contribution shifted in each row's delta.

**Range/confidence rule:** root-sum-square of half-widths around the new center; minimum confidence (worst-case) across baseline + per-row predicts. Honest-signal posture from v1.0 — lower confidence on a multi-vision quote is a feature of the framing, not a bug.

**Location:** new file `frontend/src/demo/multiVisionAggregator.ts`. No `core/` touch. No `_PREDICT_SHIM` change. No retraining.

---

## Area 3: Per-vision drivers breakdown on QuoteResultPanel

| Option | Description | Selected |
|--------|-------------|----------|
| **Stacked per-vision contribution cards** | One card per row, in row order, with hours delta + top-2 drivers per row | ✓ |
| Tabs per vision row inside drivers section | Tab-switched view of per-row drivers | (rejected — Ben said "in the breakdown" not "in a tab") |
| Single drivers list with vision badges | One list with each driver tagged to its row | (rejected — loses the per-row hours-delta visibility Ben implied) |
| Aggregate hero + collapsible per-row details | Hidden by default, expand to see | (rejected — Ben asked for it "in the breakdown" — should be visible by default) |

**Selection rationale:** Ben's verbatim ask was *"Result panel (per-vision drivers in the breakdown)"* — three constraints: (1) lives on the result panel, (2) shows per-vision drivers, (3) sits in the breakdown area. Stacked cards are the most direct read of "in the breakdown" — they appear inline in the existing breakdown area, not gated behind a tab or accordion.

**Layout placement:** between the existing top-3 drivers area and the per-category H/M/L breakdown. Section is hidden when `visionRows` is empty (no vision systems on the project). Existing global top-3 drivers stay (now sourced from the aggregated prediction).

**Inputs-echo block update:** `QuoteResultPanel.tsx:235/240` "Vision type" / "Vision systems count" rows are replaced by a single "Vision systems" row that lists each row in plain text (e.g., `"2D × 2; 3D × 1"`).

---

## Area 4: Phase 5 quote migration (schemaVersion 1 → 2)

| Option | Description | Selected |
|--------|-------------|----------|
| **Hard cutover with on-read auto-migration** | Bump schemaVersion to 2; v1 → v2 conversion happens in `onupgradeneeded` + defensive on-read | ✓ |
| Dual-write: keep flat fields + add visionRows | Old fields stay valid as "default row"; both shapes coexist forever | (rejected — Ben said "do not patch around it"; dual-shape leaks complexity into every reader) |
| Lazy migration on next save only | v1 records stay v1 until re-saved; mixed-version DB | (rejected — list view would have to handle both shapes; complexity for no win) |

**Selection rationale:** Ben's *"first-class data-model evolution; do not patch around it"* directly rejects dual-write. Hard cutover with `onupgradeneeded` + defensive on-read migration produces a clean v2-only DB while still handling the rare case of a tab open across the version bump.

**Migration rule:**
- `vision_type === "None" && count === 0` → `visionRows: []`
- `vision_type === "None" && count > 0` (degenerate v1) → `visionRows: []`
- `vision_type ∈ {"2D", "3D"} && count >= 0` → `visionRows: [{type, count: max(1, count)}]`
- Legacy keys deleted from migrated record.

Round-trip test (success criterion 4) covers both directions: save multi-vision → reopen → re-run produces same aggregated p50, AND v1 record → migrate → re-estimate.

---

## Compare tool scope (sub-decision)

| Option | Description | Selected |
|--------|-------------|----------|
| **Multi-vision in SingleQuote only; Compare uses single-row v2 shape** | Phase 5 D-13 Compare save still works, with `visionRows` length 0 or 1 | ✓ |
| Add multi-row picker to Compare too | Full multi-vision in both surfaces | (rejected — Ben never raised it; scope creep) |

**Selection rationale:** Ben's §U2 quote and the four-bullet implication list reference the SingleQuote form only. Compare tool is a project-vs-project comparator — multi-vision is a quote-shape concern that lives upstream of the comparator. Compare saves still write v2-shape records (single-row arrays) so the persistence schema is uniform.

---

## Claude's Discretion

User delegated the entire decision space to the agent ("Pick the closest solution to Ben's comment"). The following were captured as Claude's Discretion in CONTEXT.md (D-18) because they don't materially change the decisions above:

- Field component naming (`VisionRowsField` vs `VisionPicker` vs `MultiVisionPicker`).
- "Add vision system" button visual treatment and exact copy variant.
- Per-vision contribution card visual primitives (border, fill, spacing) — match existing card language.
- Whether the per-vision section gets a section heading or inherits the breakdown subtree's styling.
- Internal data structure of `delta_row` in `multiVisionAggregator.ts` (public output is fixed: `UnifiedQuoteResult` + `perVisionContributions[]`).
- N+1 predict UX during aggregation (negligible on warm Pyodide; add a skeleton only if the executor measures it as user-noticeable).
- Whether the optional `label?` field on `VisionRow` ships with a rendered input in v2.0 or just lives in the schema.
- The exact `VisionRowSchema` zod definition (literal enum vs string union, count clamp shape).

---

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section:

- Per-row hours INPUT (override the model) — would be its own phase if Ben asks.
- Reordering vision rows (drag-and-drop / up-down) — not requested.
- Multi-vision in the Compare tool's input form — single-row v2 shape suffices for v2.0.
- Retraining the model with multi-vision-aware features — touches `core/`; v3 territory.
- Per-vision confidence dots per target — start with global worst-case confidence.
- Vision presets / templates — premature; not requested.
- "Match by vision SET" similar-projects metric — single-row legacy-compat fallback for v2.0.
- Optional row-label rendering — schema slot ships, picker input may defer.
- Auto-numbering vs manual labeling — v2.0 auto-numbers, label override is opt-in.
- Cross-tab race UX for concurrent multi-vision edits — Phase 5 D-15 last-write-wins applies.

---

*Discussion completed: 2026-05-05*
