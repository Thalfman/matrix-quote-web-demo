---
phase: 07
plan: 01
subsystem: rom-quote-mode
tags: [schema, primitives, mode-flag, rom-badge, rom-form-schema, phase-7]
requires:
  - savedQuoteSchema (Phase 5)
  - quoteFormSchema + quoteFormDefaults (Phase 6)
  - cn utility + amberSoft / text-ink Tailwind tokens (v1.0)
provides:
  - QuoteMode type + QUOTE_MODE_VALUES enum
  - savedQuoteSchema.mode (top-level + per-version, defaults to "full")
  - buildAutoSuggestedName with optional `mode` arg (D-17 ROM-token insertion)
  - SaveSavedQuoteArgs.mode threading + saveSavedQuote denormalization
  - SaveQuoteButton + SaveQuoteDialog mode prop pass-through end-to-end
  - <RomBadge /> primitive ("Preliminary" chip)
  - romFormSchema (4-field zod) + romFormDefaults + toQuoteFormValues helper
affects:
  - frontend/src/lib/savedQuoteSchema.ts (additive — backward-compatible)
  - frontend/src/lib/quoteStorage.ts (additive — no IDB schema bump)
  - frontend/src/components/quote/SaveQuoteButton.tsx (new optional prop)
  - frontend/src/components/quote/SaveQuoteDialog.tsx (new optional payload field)
tech-stack:
  added: []
  patterns:
    - "zod .optional().default() to keep persistence backward-compatible"
    - "Denormalized list-row metadata (mirrors salesBucket / visionLabel / materialsCost)"
    - "Per-version stamping of mode (immutable history at save time)"
    - "TS spread + overlay (toQuoteFormValues spreads quoteFormDefaults; forward-compat for new fields)"
key-files:
  created:
    - frontend/src/components/quote/RomBadge.tsx
    - frontend/src/components/quote/RomBadge.test.tsx
    - frontend/src/pages/single-quote/romSchema.ts
    - frontend/src/pages/single-quote/romSchema.test.ts
  modified:
    - frontend/src/lib/savedQuoteSchema.ts
    - frontend/src/lib/savedQuoteSchema.test.ts
    - frontend/src/lib/quoteStorage.ts
    - frontend/src/lib/quoteStorage.test.ts
    - frontend/src/components/quote/SaveQuoteButton.tsx
    - frontend/src/components/quote/SaveQuoteButton.test.tsx
    - frontend/src/components/quote/SaveQuoteDialog.tsx
    - frontend/src/components/quote/SaveQuoteDialog.test.tsx
    - frontend/src/test/__fixtures__/phase5.ts
    - frontend/src/pages/quotes/MyQuotesPage.test.tsx
    - frontend/src/pages/quotes/QuoteRow.test.tsx
    - frontend/src/pages/quotes/SavedQuotePage.test.tsx
    - frontend/src/components/quote/VersionHistoryList.test.tsx
    - frontend/src/hooks/useSavedQuotes.test.tsx
decisions:
  - "QUOTE_MODE_VALUES enum + .default('full') keeps every Phase 5 / Phase 6 record readable without an IDB migration (D-03)."
  - "mode is denormalized at the top-level (list-row render) AND stamped per-version (immutable history) (D-19)."
  - "buildAutoSuggestedName takes an OPTIONAL third arg `mode`; when 'rom' inserts the literal ' ROM' token after the salesBucket. The canonical D-17 example string ('ME ROM 240h · No vision · 2026-05-06') was treated as the contract."
  - "mode is intentionally NOT in the saveSavedQuote deepEqual diff chain — folding it in would inflate versions on a no-op re-save."
  - "RomBadge is a no-prop primitive — always 'Preliminary', always 'Preliminary estimate' aria-label, always bg-amberSoft text-ink eyebrow chrome (D-07 / D-08)."
  - "romFormSchema is a 4-field zod subset; toQuoteFormValues spreads quoteFormDefaults so new fields in future phases inherit defaults automatically."
metrics:
  duration_minutes: 13
  completed_date: 2026-05-06
---

# Phase 7 Plan 01: Schema & Primitives Summary

Mode-flag persistence + RomBadge primitive + romFormSchema all landed in 5 atomic commits — the data-layer foundation every other Phase 7 plan depends on is now in place.

## Files Touched

### Created (4)

- `frontend/src/components/quote/RomBadge.tsx` — D-07 / D-08 primitive. No props. Renders `<span class="... bg-amberSoft text-ink eyebrow ... min-h-[28px]" aria-label="Preliminary estimate">Preliminary</span>`.
- `frontend/src/components/quote/RomBadge.test.tsx` — 5 cases covering visible text, aria-label, color/eyebrow chrome, 28px touch target, and a local BANNED_TOKENS jargon-guard.
- `frontend/src/pages/single-quote/romSchema.ts` — `romFormSchema` (4-field zod), `romFormDefaults` (blank/zero), `toQuoteFormValues(rom)` (spreads `quoteFormDefaults` then overlays the four ROM fields).
- `frontend/src/pages/single-quote/romSchema.test.ts` — 9 cases covering happy path, zero/negative material rejection (D-16 verbatim message), missing-required rejection, defaults shape, full quoteFormSchema validity, and the locked D-04 hidden-defaults contract.

### Modified — production source (4)

- `frontend/src/lib/savedQuoteSchema.ts` — added `QUOTE_MODE_VALUES` enum + `QuoteMode` type; added `mode: z.enum(QUOTE_MODE_VALUES).optional().default("full")` at TWO sites (`quoteVersionSchema` AND `savedQuoteSchema`); extended `buildAutoSuggestedName` with optional `mode?: QuoteMode` 3rd arg that inserts the literal `" ROM"` token after the salesBucket when `mode === "rom"`. **`schemaVersion` stays at literal 2** (D-03 forbids the bump).
- `frontend/src/lib/quoteStorage.ts` — `SaveSavedQuoteArgs` gains optional `mode?: QuoteMode`; `saveSavedQuote` denormalizes `effectiveMode` (defaults to `"full"` for new records, preserves `existing.mode` on update when omitted) at BOTH the top-level and per-version. **`QUOTE_DB_VERSION` stays at 2; no new `if (oldVersion < 3)` block.** `mode` is intentionally NOT in the `deepEqual` diff chain.
- `frontend/src/components/quote/SaveQuoteButton.tsx` — `SaveQuoteButtonProps` gains `mode?: QuoteMode`; threaded into BOTH `buildAutoSuggestedName(formValues, hours, mode)` AND the `SaveQuoteDialog` payload object.
- `frontend/src/components/quote/SaveQuoteDialog.tsx` — `SaveQuoteDialogProps.payload` gains `mode?: QuoteMode`; threaded into `saveQuote.mutateAsync({ ...payload, mode: payload.mode })`. **Dialog UI itself unchanged from Phase 5** — no visible mode control (D-19).

### Modified — test fixtures + factories (6)

These are the Rule-3 blocking-issue follow-on of zod's `.default("full")` making the inferred `mode` non-optional in the post-parse `SavedQuote` / `QuoteVersion` types. Every hand-rolled SavedQuote / QuoteVersion test factory was updated to include `mode: "full"`:

- `frontend/src/test/__fixtures__/phase5.ts`
- `frontend/src/lib/savedQuoteSchema.test.ts` (factories + new D-03 / D-17 / D-19 test blocks)
- `frontend/src/lib/quoteStorage.test.ts` (new 5 cases for mode threading)
- `frontend/src/components/quote/SaveQuoteButton.test.tsx` (new 3 cases for mode prop)
- `frontend/src/components/quote/SaveQuoteDialog.test.tsx` (new 2 cases for mode payload)
- `frontend/src/pages/quotes/MyQuotesPage.test.tsx` / `QuoteRow.test.tsx` / `SavedQuotePage.test.tsx` / `frontend/src/components/quote/VersionHistoryList.test.tsx` / `frontend/src/hooks/useSavedQuotes.test.tsx`

## Post-change Public Contract

```ts
// savedQuoteSchema.ts
export const QUOTE_MODE_VALUES = ["rom", "full"] as const;
export type QuoteMode = (typeof QUOTE_MODE_VALUES)[number];

export function buildAutoSuggestedName(
  values: QuoteFormValues,
  estimatedHours: number,
  mode?: QuoteMode,           // NEW optional 3rd arg
): string;

// post-parse types now include `mode: QuoteMode` (non-optional, defaulted to "full")
export type SavedQuote   = z.infer<typeof savedQuoteSchema>;
export type QuoteVersion = z.infer<typeof quoteVersionSchema>;

// quoteStorage.ts
export interface SaveSavedQuoteArgs {
  // ... existing fields ...
  mode?: QuoteMode;           // NEW optional field
}

// SaveQuoteButton.tsx
export interface SaveQuoteButtonProps {
  // ... existing props ...
  mode?: QuoteMode;           // NEW optional prop
}

// SaveQuoteDialog.tsx
SaveQuoteDialogProps.payload = {
  // ... existing fields ...
  mode?: QuoteMode;           // NEW optional field on payload
}

// RomBadge.tsx
export function RomBadge(): JSX.Element; // no props
// renders: <span class="... bg-amberSoft text-ink eyebrow ... min-h-[28px]"
//                aria-label="Preliminary estimate">Preliminary</span>

// romSchema.ts
export const romFormSchema: z.ZodObject<{
  industry_segment: z.ZodString;
  system_category: z.ZodString;
  automation_level: z.ZodString;
  estimated_materials_cost: z.ZodNumber; // .positive("Enter a material cost greater than zero.")
}>;
export type RomFormValues = z.infer<typeof romFormSchema>;
export const romFormDefaults: RomFormValues;
export function toQuoteFormValues(rom: RomFormValues): QuoteFormValues;
```

## RomBadge contract (D-07 / D-08)

- **No props.** Always renders the verbatim text `Preliminary` and `aria-label="Preliminary estimate"`.
- Locked chrome: `inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-sm text-xs eyebrow bg-amberSoft text-ink`.
- Color contract: `bg-amberSoft` is the same token as the `revised` workflow status pill — amber = "in motion / not final"; visually rhymes but reads distinct (D-07).
- Anti-pattern (D-08): never "Low confidence", never "Wide range", never any ML-flavored synonym.

## Test Count Delta

- Pre-plan vitest baseline (Phase 6 final): **937 tests**.
- Post-plan vitest run: **980 tests**.
- **Delta: +43 tests** distributed across:
  - savedQuoteSchema.test.ts: +12 (Phase 7 mode flag block + ROM-token block)
  - quoteStorage.test.ts: +5 (mode threading scenarios)
  - SaveQuoteButton.test.tsx: +3 (mode prop forwarding)
  - SaveQuoteDialog.test.tsx: +2 (mode mutateAsync threading)
  - RomBadge.test.tsx: +5 (new file)
  - romSchema.test.ts: +9 (new file)
  - Plus seven net `mode: "full"` factory adjustments (no test count change there — backfill of existing fixtures).

All 980 tests pass. Typecheck and lint exit 0. Build succeeds (8.66s).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Backfill `mode` on every hand-rolled SavedQuote / QuoteVersion test fixture**

- **Found during:** Task 1 typecheck after adding `mode` to schemas.
- **Issue:** zod's `.optional().default("full")` makes the inferred type `mode: QuoteMode` (non-optional, post-parse). Six existing test factories that hand-roll `SavedQuote` or `QuoteVersion` literals (`MyQuotesPage.test.tsx`, `QuoteRow.test.tsx`, `SavedQuotePage.test.tsx`, `VersionHistoryList.test.tsx`, `useSavedQuotes.test.tsx`, `phase5.ts` fixtures) failed `tsc --noEmit` with `Property 'mode' is missing` errors.
- **Fix:** Added `mode: "full"` to every factory's default literal AND to every nested `QuoteVersion` literal. These are pre-Phase-7 fixtures, so `"full"` is the honest historical value.
- **Files modified:**
  - `frontend/src/test/__fixtures__/phase5.ts`
  - `frontend/src/pages/quotes/MyQuotesPage.test.tsx`
  - `frontend/src/pages/quotes/QuoteRow.test.tsx`
  - `frontend/src/pages/quotes/SavedQuotePage.test.tsx`
  - `frontend/src/components/quote/VersionHistoryList.test.tsx`
  - `frontend/src/hooks/useSavedQuotes.test.tsx`
- **Commit:** Folded into 940d177 (Task 1 commit) since it was the same change set that introduced the type tightening.

No other deviations. The plan-checked design held end-to-end:

- No `core/` change.
- No `_PREDICT_SHIM` change.
- No retrain.
- No `schemaVersion: 3` literal anywhere.
- No new `if (oldVersion < 3)` block.
- `QUOTE_DB_VERSION` stays at 2.
- No backend introduction.

## Hand-off Notes

### For Plan 07-02 (`romEstimator.ts`)

- Import `romFormSchema` and `toQuoteFormValues` from `@/pages/single-quote/romSchema`.
- `toQuoteFormValues(romValues)` returns a complete `QuoteFormValues` (with `quoteFormDefaults` + four ROM-supplied overrides) ready to feed `transformToQuoteInput` → `predictQuote`.
- `visionRows: []` is already locked in via `quoteFormDefaults` — `romEstimator` does NOT need to override visionRows itself.

### For Plan 07-03 (`RomForm` + `RomResultPanel`)

- `<RomBadge />` exists at `@/components/quote/RomBadge` — drop it into the `RomResultPanel` hero card eyebrow row to replace the confidence chip in ROM mode (D-08).
- `<SaveQuoteButton mode="rom" ... />` will denormalize a ROM-mode `mode: "rom"` quote end-to-end (button → dialog payload → `saveQuote.mutateAsync({ mode: "rom" })` → `saveSavedQuote({ args.mode: "rom" })` → top-level + per-version stamp).
- The auto-suggested name shown in the Save dialog will already contain the literal `" ROM "` token because `SaveQuoteButton` threads `mode` into `buildAutoSuggestedName` automatically.

### For Plan 07-04 (saved-quote round-trip)

- A saved record's `mode` field round-trips through `getSavedQuote` / `listSavedQuotes` and is always defined post-parse (defaults to `"full"` for legacy v2 records). The list-row badge render (`quote.mode === "rom"`) needs no defensive `?? "full"` since the schema's `.default("full")` already guarantees it.
- Per-version mode is queryable via `versions[N].mode`.

## Self-Check: PASSED

**Files created (verified exist):**
- `frontend/src/components/quote/RomBadge.tsx` — FOUND
- `frontend/src/components/quote/RomBadge.test.tsx` — FOUND
- `frontend/src/pages/single-quote/romSchema.ts` — FOUND
- `frontend/src/pages/single-quote/romSchema.test.ts` — FOUND

**Commits exist (verified via `git log --oneline 125f034..HEAD`):**
- `940d177` — feat(07-01): add optional mode flag to savedQuoteSchema + ROM-token in auto-suggested name
- `9ce3fbe` — feat(07-01): thread mode through SaveSavedQuoteArgs + saveSavedQuote denormalization
- `870bc31` — feat(07-01): pass-through mode prop on SaveQuoteButton + SaveQuoteDialog
- `1082010` — feat(07-01): add RomBadge primitive — 'Preliminary' chip with locked chrome
- `8b8e5cc` — feat(07-01): add romFormSchema (4-field zod subset) + toQuoteFormValues helper

**Acceptance grep checks (25 / 25 pass):** see commit body messages and the `.planning/phases/07-rom-quote-mode/07-01-schema-and-primitives-PLAN.md` `<acceptance_criteria>` blocks for each task.

**Final verification:**
- `npm run typecheck` exits 0.
- `npm run lint` exits 0.
- `npm run test` exits 0 (980 / 980 pass).
- `npm run build` succeeds (8.66s).
