# Phase 5: Quote Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 5-quote-persistence
**Areas discussed:** Storage route, Workspace scope, Versioning + restore semantics, Workflow status interaction, Save UX & Compare integration, Cross-tab sync / migration / delete safety, Schema versioning, Customer-trust hygiene

---

## Gray-Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Storage route | Browser-only (localStorage / IndexedDB) vs introduce a backend for the first time. Headline architecture decision; flips specialist routing. | ✓ (driver-decided) |
| Workspace scope of saved quotes | Each workspace its own list vs unified My Quotes. | ✓ (driver-decided) |
| Versioning + restore semantics (PERSIST-06) | Trigger for new versions; restore = overwrite vs fork. | ✓ (driver-decided) |
| Workflow status interaction (PERSIST-05) | Manual chip vs assisted transitions; list filter/sort/group. | ✓ (driver-decided) |

**User's choice:** "You pick." — user delegated the area selection and the per-area decisions to Claude. All four were addressed; recommendations were locked at confirmation.

---

## Storage Route

| Option | Description | Selected |
|--------|-------------|----------|
| Browser-only — localStorage | Simplest; ~5MB practical ceiling. Sync API. | |
| Browser-only — IndexedDB | Async, indexed, large quotas. Slightly more code. | ✓ |
| Backend (Vercel KV / Postgres / FastAPI) | Cross-device sync, but milestone-sized (deploy / auth / CORS / CI). Flips specialist routing on. | |

**Decision:** IndexedDB, no backend.

**Rationale:** Static-SPA-no-backend is durable from v1.0. Backend route is milestone-sized and not justified by any v2.0 evidence. Ben is the sole reviewer; cross-device sync is durably out (REQUIREMENTS.md). IndexedDB over localStorage because version history × full quote payload (inputs + drivers + per-target predictions + range) blows past 5 MB once dozens of versioned quotes accumulate. Reopens in v3 if real-data ingest or AI Scope-Review forces a backend conversation.

---

## Workspace Scope of Saved Quotes

| Option | Description | Selected |
|--------|-------------|----------|
| Per-workspace lists | `/compare/quotes` (Real) and `/ml/quotes` (Synthetic), separate stores. | |
| Unified `/quotes` list across both workspaces | One list, workspace pill per row, single store. | ✓ |

**Decision:** Unified `/quotes` list with a `workspace: "real" \| "synthetic"` field on each saved quote.

**Rationale:** Real vs Synthetic is the demo's *pitch frame* ("today vs at-scale future"), not two separate work surfaces. Ben is one SE doing one job. `QuoteResultPanel` already proves workspace-agnostic UI works.

---

## Versioning + Restore Semantics (PERSIST-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Versioning trigger — every save creates a version | Save = commit a version, regardless of what changed. | |
| Versioning trigger — only on Save when inputs changed since last version | New version only when there is real input delta. | ✓ |
| Versioning trigger — only on explicit "Save as new revision" | User opt-in; quieter history. | |
| Restore semantics — overwrite | Restore replaces the form contents and discards intermediate versions. | |
| Restore semantics — fork (clone-into-form, next save = new version) | Linear, audit-preserving. | ✓ |
| Restore semantics — tree | Branching version graph. | |

**Decision:** New version on every Save where inputs changed since the last persisted version; Restore is a fork (linear list, never destructive).

**Rationale:** Matches Ben's verbatim "reopened, edited, re-quoted, versioned" — one version equals one persisted re-quote. Fork-restore preserves the audit trail Ben implied with "revised several times over many weeks or months." Tree shape adds complexity with no payoff for one SE.

---

## Workflow Status Interaction (PERSIST-05)

| Option | Description | Selected |
|--------|-------------|----------|
| State names | Ben's verbatim list: draft / sent / won / lost / revised. | ✓ |
| Manual-only chip | User clicks chip to advance. | ✓ |
| Full auto-transitions | Status auto-flips on edits, sends, etc. | |
| Manual + one assist on re-save | Save toast offers "Mark as revised?" one-tap action; no other auto-prompts. | ✓ |
| List behavior — sort only | Date / name / status sort options. | ✓ |
| List behavior — sort + filter | Add status filter UI. | (deferred) |
| List behavior — kanban grouping | Status as primary grouping. | |

**Decision:** Verbatim Ben states; manual chip advancement; one save-time assist for "revised"; sort by date / name / status; no filter UI for v2.

**Rationale:** Manual respects user agency on a state machine that Ben designed verbatim. One assist captures the most common workflow (re-save = revised) without surprising users on `won` / `lost`. Filter UI deferred until requested — sort is enough for the volume one SE will accumulate.

---

## Claude's Discretion

User said "You pick." once at the gray-area selection step and then "All good, lock it" at the confirmation step. The following sub-decisions were taken at Claude's discretion:

- Save button placement on `QuoteResultPanel` (not on the form). No draft autosave.
- Compare tool is also a save source; persists the human comparator number.
- Required user-supplied name with an auto-suggested prefill from inputs.
- `BroadcastChannel('matrix-quotes')` for cross-tab sync.
- Hard delete with confirmation modal (no soft-delete bin).
- Deprecate `sessionStorage["matrix.singlequote.last"]` cleanly; no migration prompt.
- `schemaVersion: 1` field for forward compat with Phase 6 (multi-vision) and Phase 7 (ROM).
- IndexedDB DB name `matrix-quotes`, keyed by UUID v4, indexed on `updatedAt` / `status` / `workspace`.
- Jargon-guard scans every new customer-facing string in this phase (DATA-03 ratchet).
- Library choice for the IndexedDB wrapper deferred to researcher / planner.

## Deferred Ideas

- Cross-device quote sync — durably out for v2.0.
- Status filter UI — sort-only ships; filter only if Ben asks.
- Kanban-style status grouping — out of scope.
- Soft-delete / trash bin — out of scope.
- Quote sharing between SEs — not raised; defer.
- Auto-transitions on workflow status (e.g., on Send action) — no Send action exists today.
- Export / import of saved quotes (JSON sidecar) — not requested; defer.
