---
phase: 05-quote-persistence
reviewed: 2026-05-05T22:20:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - frontend/package.json
  - frontend/src/DemoApp.tsx
  - frontend/src/components/DemoLayout.tsx
  - frontend/src/components/quote/DeleteQuoteModal.tsx
  - frontend/src/components/quote/QuoteResultPanel.tsx
  - frontend/src/components/quote/SaveQuoteButton.tsx
  - frontend/src/components/quote/SaveQuoteDialog.tsx
  - frontend/src/components/quote/SortControls.tsx
  - frontend/src/components/quote/StatusChip.tsx
  - frontend/src/components/quote/VersionHistoryList.tsx
  - frontend/src/components/quote/WorkspacePill.tsx
  - frontend/src/hooks/useSavedQuotes.ts
  - frontend/src/lib/quoteStorage.ts
  - frontend/src/lib/savedQuoteSchema.ts
  - frontend/src/pages/demo/CompareBrowseTab.tsx
  - frontend/src/pages/demo/MachineLearningQuoteTool.tsx
  - frontend/src/pages/demo/compare/ComparisonQuote.tsx
  - frontend/src/pages/quotes/MyQuotesEmptyState.tsx
  - frontend/src/pages/quotes/MyQuotesPage.tsx
  - frontend/src/pages/quotes/QuoteRow.tsx
  - frontend/src/pages/quotes/SavedQuotePage.tsx
  - frontend/src/pages/single-quote/QuoteForm.tsx
findings:
  blocker: 1
  warning: 7
  info: 6
  total: 14
status: clean
fix_status:
  blocker_fixed: 1
  warnings_fixed: 7
  info_deferred: 6
  fix_iteration: 1
  fixed_at: 2026-05-05T22:40:00Z
---

# Phase 5: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 22 production source files (tests excluded by scope)
**Status:** issues_found

## Summary

Phase 5 ships a substantial IndexedDB persistence layer with disciplined zod validation, careful threat-model framing, and clean component primitives (`StatusChip`, `WorkspacePill`, `SortControls`, `VersionHistoryList`). The threat model is well-documented (T-05-01..17), XSS surfaces are uniformly defended (no `dangerouslySetInnerHTML` anywhere; user-supplied names always rendered through React text nodes), the BroadcastChannel cache-invalidate-only contract (T-05-04, T-05-09) is implemented correctly in `useSavedQuotes`, and the static-SPA constraint holds (no backend imports leaked).

However, the **integration wiring at the entry-point Quote tools is incomplete**. The data-flow plumbing for `quoteId` / `existingName` / `restoredFromVersion` exists end-to-end at the component level (Panel → Button → Dialog → mutateAsync), but `ComparisonQuote.tsx` and `MachineLearningQuoteTool.tsx` never read `?fromQuote=` / `?restoreVersion=` from the URL to populate those props. Result: re-saving an opened-from-list quote silently creates a duplicate quote instead of appending v(N+1), and the D-06 `restoredFromVersion` lineage annotation is never written. This **breaks PERSIST-06** end-to-end despite each individual unit being correct in isolation.

Secondary issues: the centered modals lack the focus trap that UI-SPEC §"Save quote dialog"/Behaviour and PATTERNS §"frontend/src/pages/quotes/components/SaveQuoteDialog.tsx" both mandate ("trap MUST exist"); `useSavedQuote(id)` does not subscribe to broadcast events (UI-SPEC §"Cross-tab broadcast UI cue" promised SavedQuotePage live-updates); `listSavedQuotes` skips `savedQuoteSchema.parse` while `getSavedQuote` enforces it (T-05-05 unevenly applied); `CompareBrowseTab` always sends an empty `humanQuotedByBucket: {}` (D-13 partial); same-payload diff in `saveSavedQuote` relies on key-order-sensitive `JSON.stringify`; and several IndexedDB indexes are created but never used.

## Blockers

### BL-01: Re-save of opened-from-list quote creates a duplicate instead of appending a version (PERSIST-06 broken)

**Files:**
- `frontend/src/pages/demo/compare/ComparisonQuote.tsx:226-231`
- `frontend/src/pages/demo/MachineLearningQuoteTool.tsx:226-232`

**Issue:**
`QuoteForm.tsx:40-58` correctly hydrates the form from IndexedDB when `?fromQuote=<id>` is present. The Save flow forwards the UI prop chain (`QuoteResultPanel.quoteId` → `SaveQuoteButton.quoteId` → `SaveQuoteDialog.payload.id` → `saveSavedQuote({ id })`) and the storage layer correctly branches on `args.id` to append a new version (lines 187-223 in `quoteStorage.ts`).

But the chain has its **head cut off**: neither `ComparisonQuote.tsx` nor `MachineLearningQuoteTool.tsx` reads `useSearchParams()` to extract `fromQuote` and pass it to `<QuoteResultPanel quoteId={...}>`. The Panel is invoked with only `result`, `input`, and `workspace` — `quoteId` is `undefined`, so `SaveQuoteButton` receives `quoteId={undefined}`, the dialog calls `saveSavedQuote({ id: undefined, ... })`, and `quoteStorage.ts:224-247` takes the brand-new branch, generating a fresh `crypto.randomUUID()`.

The end-user effect: opening a saved quote via "Open in Quote tool", editing inputs, clicking Save → produces a SECOND saved quote in the list, leaving the original v1 unchanged. This is **the headline PERSIST-06 contract** ("reopened, edited, re-quoted, versioned") silently broken.

The same gap means `existingName` is never propagated either, so the dialog prefills with the auto-suggested name on every re-save — overwriting the user's chosen name from v1.

**Verification trace:**
- `frontend/src/components/quote/QuoteResultPanel.tsx:170-181` — passes `quoteId={quoteId}` to `SaveQuoteButton`. Wired.
- `frontend/src/components/quote/SaveQuoteButton.tsx:90` — passes `id: quoteId` to dialog payload. Wired.
- `frontend/src/components/quote/SaveQuoteDialog.tsx:116` — passes `id: payload.id` into `saveQuote.mutateAsync`. Wired.
- `frontend/src/lib/quoteStorage.ts:187-212` — appends version when `args.id` is set. Wired.
- `frontend/src/pages/demo/compare/ComparisonQuote.tsx` — never imports `useSearchParams`. **Not wired.**
- `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` — never imports `useSearchParams`. **Not wired.**

Grep evidence:
```
grep "quoteId\|existingName\|fromQuote\|restoreVersion" \
     frontend/src/pages/demo/compare/ComparisonQuote.tsx \
     frontend/src/pages/demo/MachineLearningQuoteTool.tsx
   → No matches found
```

**Fix:**
In both `ComparisonQuote.tsx` and `MachineLearningQuoteTool.tsx`:

```tsx
import { useSearchParams } from "react-router-dom";
import { useSavedQuote } from "@/hooks/useSavedQuotes";

// inside the component
const [searchParams] = useSearchParams();
const fromQuoteId = searchParams.get("fromQuote") ?? undefined;
const restoreVersion = searchParams.get("restoreVersion");
const restoredFromVersion = restoreVersion ? Number(restoreVersion) : undefined;
const { data: openedQuote } = useSavedQuote(fromQuoteId);

// ...

<QuoteResultPanel
  result={result.unified}
  input={result.formValues}
  workspace="real"
  quoteId={fromQuoteId}
  existingName={openedQuote?.name}
  status={openedQuote?.status}
  restoredFromVersion={restoredFromVersion}
/>
```

Add a corresponding integration test that asserts `saveSavedQuote` is called with `args.id` set when navigating in via `?fromQuote=`.

## Warnings

### WR-01: Modal dialogs lack the focus trap mandated by UI-SPEC

**Files:**
- `frontend/src/components/quote/SaveQuoteDialog.tsx:156-232`
- `frontend/src/components/quote/DeleteQuoteModal.tsx:67-115`

**Issue:**
UI-SPEC §"Save quote dialog (D-12, D-14)" / Behaviour: "Focus trap: tab cycles between field → Cancel → Save → field. (Implementation: standard `react-aria` focus-trap or a 12-line custom one — researcher's discretion, but trap MUST exist.)" UI-SPEC §`SaveQuoteDialog` Behaviour reiterates: "trap MUST exist." PATTERNS §`SaveQuoteDialog`: "For the centered modal, use either `react-aria` focus-trap or a 12-line custom implementation."

`grep -ri "focus.?trap\|trapFocus\|FocusTrap"` over `frontend/src` returns zero matches. Both dialogs render a backdrop + panel with `aria-modal="true"` but never confine keyboard focus inside the panel. Tabbing past the last button escapes back to the underlying page (and to interactive elements in `DemoLayout`'s sidebar that are visually obscured by the backdrop). Screen-reader users navigating with the virtual cursor or sequential focus get no signal that focus has left the modal context.

This is an accessibility regression and a direct violation of the UI contract, not a style preference.

**Fix:**
Add a small focus-trap helper. A 12-line implementation (per PATTERNS) using `tabindex` querySelector + `Tab`/`Shift+Tab` keydown handler, or import `react-aria`'s `useFocusTrap`. Either:

```tsx
// In SaveQuoteDialog and DeleteQuoteModal
import { useEffect, useRef } from "react";

function useFocusTrap(active: boolean, panelRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!active || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter((el) => !el.hasAttribute("disabled"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusable();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, panelRef]);
}
```

Attach a `panelRef` to the dialog `<form>` / `<div>` and call `useFocusTrap(open, panelRef)`.

### WR-02: `listSavedQuotes` skips `savedQuoteSchema.parse` (uneven T-05-05 enforcement)

**File:** `frontend/src/lib/quoteStorage.ts:153-160`

**Issue:**
`getSavedQuote` (line 170) re-validates via `savedQuoteSchema.parse(rec)`, which throws on `schemaVersion > 1` records (T-05-05) and on any tampered field. `listSavedQuotes` does not — it returns `getAll()` directly cast as `SavedQuote[]`:

```ts
export async function listSavedQuotes(): Promise<SavedQuote[]> {
  const handle = await db();
  const tx = handle.transaction(QUOTE_STORE_NAME, "readonly");
  const all = (await tx.store.getAll()) as SavedQuote[];     // <- no .parse
  await tx.done;
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
```

A devtools-injected record, a leftover Phase 6 future-schema row, or any malformed entry will surface in the My Quotes list with potentially invalid fields. Plan 05-01 frontmatter T-05-05 disposition: "openDb() rejects records where schemaVersion > 1 with a typed error" — but `openDb` only handles structural migrations, not per-record schemaVersion. The per-record check lives in `getSavedQuote` and must mirror in `listSavedQuotes` to honor the threat-model contract.

Worse: the front-end then renders `quote.salesBucket`, `quote.visionLabel`, `quote.materialsCost.toLocaleString()` from these unvalidated records. If `materialsCost` is a string (corruption), `.toLocaleString()` throws and crashes the row.

**Fix:**
```ts
export async function listSavedQuotes(): Promise<SavedQuote[]> {
  const handle = await db();
  const tx = handle.transaction(QUOTE_STORE_NAME, "readonly");
  const raw = await tx.store.getAll();
  await tx.done;
  // T-05-05: validate every row; drop records with future schemaVersion or
  // tampered shape rather than crash the list.
  const validated: SavedQuote[] = [];
  for (const rec of raw) {
    const parsed = savedQuoteSchema.safeParse(rec);
    if (parsed.success) validated.push(parsed.data);
    // else: silently skip malformed records (alternative: log + surface in error UI)
  }
  return validated.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
```

### WR-03: `useSavedQuote(id)` does not subscribe to BroadcastChannel — SavedQuotePage stale across tabs

**File:** `frontend/src/hooks/useSavedQuotes.ts:87-97`

**Issue:**
UI-SPEC §"Cross-tab broadcast UI cue" (line 452): "The version-history list inside an open detail page DOES re-render if the open quote's id matches." `useSavedQuotes` (the list hook) registers a subscriber that calls `qc.invalidateQueries({ queryKey: ["quotes"] })` — broad enough to catch any per-id query.

But a SavedQuotePage that mounts **without** a sibling list page (e.g., the user navigates directly to `/quotes/:id` via a bookmark) only mounts `useSavedQuote(id)`. That hook never subscribes:

```ts
export function useSavedQuote(id: string | undefined) {
  return useQuery<SavedQuote | null>({
    queryKey: id ? QUOTE_BY_ID(id) : ["quotes", "__noop__"],
    queryFn: () => (id ? getSavedQuote(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: Infinity,
  });
}
```

No `useEffect` + `subscribe`. If tab B saves a new version while tab A has SavedQuotePage open, tab A's version history will not refresh until manual reload. UI-SPEC contract violated.

**Fix:**
```ts
export function useSavedQuote(id: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    const unsub = subscribe(() => {
      void qc.invalidateQueries({ queryKey: ["quotes"] });
    });
    return unsub;
  }, [qc]);
  return useQuery<SavedQuote | null>({
    queryKey: id ? QUOTE_BY_ID(id) : ["quotes", "__noop__"],
    queryFn: () => (id ? getSavedQuote(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: Infinity,
  });
}
```

Or extract `useStorageInvalidate()` into a shared internal helper called from both hooks — DRY and matches the established pattern.

### WR-04: `CompareBrowseTab` save always sends empty `humanQuotedByBucket: {}` (D-13 incomplete)

**File:** `frontend/src/pages/demo/CompareBrowseTab.tsx:117-124`

**Issue:**
D-13 (CONTEXT line 49): "Compare tool is also a save source. PERSIST-01 explicitly names Compare. **A Compare-tool save persists the human comparator number alongside the model-side fields.** Schema accommodates a `compareInputs` optional sub-shape."

The implementation:
```tsx
<SaveQuoteButton
  workspace="real"
  formValues={formValues}
  unifiedResult={unifiedResult}
  compareInputs={{ humanQuotedByBucket: {} }}    // <- always empty
  variant="compact"
/>
```

The comment on line 96 acknowledges this: "the CompareBrowseTab UI itself does not collect human numbers; the field is reserved for QuoteForm-side use." But that means the Compare-side save persists nothing the model-side save doesn't already persist. D-13's whole point — "human comparator number" — is unfulfilled. PERSIST-01 names Compare specifically because of this asymmetry.

Either (a) lift `quotedHours` state from `QuoteForm.tsx:28` up to a parent and forward to the Compare-side button, or (b) add a comparator-input affordance on `CompareBrowseTab` itself, or (c) explicitly defer-with-a-note (and remove the meaningless `compareInputs={{ humanQuotedByBucket: {} }}` so the schema doesn't carry empty cruft).

Right now the prop is misleading: it claims to encode a human comparator while always being `{}`.

**Fix (minimum):** Remove the empty-object pass-through if no real number is collected:

```tsx
<SaveQuoteButton
  workspace="real"
  formValues={formValues}
  unifiedResult={unifiedResult}
  // compareInputs intentionally omitted — D-13 partial; track in follow-up.
  variant="compact"
/>
```

Add a TODO comment + tracking issue. Preferred long-term fix: lift `quotedHours` state to a shared context and pass through.

### WR-05: `restoreMutation` await in `SavedQuotePage.handleRestore` is an unused call

**File:** `frontend/src/pages/quotes/SavedQuotePage.tsx:122-125`

**Issue:**
```tsx
const handleRestore = async (version: number) => {
  await restoreMutation.mutateAsync({ id: data.id, version });
  navigate(quoteToolPath(data.workspace, data.id, version));
};
```

`restoreMutation` calls `quoteStorage.restoreVersion` which is documented (lines 293-309) as "NON-DESTRUCTIVE. Returns the formValues." The return value is **discarded** — the only effect is to read from IndexedDB. The next line then navigates to `?fromQuote=ID&restoreVersion=N`, where `QuoteForm.tsx:44-54` independently calls `getSavedQuote` and reads the same data again.

So the user pays for a redundant IDB read on every Restore click. If IDB is throttled (Safari background tab) the navigation is delayed for no functional reason. Worse: if `restoreMutation.mutateAsync` throws (record missing), the click silently swallows the error (no `try/catch`, no toast) AND blocks the navigate. A user clicking Restore while the page-level `useSavedQuote` cache is stale (e.g., another tab deleted the record between mount and click) gets a hung click.

**Fix:**
Drop the mutation entirely; the rehydration happens inside `QuoteForm`:

```tsx
const handleRestore = (version: number) => {
  navigate(quoteToolPath(data.workspace, data.id, version));
};

// Remove: const restoreMutation = useRestoreVersion();
// Remove: import { useRestoreVersion } from "@/hooks/useSavedQuotes";
```

Or, if the intent was to surface "version not found" before navigating, wrap in `try/catch` and toast on error. As-is, the call is dead weight.

### WR-06: Same-input diff in `saveSavedQuote` uses key-order-sensitive `JSON.stringify`

**File:** `frontend/src/lib/quoteStorage.ts:193-195`

**Issue:**
```ts
const inputsChanged =
  JSON.stringify(lastVersion.formValues) !== JSON.stringify(args.formValues) ||
  JSON.stringify(lastVersion.unifiedResult) !== JSON.stringify(args.unifiedResult);
```

`JSON.stringify` is order-sensitive: `{a:1,b:2}` and `{b:2,a:1}` produce different strings. Today the `formValues` originate from react-hook-form (insertion-order stable across renders) and `unifiedResult` from `toUnifiedResult` (deterministic). But the moment any caller reorders fields — for instance, a future zod parse step that sorts keys, or a spread that happens to alter key order — the diff will report "changed" for semantically identical payloads, inflating the version array on every save (and breaking D-05's "Same-input re-save updates updatedAt + status only — no version inflation").

This is a fragile equality check.

**Fix:**
Use a deterministic deep-equal helper. Either:

```ts
import { isDeepStrictEqual } from "node:util"; // not available in browser
```

(skip — Node-only.) Better:

```ts
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

const inputsChanged =
  !deepEqual(lastVersion.formValues, args.formValues) ||
  !deepEqual(lastVersion.unifiedResult, args.unifiedResult);
```

Or canonicalize via `JSON.stringify` with a sorted-key replacer. Either way, remove the order dependency.

### WR-07: `restoredFromVersion` is plumbing-only; no caller writes it

**Files:**
- `frontend/src/pages/demo/compare/ComparisonQuote.tsx`
- `frontend/src/pages/demo/MachineLearningQuoteTool.tsx`

**Issue:**
D-06 (CONTEXT line 35): "Selecting `v3` from the history clones its inputs into the current form; the next Save commits as `v(N+1)` with a `restoredFromVersion: 3` annotation."

The plumbing exists (QuoteResultPanel → SaveQuoteButton → SaveQuoteDialog → saveSavedQuote args). The storage layer correctly writes the field when present (`quoteStorage.ts:206-208`). The hook layer accepts it (`SaveSavedQuoteArgs.restoredFromVersion`). But **no caller ever populates it**: neither Quote tool reads `searchParams.get("restoreVersion")` to forward as `restoredFromVersion` to `<QuoteResultPanel>`. So D-06's lineage annotation is silently dropped on every restore-then-save flow.

`grep -r "restoredFromVersion" frontend/src/pages/demo/` → zero matches. Subset of BL-01 — same root cause (entry-point Quote tools don't consume URL params), but I split it because the user-visible effect differs: BL-01 creates duplicate quotes; WR-07 just loses lineage on a single quote.

**Fix:** Same `useSearchParams()` pattern as BL-01; pass `restoredFromVersion={restoreVersion ? Number(restoreVersion) : undefined}` to `<QuoteResultPanel>`.

## Info

### IN-01: Three IndexedDB indexes are created but never used

**File:** `frontend/src/lib/quoteStorage.ts:110-112`

**Issue:**
```ts
store.createIndex("updatedAt", "updatedAt");
store.createIndex("status", "status");
store.createIndex("workspace", "workspace");
```

These cost a small amount of write overhead on every `put()` (IDB maintains the index trees). `grep -n "\.index(" frontend/src` returns zero matches — `listSavedQuotes` uses `getAll()` + JS sort instead of `index("updatedAt").openCursor(...)` reverse-walk that Plan 05-01 implementation block recommended ("Reads via the updatedAt index, reverse iteration").

This is acceptable (results are correct; record counts are small) but the indexes are dead weight today. Either delete the `createIndex` calls (and add them later when sort/filter scales), or actually use them in `listSavedQuotes`.

**Fix:** Either remove unused indexes:
```ts
upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    db.createObjectStore(QUOTE_STORE_NAME, { keyPath: "id" });
    // indexes deferred until query patterns require them
  }
},
```

…or actually use the `updatedAt` index for the list read. (Note: changing the upgrade callback in production would require a DB version bump.)

### IN-02: `["quotes", "__noop__"]` placeholder query key persists in cache forever

**File:** `frontend/src/hooks/useSavedQuotes.ts:91-93`

**Issue:**
```ts
queryKey: id ? QUOTE_BY_ID(id) : ["quotes", "__noop__"],
queryFn: () => (id ? getSavedQuote(id) : Promise.resolve(null)),
enabled: !!id,
```

When `id` is undefined the hook is disabled, so no fetch fires — but TanStack Query still creates a cache entry for the placeholder key on every mount. Since `staleTime: Infinity`, this entry never garbage-collects. Multiple mounts with `undefined` id (e.g., a route briefly without `:id`) accumulate `["quotes", "__noop__"]` entries that contain `null` data. On `useDeleteQuote.onSuccess` (`useSavedQuotes.ts:131-133`), `invalidateQueries({ queryKey: ["quotes"] })` matches `["quotes", "__noop__"]` and triggers a no-op refetch (still disabled, so harmless — but unnecessary work).

**Fix:** Use a placeholder that survives invalidation cleanly, e.g., a stable `["quotes", "byId", id]` shape, or guard at the caller:
```ts
queryKey: ["quotes", "byId", id ?? "__none__"],
queryFn: () => (id ? getSavedQuote(id) : Promise.resolve(null)),
enabled: !!id,
```

The `byId` namespace also disambiguates from `["quotes", "all"]` more explicitly than the bare `["quotes", id]` shape today.

### IN-03: `SavedQuote` type name collision with legacy `frontend/src/api/types.ts`

**Files:**
- `frontend/src/api/types.ts:149-153` — legacy parent-app `SavedQuote` (with `created_by` JWT field)
- `frontend/src/lib/savedQuoteSchema.ts:127` — Phase 5 `SavedQuote`

**Issue:**
Two distinct `SavedQuote` exports coexist. They never collide in the same file today (the legacy type is only consumed by Compare-tool sibling components — `QuotesTable.tsx`, `CompareHeader.tsx`, etc. — which CONTEXT.md confirms are vestigial-from-parent-app). But the namespace overlap is a footgun: a future grep-and-replace or auto-import could land on the wrong shape.

**Fix:** Either rename Phase 5's type to `PersistedQuote` (or `MyQuote`), or rename the legacy api-types `SavedQuote` to `LegacySavedQuote`. CONTEXT.md gotcha #11 already flagged the folder-naming overlap; the type-name overlap is the same hygiene gap.

### IN-04: `materialsCost: args.formValues.estimated_materials_cost ?? 0` accepts negatives in storage

**File:** `frontend/src/lib/quoteStorage.ts:222, 246`

**Issue:**
The form schema (`schema.ts:62`) enforces `estimated_materials_cost: z.coerce.number().min(0)`, so a normal save can't surface a negative. But the storage layer's denormalized `materialsCost: z.number()` (savedQuoteSchema.ts:124) imposes no min, and the `?? 0` only handles `undefined`. A bypass route — direct `saveSavedQuote` call with synthesized formValues — could store `materialsCost: -100`, which the My Quotes list then renders as `$-100`.

Not exploitable in practice (no public API surface for direct calls), but tightening the schema closes the gap.

**Fix:**
```ts
materialsCost: z.number().min(0),
```

…in `savedQuoteSchema`, plus `Math.max(0, args.formValues.estimated_materials_cost ?? 0)` in storage.

### IN-05: `QuoteRow` uses `<div role="button">` instead of `<button>` — keyboard activation reimplemented

**File:** `frontend/src/pages/quotes/QuoteRow.tsx:74-87`

**Issue:**
The comment (lines 13-17) accurately notes the trade-off: nested interactive elements (`StatusChip`, `Trash2` button) inside a `<button>` would violate HTML semantics, so the row uses `<div role="button" tabIndex={0}>` with manual `Enter`/`Space` key handlers. This is correct.

But: the manual handler only listens for `Enter` and `Space`. Native `<button>` also activates on `Space-down` then commits on `Space-up` (so a held Space doesn't multi-fire); the manual `keyDown` handler here will multi-fire on key-repeat. Lower-priority, but worth noting because the established native pattern would handle this for free if the inner buttons were restructured (e.g., position chip+delete absolutely above an underlying `<button>` that does the navigation).

Not a bug — flagged for awareness only.

### IN-06: `salesBucket` derivation diverges across two definition sites

**Files:**
- `frontend/src/lib/savedQuoteSchema.ts:203-210` — exported `deriveSalesBucket`
- `frontend/src/lib/quoteStorage.ts:134-141` — private `deriveSalesBucketFromValues`

**Issue:**
Identical logic duplicated for the stated reason "kept private here to avoid the type-only import widening" (line 131-132). The two functions could drift: a future change to one (e.g., adding "Controls" bucket) silently won't apply to the denormalized `salesBucket` field on save unless both are touched.

The cited "type-only import widening" justification is thin — `import { deriveSalesBucket } from "./savedQuoteSchema"` already happens implicitly through the schema import, and the function body has no type cost.

**Fix:** Have `quoteStorage.ts` call the exported `deriveSalesBucket`:
```ts
import {
  deriveSalesBucket,
  savedQuoteSchema,
  // ...
} from "./savedQuoteSchema";

// ... and replace deriveSalesBucketFromValues calls with deriveSalesBucket.
```

## Threat Model Traceability

| Threat | Component | Disposition | Verified |
|--------|-----------|-------------|----------|
| T-05-01 | quoteStorage.saveSavedQuote zod re-validation | mitigate | YES — line 251 calls `savedQuoteSchema.parse(record)` before write |
| T-05-02 | XSS via persisted name | accept | YES — no `dangerouslySetInnerHTML` anywhere; React text node escaping (verified via grep) |
| T-05-03 | DoS via runaway version history | mitigate | PARTIAL — `savedQuoteNameSchema` capped at 80 chars, `quoteFormSchema` bounds payload, but no per-quote total-version cap (a script could append unbounded versions). Acceptable given single-SE threat model |
| T-05-04 | BroadcastChannel cache-invalidate-only | mitigate | YES — `useSavedQuotes:69-71` invalidates on every event; never reads payload |
| T-05-05 | schemaVersion-future record handling | mitigate | PARTIAL — `getSavedQuote` re-validates (line 170), but `listSavedQuotes` does NOT (see WR-02) |
| T-05-06 | StatusChip text content | mitigate | YES — typed enum prop, React text node |
| T-05-07 | WorkspacePill text content | mitigate | YES — `Workspace` literal-narrowed prop, React text node |
| T-05-08 | VersionHistoryList rendering | mitigate | YES — typed `QuoteVersion` props, no raw HTML |
| T-05-09 | useSavedQuotes broadcast handler | mitigate | YES — invalidate-only; mirrors T-05-04 |
| T-05-10 | SaveQuoteDialog name → persist | mitigate | YES — `savedQuoteNameSchema.safeParse(name)` at boundary (SaveQuoteDialog.tsx:108), storage-layer re-validate at line 251 |
| T-05-11 | DeleteQuoteModal two-step confirm | mitigate | YES — Trash icon (per-row) → modal with verbatim D-17 copy → primary danger button on right |
| T-05-12 | Modal name rendering | mitigate | YES — `<strong>{quoteName}</strong>` text node (DeleteQuoteModal.tsx:92) |
| T-05-13 | QuoteRow name rendering | mitigate | YES — `{quote.name}` text node (QuoteRow.tsx:90) |
| T-05-14 | MyQuotesPage name rendering | mitigate | YES — flows through QuoteRow + DeleteQuoteModal |
| T-05-15 | SavedQuotePage URL :id → IDB read | mitigate | YES — `useSavedQuote(id)` → `getSavedQuote` (zod-validated); not-found state on parse failure (data-undefined branch SavedQuotePage:89) |
| T-05-16 | QuoteForm `?fromQuote` rehydration | mitigate | YES — `getSavedQuote(fromQuoteId)` is zod-validated; reset to defaults on parse fail (QuoteForm.tsx:46 — silent skip when no record) |
| T-05-17 | Jargon-guard scope coverage | mitigate | YES — 9 Phase 5 surfaces added to `jargon-guard.test.tsx` (lines 209-342); BANNED_TOKENS unchanged |

**Threat-model summary:** 14/17 fully mitigated, 2/17 partially (T-05-03, T-05-05 — see WR-02 for T-05-05 path), 1/17 accepted by design (T-05-02). One partial (T-05-05) becomes a hard-mitigated case once WR-02 is fixed.

## Summary Counts

- **BLOCKER:** 1 (BL-01 — re-save creates duplicate; PERSIST-06 broken end-to-end)
- **WARNING:** 7 (WR-01 focus trap missing; WR-02 listSavedQuotes skips zod parse; WR-03 useSavedQuote no broadcast subscription; WR-04 D-13 humanQuotedByBucket always empty; WR-05 unused restoreMutation call; WR-06 key-order JSON.stringify diff; WR-07 restoredFromVersion never written)
- **INFO:** 6 (IN-01 unused IDB indexes; IN-02 noop query-key cache leak; IN-03 SavedQuote type name collision; IN-04 negative materialsCost not blocked; IN-05 div role=button keyboard repeat; IN-06 deriveSalesBucket duplicated)

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
