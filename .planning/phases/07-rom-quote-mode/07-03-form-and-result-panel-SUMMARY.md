---
phase: 07
plan: 03
subsystem: rom-quote-mode
tags: [rom-form, rom-result-panel, ui-chrome, sc-3-differential, phase-7, wave-2]
requires:
  - "@/components/Field + @/components/Select (v1.0 primitives)"
  - "@/components/quote/RomBadge (Plan 07-01)"
  - "@/components/quote/SaveQuoteButton with optional mode prop (Plan 07-01)"
  - "@/pages/single-quote/romSchema (RomFormValues, romFormSchema, romFormDefaults — Plan 07-01)"
  - "@/demo/romEstimator (RomMetadata — Plan 07-02)"
  - "@/lib/savedQuoteSchema deriveSalesBucket (Phase 5)"
  - "@/components/quote/QuoteResultPanel (Phase 5/6 — used as SC-3 differential)"
provides:
  - "<RomForm /> — 4-field react-hook-form + zod surface (D-02)"
  - "<RomResultPanel /> — ROM-mode result chrome (D-06/D-08/D-13/D-15/D-19)"
  - "WHY_PRELIMINARY_COPY — verbatim D-13 string exported as constant"
  - "SANITY_BANNER_COPY — verbatim D-15 string exported as constant"
  - "RomFormProps + RomResultPanelProps interfaces"
affects:
  - "Plan 07-04 (pages + routes) — page handlers compose RomForm + RomResultPanel"
  - "Plan 07-05 (jargon-guard + round-trip) — SC-3 differential render is unit-test-grep-verified here, freeing 07-05 to focus on jargon scans + SC-4 round-trip"
tech-stack:
  added: []
  patterns:
    - "Parent-controlled form (formRef + UseFormReturn passed in) — same shape as QuoteForm"
    - "Verbatim copy pinned to exported constants so jargon-guard scans read from one source"
    - "vi.mock('@/components/quote/SaveQuoteButton', ...) spy to assert prop threading without TanStack QueryClient"
    - "Sequential render+unmount within one test for side-by-side differential rendering (avoids two roots)"
key-files:
  created:
    - frontend/src/pages/single-quote/RomForm.tsx
    - frontend/src/pages/single-quote/RomForm.test.tsx
    - frontend/src/components/quote/RomResultPanel.tsx
    - frontend/src/components/quote/RomResultPanel.test.tsx
  modified: []
decisions:
  - "RomForm reuses Field/Select from @/components — no fork, no new form-field component (UI-SPEC §RomForm anatomy)."
  - "isValid gate uses react-hook-form mode='onChange' in the test harness so disabled-state assertions are deterministic; production parent will pick the appropriate mode in 07-04."
  - "RomForm is field-cluster-only — parent owns the formRef, useForm instance, dropdowns, and onSubmit handler (mirrors QuoteForm split). 07-04 will own estimateRom invocation."
  - "RomResultPanel imports RomBadge directly so no QuoteResultPanel changes are required (sibling, not fork)."
  - "WHY_PRELIMINARY_COPY and SANITY_BANNER_COPY are EXPORTED so the test file can assert against them by reference (one source of truth) and Plan 07-05's jargon-guard scan can re-import them without a copy-paste hazard."
  - "SaveQuoteButton mocked via vi.mock to capture the mode prop without dragging TanStack QueryClient into a presentational test. Mock returns a div with data-testid for visibility."
  - "SC-3 side-by-side differential is in this plan's Task 4 (unit test) so SC-3 passes at the unit-test layer, not just at 07-05's broader scan."
metrics:
  duration_minutes: 13
  completed_date: 2026-05-06
  tasks: 4
  commits: 4
  files_created: 4
  files_modified: 0
  tests_added: 21
  vitest_total: "1013/1013 (was 956 after 07-02; +57 since, of which 21 land here: 8 RomForm + 13 RomResultPanel)"
---

# Phase 7 Plan 03: Form & Result Panel Summary

Composed the two ROM-specific UI surfaces (RomForm + RomResultPanel) from the Wave-1 primitives in 4 atomic commits, with SC-3 side-by-side differential render verified at the unit-test layer.

## What Shipped

### `frontend/src/pages/single-quote/RomForm.tsx` (NEW, 123 lines)

```typescript
export interface RomFormProps {
  formRef: RefObject<HTMLFormElement>;
  form: UseFormReturn<RomFormValues>;
  dropdowns?: {
    industry_segment: string[];
    system_category: string[];
    automation_level: string[];
  };
  onSubmit: () => void;
  submitting: boolean;
}

export function RomForm(props: RomFormProps): JSX.Element;
```

Renders exactly the four D-02 locked fields:
- 3 Selects (industry_segment / system_category / automation_level)
- 1 numeric input (estimated_materials_cost) with `valueAsNumber` coercion

Uses `Field` from `@/components/Field` and `Select` from `@/components/Select` (verified live paths). Submit button is disabled until all four fields are filled and material cost > 0; once enabled the button label is the verbatim Copywriting Contract string `Compute ROM estimate`. The disabled-state hint reads `Fill in the four fields above to enable.` (D-12 verbatim). The materials-cost field shows the helper text `In US dollars. Even a rough number will do.` (Copywriting Contract verbatim).

### `frontend/src/pages/single-quote/RomForm.test.tsx` (NEW, 204 lines, 8 it() cases)

| # | Case | D-NN |
|---|------|------|
| 1 | disables submit on initial load | D-12 |
| 2 | enables submit when all four fields valid | D-12 |
| 3 | shows 'Enter a material cost greater than zero.' on zero materials cost | D-16 verbatim |
| 4 | rejects negative materials cost with the same D-16 error | D-16 verbatim |
| 5 | renders ONLY four form input/select elements | D-02 |
| 6 | coerces materials cost to a number via valueAsNumber | (correctness) |
| 7 | onSubmit fires exactly once when all fields valid | (correctness) |
| 8 | renders no banned ML-jargon tokens (BANNED_TOKENS scan) | DATA-03 |

### `frontend/src/components/quote/RomResultPanel.tsx` (NEW, 202 lines)

```typescript
export interface RomResultPanelProps {
  result: UnifiedQuoteResult;
  input: QuoteFormValues;
  rom: RomMetadata;
  workspace?: "real" | "synthetic";
  quoteId?: string;
  existingName?: string;
  status?: "draft" | "sent" | "won" | "lost" | "revised";
}

export function RomResultPanel(props: RomResultPanelProps): JSX.Element;

export const WHY_PRELIMINARY_COPY: string;  // verbatim D-13
export const SANITY_BANNER_COPY: string;    // verbatim D-15
```

Sibling of `QuoteResultPanel` (NOT a fork). Renders:

- **Your inputs** card — only the 4 ROM fields surface, via internal `RomInputsRecap`
- **Hero card** — `Estimated hours` eyebrow + `<RomBadge />` (replaces CONFIDENCE_LABEL chip per D-08) + display-hero numeric + `Likely range {low}–{high} hrs`
- **Why this is preliminary** card — verbatim D-13 body copy, with `Info` icon
- **Sanity-check banner** — guarded by `rom.sanityFlag &&`, renders verbatim D-15 copy with `role="status"`
- **Combined-totals row** — `{salesBucket}: {hours} hrs · range {low}–{high}` (REPLACES per-category H/M/L per D-06)
- **Supporting matches** card — REMAIN unchanged from full mode
- **<SaveQuoteButton mode='rom' />** — threaded so saved record carries the ROM flag (D-19)
- **Export PDF** — REMAIN secondary

HIDDEN per D-06: top-drivers card (no `topDrivers` token in source), per-category H/M/L drilldown (no `result.perCategory.map` in source), per-vision contributions (no `perVisionContributions` in source). `CONFIDENCE_LABEL` is NOT imported (D-08).

### `frontend/src/components/quote/RomResultPanel.test.tsx` (NEW, 288 lines, 13 it() cases)

| # | Case | D-NN / SC |
|---|------|-----------|
| 1 | hero RomBadge 'Preliminary' present | D-08 |
| 2 | no confidence-chip label rendered | D-08 |
| 3 | Why-this-is-preliminary verbatim D-13 copy | D-13 |
| 4 | sanity-banner D-15 copy when rom.sanityFlag is true | D-15 |
| 5 | sanity-banner ABSENT when rom.sanityFlag is false | D-15 |
| 6 | combined-totals row format (ME+EE label, hours, range numbers) | D-06 |
| 7 | HIDDEN: top-drivers card | D-06 |
| 8 | HIDDEN: per-category H/M/L breakdown (Mechanical Engineering label not surfaced) | D-06 |
| 9 | HIDDEN: per-vision contribution section | D-06 |
| 10 | SaveQuoteButton receives mode='rom' (vi.mock spy) | D-19 |
| 11 | supporting matches REMAIN unchanged | D-06 |
| 12 | no banned ML-jargon tokens | DATA-03 |
| 13 | **SC-3 side-by-side differential** — Renders BOTH QuoteResultPanel and RomResultPanel with equivalent inputs and asserts: `romBody` contains 'Preliminary' + 'Why this is preliminary' + does NOT contain 'What drives this estimate'; `fullBody` does NOT contain 'Preliminary' / 'Why this is preliminary' AND DOES contain 'What drives this estimate' | **SC-3** |

## Verification

```bash
cd frontend && npm run typecheck   # exit 0
cd frontend && npm run lint        # exit 0
cd frontend && npm run test -- --run \
  src/pages/single-quote/RomForm.test.tsx \
  src/components/quote/RomResultPanel.test.tsx
# 21/21 pass
cd frontend && npm run test -- --run
# 1013/1013 pass (was 956 at end of 07-02; +57 across new + adjusted suites)
cd frontend && npm run build
# exit 0 (8.48s; pre-existing 500kB chunk warning unchanged)
```

All green.

## D-NN Traceback (Plan-Lock Audit)

| Locked Decision | Honored In | Evidence |
|-----------------|------------|----------|
| **D-02** 4-field ROM form, no advanced disclosure | RomForm.tsx | Source contains exactly 3 `<Select` + 1 `register("estimated_materials_cost"`. No `disclosure` / `Show more` / `Advanced` / `accordion` strings. RomForm.test.tsx case #5 enforces `document.querySelectorAll('form input[name], form select[name]').length === 4`. |
| **D-06** RomResultPanel REMAIN/REPLACE/HIDE | RomResultPanel.tsx + tests | REMAIN: hero estimate, supporting matches, save quote, export PDF. REPLACE: confidence chip → `<RomBadge />`; top-drivers → 'Why this is preliminary'; per-category H/M/L → combined-totals row. HIDDEN: top-drivers (test 7), per-category (test 8), per-vision (test 9). Source contains no `topDrivers`, `perVisionContributions`, `result.perCategory.map`, or `CONFIDENCE_LABEL` tokens. |
| **D-08** Hero chip = RomBadge, not CONFIDENCE_LABEL | RomResultPanel.tsx hero card | `<RomBadge />` rendered in the hero chip slot. Test 2 asserts no 'high\|moderate\|lower confidence' text appears anywhere. |
| **D-12** Submit disabled until ready + valid; verbatim hint | RomForm.tsx submit button + hint | Button `disabled={!ready \|\| submitting \|\| !isValid}`; hint text `Fill in the four fields above to enable.` (verbatim). Tests 1 + 2 enforce both polarities. |
| **D-13** Why-preliminary verbatim copy | WHY_PRELIMINARY_COPY constant | Exported as a constant; rendered inside the 'Why this is preliminary' card; test 3 asserts `body.toContain(WHY_PRELIMINARY_COPY)`. |
| **D-15** Sanity-check banner verbatim copy + flag-gated render | SANITY_BANNER_COPY constant + `rom.sanityFlag &&` guard | Test 4 (sanityFlag:true → banner present). Test 5 (sanityFlag:false → banner absent). |
| **D-16** Verbatim 'Enter a material cost greater than zero.' error | RomForm.test.tsx tests 3 + 4 | Both submit-with-zero and submit-with-negative assert exact-string match against the form-error text node. |
| **D-19** Save quote threads mode='rom' end-to-end | RomResultPanel.tsx `<SaveQuoteButton mode="rom" ... />` | Test 10 mocks SaveQuoteButton via vi.mock and asserts `firstCall[0].mode === 'rom'`. |
| **SC-3** Non-tech reviewer side-by-side recognition | RomResultPanel.test.tsx test 13 | Renders BOTH panels in one test with equivalent inputs; asserts the chrome differences appear ONLY where they should. |

## Hand-off Notes

### For Plan 07-04 (pages + routes — `ComparisonRom.tsx`, `MachineLearningRom.tsx`, `DemoApp.tsx` route entries, `DemoLayout.tsx` sidebar entries)

The page-handler shim should look approximately like (modeled on `ComparisonQuote.tsx`):

```typescript
const form = useForm<RomFormValues>({
  resolver: zodResolver(romFormSchema),
  defaultValues: romFormDefaults,
  mode: "onChange",  // matches RomForm's disabled-gate semantics
});
const formRef = useRef<HTMLFormElement>(null);
const [result, setResult] = useState<EstimateRomResult | null>(null);

async function handleSubmit() {
  const romValues = form.getValues();
  setSubmitting(true);
  try {
    const out = await estimateRom({
      romValues,
      dataset,
      metrics,
      supportingPool,
      supportingLabel,
    });
    setResult(out);
  } finally {
    setSubmitting(false);
  }
}

// JSX:
<RomForm
  formRef={formRef}
  form={form}
  dropdowns={dropdowns}
  onSubmit={handleSubmit}
  submitting={submitting}
/>
{result && (
  <RomResultPanel
    result={result.result}
    input={result.formValues}
    rom={result.rom}
    workspace="real"
    quoteId={fromQuoteId ?? undefined}
    existingName={openedQuote?.name}
    status={openedQuote?.status}
  />
)}
```

The `dropdowns` shape that `RomForm` expects (`{ industry_segment, system_category, automation_level }`) is a strict subset of `DropdownOptions`, so 07-04 can pass through the existing dropdowns slice without rebuilding.

### For Plan 07-05 (list integration + re-open + jargon-guard + SC-4 round-trip)

The SC-3 grep-verifiable differential render test in this plan's Task 4 satisfies SC-3 at the unit-test level. **07-05 does not need to re-implement SC-3** — it only needs to:

1. Add jargon-guard renders for RomForm + RomResultPanel + ComparisonRom + MachineLearningRom + the new sidebar entries (D-18). The constants `WHY_PRELIMINARY_COPY` and `SANITY_BANNER_COPY` are exported for re-import — no copy-paste.
2. Add the SC-4 round-trip integration test (save ROM → re-open → assert mode preserved on `SavedQuote.mode` and `versions[N].mode`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@testing-library/user-event` not in dependencies — refactored RomForm.test.tsx to use only `fireEvent` + form.reset() seeding**

- **Found during:** Task 2 — first vitest run failed at module-resolution time with `Failed to resolve import "@testing-library/user-event"`.
- **Issue:** The plan's `<action>` template imports `@testing-library/user-event`, but the project's `frontend/package.json` only has `@testing-library/jest-dom` and `@testing-library/react`. Adding a new dev dep would expand 07-03's surface beyond the four declared `files_modified`, so the cleaner fix is to seed the form via `form.reset()` inside an `useEffect` and use `fireEvent.click` / `fireEvent.submit`. Same idiom QuoteForm.test.tsx already uses for the `?fromQuote` rehydration suite — no new pattern, no new dep, all 8 cases now pass deterministically.
- **Files modified:** `frontend/src/pages/single-quote/RomForm.test.tsx` (refactored — same coverage, fireEvent-only).
- **Commit:** `8f24dee` — folded into the same Task 2 commit since the refactor is the test file's first commit (no behavior change).

**2. [Rule 3 - Blocking] Worktree base reset to `f97a51e` (the EXPECTED_BASE)**

- **Found during:** First Write call landed in the parent repo because the worktree's HEAD was at `d07bda1` (Phase 6 merge), which predates Wave-1 outputs (`romSchema.ts`, `RomBadge.tsx`, `romEstimator.ts`, the modified SaveQuoteButton). The worktree's `frontend/src/pages/single-quote/` directory did not contain `romSchema.ts`.
- **Fix:** Per the worktree_branch_check protocol, `git reset --hard f97a51e0d1218a5a01861fbfac118a76c292f87e` to align the worktree to the expected base (which is "after wave 1 (07-01, 07-02 merged)" and contains all four Wave-1 outputs). Worktree HEAD is on the per-agent branch `worktree-agent-a122b9c6fdd49e056` per the deny-list/allow-list HEAD assertion.
- **Files modified:** None (a stray RomForm.tsx that briefly landed in the parent repo was deleted before the worktree reset).
- **Risk:** None — the reset is the prescribed setup step the worktree_branch_check itself runs.

**3. [Rule 3 - Blocking] Tightened SaveQuoteButton spy types so typecheck passes**

- **Found during:** Task 4 typecheck after the test ran green at runtime.
- **Issue:** The initial spy declaration `vi.fn(() => null)` had `T = () => null`, which has 0 expected arguments — but the mocked component is called with the `props` object. Three TypeScript errors followed (TS2554 / TS2352 / TS2493).
- **Fix:** Changed the spy signature to `vi.fn((_props: Record<string, unknown>) => null)` and the mock body to forward `props` typed as `Record<string, unknown>`; replaced the `as { mode?: string }` cast with `firstCall[0] as { mode?: string }` so the tuple-index access typechecks.
- **Files modified:** `frontend/src/components/quote/RomResultPanel.test.tsx`.
- **Commit:** Folded into `d71ef5c` (same Task 4 commit — first commit of the test file).

No other deviations. Every plan-locked decision was honored as written.

## Threat Surface

The plan's `<threat_model>` covered:
- T-07-08 (form input tampering): mitigated by `romFormSchema`'s `z.coerce.number().positive(...)` (already in Plan 07-01 / 07-02) + `z.string().trim().min(1)` on the trio; react-hook-form's resolver runs on every change.
- T-07-09 (XSS in result panel): mitigated — all copy is static (D-13 / D-15 verbatim constants) or comes from validated zod-parsed numbers; no `dangerouslySetInnerHTML`. `projectName` flows through React's default escaping.
- T-07-10 (DoS via re-renders): accepted — leaf component, bounded loop on `supportingMatches.items`.
- T-07-11 (info disclosure via sanity banner): accepted — plain English copy; underlying constants are NOT user-facing.

No new endpoints, no new auth surface, no new secrets, no new network boundary.

## Confirmation Checklist

- [x] No `core/` change.
- [x] No `_PREDICT_SHIM` change.
- [x] No retraining.
- [x] 4 NEW files; 0 modified files.
- [x] All Copywriting-Contract verbatim strings are present in source AND asserted in tests.
- [x] HIDDEN sections genuinely absent from source (grep proves no `topDrivers` / `perVisionContributions` / `result.perCategory.map` / `CONFIDENCE_LABEL` in RomResultPanel.tsx).
- [x] vitest 1013/1013 green; +21 tests over 956 baseline.
- [x] typecheck/lint/build all exit 0.

## Self-Check: PASSED

**Files created (verified exist in worktree):**
- `frontend/src/pages/single-quote/RomForm.tsx` — FOUND
- `frontend/src/pages/single-quote/RomForm.test.tsx` — FOUND
- `frontend/src/components/quote/RomResultPanel.tsx` — FOUND
- `frontend/src/components/quote/RomResultPanel.test.tsx` — FOUND

**Commits exist (verified via `git log --oneline f97a51e..HEAD`):**
- `fbf82c7` — feat(07-03): add RomForm — 4-field react-hook-form + zod (D-02)
- `8f24dee` — test(07-03): add RomForm tests — D-12 disabled gate, D-16 verbatim error, D-02 four-fields invariant
- `554f755` — feat(07-03): add RomResultPanel — ROM-mode chrome (D-06/D-08/D-13/D-15/D-19)
- `d71ef5c` — test(07-03): add RomResultPanel tests + SC-3 side-by-side differential render

**Acceptance grep checks (all 18 must-haves pass):**
- 3 `<Select` references in RomForm.tsx
- 1 `register("estimated_materials_cost"` reference
- 0 `disclosure` / `Show more` / `Advanced` / `accordion` references
- `Project basics` literal present
- `Compute ROM estimate` literal present
- `In US dollars. Even a rough number will do.` literal present
- `Fill in the four fields above to enable.` literal present
- `Estimated materials cost` literal present
- `<RomBadge />` rendered in RomResultPanel hero
- `mode="rom"` threaded to SaveQuoteButton (3 occurrences total in source)
- `Why this is preliminary` literal present (3 occurrences — comment + eyebrow + WHY_ constant)
- `Hours by work category` literal present
- `rom.sanityFlag &&` guard present (2 occurrences)
- 0 `topDrivers` references in RomResultPanel.tsx
- 0 `perVisionContributions` references in RomResultPanel.tsx
- 0 `CONFIDENCE_LABEL` references in RomResultPanel.tsx
- 0 `result.perCategory.map` references in RomResultPanel.tsx
- 21 `it(` cases across both test files (8 + 13)

**Final verification:**
- `npm run typecheck` exits 0
- `npm run lint` exits 0
- `npm run test -- --run` exits 0 (1013 / 1013 pass)
- `npm run build` exits 0 (8.48s)
