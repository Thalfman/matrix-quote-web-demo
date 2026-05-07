---
phase: 07
plan: 04
subsystem: rom-quote-mode
tags: [pages, routes, sidebar, rom-page, wave-3, phase-7]
requires:
  - "@/pages/single-quote/RomForm (Plan 07-03)"
  - "@/components/quote/RomResultPanel (Plan 07-03)"
  - "@/demo/romEstimator (Plan 07-02 — estimateRom + RomMetadata)"
  - "@/pages/single-quote/romSchema (Plan 07-01 — romFormSchema, romFormDefaults, RomFormValues)"
  - "@/demo/realProjects (useRealProjects + useSyntheticPool — verified live)"
  - "@/demo/modelMetrics (useModelMetrics)"
  - "@/demo/pyodideClient (ensurePyodideReady, ensureModelsReady, subscribe)"
  - "@/hooks/useSavedQuotes (useSavedQuote — fromQuote URL hydration)"
provides:
  - "ComparisonRom — /compare/rom page handler (Real Data ROM)"
  - "MachineLearningRom — /ml/rom page handler (Synthetic Data ROM)"
  - "/compare/rom route (lazy-loaded) in DemoApp"
  - "/ml/rom route (lazy-loaded) in DemoApp"
  - "Real-Data ROM SidebarLink in REAL DATA group"
  - "Synthetic-Data ROM SidebarLink in SYNTHETIC DATA group"
affects:
  - "Plan 07-05 — list-row badge render, SavedQuotePage routing branch, jargon-guard scope, SC-4 round-trip integration tests; ROM tool now reachable end-to-end so 07-05 can wire the open-from-list flow"
tech-stack:
  added: []
  patterns:
    - "Lazy-loaded route entries (React.lazy + Suspense) — same as every other DemoApp page"
    - "Page-handler shim mirrors ComparisonQuote / MachineLearningQuoteTool: Pyodide warmup → dropdowns derivation → useForm → ?fromQuote hydration → submit → scrollIntoView"
    - "Defensive openedQuote.mode === 'rom' guard before form.reset (D-20)"
    - "Sidebar slot order locked to D-14: Quote → ROM → Compare → Business Insights"
key-files:
  created:
    - frontend/src/pages/demo/compare/ComparisonRom.tsx
    - frontend/src/pages/demo/ml/MachineLearningRom.tsx
  modified:
    - frontend/src/DemoApp.tsx
    - frontend/src/components/DemoLayout.tsx
decisions:
  - "ComparisonRom and MachineLearningRom each own a useForm({resolver: zodResolver(romFormSchema), mode: 'onChange'}) — `onChange` matches the disabled-gate semantics RomForm.test.tsx asserts; `onBlur` (the QuoteForm choice) would briefly leave the submit button enabled before the first blur."
  - "MachineLearningRom imports useSyntheticPool from @/demo/realProjects — verified live (MachineLearningQuoteTool.tsx line 17). useSyntheticProjects / useTrainingProjects do not exist."
  - "Catch-all route in DemoApp unchanged; ROM routes are NEW per D-01 (not aliases of /quote)."
  - "MobileSubViewTabs / SUB_VIEWS array unchanged — D-14 sidebar entries land in the desktop sidebar only; the mobile sub-view strip intentionally stays at quote/compare/insights (UI-SPEC §Out of scope; Phase 7 doesn't extend mobile chrome)."
  - "supportingLabel differs by workspace per existing precedent: 'Most similar past projects' (real, ComparisonQuote precedent) vs 'Most similar training rows' (synthetic, MachineLearningQuoteTool precedent)."
  - "Toast catch block uses bare `catch` (no err binding) since the D-16 toast string is verbatim and ignores the underlying error message — eslint's no-unused-vars would flag the bound error otherwise."
metrics:
  duration_minutes: 14
  completed_date: 2026-05-06
  tasks: 4
  commits: 4
  files_created: 2
  files_modified: 2
  tests_added: 0
  vitest_total: "1013/1013 (unchanged from 07-03 baseline — page handlers don't add tests in this plan; SC-4 round-trip tests land in 07-05)"
---

# Phase 7 Plan 04: Pages & Routes Summary

Wired the two new ROM pages (one per workspace), the two new lazy-loaded routes, and the two new sidebar links — the ROM tool is now reachable end-to-end from the sidebar; Plan 07-05 lands the list-row badge, the SavedQuotePage routing branch, the jargon-guard scope extension, and the SC-4 round-trip integration tests.

## Files Touched

### Created (2)

- **`frontend/src/pages/demo/compare/ComparisonRom.tsx`** (262 lines, NEW) — Real Data ROM page handler.
  Pattern-mirrors `ComparisonQuote.tsx`: same Pyodide ready/error/result lifecycle, same `buildDropdowns`, same `useHotkey({key:"Enter", meta/ctrl})`, same `requestAnimationFrame` scrollIntoView. Differences: `RomForm` instead of `QuoteForm`, `estimateRom` instead of `aggregateMultiVisionEstimate`, `RomResultPanel` instead of `QuoteResultPanel`. Owns the `useForm({resolver: zodResolver(romFormSchema), mode: "onChange"})` instance, the `formRef`, the dropdowns, and the `result` state. Implements D-20 hydration with the defensive `openedQuote.mode === "rom"` guard.

- **`frontend/src/pages/demo/ml/MachineLearningRom.tsx`** (263 lines, NEW) — Synthetic Data ROM page handler.
  Same shape as `ComparisonRom` but with synthetic-side wiring: `useSyntheticPool` from `@/demo/realProjects` (verified live — same hook `MachineLearningQuoteTool.tsx` uses), `useModelMetrics("synthetic")`, `ensureModelsReady("synthetic")`, `dataset: "synthetic"` in `estimateRom`, `workspace="synthetic"` on `RomResultPanel`, `<DataProvenanceNote variant="synthetic" />`. PageHeader title + description identical to `ComparisonRom` (Copywriting Contract — only data provenance differs); eyebrow swaps `Real Data · ROM Quote` → `Synthetic Data · ROM Quote`.

### Modified (2)

- **`frontend/src/DemoApp.tsx`** (+12 lines) — Added two lazy imports (`ComparisonRom`, `MachineLearningRom`) next to the existing `ComparisonQuote` / `MachineLearningQuote` imports, and two new `<Route>` entries inside the existing `<Route element={<DemoLayout />}>` block:
  - `<Route path="compare/rom" element={<ComparisonRom />} />` (after `compare/quote`)
  - `<Route path="ml/rom" element={<MachineLearningRom />} />` (after `ml/quote`)
  Build emits both as their own lazy chunks (`ComparisonRom-*.js`, `MachineLearningRom-*.js` in `dist/assets/`).

- **`frontend/src/components/DemoLayout.tsx`** (+2 lines) — Added two new `<SidebarLink>` entries in the locked slot order (D-14):
  - REAL DATA group: `Quote → Real-Data ROM → Compare → Business Insights`
  - SYNTHETIC DATA group: `Quote → Synthetic-Data ROM → Compare → Business Insights`
  Labels are verbatim per the Copywriting Contract: `Real-Data ROM` and `Synthetic-Data ROM` (NOT bare `ROM` or `ROM Quote`). The mobile `MobileSubViewTabs` / `SUB_VIEWS` array is intentionally unchanged — UI-SPEC §"Out of scope" excludes ROM from the mobile bottom-tab strip for Phase 7.

## Verification

```bash
cd frontend && npm run typecheck   # exit 0
cd frontend && npm run lint        # exit 0
cd frontend && npm run build       # exit 0 (8.46s)
cd frontend && npm run test -- --run   # 1013 / 1013 pass (run after Task 4)
```

Build emits two new lazy chunks for the ROM pages — verified via `ls dist/assets/`:
```
ComparisonRom-2A3pbzh6.js
MachineLearningRom-B4FdXnFW.js
```

## D-NN Traceback (Plan-Lock Audit)

| Locked Decision | Honored In | Evidence |
|-----------------|------------|----------|
| **D-01** New routes per workspace, not a tab toggle | `DemoApp.tsx` + 2 page files | `path="compare/rom"` and `path="ml/rom"` are new Route entries, not aliases. `<ComparisonRom />` and `<MachineLearningRom />` are dedicated page handlers, not modes of the existing Single Quote tab. |
| **D-12** Page-level lifecycle: ready/error/result + form-disabled until valid | `ComparisonRom.tsx` + `MachineLearningRom.tsx` | Both pages render `<PyodideLoader />` while not-ready, the runtime-failure card on error (D-16 verbatim toast on submit-time failure separately), then RomForm + RomResultPanel on ready. RomForm itself owns the disabled-button hint (D-12) — page handler just feeds `submitting`. |
| **D-14** Sidebar entries with verbatim labels | `DemoLayout.tsx` | `<SidebarLink to="/compare/rom" label="Real-Data ROM" />` between `/compare/quote` and `/compare/compare`; `<SidebarLink to="/ml/rom" label="Synthetic-Data ROM" />` between `/ml/quote` and `/ml/compare`. Verified absence of bare `label="ROM"`. |
| **D-16** Runtime-failure toast verbatim | `ComparisonRom.tsx:170` + `MachineLearningRom.tsx:171` | `toast.error("Couldn't produce a ROM estimate. Try again, or open the full Quote tool for more detail.")` — exact-string match in both pages. |
| **D-20** `?fromQuote` URL-param hydration mirrored on RomQuoteTool, with defensive guard | `ComparisonRom.tsx:73-75 + 121-135` + same pattern in `MachineLearningRom.tsx` | `useSearchParams()` reads `fromQuote` → `useSavedQuote(fromQuoteId)` → second `useEffect` calls `form.reset({...})` ONLY if `openedQuote.mode === "rom"`. The mode guard means a forged URL pointing at a full quote does not stuff its values into the ROM form (T-07-12 mitigation). |

## Hand-off Notes

### For Plan 07-05 (list-row badge + re-open routing + jargon-guard ext + SC-4 round-trip)

The `/compare/rom` and `/ml/rom` routes are live and reachable from the sidebar. Plan 07-05's remaining surface:

1. **`QuoteRow.tsx` extension (D-11):** render `<RomBadge />` between `StatusChip` and `WorkspacePill` when `quote.mode === "rom"`. ~5-line conditional addition.
2. **`SavedQuotePage.tsx` routing branch (D-20):** when `quote.mode === "rom"`, the "Open in Quote tool" button routes to `/compare/rom?fromQuote={id}` or `/ml/rom?fromQuote={id}` (depending on workspace); when `mode === "full"`, existing routing applies.
3. **`jargon-guard.test.tsx` extension (D-18):** add render fixtures for `RomForm`, `RomResultPanel`, `ComparisonRom`, `MachineLearningRom`, the new sidebar entries, and the `QuoteRow` ROM-badge tooltip. Re-import `WHY_PRELIMINARY_COPY` and `SANITY_BANNER_COPY` from `RomResultPanel` so the scan reads from one source.
4. **SC-4 round-trip integration tests:** save a ROM quote → list shows ROM badge → open from list → page handler hydrates → re-save appends a version → version-history list still shows ROM badge per version.

The `ComparisonRom.tsx` defensive `openedQuote.mode === "rom"` guard means 07-05 can land the SavedQuotePage routing branch without an interim broken state — until 07-05 ships, opening a non-ROM quote on `/compare/rom?fromQuote={id}` is a no-op (the form stays at defaults).

### Wiring contract for the dropdowns prop (cross-page invariant)

Both pages call `buildDropdowns(pool)` and pass the resulting `{industry_segment, system_category, automation_level}` triple to `RomForm`. The shape is a strict subset of the Single Quote dropdowns (which also include `plc_family`, `hmi_family`, `vision_type` — none used in ROM). RomForm.tsx's prop typing already enforces this subset.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree write paths required worktree-absolute prefix, not parent-repo prefix**

- **Found during:** Task 1 commit attempt — `git status` from the worktree showed no staged file even though `Write` reported success. The first `Write` call had used `C:\Users\thalf\OneDrive\Documents\Matrix\matrix-quote-web-demo\frontend\src\pages\demo\compare\ComparisonRom.tsx` (parent-repo absolute path), which landed in the parent repo, NOT the worktree at `.../.claude/worktrees/agent-af7d9270f404abcc3/...`.
- **Fix:** `rm` removed the stray file from the parent repo, then re-Wrote to the worktree-absolute path. All subsequent Write/Edit calls used the worktree path.
- **Files affected:** `frontend/src/pages/demo/compare/ComparisonRom.tsx` (recreated at correct worktree path; identical content).
- **Risk:** None — the parent-repo file was deleted before any commit; worktree state is clean and matches the plan's intent.

**2. [Rule 3 - Blocking] `npm ci` was needed before typecheck/lint/build could run**

- **Found during:** Task 1 verify — `npm run typecheck` reported `tsconfig.json` errors about unknown compiler options because the worktree had no `node_modules`.
- **Fix:** Ran `npm ci --prefer-offline --no-audit --progress=false` in the worktree's `frontend/` dir. Subsequent runs of typecheck / lint / build all clean.
- **Risk:** None — install added 574 packages from package-lock; no source changes.

**3. [Rule 1 - Bug] Bare `catch` instead of `catch (err)` in submit handler**

- **Found during:** First lint run on Task 1 — eslint flagged the unused `err` binding when the toast body is verbatim and doesn't include the error message.
- **Issue:** The D-16 toast copy is fixed (`Couldn't produce a ROM estimate. Try again, or open the full Quote tool for more detail.`) — there's no place to surface the underlying error message in user-visible UI. Binding `err` and ignoring it would trigger `@typescript-eslint/no-unused-vars`.
- **Fix:** Used bare `catch { toast.error(...) }` (TS 4.4+ optional catch binding). Same treatment in MachineLearningRom.tsx for symmetry.
- **Files affected:** ComparisonRom.tsx, MachineLearningRom.tsx.

No other deviations. Every plan-locked decision was honored.

### Out-of-Scope Discoveries (deferred — NOT fixed)

None. The pre-existing 500 kB chunk warning (BusinessInsightsView + index.js) is unchanged and is pre-Phase-7 baseline.

## Threat Surface

The plan's `<threat_model>` covered:
- **T-07-12 (URL `?fromQuote={id}` tampering):** mitigated. `useSavedQuote.parse` validates via `savedQuoteSchema`. ComparisonRom's defensive `openedQuote.mode === "rom"` guard prevents hydrating a full quote into the ROM form even if SavedQuotePage's routing branch (lands in 07-05) is bypassed.
- **T-07-13 (information disclosure via `?fromQuote={id}`):** accepted. Same posture as Phase 5 — only quotes in this browser's IDB are accessible; the UUID is not a security secret.
- **T-07-14 (sidebar link spoofing):** accepted. Static link targets; no user input shapes the path.

No new endpoints, no new auth surface, no new secrets, no new network boundary.

## Confirmation Checklist

- [x] No `core/` change.
- [x] No `_PREDICT_SHIM` change.
- [x] No retraining.
- [x] 4 files touched (2 NEW + 2 MODIFIED) — exactly as planned.
- [x] All 11 grep-verifiable strings/patterns from the plan's `<acceptance_criteria>` confirmed via Grep.
- [x] vitest 1013/1013 still green (no test breakage from Layout / DemoApp changes).
- [x] typecheck/lint/build all exit 0.
- [x] Lazy chunks emitted for both ROM pages (verified in `dist/assets/`).
- [x] STATE.md / ROADMAP.md untouched (orchestrator owns those writes per parallel-execution contract).

## Self-Check: PASSED

**Files created/modified (verified exist at worktree path):**
- `frontend/src/pages/demo/compare/ComparisonRom.tsx` — FOUND (NEW)
- `frontend/src/pages/demo/ml/MachineLearningRom.tsx` — FOUND (NEW)
- `frontend/src/DemoApp.tsx` — FOUND (modified — `ComparisonRom` + `MachineLearningRom` lazy + `path="compare/rom"` + `path="ml/rom"`)
- `frontend/src/components/DemoLayout.tsx` — FOUND (modified — `Real-Data ROM` + `Synthetic-Data ROM` SidebarLinks)

**Commits exist (verified via `git log --oneline 9d64de1..HEAD`):**
- `f9bed8c` — feat(07-04): add ComparisonRom page — Real Data ROM Quote tool (D-01)
- `d5d84c8` — feat(07-04): add MachineLearningRom page — Synthetic Data ROM Quote tool (D-01)
- `e7651d5` — feat(07-04): add /compare/rom and /ml/rom routes to DemoApp (D-01)
- `93a442f` — feat(07-04): add Real-Data ROM + Synthetic-Data ROM sidebar links (D-14)

**Acceptance grep checks (all pass):**
- ComparisonRom.tsx: `export function ComparisonRom`, `estimateRom(`, `<RomForm`, `<RomResultPanel`, `Real Data · ROM Quote`, `Quick early estimate`, the full description sentence, the D-16 toast verbatim, `useSearchParams` + `fromQuote`, `openedQuote.mode === "rom"`, `dataset: "real"` — all present.
- MachineLearningRom.tsx: `export function MachineLearningRom`, `import { useSyntheticPool } from "@/demo/realProjects"`, `dataset: "synthetic"`, `Synthetic Data · ROM Quote`, `Quick early estimate`, the description sentence verbatim, `<DataProvenanceNote variant="synthetic"`, `<RomForm`, `<RomResultPanel` with `workspace="synthetic"` — all present.
- DemoApp.tsx: `const ComparisonRom = lazy(`, `const MachineLearningRom = lazy(`, `path="compare/rom"`, `path="ml/rom"`, `<ComparisonRom />`, `<MachineLearningRom />` — all present.
- DemoLayout.tsx: `to="/compare/rom"` + `label="Real-Data ROM"`, `to="/ml/rom"` + `label="Synthetic-Data ROM"`, no bare `label="ROM"`. Slot order correct.

**Final verification:**
- `npm run typecheck` exits 0
- `npm run lint` exits 0
- `npm run test -- --run` exits 0 (1013 / 1013 pass)
- `npm run build` exits 0 (8.46s — pre-existing chunk-size warning unchanged)
