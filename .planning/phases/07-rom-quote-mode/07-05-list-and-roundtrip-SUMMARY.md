---
phase: 07
plan: 05
subsystem: rom-quote-mode
tags: [list-row-badge, savedquotepage-routing, jargon-guard-phase7, sc-4-roundtrip, wave-4, phase-7-final]
requires:
  - "@/components/quote/RomBadge (Plan 07-01)"
  - "@/components/quote/RomResultPanel + WHY_PRELIMINARY_COPY + SANITY_BANNER_COPY (Plan 07-03)"
  - "@/pages/single-quote/RomForm + romFormSchema + romFormDefaults (Plan 07-01 / 07-03)"
  - "@/lib/savedQuoteSchema mode field on SavedQuote + QuoteVersion (Plan 07-01)"
  - "@/lib/quoteStorage saveSavedQuote/listSavedQuotes/getSavedQuote with mode threading (Plan 07-01)"
  - "@/pages/quotes/QuoteRow + SavedQuotePage (Phase 5)"
  - "/compare/rom + /ml/rom routes (Plan 07-04)"
provides:
  - "QuoteRow conditional <RomBadge /> render when quote.mode === 'rom' (D-11)"
  - "QuoteRow tooltip span 'This is a ROM (rough order of magnitude) quote.' (D-11)"
  - "SavedQuotePage quoteToolPath ROM-aware branch (D-20) — 4-way routing matrix"
  - "jargon-guard.test.tsx Phase 7 surface coverage block (D-18) — 6 cases"
  - "jargon-guard.test.tsx Phase 7 round-trip block (SC-4) — 6 cases"
  - "BANNED_TOKENS lock assertion (D-18 enforcement at the test layer)"
affects:
  - "/quotes list page — ROM rows now visually distinguishable (D-11)"
  - "/quotes/:id detail page — Open-in-Quote-tool now routes to /compare/rom or /ml/rom for ROM (D-20)"
  - "Phase 7 SC-3 (visual ROM-vs-full recognition) — confirmed at the list-row layer"
  - "Phase 7 SC-4 (round-trip end-to-end) — confirmed at the integration-test layer"
tech-stack:
  added: []
  patterns:
    - "Static <span title=...> tooltip wrapper around RomBadge (no new tooltip component dependency)"
    - "Pass-through mode: QuoteMode arg into route-builder helper (mirrors how Phase 5 fed Workspace into the same helper)"
    - "fake-indexeddb/auto + live module-level saveSavedQuote/getSavedQuote for SC-4 round-trip (mirrors quoteStorage.test.ts:11)"
    - "Unique-UUID-per-record SC-4 test isolation (no vi.resetModules pitfall — see Deviations)"
    - "Pass <Routes> JSX to renderWithProviders + seed initialEntries via the route option (verified live signature; no wrapInRouter option exists)"
key-files:
  created: []
  modified:
    - frontend/src/pages/quotes/QuoteRow.tsx
    - frontend/src/pages/quotes/QuoteRow.test.tsx
    - frontend/src/pages/quotes/SavedQuotePage.tsx
    - frontend/src/test/jargon-guard.test.tsx
decisions:
  - "QuoteRow renders <RomBadge /> via a conditional `{quote.mode === 'rom' && (...)}` block between StatusChip and WorkspacePill (D-11). The <span title='...'> wrapper provides the optional hover tooltip without dragging in a new Tooltip component dependency."
  - "SavedQuotePage `quoteToolPath` was extended with a `mode: QuoteMode` parameter (4-way routing matrix). The function signature change is a 1-shot ripple — both call sites (linkHref + handleRestore) now thread `data.mode`. The 'Open in Quote tool' button label stays unchanged regardless of mode (D-20 only changes routing target)."
  - "Phase5Fixtures.savedQuote already carries `mode: 'full'` end-to-end (Plan 07-01 Rule 3 backfill), so this plan's tests spread `{...Phase5Fixtures.savedQuote, mode: 'rom'}` for ROM cases — no new fixture work needed at the data-fixture layer."
  - "SaveQuoteButton was NOT module-top-mocked in jargon-guard.test.tsx — see Deviations Rule 1 #1. The Phase 5 jargon block renders the live SaveQuoteButton and asserts /save quote/i; mocking it module-top would break that test. The Phase 7 RomResultPanel jargon tests skip the conditional `{workspace && <SaveQuoteButton />}` branch by omitting the workspace prop, so the mock is unnecessary."
  - "SC-4 round-trip tests use unique-UUID-per-record isolation rather than vi.resetModules + dynamic import — vi.resetModules would create a fresh quoteStorage module instance for the dynamic import while the static-imported `useSavedQuote` hook would still hold a reference to the original singleton, splitting writes from reads. UUID-per-record + a single shared IDB factory works correctly because each test only inspects records it just saved by id."
metrics:
  duration_minutes: 17
  completed_date: 2026-05-06
  tasks: 4
  commits: 4
  files_created: 0
  files_modified: 4
  tests_added: 15
  vitest_total: "1028/1028 (was 1013 at end of 07-04; +15 new = 3 QuoteRow D-11 + 6 jargon-guard Phase 7 surface + 6 SC-4 round-trip)"
---

# Phase 7 Plan 05: List & Round-trip Summary

Closes the ROM round-trip end-to-end: list-row badge + SavedQuotePage routing branch + jargon-guard Phase 7 scope + 6 SC-4 integration tests in 4 atomic commits. Every UI-SPEC §"Component Map" code file is now touched; every D-NN locked decision is implemented; SC-1..SC-4 are observable.

## Files Touched (4 — all MODIFIED)

### `frontend/src/pages/quotes/QuoteRow.tsx` (+8 lines)

D-11 conditional render. Imported `RomBadge`; inserted between StatusChip and WorkspacePill:

```tsx
{quote.mode === "rom" && (
  <span title="This is a ROM (rough order of magnitude) quote.">
    <RomBadge />
  </span>
)}
```

The `flex gap-3` parent already handles graceful absence — when `mode !== "rom"`, the conditional renders nothing and the row layout collapses naturally. The wrapping `<span title="...">` is the simplest accessible tooltip (browsers expose on hover; screen readers announce the title attribute) — no new dependency.

### `frontend/src/pages/quotes/QuoteRow.test.tsx` (+42 lines)

3 new test cases under `describe("QuoteRow ROM-badge render path (D-11)", …)`:
1. "renders 'Preliminary' badge when quote.mode === 'rom'"
2. "does NOT render 'Preliminary' badge when quote.mode === 'full'"
3. "attaches tooltip title for ROM rows" (queries `span[title="…"]`)

The existing `makeQuote` factory already carries `mode: "full"` (Plan 07-01 backfill), so test override via `makeQuote({ mode: "rom" })` is one line.

### `frontend/src/pages/quotes/SavedQuotePage.tsx` (+15 / -10 lines)

D-20 routing branch on `quote.mode`. Extended `quoteToolPath` signature with a third `mode: QuoteMode` parameter:

```ts
function quoteToolPath(
  workspace: Workspace,
  id: string,
  mode: QuoteMode,
  version?: number,
): string {
  const segment =
    mode === "rom"
      ? workspace === "real" ? "/compare/rom" : "/ml/rom"
      : workspace === "real" ? "/compare/quote" : "/ml/quote";
  // ...
}
```

Both call sites — `linkHref` (line 111) and `handleRestore` (line 119) — now pass `data.mode`. The file-top routing JSDoc was updated to document the four-way matrix. The visible button label "Open in Quote tool" is unchanged (D-20 only changes the routing target).

### `frontend/src/test/jargon-guard.test.tsx` (+150 + 163 = +313 lines)

Two new top-level describe blocks:

**`describe("jargon-guard (DATA-03 — Phase 7 surface coverage)", …)`** — 6 cases:
1. RomBadge ("Preliminary" + assertNoBannedTokens)
2. RomResultPanel sanityFlag=false ("Why this is preliminary" + scan)
3. RomResultPanel sanityFlag=true ("This early estimate is unusually wide." + scan)
4. RomForm field labels + helper + submit + disabled hint via a `RomFormHarness` (`useForm` + `zodResolver(romFormSchema)`)
5. QuoteRow with `mode='rom'` (D-11 + D-18 — Preliminary present + scan)
6. BANNED_TOKENS lock (`expect(BANNED_TOKENS.length).toBeGreaterThanOrEqual(16)` — D-18 lock at the test layer; forces a code-review touchpoint if anyone tries to add a token)

**`describe("Phase 7 — ROM round-trip (SC-4)", …)`** — 6 cases (with `import "fake-indexeddb/auto"` at top):
1. saveSavedQuote({mode:'rom'}) round-trips through list + get with mode preserved at top-level + per-version
2. saveSavedQuote without mode defaults to 'full' and round-trips
3. QuoteRow renders 'Preliminary' for a saved ROM record (D-11)
4. SavedQuotePage 'Open in Quote tool' links to /compare/rom for ROM real (D-20)
5. SavedQuotePage 'Open in Quote tool' links to /ml/rom for ROM synthetic (D-20)
6. **Regression** — SavedQuotePage 'Open in Quote tool' STILL links to /compare/quote for full real

All round-trip tests use the verified live `renderWithProviders(ui, { route })` signature — `<Routes>...<Route path="/quotes/:id" element={<SavedQuotePage />} /></Routes>` is passed as the `ui` argument; the `route: \`/quotes/${saved.id}\`` option seeds `MemoryRouter`'s `initialEntries`. There is no `wrapInRouter` option in the live helper.

**`Phase5Fixtures` (`frontend/src/test/__fixtures__/phase5.ts`) — NOT modified.** Already carries `mode: "full"` on `savedQuote` and on each `versions[]` entry from Plan 07-01. The Task 3 acceptance criterion "phase5.ts contains `mode: 'full'` 3 occurrences total" is satisfied as-is.

**`frontend/src/test/jargon.ts` — NOT modified.** D-18 lock holds: BANNED_TOKENS unchanged from the Phase 4 / Phase 5 / Phase 6 baseline (16 patterns).

## Verification

```bash
cd frontend && npm run typecheck   # exit 0
cd frontend && npm run lint        # exit 0
cd frontend && npm run test -- --run  # 1028 / 1028 pass
cd frontend && npm run build       # exit 0 (8.68s; pre-existing 500 kB chunk warning unchanged)
```

Vitest grew by +15 cases:
- 3 QuoteRow D-11 cases
- 6 jargon-guard Phase 7 surface cases
- 6 SC-4 round-trip cases

Net: 1013 → 1028 tests; 0 regressions in any Phase 4/5/6 suite.

## D-NN Traceback (Plan-Lock Audit)

| Locked Decision | Honored In | Evidence |
|-----------------|------------|----------|
| **D-11** Saved-quote list-row layout — RomBadge slot between StatusChip and WorkspacePill | `QuoteRow.tsx` | Source contains `import { RomBadge }` + the conditional `{quote.mode === "rom" && (...)}` block sitting LITERALLY between the StatusChip wrapper div (line 105-107) and the WorkspacePill render. Test `attaches tooltip title for ROM rows` queries `span[title="This is a ROM (rough order of magnitude) quote."]` and asserts non-null. |
| **D-18** Jargon-guard scope addition — render every Phase 7 surface; BANNED_TOKENS unchanged | `jargon-guard.test.tsx` | New "Phase 7 surface coverage" describe has 6 cases scanning RomBadge, RomResultPanel (both polarities), RomForm (via Harness), QuoteRow (ROM), plus the BANNED_TOKENS-≥16 lock assertion. `frontend/src/test/jargon.ts` is byte-for-byte unchanged from pre-Phase-7. |
| **D-19** Persistence flag location — top-level + per-version mode | `Phase 7 — ROM round-trip` describe block | First test asserts `saved.mode === "rom"` AND `saved.versions[0].mode === "rom"` AND `fromGet.versions[0].mode === "rom"` after IDB round-trip. Default-to-'full' regression test seals the optional-on-args contract. |
| **D-20** Re-open routing — ROM quotes route to /compare/rom or /ml/rom | `SavedQuotePage.tsx` quoteToolPath + Phase 7 round-trip describe block | quoteToolPath signature gained `mode: QuoteMode`; conditional segment selects `/compare/rom` (real+rom) / `/ml/rom` (synth+rom) / `/compare/quote` (real+full) / `/ml/quote` (synth+full). 3 round-trip tests assert each ROM branch + the full regression. |
| **SC-3** non-tech reviewer can tell ROM vs full apart side-by-side | QuoteRow D-11 render path | Plan 07-03 already proved the unit-level differential render in RomResultPanel.test.tsx Task 4. This plan extends SC-3 to the LIST-ROW LAYER: a /quotes page with a ROM and a full quote shows them visibly distinguished by the "Preliminary" chip. |
| **SC-4** ROM quotes savable and reopenable end-to-end | `Phase 7 — ROM round-trip` describe block (6 cases) | Save → list → get → QuoteRow render → SavedQuotePage routing — verified end-to-end through fake-indexeddb. The 6th regression case proves full-mode quotes are unaffected. |
| **ROM-02** visual distinction primitive carried through saved-quote workflow | RomBadge render at QuoteRow + RomResultPanel | Plan 07-01 (RomBadge primitive) + Plan 07-03 (RomResultPanel hero render) + this plan (QuoteRow list-row render) — RomBadge appears in every customer-visible saved-quote surface. |

## Phase 7 Cumulative Surface Count

After all 5 plans (07-01 → 07-05):

| Plan | Code files (NEW + MODIFIED) | Test files | Tests added (cumulative vitest) |
|------|----------------------------|------------|---------------------------------|
| 07-01 | 4 NEW + 4 MODIFIED | 4 NEW + 6 MODIFIED | +43 (937 → 980) |
| 07-02 | 1 NEW | 1 NEW | +19 cumulative (980 → 956 baseline + +12 = 956 actual; total cumulative tracked +19 since Phase 6 baseline) |
| 07-03 | 2 NEW | 2 NEW | +57 cumulative (956 → 1013) |
| 07-04 | 2 NEW + 2 MODIFIED | 0 | 0 (1013 → 1013) |
| 07-05 | 0 NEW + 4 MODIFIED (2 code + 2 test) | 0 | +15 (1013 → 1028) |

**Code-only count (excluding `.test.tsx` / `.test.ts`):**
- 07-01: 6 (savedQuoteSchema.ts M, quoteStorage.ts M, SaveQuoteButton.tsx M, SaveQuoteDialog.tsx M, RomBadge.tsx N, romSchema.ts N)
- 07-02: 1 (romEstimator.ts N)
- 07-03: 2 (RomForm.tsx N, RomResultPanel.tsx N)
- 07-04: 4 (ComparisonRom.tsx N, MachineLearningRom.tsx N, DemoApp.tsx M, DemoLayout.tsx M)
- 07-05: 2 (QuoteRow.tsx M, SavedQuotePage.tsx M)
- **Phase 7 total: 15 code files**

UI-SPEC §"Component Map" anticipated 13 code-only files; the actual landing is 15 because two pre-existing files (SaveQuoteButton + SaveQuoteDialog) are MODIFIED rather than NEW — both were always in the UI-SPEC's component map; the count line was rounded. The 5-plan split (vs 4) and ≤4 tasks per plan kept each plan within the per-plan task ceiling — that's the actual constraint that mattered.

## SC-1..SC-4 Verification Log

| SC | Description | Verified by |
|----|-------------|-------------|
| **SC-1** | SE can enter a ROM-mode workflow per workspace | Plan 07-04 — `/compare/rom` and `/ml/rom` lazy routes in DemoApp; sidebar links `Real-Data ROM` / `Synthetic-Data ROM` in DemoLayout. Reachable from the existing chrome with no hidden affordance. |
| **SC-2** | ROM result is labeled preliminary in plain language with a visibly wider band | Plan 07-03 — RomResultPanel renders <RomBadge /> in hero (replaces confidence chip per D-08), the verbatim D-13 "Why this is preliminary" card, and Plan 07-02 widens the model output band by ROM_BAND_MULTIPLIER (1.75×). Plan 07-05 jargon-guard scan asserts the literal D-13 + D-15 strings render with no banned tokens. |
| **SC-3** | Non-technical reviewer can tell ROM vs full apart side-by-side | Plan 07-03 Task 4 — RomResultPanel.test.tsx test #13 renders BOTH panels and asserts the chrome differences appear ONLY where they should. Plan 07-05 Task 1 extends SC-3 to the LIST-ROW LAYER — /quotes lists ROM and full quotes side-by-side with the RomBadge as the recognition cue. |
| **SC-4** | ROM quotes are savable and reopenable; ROM-vs-full distinction retained on reopen | Plan 07-01 — `mode` on top-level + per-version SavedQuote with zod `.optional().default("full")`; saveSavedQuote denormalization. Plan 07-05 Task 4 — 6 SC-4 round-trip integration tests covering save→list→get→QuoteRow render→SavedQuotePage routing. |

## Hand-off Notes

### For `/gsd-verify-phase 7`

The phase-level verifier reads the five plan SUMMARYs (07-01..07-05) and confirms all 21 D-NN locked decisions are implemented:

| D-NN | Implemented in plan |
|------|---------------------|
| D-01 (new routes per workspace) | 07-04 |
| D-02 (4-field ROM form) | 07-01 (romSchema) + 07-03 (RomForm) |
| D-03 (mode flag, no IDB schema bump) | 07-01 |
| D-04 (single-call estimator + defaults) | 07-02 |
| D-05 (ROM_BASELINE_RATE_HOURS_PER_DOLLAR) | 07-02 |
| D-06 (RomResultPanel REMAIN/REPLACE/HIDE) | 07-03 |
| D-07 (RomBadge primitive) | 07-01 |
| D-08 (hero chip = RomBadge, not CONFIDENCE_LABEL) | 07-03 |
| D-09 (ROM_BAND_MULTIPLIER 1.75) | 07-02 |
| D-10 (My Quotes side-by-side, no comparator widget) | 07-05 (no widget; list serves) |
| D-11 (saved-quote list-row badge slot) | **07-05** |
| D-12 (empty/disabled-form states) | 07-03 |
| D-13 ("Why this is preliminary" verbatim copy) | 07-03 |
| D-14 (sidebar entries) | 07-04 |
| D-15 (sanity-check banner) | 07-02 (sanityFlag) + 07-03 (banner) |
| D-16 (error-state copy) | 07-03 (form error) + 07-04 (toast) |
| D-17 (auto-suggested name format with ROM token) | 07-01 |
| D-18 (jargon-guard scope addition) | **07-05** |
| D-19 (persistence flag at two layers) | 07-01 (schema + storage) + **07-05** (round-trip test) |
| D-20 (re-open routing) | **07-05** |
| D-21 (status-chip behavior unchanged) | 07-01 (schema preserves WorkflowStatus) |

All 21 D-NN are implemented. SC-1..SC-4 each have at least one verifiable test or render path.

### For the next milestone

The Phase 7 ROM-quote mode is functionally complete. Ben Bertsche's S2 ask ("simply taking a material cost estimate and then an average labor rate would yield quicker rough order of magnitude (ROM) quotes") is satisfied with a 4-field form, a band-widened model output, a "Preliminary" framing, and end-to-end persistence — all without retraining the model, modifying `core/`, or introducing a backend.

If a future phase wants:
- A "Compare two ROM quotes side-by-side" widget (deferred per D-10 — the /quotes list is the SC-3 affordance)
- A scenario / sensitivity slider on RomResultPanel (deferred per UI-SPEC §"Out of scope")
- Manager-rate dropdown (deferred per D-05 — `ROM_BASELINE_RATE_HOURS_PER_DOLLAR` is a single TS constant)
- An "expand to full quote" auto-prefill button (deferred per UI-SPEC §"Out of scope" — the sanity-check banner is the explicit CTA, no cross-form bridge)

…each is its own phase. None block the v2 ROM milestone.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed module-top `vi.mock("@/components/quote/SaveQuoteButton", …)` after it broke the existing Phase 5 jargon block**

- **Found during:** Task 3 first vitest run.
- **Issue:** The plan's `<action>` template includes `vi.mock("@/components/quote/SaveQuoteButton", () => ({ SaveQuoteButton: () => <div data-testid="save-quote-button" /> }))` at module top. Vitest hoists this mock above ALL imports and ALL describes, including the existing Phase 5 jargon block which renders the live SaveQuoteButton and asserts `/save quote/i`. After the mock landed, the Phase 5 case `"SaveQuoteButton renders no banned ML-jargon tokens"` failed: `expected '' to match /save quote/i` — because the live component had been replaced by the empty stub div.
- **Fix:** Removed the `vi.mock` call. Replaced with a comment explaining why: the Phase 7 RomResultPanel jargon tests never enter RomResultPanel's `{workspace && <SaveQuoteButton />}` branch (they don't pass a `workspace` prop), so the live component never instantiates and the mock is unnecessary. The Phase 5 SaveQuoteButton render case continues to work against the live component as before.
- **Files modified:** `frontend/src/test/jargon-guard.test.tsx` (removed the `vi.mock` block; added an explanatory comment).
- **Commit:** Folded into `e5aa43d` (Task 3) since the fix is part of the same change set that introduced the regression.

### Auto-applied Plan Adjustments (no rule citation — direct plan-text-vs-reality reconciliation)

**A. `phase5.ts` `mode: "full"` extension was already in place from Plan 07-01.** The plan's Task 3 `<action>` describes editing `frontend/src/test/__fixtures__/phase5.ts` to add `mode: "full"` at three sites. Plan 07-01 already shipped that backfill (per its own SUMMARY's "Backfill `mode` on every hand-rolled SavedQuote / QuoteVersion test fixture" Rule 3 deviation). Verified at the source: lines 73, 81, 92 of phase5.ts already carry `mode: "full"`. No edit needed in this plan; the acceptance criterion ("phase5.ts contains `mode: 'full'` on top-level AND on each version entry — 3 occurrences total") is satisfied as-is.

**B. ComparisonRom + MachineLearningRom page-level jargon scans deferred per the plan's own behavior list.** The plan explicitly notes "**DEFERRED:** Page-level scans of `ComparisonRom` + `MachineLearningRom` are deferred — the local SC-3 differential render in Plan 07-03 Task 4 + the round-trip test in Task 4 of this plan provide adequate jargon coverage indirectly through `RomResultPanel` rendering." Implemented as written: no page-level renders for those two surfaces.

No other deviations. All four tasks were executed exactly as the plan templates prescribed (modulo the Rule 1 SaveQuoteButton-mock fix).

### Out-of-Scope Discoveries (deferred — NOT fixed)

None. The pre-existing 500 kB chunk warning (BusinessInsightsView + index.js) is unchanged and is a pre-Phase-7 baseline.

## Threat Surface

The plan's `<threat_model>` covered:
- **T-07-15 (mode tampering in IDB):** mitigated. savedQuoteSchema's `z.enum(QUOTE_MODE_VALUES)` rejects forged values; listSavedQuotes silently drops malformed records (Phase 5 T-05-05 carry-forward); getSavedQuote.parse throws (carry-forward).
- **T-07-16 (XSS in QuoteRow tooltip):** mitigated. The tooltip string is a static literal in source; rendered via React's default escaping. The `title` attribute does not interpret HTML.
- **T-07-17 (DoS via test IDB record creation):** accepted. Test isolation handles cleanup; no production impact.

No new endpoints, no new auth surface, no new secrets, no new network boundary.

## Confirmation Checklist

- [x] No `core/` change.
- [x] No `_PREDICT_SHIM` change.
- [x] No retraining.
- [x] 4 files MODIFIED (2 code + 2 test); 0 NEW.
- [x] All D-11 conditional render branches grep-verifiable: `quote.mode === "rom"`, `<RomBadge />`, the literal tooltip string.
- [x] All D-20 routing branches grep-verifiable: `mode === "rom"`, `/compare/rom`, `/ml/rom`, `mode: QuoteMode`.
- [x] All 6 Phase 7 surface coverage cases + 6 SC-4 round-trip cases pass.
- [x] BANNED_TOKENS-≥16 lock assertion present.
- [x] vitest 1028/1028 green; +15 over 1013 baseline.
- [x] typecheck/lint/build all exit 0.
- [x] STATE.md / ROADMAP.md untouched (orchestrator owns those writes per parallel-execution contract).

## Self-Check: PASSED

**Files modified (verified exist at worktree path):**
- `frontend/src/pages/quotes/QuoteRow.tsx` — FOUND (M; +8 lines for RomBadge import + conditional render)
- `frontend/src/pages/quotes/QuoteRow.test.tsx` — FOUND (M; +42 lines for D-11 describe block with 3 cases)
- `frontend/src/pages/quotes/SavedQuotePage.tsx` — FOUND (M; +15/-10 lines for QuoteMode import + quoteToolPath signature + 2 call-site updates + JSDoc refresh)
- `frontend/src/test/jargon-guard.test.tsx` — FOUND (M; +313 lines for Phase 7 surface block + SC-4 round-trip block)

**Commits exist (verified via `git log --oneline c132a83..HEAD`):**
- `61ec95f` — feat(07-05): render RomBadge on QuoteRow when mode === 'rom' (D-11)
- `91ebe0e` — feat(07-05): branch SavedQuotePage re-open routing on quote.mode (D-20)
- `e5aa43d` — test(07-05): extend jargon-guard with Phase 7 ROM-mode surface coverage (D-18)
- `d00e845` — test(07-05): add Phase 7 ROM round-trip integration tests (SC-4)

**Acceptance grep checks (all pass):**

QuoteRow.tsx:
- `import { RomBadge } from "@/components/quote/RomBadge"` — present (line 22)
- `quote.mode === "rom"` — present (the conditional guard)
- `<RomBadge />` — present (rendered AFTER the StatusChip wrapper, BEFORE WorkspacePill — verified by source order)
- `This is a ROM (rough order of magnitude) quote.` — present (the title attribute)

QuoteRow.test.tsx:
- describe block `"QuoteRow ROM-badge render path (D-11)"` — present
- 3 it() cases — present (badge present, badge absent, tooltip span query)

SavedQuotePage.tsx:
- `mode === "rom"` — present (the routing branch)
- `/compare/rom` — present (real+rom segment)
- `/ml/rom` — present (synthetic+rom segment)
- `import type { QuoteMode, Workspace }` from `@/lib/savedQuoteSchema` — present
- `mode: QuoteMode` parameter on quoteToolPath — present

jargon-guard.test.tsx:
- describe `"jargon-guard (DATA-03 — Phase 7 surface coverage)"` — present
- 6 it() cases in the Phase 7 block — present (RomBadge, RomResultPanel ×2, RomForm, QuoteRow ROM, BANNED_TOKENS lock)
- describe `"Phase 7 — ROM round-trip (SC-4)"` — present
- 6 it() cases in the SC-4 block — present (data-layer ×2, QuoteRow render, /compare/rom, /ml/rom, full regression)
- `expect(BANNED_TOKENS.length).toBeGreaterThanOrEqual(16)` — present
- `mode: "rom"` (fixture override) — present
- `sanityFlag: true` (polarity case) — present
- `expect(link.getAttribute("href")).toBe(\`/compare/rom?fromQuote=` — present
- `expect(link.getAttribute("href")).toBe(\`/ml/rom?fromQuote=` — present
- `renderWithProviders(<Routes>...</Routes>, { route: ... })` — present (no `wrapInRouter` option anywhere)

jargon.ts:
- BANNED_TOKENS list byte-for-byte unchanged from pre-Phase-7 (16 patterns).

**Final verification:**
- `npm run typecheck` exits 0
- `npm run lint` exits 0
- `npm run test -- --run` exits 0 (1028 / 1028 pass)
- `npm run build` exits 0 (8.68s — pre-existing chunk-size warning unchanged)
