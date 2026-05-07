---
phase: 07
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/lib/savedQuoteSchema.ts
  - frontend/src/lib/quoteStorage.ts
  - frontend/src/components/quote/SaveQuoteButton.tsx
  - frontend/src/components/quote/SaveQuoteDialog.tsx
  - frontend/src/components/quote/RomBadge.tsx
  - frontend/src/components/quote/RomBadge.test.tsx
  - frontend/src/pages/single-quote/romSchema.ts
autonomous: true
requirements:
  - ROM-02
specialists:
  - frontend-specialist
  - test-writer
must_haves:
  truths:
    - "An optional `mode: 'rom' | 'full'` field is added to savedQuoteSchema (top-level) and quoteVersionSchema (per-version), with default 'full' on read for legacy v2 records (D-03, D-19)."
    - "schemaVersion stays at literal 2 — no IndexedDB onupgradeneeded change (D-03)."
    - "buildAutoSuggestedName inserts the literal token 'ROM' after the salesBucket only when mode === 'rom' (D-17)."
    - "SaveSavedQuoteArgs gains an optional `mode?: 'rom' | 'full'` field; saveSavedQuote denormalizes top-level mode from args (or preserves existing on update); the latest version's mode mirrors args.mode."
    - "SaveQuoteButton + SaveQuoteDialog accept and forward an optional `mode` prop end-to-end through to saveSavedQuote (D-19)."
    - "A new <RomBadge> component renders the literal text 'Preliminary' inside a `bg-amberSoft text-ink eyebrow uppercase` chip with `aria-label='Preliminary estimate'` (D-07, D-08)."
    - "A new romFormSchema (4-field zod subset of quoteFormSchema) exists at frontend/src/pages/single-quote/romSchema.ts with helpers romFormDefaults and toQuoteFormValues (D-02)."
  artifacts:
    - path: "frontend/src/components/quote/RomBadge.tsx"
      provides: "Preliminary badge primitive (D-07)"
      contains: "export function RomBadge"
    - path: "frontend/src/components/quote/RomBadge.test.tsx"
      provides: "Render + ARIA test for the Preliminary badge"
      contains: "RomBadge"
    - path: "frontend/src/pages/single-quote/romSchema.ts"
      provides: "ROM 4-field zod schema + defaults + toQuoteFormValues"
      contains: "export const romFormSchema"
    - path: "frontend/src/lib/savedQuoteSchema.ts"
      provides: "mode flag on top-level + per-version, ROM token in auto-suggested name"
      contains: "mode: z.enum"
    - path: "frontend/src/lib/quoteStorage.ts"
      provides: "SaveSavedQuoteArgs.mode threading"
      contains: "mode?: \"rom\" | \"full\""
    - path: "frontend/src/components/quote/SaveQuoteButton.tsx"
      provides: "mode prop pass-through"
      contains: "mode?: \"rom\" | \"full\""
    - path: "frontend/src/components/quote/SaveQuoteDialog.tsx"
      provides: "mode prop pass-through into saveQuote.mutateAsync"
      contains: "mode?: \"rom\" | \"full\""
  key_links:
    - from: "frontend/src/components/quote/SaveQuoteButton.tsx"
      to: "frontend/src/components/quote/SaveQuoteDialog.tsx"
      via: "payload.mode"
      pattern: "mode: payload.mode"
    - from: "frontend/src/components/quote/SaveQuoteDialog.tsx"
      to: "frontend/src/lib/quoteStorage.ts (saveSavedQuote)"
      via: "saveQuote.mutateAsync({ ...payload, mode })"
      pattern: "mode:"
    - from: "frontend/src/lib/savedQuoteSchema.ts (buildAutoSuggestedName)"
      to: "ROM-mode auto-suggested name"
      via: "literal `ROM` token insertion"
      pattern: "ROM"
---

<objective>
Land the data-layer foundation and the single new presentational primitive (RomBadge) for Phase 7. This plan adds the optional `mode: "rom" | "full"` field to the persistence shape (schema + storage + Save button/dialog pass-through), extends `buildAutoSuggestedName` to insert the literal `ROM` token, defines the new 4-field `romFormSchema`, and ships the standalone `RomBadge` primitive with its render test.

Purpose: every other Phase 7 plan depends on these primitives. The ROM badge has no other Phase 7 file dependencies and can ship alongside the data-layer extension in the same wave because both are file-disjoint from `romEstimator.ts` (Plan 07-02). After this plan, Wave 2 (Plan 07-03) can build the form against romFormSchema and the result panel against the typed mode prop, and Wave 3 (Plan 07-04) can route a saved-quote `mode === "rom"` round-trip end to end.

Output: schema-level mode field, list-row denormalization carried through, RomBadge primitive + test, romFormSchema + helpers — total 7 file touches (2 NEW components + 1 NEW component test + 1 NEW schema file + 4 MODIFIED data-layer files).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/07-rom-quote-mode/07-UI-SPEC.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from the live codebase 2026-05-06. -->

From frontend/src/lib/savedQuoteSchema.ts (current shape — Phase 6 v2):
```typescript
export const savedQuoteSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.literal(2),
  name: savedQuoteNameSchema,
  workspace: z.enum(["real", "synthetic"]),
  status: z.enum(STATUS_CYCLE),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  versions: z.array(quoteVersionSchema).min(1),
  // Denormalized list-row metadata.
  salesBucket: z.string(),
  visionLabel: z.string(),
  materialsCost: z.number(),
});

export const quoteVersionSchema = z.object({
  version: z.number().int().min(1),
  savedAt: z.string().datetime(),
  statusAtTime: z.enum(STATUS_CYCLE),
  formValues: quoteFormSchema,
  unifiedResult: unifiedQuoteResultSchema,
  restoredFromVersion: z.number().int().min(1).optional(),
  compareInputs: z.object({...}).optional(),
});

export function buildAutoSuggestedName(values: QuoteFormValues, estimatedHours: number): string {
  // builds: "{bucket} {hours}h · {visionLabel} · {ISO date}" — capped at 80
}
```

From frontend/src/lib/quoteStorage.ts (current SaveSavedQuoteArgs):
```typescript
export interface SaveSavedQuoteArgs {
  id?: string;
  name: string;
  workspace: Workspace;
  status?: WorkflowStatus;
  formValues: QuoteFormValues;
  unifiedResult: Record<string, unknown> | object;
  compareInputs?: { humanQuotedByBucket: Record<string, number> };
  restoredFromVersion?: number;
}
```

From frontend/src/pages/single-quote/schema.ts:
```typescript
export const quoteFormDefaults: QuoteFormValues = { ... };
export const quoteFormSchema = z.object({ ... });
```

From frontend/src/components/quote/SaveQuoteButton.tsx (line 31-46):
```typescript
export interface SaveQuoteButtonProps {
  workspace: Workspace;
  formValues: QuoteFormValues;
  unifiedResult: UnifiedQuoteResult;
  quoteId?: string;
  existingName?: string;
  status?: WorkflowStatus;
  restoredFromVersion?: number;
  compareInputs?: { humanQuotedByBucket: Record<string, number> };
  variant?: "primary" | "compact";
}
```

From frontend/src/components/quote/SaveQuoteDialog.tsx (line 32-52, payload shape):
```typescript
payload: {
  id?: string;
  workspace: Workspace;
  status?: WorkflowStatus;
  formValues: QuoteFormValues;
  unifiedResult: UnifiedQuoteResult;
  compareInputs?: { humanQuotedByBucket: Record<string, number> };
  restoredFromVersion?: number;
  suggestedName: string;
  existingName?: string;
};
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add `mode` flag to savedQuoteSchema + quoteVersionSchema + buildAutoSuggestedName ROM-token extension</name>
  <files>frontend/src/lib/savedQuoteSchema.ts</files>

  <read_first>
    - frontend/src/lib/savedQuoteSchema.ts (full file — 256 lines, the current schema is the contract)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-03, D-17, D-19 — the locked decisions for mode flag location and auto-suggested name format)
    - frontend/src/lib/savedQuoteSchema.test.ts (if it exists — to mirror existing test patterns)
  </read_first>

  <behavior>
    - Test: parsing a v2 record WITHOUT a `mode` field succeeds and yields `mode: "full"` after schema parse (default applied).
    - Test: parsing a v2 record WITH `mode: "rom"` round-trips that value at both savedQuoteSchema.mode and versions[0].mode.
    - Test: parsing a v2 record WITH `mode: "full"` round-trips.
    - Test: invalid mode (e.g. `mode: "ROM"` capitalized, `mode: "preliminary"`) fails zod parse.
    - Test: buildAutoSuggestedName({...quoteFormDefaults, industry_segment:"Auto", system_category:"X", automation_level:"Y", estimated_materials_cost: 245000}, 240) returns a string starting with the bucket and NOT containing " ROM " when called with mode === "full" (default).
    - Test: a NEW exported helper `buildRomAutoSuggestedName(values, estimatedHours)` (or a new optional `mode` argument on buildAutoSuggestedName) returns a string that contains the literal substring " ROM " between the bucket and the hour token. Example assertion: result starts with "{bucket} ROM " (e.g. `expect(name).toMatch(/^(ME|EE|ME\+EE|Quote) ROM \d+h · /)`).
  </behavior>

  <action>
    Edit `frontend/src/lib/savedQuoteSchema.ts`:

    1. Add a new exported zod enum just below `STATUS_CYCLE`:
       ```typescript
       /** Quote shape mode (D-03). "rom" = ROM-quote (Phase 7); "full" = full-input quote.
        *  Optional on read; missing or undefined defaults to "full" for backward-compat
        *  with every Phase 5 / Phase 6 saved record. */
       export const QUOTE_MODE_VALUES = ["rom", "full"] as const;
       export type QuoteMode = (typeof QUOTE_MODE_VALUES)[number];
       ```

    2. Extend `quoteVersionSchema` (currently line 97-109) to include the optional mode field with default `"full"`. Use `.default("full")` so a parse of a versionless record produces a defined `mode`:
       ```typescript
       export const quoteVersionSchema = z.object({
         version: z.number().int().min(1),
         savedAt: z.string().datetime(),
         statusAtTime: z.enum(STATUS_CYCLE),
         formValues: quoteFormSchema,
         unifiedResult: unifiedQuoteResultSchema,
         restoredFromVersion: z.number().int().min(1).optional(),
         compareInputs: z
           .object({
             humanQuotedByBucket: z.record(z.string(), z.number()),
           })
           .optional(),
         mode: z.enum(QUOTE_MODE_VALUES).optional().default("full"),
       });
       ```

    3. Extend `savedQuoteSchema` (currently line 112-125) to include the same optional+default mode field at the top level:
       ```typescript
       export const savedQuoteSchema = z.object({
         id: z.string().uuid(),
         schemaVersion: z.literal(2),
         name: savedQuoteNameSchema,
         workspace: z.enum(["real", "synthetic"]),
         status: z.enum(STATUS_CYCLE),
         createdAt: z.string().datetime(),
         updatedAt: z.string().datetime(),
         versions: z.array(quoteVersionSchema).min(1),
         salesBucket: z.string(),
         visionLabel: z.string(),
         materialsCost: z.number(),
         mode: z.enum(QUOTE_MODE_VALUES).optional().default("full"),
       });
       ```

    4. Replace `buildAutoSuggestedName` (currently line 235-255) with a single function that accepts an optional third argument `mode?: QuoteMode`. When `mode === "rom"`, insert the literal token ` ROM` between the salesBucket and the hour label. Format becomes: `"{bucket}[ ROM] {hours}h · {visionLabel} · {ISO}"`. Keep the 80-char cap; ROM mode quotes get a slightly tighter vision-label budget (truncate vision first, never the date). Verbatim from D-17: `"ME ROM 240h · No vision · 2026-05-06"`. **Note on D-17 format:** the canonical D-17 example string `"ME ROM 240h · No vision · 2026-05-06"` preserves the existing Phase 5 `{bucket} {hours}h · {visionLabel} · {ISO}` template with the literal `ROM` token inserted after the salesBucket. This implementation deliberately honors that example over any prose-truncated D-17 description elsewhere in the spec — the example string IS the contract for the format.

       Example signature:
       ```typescript
       export function buildAutoSuggestedName(
         values: QuoteFormValues,
         estimatedHours: number,
         mode?: QuoteMode,
       ): string {
         const bucket = deriveSalesBucket(values);
         const romToken = mode === "rom" ? " ROM" : "";
         const hours = `${Math.round(estimatedHours).toLocaleString("en-US")}h`;
         const visionLabel = (!values.visionRows || values.visionRows.length === 0)
           ? "No vision"
           : values.visionRows.map((r) => `${r.type}×${r.count}`).join("+");
         const date = new Date().toISOString().slice(0, 10);
         const candidate = `${bucket}${romToken} ${hours} · ${visionLabel} · ${date}`;
         if (candidate.length <= 80) return candidate;
         const overrun = candidate.length - 80;
         const truncatedLen = Math.max(0, visionLabel.length - overrun - 1);
         const truncatedVision = visionLabel.slice(0, truncatedLen) + "…";
         return `${bucket}${romToken} ${hours} · ${truncatedVision} · ${date}`;
       }
       ```

    5. The exported `SavedQuote` and `QuoteVersion` types now include `mode: QuoteMode` (non-optional after parse, because of `.default("full")`). Verify by running typecheck — no consumer needs updating because the field is post-parse always defined as `"full"` for legacy records.

    Also write `frontend/src/lib/savedQuoteSchema.test.ts` if not already present, OR extend the existing one with the four behavior cases above. The existing repo convention places schema tests next to the schema file; mirror that.
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/lib/savedQuoteSchema.test.ts</automated>
    <automated>cd frontend && npm run typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/lib/savedQuoteSchema.ts` contains `export const QUOTE_MODE_VALUES = ["rom", "full"]` (literal).
    - `frontend/src/lib/savedQuoteSchema.ts` contains `mode: z.enum(QUOTE_MODE_VALUES).optional().default("full")` at TWO sites (in quoteVersionSchema AND savedQuoteSchema).
    - `frontend/src/lib/savedQuoteSchema.ts` contains the substring `mode === "rom" ? " ROM" : ""` (or equivalent — the literal ` ROM` token MUST be wired into buildAutoSuggestedName conditional on mode).
    - `frontend/src/lib/savedQuoteSchema.ts` does NOT contain `schemaVersion: z.literal(3)` anywhere (D-03 forbids the schemaVersion bump).
    - Tests in `frontend/src/lib/savedQuoteSchema.test.ts` cover the 6 behavior cases above and pass.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    schema/types extended; buildAutoSuggestedName accepts mode; tests cover default-fallback, round-trip, invalid-mode, and ROM-token formatting. `npm run typecheck` and `npm run test -- --run src/lib/savedQuoteSchema.test.ts` exit 0.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Thread `mode` through quoteStorage.SaveSavedQuoteArgs + saveSavedQuote denormalization</name>
  <files>frontend/src/lib/quoteStorage.ts</files>

  <read_first>
    - frontend/src/lib/quoteStorage.ts (full file — 461 lines, the current saveSavedQuote logic is the contract being extended)
    - frontend/src/lib/quoteStorage.test.ts (if it exists — mirror the existing test patterns; otherwise extend the SchemaTest fixture from Phase 6)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-19 — top-level + per-version mode persistence)
  </read_first>

  <behavior>
    - Test: saveSavedQuote({...args, mode: "rom"}) on a brand-new record produces a SavedQuote where both `record.mode === "rom"` AND `record.versions[0].mode === "rom"`.
    - Test: saveSavedQuote({...args}) without `mode` arg on a brand-new record produces a SavedQuote with `record.mode === "full"` AND `record.versions[0].mode === "full"`.
    - Test: saveSavedQuote on an UPDATE (existing id) without args.mode preserves existing record.mode and stamps the new version's mode to match `args.mode ?? existing.mode`.
    - Test: saveSavedQuote on an UPDATE with args.mode that differs from existing.mode updates the top-level record.mode AND stamps the new version's mode to args.mode (so a ROM quote saved-as-full or vice versa is honestly recorded — though the UI currently never crosses; this defends the contract).
    - Test: a Phase 6 v2 record persisted WITHOUT a mode field round-trips through getSavedQuote and surfaces with `mode === "full"` (defaulted post-parse).
  </behavior>

  <action>
    Edit `frontend/src/lib/quoteStorage.ts`:

    1. Import `QuoteMode` from savedQuoteSchema:
       ```typescript
       import {
         savedQuoteSchema,
         type QuoteMode,
         type QuoteVersion,
         type SavedQuote,
         type WorkflowStatus,
         type Workspace,
       } from "./savedQuoteSchema";
       ```

    2. Extend `SaveSavedQuoteArgs` (currently line 48-66) to add an optional mode field:
       ```typescript
       export interface SaveSavedQuoteArgs {
         id?: string;
         name: string;
         workspace: Workspace;
         status?: WorkflowStatus;
         formValues: QuoteFormValues;
         unifiedResult: Record<string, unknown> | object;
         compareInputs?: { humanQuotedByBucket: Record<string, number> };
         restoredFromVersion?: number;
         /** D-03 / D-19: ROM vs full quote shape. Optional; defaults to "full"
          *  on brand-new records and preserves existing on update when omitted. */
         mode?: QuoteMode;
       }
       ```

    3. In `saveSavedQuote` (currently line 316-394), thread mode into BOTH the new-record branch and the update branch.

       In the **brand-new** branch (currently line 363-385), add `mode` to the new QuoteVersion AND to the top-level record. Default to `"full"` when args.mode is omitted:
       ```typescript
       const effectiveMode: QuoteMode = args.mode ?? "full";
       record = {
         id: crypto.randomUUID(),
         schemaVersion: 2,
         name: args.name.trim(),
         workspace: args.workspace,
         status: args.status ?? "draft",
         createdAt: now,
         updatedAt: now,
         mode: effectiveMode,
         versions: [
           {
             version: 1,
             savedAt: now,
             statusAtTime: args.status ?? "draft",
             formValues: args.formValues,
             unifiedResult: args.unifiedResult as QuoteVersion["unifiedResult"],
             mode: effectiveMode,
             ...(args.compareInputs && { compareInputs: args.compareInputs }),
           },
         ],
         salesBucket: deriveSalesBucketFromValues(args.formValues),
         visionLabel: deriveVisionLabel(args.formValues),
         materialsCost: args.formValues.estimated_materials_cost ?? 0,
       };
       ```

       In the **update** branch (currently line 321-361), preserve existing mode when args.mode is omitted, and stamp the new version's mode to args.mode (or existing.mode if omitted). The existing.mode is always defined post-parse because savedQuoteSchema applies `.default("full")`. Concretely:
       ```typescript
       const effectiveMode: QuoteMode = args.mode ?? existing.mode;
       // ... existing inputsChanged computation ...
       const versions: QuoteVersion[] = inputsChanged
         ? [
             ...existing.versions,
             {
               version: lastVersion.version + 1,
               savedAt: now,
               statusAtTime: args.status ?? existing.status,
               formValues: args.formValues,
               unifiedResult: args.unifiedResult as QuoteVersion["unifiedResult"],
               mode: effectiveMode,
               ...(args.restoredFromVersion !== undefined && {
                 restoredFromVersion: args.restoredFromVersion,
               }),
               ...(args.compareInputs && { compareInputs: args.compareInputs }),
             },
           ]
         : existing.versions;

       record = {
         ...existing,
         name: args.name.trim(),
         status: args.status ?? existing.status,
         updatedAt: now,
         mode: effectiveMode,
         versions,
         salesBucket: deriveSalesBucketFromValues(args.formValues),
         visionLabel: deriveVisionLabel(args.formValues),
         materialsCost: args.formValues.estimated_materials_cost ?? 0,
       };
       ```

       Note: the inputsChanged comparison currently uses `deepEqual(lastVersion.formValues, args.formValues) && deepEqual(lastVersion.unifiedResult, args.unifiedResult)`. Adding mode to that comparison is NOT required because mode never changes mid-record-update through the UI today (a ROM quote stays ROM, a full quote stays full). Document this in a comment if needed; do NOT add mode to the deepEqual chain (would inflate versions on a no-op re-save).

    4. Do NOT touch the IDB upgrade path — schemaVersion stays 2 (D-03). The `mode` field is purely additive on a v2 record; the `.passthrough()` chain (savedQuoteSchema.ts:52) and `savedQuoteSchema.parse()` together ensure round-trip integrity.

    5. Do NOT touch `migrateRecordV1ToV2` — it doesn't need to know about mode (legacy v1 records pre-date Phase 7 entirely).

    Extend or create `frontend/src/lib/quoteStorage.test.ts` to cover the five behavior cases above.
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/lib/quoteStorage.test.ts</automated>
    <automated>cd frontend && npm run typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/lib/quoteStorage.ts` contains `mode?: QuoteMode` in the SaveSavedQuoteArgs interface (verbatim — using the QuoteMode type from savedQuoteSchema).
    - `frontend/src/lib/quoteStorage.ts` contains the substring `args.mode ?? "full"` (brand-new branch effectiveMode resolution) AND `args.mode ?? existing.mode` (update branch effectiveMode resolution).
    - `frontend/src/lib/quoteStorage.ts` saveSavedQuote stamps the new QuoteVersion with `mode: effectiveMode` in BOTH the brand-new and update branches.
    - `frontend/src/lib/quoteStorage.ts` does NOT contain `QUOTE_DB_VERSION = 3` anywhere (still must be `2`).
    - `frontend/src/lib/quoteStorage.ts` does NOT contain a new `if (oldVersion < 3)` block in the IDB upgrade callback.
    - Tests in `frontend/src/lib/quoteStorage.test.ts` cover the 5 behavior cases above and pass.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    SaveSavedQuoteArgs gains optional `mode`; saveSavedQuote denormalizes top-level mode AND stamps per-version mode; no IDB schema bump; test coverage for default + round-trip + update preservation. `npm run test` for quoteStorage exits 0.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Pass-through `mode` prop on SaveQuoteButton + SaveQuoteDialog</name>
  <files>frontend/src/components/quote/SaveQuoteButton.tsx, frontend/src/components/quote/SaveQuoteDialog.tsx</files>

  <read_first>
    - frontend/src/components/quote/SaveQuoteButton.tsx (full file — 107 lines, the props contract)
    - frontend/src/components/quote/SaveQuoteDialog.tsx (full file — 240 lines, the payload + saveQuote.mutateAsync call)
    - frontend/src/components/quote/SaveQuoteButton.test.tsx (if exists — to mirror existing render assertions)
    - frontend/src/components/quote/SaveQuoteDialog.test.tsx (if exists — same)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-19 — mode threads end-to-end)
  </read_first>

  <behavior>
    - Test: <SaveQuoteButton workspace="real" formValues={...} unifiedResult={...} mode="rom" /> opens a SaveQuoteDialog whose payload contains `mode: "rom"`.
    - Test: <SaveQuoteButton workspace="real" formValues={...} unifiedResult={...} /> (no mode prop) opens a dialog whose payload is `mode: undefined` (so saveSavedQuote's args.mode === undefined branch fires).
    - Test: SaveQuoteDialog onSubmit invokes saveQuote.mutateAsync with `mode: "rom"` when payload.mode === "rom" (mock the hook).
    - Test: when SaveQuoteButton receives `mode: "rom"`, the `suggestedName` it computes via buildAutoSuggestedName contains the literal " ROM " token.
  </behavior>

  <action>
    Edit `frontend/src/components/quote/SaveQuoteButton.tsx`:

    1. Import `QuoteMode` from savedQuoteSchema:
       ```typescript
       import {
         buildAutoSuggestedName,
         type QuoteMode,
         type SavedQuote,
         type WorkflowStatus,
         type Workspace,
       } from "@/lib/savedQuoteSchema";
       ```

    2. Add `mode?: QuoteMode;` to `SaveQuoteButtonProps` (currently line 31-46), with a JSDoc:
       ```typescript
       /** D-19: ROM vs full quote shape. Threaded into the saved record so the
        *  list-row badge and re-open routing can distinguish them. Omit for
        *  full-mode quotes (defaults to "full" downstream). */
       mode?: QuoteMode;
       ```

    3. Destructure `mode` from props in the function component (currently line 52-62), then thread it into BOTH the call to `buildAutoSuggestedName` AND the SaveQuoteDialog payload:
       ```typescript
       export function SaveQuoteButton({
         workspace,
         formValues,
         unifiedResult,
         quoteId,
         existingName,
         status,
         restoredFromVersion,
         compareInputs,
         mode,
         variant = "primary",
       }: SaveQuoteButtonProps) {
         const [open, setOpen] = useState(false);
         const navigate = useNavigate();
         const suggestedName = buildAutoSuggestedName(
           formValues,
           unifiedResult.estimateHours,
           mode,
         );
         // ... existing return; pass mode in payload below ...
       }
       ```

    4. In the JSX (currently line 86-103), add `mode` to the dialog payload object:
       ```typescript
       payload={{
         id: quoteId,
         workspace,
         status,
         formValues,
         unifiedResult,
         compareInputs,
         restoredFromVersion,
         suggestedName,
         existingName,
         mode,
       }}
       ```

    Edit `frontend/src/components/quote/SaveQuoteDialog.tsx`:

    1. Import `QuoteMode`:
       ```typescript
       import {
         savedQuoteNameSchema,
         type QuoteMode,
         type SavedQuote,
         type WorkflowStatus,
         type Workspace,
       } from "@/lib/savedQuoteSchema";
       ```

    2. Add `mode?: QuoteMode;` to the payload type in `SaveQuoteDialogProps` (currently line 32-52):
       ```typescript
       payload: {
         id?: string;
         workspace: Workspace;
         status?: WorkflowStatus;
         formValues: QuoteFormValues;
         unifiedResult: UnifiedQuoteResult;
         compareInputs?: { humanQuotedByBucket: Record<string, number> };
         restoredFromVersion?: number;
         suggestedName: string;
         existingName?: string;
         mode?: QuoteMode;
       };
       ```

    3. In the `onSubmit` handler (currently line 110-159), thread `payload.mode` into the saveQuote.mutateAsync arg object:
       ```typescript
       const saved = await saveQuote.mutateAsync({
         id: payload.id,
         name: parsed.data,
         workspace: payload.workspace,
         status: payload.status,
         formValues: payload.formValues,
         unifiedResult: payload.unifiedResult,
         compareInputs: payload.compareInputs,
         restoredFromVersion: payload.restoredFromVersion,
         mode: payload.mode,
       });
       ```

    4. Do NOT add any visible UI for mode in the dialog itself — the dialog is unchanged from Phase 5 visually (UI-SPEC §"Save / restore" — unchanged from Phase 5). Mode is purely a data-layer pass-through here.

    Extend tests for both components per the behavior cases above. Mock `useSaveQuote` (TanStack hook) similar to the existing Phase 5 test patterns.
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/components/quote/SaveQuoteButton.test.tsx src/components/quote/SaveQuoteDialog.test.tsx</automated>
    <automated>cd frontend && npm run typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/components/quote/SaveQuoteButton.tsx` contains `mode?: QuoteMode;` in the props interface.
    - `frontend/src/components/quote/SaveQuoteButton.tsx` contains the substring `buildAutoSuggestedName(\n          formValues,\n          unifiedResult.estimateHours,\n          mode,` (or equivalent multi-line formatting — the third positional arg `mode` MUST be passed).
    - `frontend/src/components/quote/SaveQuoteButton.tsx` payload object passed to SaveQuoteDialog contains `mode,` (shorthand) or `mode: mode`.
    - `frontend/src/components/quote/SaveQuoteDialog.tsx` payload type contains `mode?: QuoteMode`.
    - `frontend/src/components/quote/SaveQuoteDialog.tsx` saveQuote.mutateAsync call contains `mode: payload.mode`.
    - Test coverage for the 4 behavior cases above passes.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    SaveQuoteButton accepts a `mode` prop and forwards it through suggestedName + dialog payload + saveQuote.mutateAsync. Dialog UI itself unchanged. Tests cover the threading. typecheck + lint clean.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Create RomBadge component + render test</name>
  <files>frontend/src/components/quote/RomBadge.tsx, frontend/src/components/quote/RomBadge.test.tsx</files>

  <read_first>
    - frontend/src/components/quote/StatusChip.tsx (chrome dimensions reference per UI-SPEC Cross-References — 28px tall, eyebrow uppercase)
    - frontend/src/components/quote/WorkspacePill.tsx (read-only badge primitive reference)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-07 + D-08 + Accessibility section + RomBadge anatomy at line 352-371)
    - frontend/src/lib/utils.ts (cn helper — same as Phase 5 / Phase 6)
  </read_first>

  <behavior>
    - Test: <RomBadge /> renders a single span with text "Preliminary" (verbatim, capital P, no trailing whitespace, no other characters).
    - Test: <RomBadge /> renders with `aria-label="Preliminary estimate"` (verbatim, per Accessibility section of UI-SPEC).
    - Test: <RomBadge /> renders with the className substring `bg-amberSoft` and `text-ink` (the locked color tokens from D-07 / Color section).
    - Test: <RomBadge /> renders with eyebrow class (the uppercase eyebrow style — per UI-SPEC §"Typography" RomBadge uses `eyebrow text-xs`).
    - Test (jargon-guard): the rendered text content does NOT contain any of the BANNED_TOKENS regex matches. (The full repo jargon-guard scan picks this up later in Plan 07-05 Task 3; this local test is belt-and-suspenders.)
    - Test (DOM): the badge has min-height 28px (or rendered as `min-h-[28px]`) per UI-SPEC §"Spacing Scale" + §"Touch targets".
  </behavior>

  <action>
    Create `frontend/src/components/quote/RomBadge.tsx`. Verbatim per UI-SPEC §"`RomBadge`" anatomy:

    ```typescript
    /**
     * Phase 7 — D-07 / D-08. The "Preliminary" badge primitive.
     *
     * Renders a 28px-tall non-interactive amber chip with the text "Preliminary"
     * and aria-label "Preliminary estimate". Two render sites:
     *   - QuoteResultPanel hero card (replaces the confidence chip in ROM mode)
     *   - QuoteRow on /quotes (next to the WorkspacePill, for ROM-mode rows)
     *
     * No props. The badge is always "Preliminary" — never "Low confidence",
     * never "Wide range", never any ML-flavored synonym (D-08 anti-pattern).
     */
    import { cn } from "@/lib/utils";

    export function RomBadge() {
      return (
        <span
          className={cn(
            "inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-sm",
            "text-xs eyebrow",
            "bg-amberSoft text-ink",
          )}
          aria-label="Preliminary estimate"
        >
          Preliminary
        </span>
      );
    }
    ```

    Create `frontend/src/components/quote/RomBadge.test.tsx`:

    ```typescript
    import { describe, expect, it } from "vitest";

    import { renderWithProviders } from "@/test/render";
    import { BANNED_TOKENS } from "@/test/jargon";
    import { RomBadge } from "@/components/quote/RomBadge";

    describe("RomBadge", () => {
      it("renders the literal text 'Preliminary'", () => {
        const { getByText } = renderWithProviders(<RomBadge />);
        expect(getByText("Preliminary")).toBeInTheDocument();
      });

      it("exposes aria-label='Preliminary estimate'", () => {
        const { getByLabelText } = renderWithProviders(<RomBadge />);
        expect(getByLabelText("Preliminary estimate")).toBeInTheDocument();
      });

      it("uses bg-amberSoft + text-ink + eyebrow chrome (D-07)", () => {
        const { getByText } = renderWithProviders(<RomBadge />);
        const span = getByText("Preliminary");
        expect(span.className).toMatch(/bg-amberSoft/);
        expect(span.className).toMatch(/text-ink/);
        expect(span.className).toMatch(/eyebrow/);
      });

      it("uses min-h-[28px] for the locked 28px touch-target chrome", () => {
        const { getByText } = renderWithProviders(<RomBadge />);
        const span = getByText("Preliminary");
        expect(span.className).toMatch(/min-h-\[28px\]/);
      });

      it("renders no banned ML-jargon tokens (DATA-03)", () => {
        renderWithProviders(<RomBadge />);
        const body = document.body.textContent ?? "";
        for (const re of BANNED_TOKENS) {
          expect(body, `[jargon-guard] RomBadge: ${re}`).not.toMatch(re);
        }
      });
    });
    ```

    The repo convention is to co-locate `*.test.tsx` next to the component. Use `renderWithProviders` from `@/test/render` (existing utility — same one Phase 5/6 tests use; see jargon-guard.test.tsx:5 for the import).
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/components/quote/RomBadge.test.tsx</automated>
    <automated>cd frontend && npm run typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/components/quote/RomBadge.tsx` exists.
    - `frontend/src/components/quote/RomBadge.tsx` contains `export function RomBadge`.
    - `frontend/src/components/quote/RomBadge.tsx` contains the literal string `Preliminary` (the visible chip text — D-07 verbatim).
    - `frontend/src/components/quote/RomBadge.tsx` contains the literal string `Preliminary estimate` (the aria-label — UI-SPEC Accessibility section verbatim).
    - `frontend/src/components/quote/RomBadge.tsx` contains the substring `bg-amberSoft` and `text-ink`.
    - `frontend/src/components/quote/RomBadge.tsx` contains the substring `min-h-[28px]`.
    - `frontend/src/components/quote/RomBadge.test.tsx` exists with at least 5 `it(...)` cases covering the 5 behavior cases above.
    - `cd frontend && npm run test -- --run src/components/quote/RomBadge.test.tsx` exits 0.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    RomBadge component exists with verbatim "Preliminary" text + aria-label + locked chrome; 5 tests cover render/aria/chrome/jargon-guard. test + typecheck + lint pass.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: Create romFormSchema (4-field zod subset)</name>
  <files>frontend/src/pages/single-quote/romSchema.ts</files>

  <read_first>
    - frontend/src/pages/single-quote/schema.ts (full file — 229 lines, the parent schema being subsetted)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-02 — exact 4-field shape; D-04 — ROM defaults that fill the hidden hour-driving inputs; UI-SPEC §"Component Anatomy" `RomForm` snippet at line 246-272)
  </read_first>

  <behavior>
    - Test: parsing `{industry_segment: "Auto", system_category: "Robotic Cell", automation_level: "Semi-Auto", estimated_materials_cost: 245000}` succeeds.
    - Test: parsing with `estimated_materials_cost: 0` FAILS with the message `"Enter a material cost greater than zero."` (D-16 verbatim).
    - Test: parsing with `estimated_materials_cost: -1` FAILS with the same message.
    - Test: parsing with missing `industry_segment` FAILS with a "Required" error.
    - Test: `toQuoteFormValues(romValues)` returns a complete QuoteFormValues that satisfies `quoteFormSchema.parse()` — i.e. all 30+ fields filled with the locked ROM defaults from D-04 (plc_family="AB Compact Logix", hmi_family="AB PanelView Plus", visionRows: [], complexity_score_1_5: 3, custom_pct: 50, all numeric counts: 0, all booleans: false, classification scores: 3).
    - Test: `romFormDefaults` itself is a valid romFormSchema parse target with the four required fields blank/zero.
  </behavior>

  <action>
    Create `frontend/src/pages/single-quote/romSchema.ts`:

    ```typescript
    /**
     * Phase 7 — D-02. ROM-mode form schema (4-field zod subset).
     *
     * The ROM form takes ONLY:
     *   - industry_segment (Select, required, free string)
     *   - system_category (Select, required, free string)
     *   - automation_level (Select, required, free string — model's required
     *     categorical trio, see core/config.py — kept because the joblibs
     *     refuse to predict without it)
     *   - estimated_materials_cost (currency input, required, > 0)
     *
     * Every other QuoteFormValues field is HIDDEN from the user (D-02 forbids
     * a "show advanced" disclosure — the SE who opens that disclosure is no
     * longer in ROM mode). On submit, toQuoteFormValues fills the hidden fields
     * with the locked ROM defaults from D-04 so the trained model can run.
     */
    import { z } from "zod";

    import {
      quoteFormDefaults,
      type QuoteFormValues,
    } from "@/pages/single-quote/schema";

    const requiredString = z.string().trim().min(1, "Required");

    export const romFormSchema = z.object({
      industry_segment: requiredString,
      system_category: requiredString,
      automation_level: requiredString,
      // D-16 verbatim: "Enter a material cost greater than zero."
      estimated_materials_cost: z.coerce
        .number()
        .positive("Enter a material cost greater than zero."),
    });

    export type RomFormValues = z.infer<typeof romFormSchema>;

    /**
     * Initial values for the ROM form. All four required fields blank/zero;
     * react-hook-form's required validation prevents submission until filled.
     */
    export const romFormDefaults: RomFormValues = {
      industry_segment: "",
      system_category: "",
      automation_level: "",
      estimated_materials_cost: 0,
    };

    /**
     * D-04: expand the 4 ROM fields into a complete QuoteFormValues by filling
     * every hidden field with the locked ROM defaults (taken from quoteFormDefaults).
     * This is the input the romEstimator hands to predictQuote.
     *
     *   - plc_family / hmi_family: the AB defaults from quoteFormDefaults
     *   - all numeric counts: 0
     *   - product/process scale scores: 3 (model's mid-range)
     *   - complexity_score_1_5: 3
     *   - custom_pct: 50
     *   - all booleans: false (controls/robotics/retrofit/duplicate/deformable/bulk/tricky packaging)
     *     EXCEPT has_controls and has_robotics, which mirror quoteFormDefaults' true/true
     *     because the trained model assumes both at the demo's default project shape
     *     and zeroing them produces a degenerate prediction.
     *   - visionRows: [] (D-02 — no vision in ROM mode)
     *
     * Spreading quoteFormDefaults first then overlaying the four ROM-supplied
     * fields keeps this function correct even if quoteFormDefaults grows new
     * fields in a future phase.
     */
    export function toQuoteFormValues(rom: RomFormValues): QuoteFormValues {
      return {
        ...quoteFormDefaults,
        industry_segment: rom.industry_segment,
        system_category: rom.system_category,
        automation_level: rom.automation_level,
        estimated_materials_cost: rom.estimated_materials_cost,
      };
    }
    ```

    Also create `frontend/src/pages/single-quote/romSchema.test.ts` with the six behavior cases above.
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/pages/single-quote/romSchema.test.ts</automated>
    <automated>cd frontend && npm run typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/pages/single-quote/romSchema.ts` exists.
    - `frontend/src/pages/single-quote/romSchema.ts` contains `export const romFormSchema = z.object`.
    - `frontend/src/pages/single-quote/romSchema.ts` contains the literal string `"Enter a material cost greater than zero."` (D-16 verbatim).
    - `frontend/src/pages/single-quote/romSchema.ts` contains `export const romFormDefaults`.
    - `frontend/src/pages/single-quote/romSchema.ts` contains `export function toQuoteFormValues`.
    - `frontend/src/pages/single-quote/romSchema.ts` contains `...quoteFormDefaults` (spread of the parent defaults).
    - `frontend/src/pages/single-quote/romSchema.ts` does NOT contain `visionRows:` followed by anything other than `[]` (the function deliberately does not override visionRows — quoteFormDefaults already has `visionRows: []`).
    - Tests in `frontend/src/pages/single-quote/romSchema.test.ts` cover the 6 behavior cases above and pass.
    - `cd frontend && npm run test -- --run src/pages/single-quote/romSchema.test.ts` exits 0.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    romFormSchema + romFormDefaults + toQuoteFormValues exported from new file. Test coverage for 6 behaviors. typecheck + lint clean.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser form input → IndexedDB | User-typed material cost / industry / system category (already validated by zod). |
| IndexedDB → render | Persisted records read back, validated by `savedQuoteSchema.safeParse` on list path / `.parse` on detail path. |

This plan adds NO network boundary, NO new auth surface, NO new secrets. The static-SPA-no-backend posture from Phase 5 carries forward unchanged.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-01 | Tampering | savedQuoteSchema.mode | mitigate | `mode: z.enum(QUOTE_MODE_VALUES).optional().default("full")` rejects non-enum values at parse; existing `.passthrough()` chain prevents data loss but a forged record with an invalid `mode` value still fails `savedQuoteSchema.parse` on the detail path (T-05-05 carry-forward) — the list path silently drops it via `safeParse` (T-05-05 list-resilience posture). |
| T-07-02 | Information Disclosure | RomBadge.tsx | accept | The badge contains a single static string; no PII, no user content surfaces here. |
| T-07-03 | DoS | romFormSchema (estimated_materials_cost) | mitigate | `z.coerce.number().positive(...)` rejects zero/negative and coerces non-numeric input; quoteFormSchema's parent does NOT cap the upper bound, but downstream `Math.log1p(Math.max(v.estimated_materials_cost, 0))` in transformToQuoteInput is bounded by IEEE 754 — no infinite-loop or unbounded-allocation surface. The 80-char `savedQuoteNameSchema.max(80)` carry-forward bounds the auto-suggested name even with the new ROM token. |
| T-07-04 | Repudiation | mode field per-version | accept | Per-version `mode` stamping (D-19) means an SE can't quietly flip a saved ROM quote to look full or vice versa across versions — the version history records the mode as it was at the save time. |

Block-on severity: high. T-07-01 + T-07-03 are the only non-accept threats; both are mitigated by zod and an existing passthrough chain.
</threat_model>

<verification>
After all five tasks complete:

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test -- --run \
  src/lib/savedQuoteSchema.test.ts \
  src/lib/quoteStorage.test.ts \
  src/components/quote/SaveQuoteButton.test.tsx \
  src/components/quote/SaveQuoteDialog.test.tsx \
  src/components/quote/RomBadge.test.tsx \
  src/pages/single-quote/romSchema.test.ts
cd frontend && npm run build
```

All commands exit 0.

Manual sanity (optional, no blocking gate):
- Open the dev server and confirm: `<RomBadge />` rendered ad-hoc on any page shows "Preliminary" in an amber chip without console warnings.
- Re-save an existing Phase 5/6 saved quote (full mode); confirm via DevTools IndexedDB inspection that the record now carries `mode: "full"` (default applied on first re-save).
</verification>

<success_criteria>
1. SC-2 (visual distinction primitive): `<RomBadge />` exists, renders verbatim "Preliminary" + `aria-label="Preliminary estimate"`, uses locked tokens (D-07).
2. SC-4 (ROM-vs-full distinction round-trip — first half): every saved-quote read path carries a defined `mode` field, defaulting to `"full"` for legacy v2 records (D-03/D-19). The Save path threads ROM mode through SaveQuoteButton → Dialog → saveSavedQuote without surfacing in the dialog UI.
3. ROM-02 partial: the data-layer + badge primitive that "labels [a saved ROM quote] as preliminary" land. SC-1 (form workflow), SC-3 (side-by-side recognition), SC-4 round-trip end-to-end ride on Plans 07-02..07-04.

Definition of done:
- All 5 tasks have passing acceptance criteria.
- 21 grep-verifiable strings present across 7 files.
- typecheck + lint + test for affected files all exit 0.
- No `schemaVersion: 3` literal anywhere; no new `if (oldVersion < 3)` block; QUOTE_DB_VERSION still `2`.
</success_criteria>

<output>
After completion, create `.planning/phases/07-rom-quote-mode/07-01-schema-and-primitives-SUMMARY.md` documenting:
- Files touched (7) and their post-change interface (mode prop signatures, romFormSchema export shape).
- The RomBadge primitive's contract (no props, fixed text, fixed aria-label).
- Test count delta (vitest baseline pre-plan vs post-plan).
- Any deviations from the UI-SPEC + the D-NN rationale for them.
- Hand-off note for Plan 07-02: `romEstimator.ts` will use the romFormSchema → toQuoteFormValues helper from this plan.
- Hand-off note for Plan 07-03: SaveQuoteButton now accepts `mode?: QuoteMode`; the new RomResultPanel will pass `mode="rom"` through it.
</output>
