# Phase 5: Quote Persistence - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

A Sales Engineer can save the quote they just produced (from Single Quote or Compare, on either the Real or Synthetic workspace), give it an identifying name, and find it again later in a top-level "My Quotes" list. They can open a saved quote, edit any input, re-run the estimate, and save the revised version — preserving the prior version in a per-quote history that can be restored. They can set and change a workflow status (draft / sent / won / lost / revised) on each saved quote, and delete obsolete quotes. All persistence behavior survives a full refresh and a closed/reopened tab.

This phase replaces the same-day-patch precursor `sessionStorage["matrix.singlequote.last"]` (UX-01) with proper named, durable, multi-quote persistence. The existing `frontend/src/pages/quotes/` folder is the **Compare-tool** components vestigially named from the parent app — it is not a "saved quotes" surface yet and contains no persistence code.

**In scope:** save, list, open-edit-resave, delete, workflow status, version history with restore — all six PERSIST requirements. Both workspaces (Real and Synthetic) feed into the same list.

**Not in scope (belong elsewhere):** multi-vision per quote (Phase 6 — but the schema must round-trip whatever Phase 6 introduces), ROM-mode quote shape (Phase 7 — same round-trip requirement), real-data ingest (v3), AI Scope-Review (v3), cross-device sync (durably out for v2.0 per the storage-route decision below).

</domain>

<decisions>
## Implementation Decisions

### Storage Route (the headline decision — PERSIST-01 architecture sub-decision)

- **D-01:** **Browser-only storage via IndexedDB.** No backend introduced in this phase. The static-SPA-no-backend posture from v1.0 (`.planning/codebase/ARCHITECTURE.md`) holds. Specialist routing is unchanged: `frontend-specialist`, `ui-ux-specialist`, `test-writer`. `auth-admin-specialist`, `backend-specialist`, `storage-specialist` remain N/A on this repo. Re-evaluate the backend question in v3 if real-data ingest (DATA-05) or AI Scope-Review (AI-01) forces it.
- **D-02:** **IndexedDB, not localStorage.** Version history × full quote payload (inputs + drivers + per-target predictions + range) blows past localStorage's ~5MB practical ceiling once a few dozen versioned quotes accumulate. IndexedDB also gives an async API and native indexes (date / status / name) without scanning all rows. Library choice (`idb` vs hand-rolled) is researcher's call — `idb` is ~1KB gz and the typical recommendation; either is acceptable. DB name: `matrix-quotes`. Single object store `quotes` keyed by `id` (UUID v4), with secondary indexes on `updatedAt`, `status`, `workspace`.
- **D-03:** **Cross-device sync is durably OUT for v2.0.** Already noted in REQUIREMENTS.md Out of Scope. If Ben asks for cross-device, that re-opens the backend conversation in v3 — not here.

### Workspace Scope of Saved Quotes

- **D-04:** **Unified `/quotes` route across both workspaces.** One top-level "My Quotes" list, reachable from both the Real-Data and Synthetic-Data sidebar groups in `DemoLayout`. A saved quote carries `workspace: "real" | "synthetic"` so the engine that produced it is recoverable on re-open (re-open routes back to `/compare/quote` for `"real"` or `/ml/quote` for `"synthetic"`). The list shows a small workspace pill per row.

### Versioning + Restore Semantics (PERSIST-06 — Ben's verbatim "reopened, edited, re-quoted, versioned")

- **D-05:** **A new version is created on every Save of an opened-from-list quote where any input changed since the last persisted version.** First save on a brand-new quote = `v1`. Editing inputs and re-running the estimate stages a candidate v2; clicking Save commits v2. One version = one persisted re-quote, matching Ben's verbatim language exactly.
- **D-06:** **Restore is a fork, never destructive.** Selecting `v3` from the history clones its inputs into the current form; the next Save commits as `v(N+1)` with a `restoredFromVersion: 3` annotation. The version list grows monotonically. Linear (list, not tree) — no branching for the single-SE use case.
- **D-07:** **Per-quote version history UI** is a vertical list inside the open-quote view, newest first, each row showing `vN · ISO date · status-at-time · [Restore]`.

### Workflow Status (PERSIST-05 — Ben's verbatim states)

- **D-08:** **States are exactly: draft / sent / won / lost / revised** — Ben's verbatim list, no additions, no renaming.
- **D-09:** **Manual chip change is the primary interaction.** Default status on first save is `draft`. The user clicks the status chip on the open quote to advance.
- **D-10:** **One assist:** when a re-save creates a new version, the save-confirmation toast offers a one-tap "Mark as **revised**?" action. That is the only auto-prompt — no other auto-transitions (no auto-set on send, no auto-flip on edit). Avoids surprising a user who set `won` and then opens to view.
- **D-11:** **My Quotes list shows status as a colored pill.** Sort options: date (default) / name / status. **No filter UI for v2.0** — sort is enough; add a status filter only if Ben asks. Kanban-style status grouping is out of scope.

### Save UX & Compare Integration

- **D-12:** **"Save quote" button lives on `QuoteResultPanel`** (after an estimate is generated). Form-time draft autosave is OUT — it adds complexity and the result-panel save button maps cleanly to "I produced an estimate I want to keep."
- **D-13:** **Compare tool is also a save source.** PERSIST-01 explicitly names Compare. A Compare-tool save persists the human comparator number alongside the model-side fields. Schema accommodates a `compareInputs` optional sub-shape.
- **D-14:** **Naming:** required user-supplied name on save. Auto-suggested name from inputs (e.g., `"ME 800h · Vision · 2026-05-05"`) prefilled in the dialog; user can keep or edit. PERSIST-02 requires "name + date + key inputs" in the list — this satisfies it without forcing the user to type from scratch.

### Cross-tab Sync, Migration, Delete Safety

- **D-15:** **Cross-tab sync via `BroadcastChannel('matrix-quotes')`.** ~10 LOC, no library. Editing in one tab updates the My Quotes list in another open tab. Edge case (rare, single-user): if the same quote is open in two tabs and both edit, last-write-wins on Save — explicit conflict UX is overkill for one SE.
- **D-16:** **Deprecate `sessionStorage["matrix.singlequote.last"]`.** No migration prompt — sessionStorage entries are session-scoped and disappear on browser close. Remove `readLastValues()` cleanly in `frontend/src/pages/single-quote/QuoteForm.tsx`. The behavior it provided is replaced by reopening a saved quote.
- **D-17:** **Delete = confirmation modal, hard delete, no soft-delete bin.** "Delete '\<quote name\>' permanently? This removes its full version history." The status `lost` already covers the "I don't want to actually delete this" use case. Smaller and clearer than building a trash UI.

### Schema Versioning (forward-compatibility for Phase 6 / Phase 7)

- **D-18:** **Each saved quote stores a `schemaVersion: 1` field** so Phase 6 (multi-vision) and Phase 7 (ROM mode) can extend the shape without losing v2 quotes. Migration code in IndexedDB `onupgradeneeded` handles the bump.

### Customer-Trust Hygiene (carried from v1.0)

- **D-19:** **Jargon-guard scans every new customer-facing string** introduced by this phase: list screen labels, save-dialog copy, status-pill text, delete-confirmation modal, restore button, error toasts, version-history headers. The guard already covers `QuoteResultPanel` + Insights pages (DATA-03); extending to the new surfaces is a tracked task.

### Claude's Discretion

These are decided but the exact letter is at the executor's discretion as long as the spirit holds:

- IndexedDB wrapper choice (`idb` package vs hand-rolled).
- The exact UUID library (or `crypto.randomUUID()` directly — supported in all modern browsers).
- Save-dialog UX shape (modal vs inline panel vs slide-over) — anything that feels native to the existing demo's visual language.
- Toast library is already `sonner` (per ARCHITECTURE.md) — reuse it.
- The "auto-suggested name" generator's exact format string.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/PROJECT.md` — milestone v2.0 framing, Ben as primary reviewer, "Manager out of the loop" north star, key decisions table.
- `.planning/REQUIREMENTS.md` — PERSIST-01 through PERSIST-06 verbatim. Out-of-scope rows including durable cross-device-sync exclusion.
- `.planning/ROADMAP.md` §"Phase 5: Quote Persistence" — goal statement, 7 success criteria (note: SC#5 — survives refresh and closed/reopened tab — is a litmus test for IndexedDB wiring), phase notes including the "open architecture decision" flag this CONTEXT.md resolves.

### Customer feedback (the PRD-express source)
- `.planning/feedback/2026-05-01-ben-bertsche-review.md` §U1 ("Quote inputs are lost after submit") — Ben's verbatim ask, including the "database approach is more in line with our quoting process — we often revise quotes several times over many weeks or months" sentence that drives both PERSIST-03 and PERSIST-06. Also §U1's "Two fix levels" framing — UX-01 was the quick win; this phase is the foundational fix.

### Codebase architecture (binding constraints)
- `.planning/codebase/ARCHITECTURE.md` — entire doc; especially §"System Overview" (no runtime backend), §"Data Flow / Single Quote" (the Pyodide-driven prediction path producing `UnifiedQuoteResult`), §"State Management" (where `sessionStorage["matrix.singlequote.last"]` lives today, line 288), §"Anti-Patterns / Adding HTTP calls back to a phantom backend" (do NOT introduce `frontend/src/api/` calls — types only), §"Architectural Constraints / No backend in deployed build."
- `.planning/codebase/STRUCTURE.md` — for new-route placement under `frontend/src/pages/` and the `DemoLayout` sidebar wiring.
- `.planning/codebase/CONVENTIONS.md` — TS / React / form patterns this phase must conform to.
- `.planning/codebase/TESTING.md` — Vitest patterns, including the Pyodide-mock fixture used in v1.0.

### Customer-trust hygiene (DATA-03 ratchet)
- `frontend/src/lib/jargonGuard.ts` (jargon-guard surface) and `frontend/tests/jargon-guard.test.tsx` — extend coverage to every new user-facing string in this phase.

### Implementation touchpoints (existing files this phase will read or extend)
- `frontend/src/pages/single-quote/QuoteForm.tsx` — current owner of `readLastValues` / `sessionStorage["matrix.singlequote.last"]`. Remove on this phase.
- `frontend/src/components/quote/QuoteResultPanel.tsx` — host of the new "Save quote" button.
- `frontend/src/components/DemoLayout.tsx` — sidebar wiring for the new `/quotes` route.
- `frontend/src/DemoApp.tsx` — route table; add `/quotes` (list) and `/quotes/:id` (detail/edit).
- `frontend/src/demo/quoteResult.ts` — `UnifiedQuoteResult` shape that gets persisted.
- `frontend/src/pages/single-quote/schema.ts` — input shape (zod-validated) that gets persisted.
- `frontend/src/pages/Compare.tsx` and `frontend/src/pages/demo/CompareBrowseTab.tsx` — Compare-side save entry point.

### Past-phase precedents (reuse, don't reinvent)
- `.planning/milestones/v1.0-phases/01-customer-blocking-bugs/` — UX-01 same-day patch (the precursor this phase replaces). Discussion-log there records why it was a stopgap.
- `.planning/milestones/v1.0-phases/04-build-quality-hardening/` — jargon-guard extension pattern (DATA-03). Same pattern applies here for the new surfaces.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`UnifiedQuoteResult` (`frontend/src/demo/quoteResult.ts`)** — canonical shape both Real and Synthetic quotes adapt to. Persist this exact shape (plus inputs + workspace + meta) so re-open feeds it back to `QuoteResultPanel` without a re-render-from-scratch.
- **`QuoteResultPanel` (`frontend/src/components/quote/QuoteResultPanel.tsx`)** — already the rendering surface for both Quote tabs. Add a "Save quote" affordance here (only visible when a successful estimate is on screen). On open-from-list, this same component renders the saved estimate without re-running Pyodide if `UnifiedQuoteResult` is in storage.
- **`predictQuote` + `ensureModelsReady` (`frontend/src/demo/pyodideClient.ts`)** — re-estimate path on edit. The existing dual-bundle cache (`LOADED["real"]`, `LOADED["synthetic"]`) means re-running an opened-from-list quote is a no-op-warmup if the user is in the same workspace.
- **`useRealProjects` / `useSyntheticPool` / TanStack Query** — pattern for static-asset reads with `staleTime: Infinity`. New `useSavedQuotes()` hook mirrors this shape but reads from IndexedDB and invalidates on Save / Delete / cross-tab broadcast.
- **`sonner` toaster (in `main.tsx`)** — reuse for the save-confirmation toast that hosts the "Mark as revised?" assist (D-10).
- **`zod` + `react-hook-form`** — already in use for the quote form. Saved-quote name field can be a small zod schema.

### Established Patterns

- **No HTTP calls from demo pages** (ARCHITECTURE.md anti-pattern). The persistence module must never reach `frontend/src/api/*`. Types are fine; calls are not.
- **Module-level singletons for cross-component state** (`pyodideClient.ts`'s `pyodidePromise` / `modelPromises`). The IndexedDB connection should follow the same pattern: open once per tab, share across hooks.
- **Lazy-load heavy work** (Pyodide is lazy-loaded; recharts is lazy-loaded). IndexedDB is light enough to open eagerly on app boot, but the saved-quotes hook should still gate UI on a `ready` flag.
- **Boolean coercion in form state** (booleans → 0/1 ints via `transformToQuoteInput()` in QuoteForm). When restoring a saved quote, run the inverse — re-hydrate booleans before feeding the form.
- **Shared `QuoteResultPanel` between Real and Synthetic** is the proof that workspace-agnostic UI works. Apply the same principle to the My Quotes list.

### Integration Points

- **Routes:** `/quotes` (list) and `/quotes/:id` (detail/edit/history) added to `DemoApp.tsx` route table. Re-open from the list redirects to `/compare/quote?fromQuote={id}` for `workspace: "real"` and `/ml/quote?fromQuote={id}` for `workspace: "synthetic"` — the existing Quote tab reads the query param, hydrates the form, and renders the saved `UnifiedQuoteResult` on `QuoteResultPanel`.
- **Sidebar:** `DemoLayout.tsx`'s sidebar gets a new entry — "My Quotes" — visible from both Real and Synthetic groups (or as a top-level entry above both groups; UI-spec call).
- **Save trigger:** `QuoteResultPanel.tsx` gets a Save button. The button opens a small dialog (name field with auto-suggested default + Save / Cancel).
- **Compare-side save:** `CompareBrowseTab.tsx` (or wherever the comparator number lives) hosts the same Save button, scoped to the multi-project comparator workspace.
- **Cross-tab:** `BroadcastChannel('matrix-quotes')` listened to by `useSavedQuotes()` for live list updates.

### Constraints (carry-forward)

- **No editing `core/`** — vendored from parent app, anti-pattern in ARCHITECTURE.md.
- **No live retraining** — durable v1.0 decision; persistence does not touch the model bundles.
- **Pyodide pinning at 0.27.1** — unrelated to this phase but a constraint on touching `pyodideClient.ts`.
- **Jargon-guard table-stakes** (DATA-03) — every new customer-facing string is scanned.
- **IS_DEMO is always true** — the persistence layer must work under that flag. Do not introduce a `IS_DEMO === false` branch that "would talk to a backend" — that's premature complexity.

</code_context>

<specifics>
## Specific Ideas

- **Ben's verbatim status states (PERSIST-05):** draft / sent / won / lost / revised — exactly these five, in that order on the chip control. No translation, no synonyms.
- **Ben's verbatim version-history language (PERSIST-06):** "reopened, edited, re-quoted, versioned" — direct interpretation of the four verbs is encoded in D-05/D-06/D-07. Do not silently re-interpret.
- **The pitch contract (durable):** Real vs Synthetic is "today vs at-scale future" framing for the demo — it is **not** a "two work surfaces" mental model. The unified My Quotes list (D-04) leans into this: the SE has one job and saves one set of quotes; the workspace pill is informational, not navigational.
- **Sales-bucket / vision-type metadata in the list (PERSIST-02):** the list row should surface at minimum: name, date, status, workspace pill, sales bucket, vision type, materials cost — those are the recognizable fields a SE uses to identify a quote weeks later.

</specifics>

<deferred>
## Deferred Ideas

- **Cross-device quote sync** — durably out for v2.0; reopens in v3 if real-data ingest (DATA-05) or AI Scope-Review (AI-01) forces a backend conversation. Already in REQUIREMENTS.md Out of Scope.
- **Status filter UI in the My Quotes list** — sort by status is in scope; a chip-based filter is deferred until Ben asks for it. Easy add post-v2 if needed.
- **Kanban-style status grouping** — out of scope; defer indefinitely. Sort is sufficient for one SE.
- **Soft-delete / trash bin** — out of scope; status `lost` covers the "don't truly delete" case. Reconsider only if multi-user persistence ever ships.
- **Quote sharing between Sales Engineers** — explicitly NOT excluded in REQUIREMENTS.md (Ben never raised it). If multi-SE deployment surfaces in v3, this becomes a candidate. Not for v2.0 because it forces auth + backend.
- **Auto-transitions on workflow status** (e.g., flipping to `sent` when a "Send to customer" action exists) — no Send action exists today. If a future phase adds an export/share-to-customer flow, status auto-update can be reconsidered.
- **Export / import of saved quotes** (e.g., JSON export to share a quote with a colleague) — not requested; defer.

</deferred>

---

*Phase: 5-quote-persistence*
*Context gathered: 2026-05-05*
