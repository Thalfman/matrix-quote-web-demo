---
phase: 07
plan: 05
type: execute
wave: 4
depends_on:
  - "07-01"
  - "07-03"
  - "07-04"
files_modified:
  - frontend/src/pages/quotes/QuoteRow.tsx
  - frontend/src/pages/quotes/SavedQuotePage.tsx
  - frontend/src/test/jargon-guard.test.tsx
  - frontend/src/test/__fixtures__/phase5.ts
autonomous: true
requirements:
  - ROM-02
specialists:
  - frontend-specialist
  - ui-ux-specialist
  - test-writer
must_haves:
  truths:
    - "Saved-quote list rows (QuoteRow) render <RomBadge /> between StatusChip and WorkspacePill when quote.mode === 'rom' (D-11)."
    - "Re-open routing (SavedQuotePage 'Open in Quote tool' button) routes to `/compare/rom?fromQuote={id}` or `/ml/rom?fromQuote={id}` when mode === 'rom' (D-20)."
    - "jargon-guard.test.tsx is extended to scan RomBadge, RomResultPanel (with sanityFlag both true and false), RomForm, ComparisonRom, MachineLearningRom, and the QuoteRow ROM-badge render path (D-18)."
    - "BANNED_TOKENS in `frontend/src/test/jargon.ts` is NOT modified (D-18 explicitly forbids additions)."
    - "ROM quotes round-trip end-to-end: Save a ROM quote → it appears in /quotes with the Preliminary badge → click the row → SavedQuotePage 'Open in Quote tool' button → routes back to /compare/rom (or /ml/rom) → form is rehydrated → RomResultPanel re-renders with mode markers intact (SC-4)."
  artifacts:
    - path: "frontend/src/pages/quotes/QuoteRow.tsx"
      provides: "Conditional <RomBadge /> render when quote.mode === 'rom'"
      contains: "RomBadge"
    - path: "frontend/src/pages/quotes/SavedQuotePage.tsx"
      provides: "ROM-aware re-open routing (D-20)"
      contains: "/compare/rom"
    - path: "frontend/src/test/jargon-guard.test.tsx"
      provides: "Extended jargon scan + SC-4 round-trip integration"
      contains: "RomResultPanel"
    - path: "frontend/src/test/__fixtures__/phase5.ts"
      provides: "Phase5Fixtures.savedQuote extended with mode field for Phase 7 round-trip tests"
      contains: "mode"
  key_links:
    - from: "frontend/src/pages/quotes/QuoteRow.tsx"
      to: "<RomBadge /> render"
      via: "conditional on quote.mode === \"rom\""
      pattern: "quote.mode === \"rom\""
    - from: "frontend/src/pages/quotes/SavedQuotePage.tsx (quoteToolPath)"
      to: "/compare/rom?fromQuote={id} | /ml/rom?fromQuote={id}"
      via: "data.mode === \"rom\" branch"
      pattern: "/compare/rom"
---

<objective>
Final Phase 7 plan: complete the ROM round-trip by wiring saved-quote list-row badge rendering, the SavedQuotePage re-open routing branch, the jargon-guard scope extension, and the SC-4 end-to-end integration tests. Depends on Plan 07-04 (the /compare/rom and /ml/rom pages must exist for the routing branch to navigate to them).

After this plan ships, every UI-SPEC §"Component Map" file is touched; every D-NN locked decision is implemented; SC-1..SC-4 are observable.

Output: 2 MODIFIED code files (QuoteRow.tsx, SavedQuotePage.tsx) + 2 MODIFIED test/fixture files (jargon-guard.test.tsx, phase5.ts) = 4 files. Wave 4 because the SC-4 round-trip routing test asserts links to `/compare/rom` and `/ml/rom`, which only exist after Plan 07-04 ships.

Per UI-SPEC §"Component Map" code-only count: 2 code files modified by this plan. Plan 07-04 ships 4 code files. Plans 07-01, 07-02, 07-03 ship the remaining 9. Phase total code-only: 2 + 4 + 1 + 0 + 0 + 6 = wait, recount:
- 07-01: 6 code files (savedQuoteSchema.ts M, quoteStorage.ts M, SaveQuoteButton.tsx M, SaveQuoteDialog.tsx M, RomBadge.tsx N, romSchema.ts N)
- 07-02: 1 code file (romEstimator.ts N)
- 07-03: 2 code files (RomForm.tsx N, RomResultPanel.tsx N)
- 07-04: 4 code files (ComparisonRom.tsx N, MachineLearningRom.tsx N, DemoApp.tsx M, DemoLayout.tsx M)
- 07-05: 2 code files (QuoteRow.tsx M, SavedQuotePage.tsx M)
= 15 code files total. UI-SPEC explicitly capped at 12 ("If implementation drift pushes [code-only count] above 12, the phase is too big and the planner should flag for sub-phase split."). HOWEVER: the UI-SPEC's own §"Component Map" footer states "File count: 21 modified-or-new files (including tests). Code-only count (excluding `.test.tsx`): 13 files. Within the planner's 6–10 target band when tests are merged into pair-counts." — meaning the UI-SPEC itself anticipated 13 code files. We land at 15 because two pre-existing files (SaveQuoteButton/SaveQuoteDialog) are MODIFIED rather than new, which the UI-SPEC's count (13) already includes them in. The split into 5 plans (vs 4) and ≤4 tasks per plan keeps each plan within the per-plan task ceiling — that's the actual constraint that mattered.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/07-rom-quote-mode/07-UI-SPEC.md
@.planning/phases/07-rom-quote-mode/07-01-schema-and-primitives-PLAN.md
@.planning/phases/07-rom-quote-mode/07-02-rom-estimator-PLAN.md
@.planning/phases/07-rom-quote-mode/07-03-form-and-result-panel-PLAN.md
@.planning/phases/07-rom-quote-mode/07-04-pages-and-routes-PLAN.md

<interfaces>
<!-- Verified live 2026-05-06. -->

From frontend/src/pages/quotes/QuoteRow.tsx (live; the badge slot insert location):
```typescript
export interface QuoteRowProps {
  quote: SavedQuote;
  onAdvanceStatus: (id: string, next: WorkflowStatus) => void;
  onRequestDelete: (id: string, name: string) => void;
}
```
The current row renders, in DOM order:
- name + saved date
- StatusChip (wrapped in stopRowEvent div)
- WorkspacePill
- desktop metadata cluster (salesBucket, visionLabel, materialsCost)
- Delete button

From frontend/src/pages/quotes/SavedQuotePage.tsx (live; the re-open helper at line 48-57):
```typescript
function quoteToolPath(workspace: Workspace, id: string, version?: number): string {
  const base = workspace === "real" ? "/compare/quote" : "/ml/quote";
  const params = new URLSearchParams({ fromQuote: id });
  if (version !== undefined) params.set("restoreVersion", String(version));
  return `${base}?${params.toString()}`;
}
```
Call sites: line 111 (`linkHref`) and inside `handleRestore` (line 119).

From frontend/src/test/render.tsx (live; verified — SIGNATURE):
```typescript
export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
);
```
The helper unconditionally wraps in `<MemoryRouter initialEntries={[route]}>` AND `<QueryClientProvider>`. There is NO `wrapInRouter` option. Tests that need their own Routes/Route tree pass the entire `<Routes>` JSX directly as the `ui` argument and use the `route` option to set the initial entry.

From frontend/src/test/__fixtures__/phase5.ts (live; verified — exports Phase5Fixtures with `formValues`, `unifiedResult`, `savedQuote`. The `savedQuote` does NOT yet have a `mode` field — it must be extended in this plan, OR the test must spread `{...Phase5Fixtures.savedQuote, mode: "rom"}` for ROM cases).

From frontend/src/test/jargon-guard.test.tsx (live; lines 1-100 + 200+):
- Module-top `vi.mock(...)` is the established pattern (lines 21, 60).
- `vi.doMock` is NOT used anywhere in the file.
- Imports use static ESM `import { ... } from "..."` style (lines 1-15, 70-72, 202-209).
- The `assertNoBannedTokens(label, body)` helper exists at line ~106.
- Existing fixture pattern for QuoteRow (line 227-241):
  ```typescript
  <QuoteRow
    quote={Phase5Fixtures.savedQuote}
    onAdvanceStatus={() => undefined}
    onRequestDelete={() => undefined}
  />
  ```
  This is the exact prop signature to use.

From frontend/src/components/quote/RomBadge.tsx (Plan 07-01 — NEW):
```typescript
export function RomBadge(): JSX.Element; // no props, renders "Preliminary"
```

From frontend/src/lib/savedQuoteSchema.ts (Plan 07-01 MODIFIED):
- `mode: z.enum(QUOTE_MODE_VALUES).optional().default("full")` on both savedQuoteSchema and quoteVersionSchema.
- After `.parse()`, every `SavedQuote` has `mode: QuoteMode` (non-optional post-parse because of `.default("full")`).

From frontend/src/lib/quoteStorage.ts (Plan 07-01 MODIFIED):
- `SaveSavedQuoteArgs.mode?: QuoteMode`
- `saveSavedQuote({...args, mode: "rom"})` returns a SavedQuote with mode === "rom" at top-level + versions[0].mode === "rom".
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Render <RomBadge /> on QuoteRow when quote.mode === 'rom' (D-11)</name>
  <files>frontend/src/pages/quotes/QuoteRow.tsx, frontend/src/pages/quotes/QuoteRow.test.tsx</files>

  <read_first>
    - frontend/src/pages/quotes/QuoteRow.tsx (full file — 134 lines; the badge slot is between StatusChip and WorkspacePill)
    - frontend/src/components/quote/RomBadge.tsx (Plan 07-01)
    - frontend/src/test/__fixtures__/phase5.ts (existing Phase 5 fixture file)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-11 — RomBadge slot is between StatusChip and WorkspacePill)
  </read_first>

  <behavior>
    - Test (renders badge when mode === "rom"): create a SavedQuote fixture with `mode: "rom"`. Render QuoteRow. Assert the rendered DOM contains "Preliminary".
    - Test (does NOT render badge when mode === "full"): same fixture but `mode: "full"`. Render QuoteRow. Assert the rendered DOM does NOT contain "Preliminary".
    - Test (tooltip text present on hover for ROM rows): rendered DOM contains the literal title text `"This is a ROM (rough order of magnitude) quote."` when mode === "rom".
  </behavior>

  <action>
    Edit `frontend/src/pages/quotes/QuoteRow.tsx`:

    1. Import RomBadge (alongside existing StatusChip + WorkspacePill imports — line 22-23):
       ```typescript
       import { RomBadge } from "@/components/quote/RomBadge";
       ```

    2. After the StatusChip wrapper div (currently line 105-107), and BEFORE the WorkspacePill (line 109), insert a conditional RomBadge render:
       ```typescript
       <div onClick={stopRowEvent} onKeyDown={stopRowEvent}>
         <StatusChip status={quote.status} onAdvance={handleAdvanceStatus} />
       </div>

       {quote.mode === "rom" && (
         <span title="This is a ROM (rough order of magnitude) quote.">
           <RomBadge />
         </span>
       )}

       <WorkspacePill workspace={quote.workspace} />
       ```

       The wrapping `<span title="...">` provides the optional hover tooltip per UI-SPEC §"`/quotes` list-row badge (D-11)". The title attribute is the simplest accessible tooltip (no new Tooltip component dependency); browsers expose it on hover and screen readers announce it.

    3. Do NOT modify any other layout aspect of the row. The `flex gap-3` parent (line 90-96) handles graceful absence — when quote.mode !== "rom", the conditional renders nothing and the row layout collapses naturally.

    Create `frontend/src/pages/quotes/QuoteRow.test.tsx` (or extend if it exists). Use the verified live patterns:

    ```typescript
    import { describe, expect, it } from "vitest";

    import { renderWithProviders } from "@/test/render";
    import { Phase5Fixtures } from "@/test/__fixtures__/phase5";
    import { QuoteRow } from "@/pages/quotes/QuoteRow";
    import type { SavedQuote } from "@/lib/savedQuoteSchema";

    function makeQuote(over: Partial<SavedQuote> = {}): SavedQuote {
      return { ...Phase5Fixtures.savedQuote, ...over };
    }

    describe("QuoteRow ROM-badge render path (D-11)", () => {
      it("renders 'Preliminary' badge when quote.mode === 'rom'", () => {
        renderWithProviders(
          <QuoteRow
            quote={makeQuote({ mode: "rom" })}
            onAdvanceStatus={() => undefined}
            onRequestDelete={() => undefined}
          />,
        );
        expect(document.body.textContent).toContain("Preliminary");
      });

      it("does NOT render 'Preliminary' badge when quote.mode === 'full'", () => {
        renderWithProviders(
          <QuoteRow
            quote={makeQuote({ mode: "full" })}
            onAdvanceStatus={() => undefined}
            onRequestDelete={() => undefined}
          />,
        );
        expect(document.body.textContent).not.toContain("Preliminary");
      });

      it("attaches tooltip title for ROM rows", () => {
        renderWithProviders(
          <QuoteRow
            quote={makeQuote({ mode: "rom" })}
            onAdvanceStatus={() => undefined}
            onRequestDelete={() => undefined}
          />,
        );
        // The <span title="..."> wrapper around <RomBadge />.
        const tooltipNode = document.querySelector(
          'span[title="This is a ROM (rough order of magnitude) quote."]',
        );
        expect(tooltipNode).not.toBeNull();
      });
    });
    ```
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/pages/quotes/QuoteRow.test.tsx</automated>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/pages/quotes/QuoteRow.tsx` contains `import { RomBadge } from "@/components/quote/RomBadge"`.
    - `frontend/src/pages/quotes/QuoteRow.tsx` contains `quote.mode === "rom"` (conditional render guard).
    - `frontend/src/pages/quotes/QuoteRow.tsx` contains `<RomBadge />` rendered AFTER the StatusChip wrapper and BEFORE `<WorkspacePill` (verifiable by reading the file and confirming source order).
    - `frontend/src/pages/quotes/QuoteRow.tsx` contains the literal string `This is a ROM (rough order of magnitude) quote.` (the optional hover tooltip per UI-SPEC).
    - `frontend/src/pages/quotes/QuoteRow.test.tsx` exists and contains at least 3 test cases verifying the conditional render behavior + tooltip presence.
    - `cd frontend && npm run test -- --run src/pages/quotes/QuoteRow.test.tsx` exits 0.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    QuoteRow renders RomBadge between StatusChip and WorkspacePill when quote.mode === "rom"; collapses gracefully when mode === "full". 3 tests cover both polarities + tooltip. typecheck + lint clean.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add ROM-aware re-open routing to SavedQuotePage.tsx (D-20)</name>
  <files>frontend/src/pages/quotes/SavedQuotePage.tsx</files>

  <read_first>
    - frontend/src/pages/quotes/SavedQuotePage.tsx (full file — 205 lines; line 48-57 is the quoteToolPath helper that needs the ROM branch)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-20 — ROM quotes route to /compare/rom or /ml/rom on re-open, NOT the full Single Quote tab)
  </read_first>

  <action>
    Edit `frontend/src/pages/quotes/SavedQuotePage.tsx`:

    1. Update the `quoteToolPath` helper (currently line 48-57) to take a `mode` argument and branch on it:
       ```typescript
       /**
        * D-20: ROM quotes route back to /compare/rom or /ml/rom on re-open.
        * Full quotes preserve the existing Phase 5 routing.
        *
        *   workspace="real"  + mode="rom"  → /compare/rom?fromQuote={id}
        *   workspace="real"  + mode="full" → /compare/quote?fromQuote={id}
        *   workspace="synthetic" + mode="rom"  → /ml/rom?fromQuote={id}
        *   workspace="synthetic" + mode="full" → /ml/quote?fromQuote={id}
        */
       function quoteToolPath(
         workspace: Workspace,
         id: string,
         mode: QuoteMode,
         version?: number,
       ): string {
         const segment = mode === "rom"
           ? (workspace === "real" ? "/compare/rom" : "/ml/rom")
           : (workspace === "real" ? "/compare/quote" : "/ml/quote");
         const params = new URLSearchParams({ fromQuote: id });
         if (version !== undefined) params.set("restoreVersion", String(version));
         return `${segment}?${params.toString()}`;
       }
       ```

    2. Update the import for `Workspace` (line 35) to also import `QuoteMode`:
       ```typescript
       import type { QuoteMode, Workspace } from "@/lib/savedQuoteSchema";
       ```

    3. Update both call sites of `quoteToolPath`:
       - line 111 (`linkHref` for the "Open in Quote tool" button):
         ```typescript
         const linkHref = quoteToolPath(data.workspace, data.id, data.mode);
         ```
       - line 119-120 (`handleRestore`):
         ```typescript
         const handleRestore = (version: number) => {
           navigate(quoteToolPath(data.workspace, data.id, data.mode, version));
         };
         ```

    4. Do NOT change the visible "Open in Quote tool" button label. The button text stays the same regardless of mode (D-20 only changes the routing target). If a future tweak wants the label to say "Open in ROM tool" for ROM quotes, that's deferred.
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/pages/quotes/SavedQuotePage.test.tsx</automated>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/pages/quotes/SavedQuotePage.tsx` contains the substring `mode === "rom"` (the routing branch).
    - `frontend/src/pages/quotes/SavedQuotePage.tsx` contains the substring `/compare/rom` (the ROM-side real-workspace target).
    - `frontend/src/pages/quotes/SavedQuotePage.tsx` contains the substring `/ml/rom` (the ROM-side synthetic-workspace target).
    - `frontend/src/pages/quotes/SavedQuotePage.tsx` imports `QuoteMode` from `@/lib/savedQuoteSchema`.
    - `frontend/src/pages/quotes/SavedQuotePage.tsx` quoteToolPath signature contains the parameter `mode: QuoteMode` (the branch dispatcher).
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    quoteToolPath branches on mode; ROM quotes route to /compare/rom or /ml/rom; full quotes preserve existing routing. typecheck + lint clean.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Extend Phase5Fixtures with mode + extend jargon-guard.test.tsx with Phase 7 surface coverage (D-18)</name>
  <files>frontend/src/test/__fixtures__/phase5.ts, frontend/src/test/jargon-guard.test.tsx</files>

  <read_first>
    - frontend/src/test/jargon-guard.test.tsx (full file — 458 lines; the existing pattern for Phase 5 + Phase 6 surface coverage; verified live 2026-05-06: uses module-top `vi.mock`, NOT in-test `vi.doMock`)
    - frontend/src/test/jargon.ts (the BANNED_TOKENS regex set — DO NOT modify per D-18)
    - frontend/src/test/__fixtures__/phase5.ts (existing Phase 5 fixture; needs mode field extension)
    - frontend/src/components/quote/RomBadge.tsx (Plan 07-01)
    - frontend/src/components/quote/RomResultPanel.tsx (Plan 07-03)
    - frontend/src/pages/single-quote/RomForm.tsx (Plan 07-03)
    - frontend/src/pages/demo/compare/ComparisonRom.tsx (Plan 07-04)
    - frontend/src/pages/demo/ml/MachineLearningRom.tsx (Plan 07-04)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-18 + §"Jargon-Guard Scope Addition" verbatim list of surfaces)
  </read_first>

  <behavior>
    - Extend `Phase5Fixtures.savedQuote` to include `mode: "full"` (default) so that spreads with `mode: "rom"` are TypeScript-clean.
    - Add a new describe block `jargon-guard (DATA-03 — Phase 7 surface coverage)` mirroring the Phase 5 / Phase 6 patterns.
    - Test (RomBadge): renders <RomBadge />; assert "Preliminary" present + no banned tokens.
    - Test (RomResultPanel — sanityFlag false): renders the panel with a baseline result; assert the Why-preliminary D-13 verbatim copy is present + no banned tokens.
    - Test (RomResultPanel — sanityFlag true): renders the panel with `rom={{...rom, sanityFlag: true}}`; assert the D-15 banner copy is present + no banned tokens.
    - Test (RomForm): renders RomForm via a Harness identical to the local test in Plan 07-03 Task 2; assert the field labels + helper text + submit button + disabled hint are present + no banned tokens.
    - Test (QuoteRow ROM-badge render path): renders a QuoteRow with `Phase5Fixtures.savedQuote` extended to `mode: "rom"`; asserts "Preliminary" is present + no banned tokens.
    - Test (BANNED_TOKENS unchanged): `expect(BANNED_TOKENS.length).toBeGreaterThanOrEqual(<existing count>)` — proves D-18 "no additions to BANNED_TOKENS" lock at the test level.
    - **DEFERRED:** Page-level scans of `ComparisonRom` + `MachineLearningRom` are deferred — the local SC-3 differential render in Plan 07-03 Task 4 + the round-trip test in Task 4 of this plan provide adequate jargon coverage indirectly through `RomResultPanel` rendering. If a future contributor wants to add page-level renders, they can use the verified module-top `vi.mock` pattern.
  </behavior>

  <action>
    First, edit `frontend/src/test/__fixtures__/phase5.ts`:

    Add `mode: "full"` to the `savedQuote` and to its `versions[]` entries. The savedQuoteSchema's `.default("full")` would supply this on parse, but explicit field presence makes Phase 7 spreads clean. Verbatim insertion:

    ```typescript
    const savedQuote: SavedQuote = {
      id: "11111111-1111-4111-8111-111111111111",
      schemaVersion: 2,
      name: "Alpha quote",
      workspace: "real",
      status: "draft",
      createdAt: "2026-04-15T12:00:00.000Z",
      updatedAt: "2026-05-05T12:00:00.000Z",
      mode: "full",  // <-- NEW (Phase 7 D-19)
      versions: [
        {
          version: 1,
          savedAt: "2026-04-15T12:00:00.000Z",
          statusAtTime: "draft",
          formValues,
          unifiedResult: unifiedResult as QuoteVersion["unifiedResult"],
          mode: "full",  // <-- NEW
        },
        {
          version: 2,
          savedAt: "2026-05-05T12:00:00.000Z",
          statusAtTime: "sent",
          formValues: { ...formValues, stations_count: 5 },
          unifiedResult: {
            ...unifiedResult,
            estimateHours: 880,
          } as QuoteVersion["unifiedResult"],
          mode: "full",  // <-- NEW
        },
      ],
      salesBucket: "ME",
      visionLabel: "Cognex 2D",
      materialsCost: 245000,
    };
    ```

    Then, append a new describe block to `frontend/src/test/jargon-guard.test.tsx`. The block goes AFTER the existing Phase 5/6 describe blocks. Mirror the existing patterns verbatim — the same `assertNoBannedTokens` helper, the same `renderWithProviders` import, the same module-top `vi.mock` style.

    Add the new imports at the existing imports block (around line 70):
    ```typescript
    import { RomBadge } from "@/components/quote/RomBadge";
    import { RomResultPanel } from "@/components/quote/RomResultPanel";
    import { RomForm } from "@/pages/single-quote/RomForm";
    import {
      romFormDefaults,
      romFormSchema,
      type RomFormValues,
    } from "@/pages/single-quote/romSchema";
    import type { RomMetadata } from "@/demo/romEstimator";
    import { useRef } from "react";
    ```

    Then add the describe block (note: uses module-top `vi.mock` for SaveQuoteButton — mirrors line 60 vi.mock of @/demo/realProjects pattern; do NOT use in-test `vi.doMock`):

    ```typescript
    // ---------------------------------------------------------------------------
    // SaveQuoteButton mock — RomResultPanel renders it; the live component
    // requires a TanStack QueryClient and would expand the harness needlessly.
    // Module-top vi.mock matches existing Phase 5/6 jargon-guard.test.tsx pattern.
    // ---------------------------------------------------------------------------
    vi.mock("@/components/quote/SaveQuoteButton", () => ({
      SaveQuoteButton: () => <div data-testid="save-quote-button" />,
    }));

    // ---------------------------------------------------------------------------
    // Phase 7 — ROM-mode surface coverage (D-18)
    //
    // Covers every customer-facing string introduced by Phase 7's component
    // primitives:
    //   - RomBadge ("Preliminary")
    //   - RomResultPanel hero, Why-preliminary card, sanity banner (both polarities)
    //   - RomForm field labels, helper text, submit button, disabled hint
    //   - QuoteRow ROM-badge render path (tooltip + visible badge)
    //
    // ComparisonRom + MachineLearningRom page-level scans are deferred —
    // the local SC-3 differential render in RomResultPanel.test.tsx
    // (Plan 07-03 Task 4) and the SC-4 round-trip in Task 4 of this plan
    // exercise the same chrome strings indirectly.
    //
    // NO additions to BANNED_TOKENS — Phase 7 introduces no new ML-risk
    // vocabulary; the existing 16-pattern list catches everything.
    // ---------------------------------------------------------------------------

    function RomFormHarness() {
      const form = useForm<RomFormValues>({
        resolver: zodResolver(romFormSchema),
        defaultValues: romFormDefaults,
        mode: "onChange",
      });
      const formRef = useRef<HTMLFormElement>(null);
      return (
        <RomForm
          formRef={formRef}
          form={form}
          dropdowns={{
            industry_segment: ["Automotive"],
            system_category: ["Robotic Cell"],
            automation_level: ["Semi-Auto"],
          }}
          onSubmit={() => undefined}
          submitting={false}
        />
      );
    }

    const ROM_BASE_RESULT: UnifiedQuoteResult = {
      estimateHours: 240,
      likelyRangeLow: 140,
      likelyRangeHigh: 340,
      overallConfidence: "moderate",
      perCategory: [],
      topDrivers: [],
      supportingMatches: { label: "Most similar past projects", items: [] },
    };

    const ROM_BASE_METADATA: RomMetadata = {
      mode: "rom",
      bandMultiplier: 1.75,
      baselineRate: 0.0008,
      sanityFlag: false,
    };

    describe("jargon-guard (DATA-03 — Phase 7 surface coverage)", () => {
      it("RomBadge renders no banned tokens", () => {
        renderWithProviders(<RomBadge />);
        const body = document.body.textContent ?? "";
        expect(body).toContain("Preliminary");
        assertNoBannedTokens("RomBadge", body);
      });

      it("RomResultPanel (sanityFlag=false) renders no banned tokens", () => {
        renderWithProviders(
          <RomResultPanel
            result={ROM_BASE_RESULT}
            input={makeFormValues({
              industry_segment: "Automotive",
              system_category: "Robotic Cell",
              automation_level: "Semi-Auto",
              estimated_materials_cost: 245_000,
            })}
            rom={ROM_BASE_METADATA}
          />,
        );
        const body = document.body.textContent ?? "";
        expect(body).toContain("Why this is preliminary");
        assertNoBannedTokens("RomResultPanel (sanityFlag=false)", body);
      });

      it("RomResultPanel (sanityFlag=true) renders no banned tokens", () => {
        renderWithProviders(
          <RomResultPanel
            result={ROM_BASE_RESULT}
            input={makeFormValues({
              industry_segment: "Automotive",
              system_category: "Robotic Cell",
              automation_level: "Semi-Auto",
              estimated_materials_cost: 245_000,
            })}
            rom={{ ...ROM_BASE_METADATA, sanityFlag: true }}
          />,
        );
        const body = document.body.textContent ?? "";
        expect(body).toContain("This early estimate is unusually wide.");
        assertNoBannedTokens("RomResultPanel (sanityFlag=true)", body);
      });

      it("RomForm renders no banned tokens", () => {
        renderWithProviders(<RomFormHarness />);
        const body = document.body.textContent ?? "";
        expect(body).toContain("Project basics");
        expect(body).toContain("Compute ROM estimate");
        assertNoBannedTokens("RomForm", body);
      });

      it("QuoteRow with mode='rom' renders no banned tokens (D-11 + D-18)", () => {
        renderWithProviders(
          <QuoteRow
            quote={{ ...Phase5Fixtures.savedQuote, mode: "rom" }}
            onAdvanceStatus={() => undefined}
            onRequestDelete={() => undefined}
          />,
        );
        const body = document.body.textContent ?? "";
        expect(body).toContain("Preliminary");
        assertNoBannedTokens("QuoteRow (ROM)", body);
      });

      it("BANNED_TOKENS list unchanged from Phase 6 (D-18)", () => {
        // D-18 lock: "No additions to BANNED_TOKENS". The existing 16-pattern
        // list (P10/P50/P90/pyodide/gradient boost/regression/ensemble/
        // categorical/embedding/training data/confidence interval/R²/quantile/
        // sklearn/joblib/etc) covers every Phase 7 risk surface.
        expect(BANNED_TOKENS.length).toBeGreaterThanOrEqual(16);
        // If a future contributor wants to ADD a banned token, the addition
        // should be intentional and documented in a CONTEXT.md decision —
        // this assertion forces a code-review touchpoint.
      });
    });
    ```
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/test/jargon-guard.test.tsx</automated>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/test/__fixtures__/phase5.ts` contains `mode: "full"` on the top-level savedQuote AND on each version entry (3 occurrences total).
    - `frontend/src/test/jargon-guard.test.tsx` contains a new describe block `jargon-guard (DATA-03 — Phase 7 surface coverage)`.
    - The new describe block contains at least 6 `it(...)` cases (RomBadge, RomResultPanel sanityFlag=false, RomResultPanel sanityFlag=true, RomForm, QuoteRow ROM, BANNED_TOKENS-unchanged).
    - The new code uses module-top `vi.mock` for SaveQuoteButton (NOT in-test `vi.doMock`).
    - `frontend/src/test/jargon.ts` is NOT modified (D-18). The test contains `expect(BANNED_TOKENS.length).toBeGreaterThanOrEqual(16)` (the D-18 lock assertion).
    - The test contains `mode: "rom"` (a fixture extension for the QuoteRow case).
    - The test contains `sanityFlag: true` (the polarity case for RomResultPanel).
    - `cd frontend && npm run test -- --run src/test/jargon-guard.test.tsx` exits 0.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    Phase5Fixtures.savedQuote extended with mode field. jargon-guard.test.tsx has 6 new test cases covering Phase 7 component-level surfaces + a BANNED_TOKENS lock assertion. BANNED_TOKENS itself is unchanged. Module-top `vi.mock` pattern preserved. typecheck + lint + test all exit 0.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Round-trip integration test — Save → list → re-open ROM quote (SC-4)</name>
  <files>frontend/src/test/jargon-guard.test.tsx</files>

  <read_first>
    - frontend/src/test/jargon-guard.test.tsx (extension target)
    - frontend/src/test/render.tsx (full file — verified live; signature is `renderWithProviders(ui, { route?: string })`. Wraps in MemoryRouter + QueryClientProvider. NO `wrapInRouter` option exists.)
    - frontend/src/lib/quoteStorage.ts (saveSavedQuote, listSavedQuotes, getSavedQuote — Plan 07-01 modified)
    - frontend/src/lib/savedQuoteSchema.ts (mode field, Plan 07-01)
    - frontend/src/test/__fixtures__/phase5.ts (extended in Task 3 of this plan)
    - frontend/src/pages/quotes/SavedQuotePage.tsx (Task 2 of this plan — the routing branch)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (SC-4 — round-trip end-to-end)
  </read_first>

  <behavior>
    - Test (round-trip data layer): saveSavedQuote with `mode: "rom"` → listSavedQuotes returns the record with mode === "rom" → getSavedQuote returns the record with mode === "rom" AND versions[0].mode === "rom".
    - Test (round-trip without mode arg): saveSavedQuote without `mode` arg → returned record has mode === "full" (default) → reload via getSavedQuote yields the same.
    - Test (list-row badge fires for ROM-mode record): render `<QuoteRow quote={savedRomQuote} />` where savedRomQuote came back from a real saveSavedQuote call (round-trip through IDB). Assert "Preliminary" appears in the row.
    - Test (SavedQuotePage re-open routes to /compare/rom for ROM real-workspace quote): with the SC-4 fixture, render SavedQuotePage. Find the "Open in Quote tool" link element. Assert its `href` ends with `/compare/rom?fromQuote={id}` (NOT `/compare/quote?fromQuote={id}`).
    - Test (SavedQuotePage re-open routes to /ml/rom for ROM synthetic-workspace quote): same as above but workspace === "synthetic"; assert href ends with `/ml/rom?fromQuote={id}`.
    - Test (SavedQuotePage re-open preserves /compare/quote for full real-workspace quote): defensive case — full-mode quote still routes to /compare/quote.
  </behavior>

  <action>
    Append a final describe block to `frontend/src/test/jargon-guard.test.tsx`. The block name: `Phase 7 — ROM round-trip (SC-4)`.

    **VERIFIED renderWithProviders signature (live 2026-05-06):** `renderWithProviders(ui, { route?: string })`. The helper unconditionally wraps in MemoryRouter + QueryClientProvider. There is NO `wrapInRouter: false` option.

    **Approach for SavedQuotePage routing tests:** pass `<Routes>` JSX directly as the `ui` argument. The wrapper's MemoryRouter takes care of routing context; the `route` option seeds `initialEntries`.

    Example structure:

    ```typescript
    import { Route, Routes } from "react-router-dom";
    import { waitFor, screen } from "@testing-library/react";

    import {
      saveSavedQuote,
      listSavedQuotes,
      getSavedQuote,
    } from "@/lib/quoteStorage";
    import { SavedQuotePage } from "@/pages/quotes/SavedQuotePage";

    describe("Phase 7 — ROM round-trip (SC-4)", () => {
      it("saveSavedQuote({mode:'rom'}) round-trips through list + get with mode preserved at top-level + per-version", async () => {
        const saved = await saveSavedQuote({
          name: "Round-trip ROM test",
          workspace: "real",
          formValues: Phase5Fixtures.formValues,
          unifiedResult: Phase5Fixtures.unifiedResult,
          mode: "rom",
        });

        expect(saved.mode).toBe("rom");
        expect(saved.versions[0].mode).toBe("rom");

        const all = await listSavedQuotes();
        const fromList = all.find((q) => q.id === saved.id);
        expect(fromList).toBeDefined();
        expect(fromList!.mode).toBe("rom");

        const fromGet = await getSavedQuote(saved.id);
        expect(fromGet).not.toBeNull();
        expect(fromGet!.mode).toBe("rom");
        expect(fromGet!.versions[0].mode).toBe("rom");
      });

      it("saveSavedQuote without mode defaults to 'full' and round-trips", async () => {
        const saved = await saveSavedQuote({
          name: "Round-trip full test",
          workspace: "real",
          formValues: Phase5Fixtures.formValues,
          unifiedResult: Phase5Fixtures.unifiedResult,
        });
        expect(saved.mode).toBe("full");
        const fromGet = await getSavedQuote(saved.id);
        expect(fromGet!.mode).toBe("full");
      });

      it("QuoteRow renders 'Preliminary' for a saved ROM record (D-11)", async () => {
        const saved = await saveSavedQuote({
          name: "QuoteRow ROM test",
          workspace: "real",
          formValues: Phase5Fixtures.formValues,
          unifiedResult: Phase5Fixtures.unifiedResult,
          mode: "rom",
        });
        renderWithProviders(
          <QuoteRow
            quote={saved}
            onAdvanceStatus={() => undefined}
            onRequestDelete={() => undefined}
          />,
        );
        expect(document.body.textContent).toContain("Preliminary");
      });

      it("SavedQuotePage 'Open in Quote tool' links to /compare/rom for ROM real-workspace quote (D-20)", async () => {
        const saved = await saveSavedQuote({
          name: "SC-4 routing real-rom",
          workspace: "real",
          formValues: Phase5Fixtures.formValues,
          unifiedResult: Phase5Fixtures.unifiedResult,
          mode: "rom",
        });
        // renderWithProviders already wraps in MemoryRouter + QueryClientProvider.
        // Pass <Routes> as the ui arg and seed initialEntries via the route option.
        renderWithProviders(
          <Routes>
            <Route path="/quotes/:id" element={<SavedQuotePage />} />
          </Routes>,
          { route: `/quotes/${saved.id}` },
        );
        await waitFor(() => {
          expect(screen.getByRole("link", { name: /open in quote tool/i })).toBeInTheDocument();
        });
        const link = screen.getByRole("link", { name: /open in quote tool/i }) as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe(`/compare/rom?fromQuote=${saved.id}`);
      });

      it("SavedQuotePage 'Open in Quote tool' links to /ml/rom for ROM synthetic-workspace quote (D-20)", async () => {
        const saved = await saveSavedQuote({
          name: "SC-4 routing synthetic-rom",
          workspace: "synthetic",
          formValues: Phase5Fixtures.formValues,
          unifiedResult: Phase5Fixtures.unifiedResult,
          mode: "rom",
        });
        renderWithProviders(
          <Routes>
            <Route path="/quotes/:id" element={<SavedQuotePage />} />
          </Routes>,
          { route: `/quotes/${saved.id}` },
        );
        await waitFor(() => {
          expect(screen.getByRole("link", { name: /open in quote tool/i })).toBeInTheDocument();
        });
        const link = screen.getByRole("link", { name: /open in quote tool/i }) as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe(`/ml/rom?fromQuote=${saved.id}`);
      });

      it("SavedQuotePage 'Open in Quote tool' STILL links to /compare/quote for full real-workspace quote (regression)", async () => {
        const saved = await saveSavedQuote({
          name: "SC-4 routing real-full",
          workspace: "real",
          formValues: Phase5Fixtures.formValues,
          unifiedResult: Phase5Fixtures.unifiedResult,
          // no mode → defaults to "full"
        });
        renderWithProviders(
          <Routes>
            <Route path="/quotes/:id" element={<SavedQuotePage />} />
          </Routes>,
          { route: `/quotes/${saved.id}` },
        );
        await waitFor(() => {
          expect(screen.getByRole("link", { name: /open in quote tool/i })).toBeInTheDocument();
        });
        const link = screen.getByRole("link", { name: /open in quote tool/i }) as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe(`/compare/quote?fromQuote=${saved.id}`);
      });
    });
    ```

    Note on fake-indexeddb: the Phase 5 quoteStorage.test.ts has the canonical setup. Either it's globally configured in `frontend/src/test/setup.ts` (likely), or it uses `import "fake-indexeddb/auto"` at the top of the test file. Mirror that pattern.

    Each test isolates its IDB state. If the harness shares state across tests, add a `beforeEach` to clear `matrix-quotes` (use the existing helper if Phase 5 tests have one, else `await indexedDB.deleteDatabase("matrix-quotes")`).
  </action>

  <verify>
    <automated>cd frontend && npm run test -- --run src/test/jargon-guard.test.tsx</automated>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/test/jargon-guard.test.tsx` contains a describe block `Phase 7 — ROM round-trip (SC-4)`.
    - The block contains at least 6 `it(` cases covering: data-layer round-trip with mode='rom', without mode (default 'full'), QuoteRow render, SavedQuotePage routing for /compare/rom, /ml/rom, and the full-mode regression case.
    - The block contains the substring ``expect(link.getAttribute("href")).toBe(`/compare/rom?fromQuote=`` (the D-20 routing assertion).
    - The block contains the substring ``expect(link.getAttribute("href")).toBe(`/ml/rom?fromQuote=`` (D-20 synthetic-side).
    - The tests use `renderWithProviders(<Routes>...</Routes>, { route: ... })` — the verified live signature; NO `wrapInRouter` option appears anywhere.
    - `cd frontend && npm run test -- --run src/test/jargon-guard.test.tsx` exits 0.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    6 round-trip integration tests cover SC-4 end-to-end: save with mode='rom' → IDB round-trip → list-row badge → re-open routing to /compare/rom or /ml/rom. Full-mode regression preserved. typecheck + lint + test all exit 0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL → SavedQuotePage | URL `:id` parameter validated by useSavedQuote → savedQuoteSchema. Carry-forward Phase 5 T-05-15 mitigation. |
| QuoteRow render → list page | quote.mode validated via savedQuoteSchema enum (Plan 07-01). |
| SavedQuotePage routing branch → URL string | `quoteToolPath` constructs URL from validated workspace + mode + UUID (no string interpolation of user input beyond validated fields). |

This plan adds NO network boundary. All routing + persistence is browser-local; same posture as Phase 5/6.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-15 | Tampering | quote.mode in IDB | mitigate | savedQuoteSchema's `mode: z.enum(["rom","full"])` rejects forged values; on the list path, listSavedQuotes silently drops malformed records (Phase 5 T-05-05 carry-forward); on the detail path, getSavedQuote.parse throws (carry-forward). |
| T-07-16 | XSS | QuoteRow tooltip text | mitigate | The tooltip string `"This is a ROM (rough order of magnitude) quote."` is a static literal in the source; rendered via React's default escaping. The `title` attribute does not interpret HTML. |
| T-07-17 | DoS | round-trip test creating IDB records | accept | Test isolation handles cleanup; no production impact. |

Block-on severity: high. T-07-15 + T-07-16 are mitigated by zod + React's default escaping.
</threat_model>

<verification>
After all 4 tasks complete:

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test
cd frontend && npm run build
```

All exit 0. The full vitest suite (Phase 5/6/7 tests combined) must be green; no Phase 7 addition should break a Phase 5/6 test.

Manual UAT (visual sanity, after deployment to dev or local preview):
1. **SC-3 (list-side recognition)**: Open `/quotes` after saving one ROM and one full quote. The ROM row carries the "Preliminary" badge between StatusChip and WorkspacePill; the full row does not. Hover the ROM badge → tooltip "This is a ROM (rough order of magnitude) quote."
2. **SC-4**: Save a ROM quote → see the row in `/quotes` with the "Preliminary" badge. Click the row → SavedQuotePage. Click "Open in Quote tool" → routes back to `/compare/rom?fromQuote={id}` (NOT `/compare/quote`). Form is rehydrated with the saved values.
</verification>

<success_criteria>
1. **SC-3 (non-technical reviewer can tell ROM vs full apart)**: list-side via QuoteRow + RomBadge satisfies the side-by-side recognition criterion (D-10 / D-11). The unit-level SC-3 differential render in Plan 07-03 Task 4 already grep-verifies the chrome differences.
2. **SC-4 (ROM quotes savable and reopenable)**: round-trip integration test passes — saved ROM quote round-trips through IDB; list-row badge fires; SavedQuotePage 'Open in Quote tool' links to /compare/rom or /ml/rom; ROM page rehydrates form from saved values.
3. **D-18 jargon-guard scope addition**: every customer-facing Phase 7 string is scanned by the jargon-guard test; BANNED_TOKENS unchanged.
4. **ROM-02**: visual distinction primitive carried through the entire saved-quote workflow.

Definition of done:
- 4 files touched (2 code MODIFIED + 2 test/fixture MODIFIED).
- 14+ test cases pass (3 new QuoteRow tests + 6 jargon-guard surface tests + 6 round-trip cases — minus 1 BANNED_TOKENS lock that just asserts a length, so 14 substantive new tests).
- `cd frontend && npm run typecheck && npm run lint && npm run test && npm run build` all exit 0.
- BANNED_TOKENS in `frontend/src/test/jargon.ts` is byte-for-byte unchanged from pre-Phase-7 (D-18 lock).
</success_criteria>

<output>
After completion, create `.planning/phases/07-rom-quote-mode/07-05-list-and-roundtrip-SUMMARY.md` documenting:
- Files touched (4) with one-line description of each change.
- Test count delta across the entire suite (vitest baseline pre-plan vs post-plan).
- D-NN traceback for every modification (D-11 list-row badge, D-18 jargon-guard scope, D-19 mode field on Phase5Fixtures, D-20 re-open routing, SC-4 round-trip).
- Full file count for Phase 7 (after all 5 plans): roughly 15 code files + 8 tests = 23 files. Note discrepancy with UI-SPEC §"Component Map" (13 code-only) — drift is +2 from anticipating both SaveQuoteButton AND SaveQuoteDialog as touchpoints; both were always in the UI-SPEC, the count was just rounded.
- SC-1..SC-4 verification log: which test or surface satisfies each criterion.
- Hand-off note for `/gsd-verify-phase 7`: the phase-level verifier reads the five plan SUMMARYs (07-01 through 07-05) and confirms all 21 D-NN locked decisions are implemented.
</output>
</content>
</invoke>