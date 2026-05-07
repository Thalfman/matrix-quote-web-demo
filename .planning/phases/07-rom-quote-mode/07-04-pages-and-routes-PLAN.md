---
phase: 07
plan: 04
type: execute
wave: 3
depends_on:
  - "07-01"
  - "07-02"
  - "07-03"
files_modified:
  - frontend/src/pages/demo/compare/ComparisonRom.tsx
  - frontend/src/pages/demo/ml/MachineLearningRom.tsx
  - frontend/src/DemoApp.tsx
  - frontend/src/components/DemoLayout.tsx
autonomous: true
requirements:
  - ROM-01
  - ROM-02
specialists:
  - frontend-specialist
  - ui-ux-specialist
must_haves:
  truths:
    - "A new route `/compare/rom` lazy-loads `ComparisonRom` and a new route `/ml/rom` lazy-loads `MachineLearningRom` (D-01)."
    - "Both ROM pages mount RomForm + RomResultPanel, own the useForm({resolver: zodResolver(romFormSchema)}) instance, and call estimateRom on submit."
    - "DemoLayout's REAL DATA group has a new `Real-Data ROM` SidebarLink between `Quote` and `Compare`; the SYNTHETIC DATA group has a new `Synthetic-Data ROM` SidebarLink in the same slot (D-14)."
    - "Both ROM pages support `?fromQuote={id}` URL-param hydration, identical to ComparisonQuote's pattern — opening a saved ROM quote rehydrates the form with the saved romValues (D-20 hydration; the SavedQuotePage routing branch lands in Plan 07-05)."
  artifacts:
    - path: "frontend/src/pages/demo/compare/ComparisonRom.tsx"
      provides: "Real Data ROM page (/compare/rom)"
      contains: "export function ComparisonRom"
    - path: "frontend/src/pages/demo/ml/MachineLearningRom.tsx"
      provides: "Synthetic Data ROM page (/ml/rom)"
      contains: "export function MachineLearningRom"
    - path: "frontend/src/DemoApp.tsx"
      provides: "/compare/rom + /ml/rom lazy-loaded routes"
      contains: "compare/rom"
    - path: "frontend/src/components/DemoLayout.tsx"
      provides: "Real-Data ROM + Synthetic-Data ROM sidebar links"
      contains: "Real-Data ROM"
  key_links:
    - from: "frontend/src/DemoApp.tsx"
      to: "frontend/src/pages/demo/compare/ComparisonRom.tsx"
      via: "lazy import + Route"
      pattern: "ComparisonRom"
    - from: "frontend/src/DemoApp.tsx"
      to: "frontend/src/pages/demo/ml/MachineLearningRom.tsx"
      via: "lazy import + Route"
      pattern: "MachineLearningRom"
    - from: "frontend/src/components/DemoLayout.tsx (REAL DATA group)"
      to: "/compare/rom"
      via: "<SidebarLink to=\"/compare/rom\" />"
      pattern: "to=\"/compare/rom\""
    - from: "frontend/src/components/DemoLayout.tsx (SYNTHETIC DATA group)"
      to: "/ml/rom"
      via: "<SidebarLink to=\"/ml/rom\" />"
      pattern: "to=\"/ml/rom\""
---

<objective>
Wire the Phase 7 page-level surfaces into the demo SPA: two new pages (one per workspace), two new routes, two new sidebar links. After this plan ships, the ROM tool is reachable and functional from the sidebar; the saved-quote list integration, re-open routing branch, jargon-guard extension, and SC-4 round-trip integration tests land in Plan 07-05.

Output: 2 NEW pages + 2 MODIFIED files = 4 files touched. Wave 3 because every page imports from Plan 07-03 (RomForm, RomResultPanel) and the routing/sidebar touches depend on those page components existing.

This split (Plan 07-04 = pages + routes; Plan 07-05 = list integration + jargon + round-trip) keeps each plan within ≤4 tasks per the UI-SPEC §"Component Map" 12-file budget guidance and the planner's per-plan task ceiling. UI-SPEC verbatim: "If implementation drift pushes [code-only count] above 12, the phase is too big and the planner should flag for sub-phase split." This plan's code-only count: 4 (ComparisonRom, MachineLearningRom, DemoApp.tsx M, DemoLayout.tsx M).
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

<interfaces>
<!-- Wave 1 + Wave 2 outputs the page handlers consume. Verified live 2026-05-06. -->

From frontend/src/pages/single-quote/romSchema.ts (Plan 07-01):
```typescript
export const romFormSchema, romFormDefaults, type RomFormValues, function toQuoteFormValues
```

From frontend/src/demo/romEstimator.ts (Plan 07-02):
```typescript
export async function estimateRom(args: {
  romValues: RomFormValues;
  dataset: Dataset;
  metrics: Record<string, ModelMetric>;
  supportingPool: ProjectRecord[];
  supportingLabel: string;
}): Promise<{ result: UnifiedQuoteResult; rom: RomMetadata; formValues: QuoteFormValues }>;
```

From frontend/src/pages/single-quote/RomForm.tsx (Plan 07-03):
```typescript
export interface RomFormProps {
  formRef: RefObject<HTMLFormElement>;
  form: UseFormReturn<RomFormValues>;
  dropdowns?: { industry_segment: string[]; system_category: string[]; automation_level: string[] };
  onSubmit: () => void;
  submitting: boolean;
}
```

From frontend/src/components/quote/RomResultPanel.tsx (Plan 07-03):
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
```

From frontend/src/pages/demo/compare/ComparisonQuote.tsx (existing — the page-handler precedent the ROM pages mirror; lines 1-248). Key elements:
- ensurePyodideReady + ensureModelsReady("real") for the runtime warmup
- useRealProjects() / useModelMetrics("real") for the dataset
- useSearchParams for fromQuote URL param + useSavedQuote(fromQuoteId)
- buildDropdowns(pool) helper
- handleSubmit calls aggregateMultiVisionEstimate (in our case → estimateRom)
- requestAnimationFrame to scrollIntoView #quote-results

**VERIFIED synthetic-side precedent (live codebase 2026-05-06):**
- The "MachineLearningQuote" route handler that DemoApp lazy-loads is `frontend/src/pages/demo/ml/MachineLearningQuote.tsx`, but that file is a 2-line re-export shim:
  ```typescript
  export { MachineLearningQuoteTool as MachineLearningQuote } from "@/pages/demo/MachineLearningQuoteTool";
  ```
- The REAL implementation lives at `frontend/src/pages/demo/MachineLearningQuoteTool.tsx`. That's the file MachineLearningRom must mirror.
- The synthetic-side data hook is `useSyntheticPool` from `@/demo/realProjects` (NOT `useSyntheticProjects` or `useTrainingProjects` — those names do not exist). MachineLearningQuoteTool.tsx line 17 imports it verbatim:
  ```typescript
  import { useSyntheticPool } from "@/demo/realProjects";
  ```

From frontend/src/components/DemoLayout.tsx (existing — line 192-204 for REAL DATA group, 211-223 for SYNTHETIC DATA group).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ComparisonRom.tsx — Real Data ROM page (/compare/rom)</name>
  <files>frontend/src/pages/demo/compare/ComparisonRom.tsx</files>

  <read_first>
    - frontend/src/pages/demo/compare/ComparisonQuote.tsx (full file — 248 lines, the structural precedent. Mirror the ready/error/result lifecycle, the dropdowns derivation, the URL-param hydration, the requestAnimationFrame scroll.)
    - frontend/src/pages/single-quote/RomForm.tsx (Plan 07-03)
    - frontend/src/components/quote/RomResultPanel.tsx (Plan 07-03)
    - frontend/src/demo/romEstimator.ts (Plan 07-02)
    - frontend/src/pages/single-quote/romSchema.ts (Plan 07-01)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-01 + D-12 + D-20 + Copywriting Contract for /compare/rom page)
  </read_first>

  <action>
    Create `frontend/src/pages/demo/compare/ComparisonRom.tsx`. Pattern-mirror ComparisonQuote.tsx but swap aggregateMultiVisionEstimate → estimateRom, QuoteForm → RomForm, QuoteResultPanel → RomResultPanel:

    ```typescript
    /**
     * Phase 7 — D-01. /compare/rom — Real Data ROM Quote tool.
     *
     * Pattern-mirror of ComparisonQuote.tsx: same Pyodide warmup, same
     * dropdowns derivation, same fromQuote URL-param hydration, same
     * scroll-into-view. The differences vs ComparisonQuote:
     *   - Form: RomForm (4-field) instead of QuoteForm
     *   - Estimator: estimateRom (single predict + band widening) instead of aggregateMultiVisionEstimate
     *   - Result panel: RomResultPanel (ROM chrome) instead of QuoteResultPanel
     *
     * Owns the useForm({resolver: zodResolver(romFormSchema)}) instance,
     * the formRef, the dropdowns, and the result state. RomForm is the
     * presentational field cluster.
     */
    import { useEffect, useMemo, useRef, useState } from "react";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { useForm } from "react-hook-form";
    import { useSearchParams } from "react-router-dom";
    import { toast } from "sonner";
    import { AlertTriangle } from "lucide-react";

    import { DataProvenanceNote } from "@/components/DataProvenanceNote";
    import { PageHeader } from "@/components/PageHeader";
    import { PyodideLoader } from "@/components/PyodideLoader";
    import {
      ensurePyodideReady,
      ensureModelsReady,
      subscribe,
    } from "@/demo/pyodideClient";
    import { useRealProjects } from "@/demo/realProjects";
    import { useModelMetrics } from "@/demo/modelMetrics";
    import { useHotkey } from "@/lib/useHotkey";
    import { useSavedQuote } from "@/hooks/useSavedQuotes";
    import { RomForm } from "@/pages/single-quote/RomForm";
    import { RomResultPanel } from "@/components/quote/RomResultPanel";
    import { estimateRom } from "@/demo/romEstimator";
    import {
      romFormDefaults,
      romFormSchema,
      type RomFormValues,
    } from "@/pages/single-quote/romSchema";
    import type { UnifiedQuoteResult } from "@/demo/quoteResult";
    import type { RomMetadata } from "@/demo/romEstimator";
    import type { QuoteFormValues } from "@/pages/single-quote/schema";

    type ResultState = {
      unified: UnifiedQuoteResult;
      formValues: QuoteFormValues;
      rom: RomMetadata;
    };

    function buildDropdowns(pool: Record<string, unknown>[]) {
      function uniqueStrings(field: string): string[] {
        const set = new Set<string>();
        for (const r of pool) {
          const v = r[field];
          if (v != null && String(v).trim()) set.add(String(v));
        }
        return Array.from(set).sort();
      }
      return {
        industry_segment: uniqueStrings("industry_segment"),
        system_category: uniqueStrings("system_category"),
        automation_level: uniqueStrings("automation_level"),
      };
    }

    export function ComparisonRom() {
      const { data: pool } = useRealProjects();
      const { data: metricsData } = useModelMetrics("real");

      const [searchParams] = useSearchParams();
      const fromQuoteId = searchParams.get("fromQuote") ?? undefined;
      const { data: openedQuote } = useSavedQuote(fromQuoteId);

      const metricsByTarget = useMemo(
        () =>
          Object.fromEntries(
            (metricsData?.models ?? []).map((m) => [m.target, m]),
          ),
        [metricsData],
      );

      const dropdowns = useMemo(
        () => (pool ? buildDropdowns(pool) : undefined),
        [pool],
      );

      const [ready, setReady] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [result, setResult] = useState<ResultState | null>(null);
      const [submitting, setSubmitting] = useState(false);
      const formRef = useRef<HTMLFormElement>(null);

      const form = useForm<RomFormValues>({
        resolver: zodResolver(romFormSchema),
        defaultValues: romFormDefaults,
        mode: "onChange",
      });

      // Patch dropdown defaults when the pool loads (mirrors ComparisonQuote.tsx:102-113).
      useEffect(() => {
        if (!dropdowns) return;
        const current = form.getValues();
        const patch: Partial<RomFormValues> = {};
        if (!current.industry_segment && dropdowns.industry_segment[0])
          patch.industry_segment = dropdowns.industry_segment[0];
        if (!current.system_category && dropdowns.system_category[0])
          patch.system_category = dropdowns.system_category[0];
        if (!current.automation_level && dropdowns.automation_level[0])
          patch.automation_level = dropdowns.automation_level[0];
        if (Object.keys(patch).length) form.reset({ ...current, ...patch });
      }, [dropdowns, form]);

      // D-20: hydrate from saved quote when openedQuote arrives.
      useEffect(() => {
        if (!openedQuote) return;
        const latest = openedQuote.versions[openedQuote.versions.length - 1];
        const v = latest.formValues;
        // Only hydrate if the saved quote is mode === "rom" (otherwise the user
        // landed on /compare/rom with a fromQuote that points to a full quote;
        // SavedQuotePage's routing branch (Plan 07-05) prevents this — but defend.).
        if (openedQuote.mode === "rom") {
          form.reset({
            industry_segment: v.industry_segment,
            system_category: v.system_category,
            automation_level: v.automation_level,
            estimated_materials_cost: v.estimated_materials_cost ?? 0,
          });
        }
      }, [openedQuote, form]);

      useEffect(() => {
        const unsub = subscribe((s) => {
          if (s.stage === "error") setError(s.message);
        });
        ensurePyodideReady()
          .then(() => ensureModelsReady("real"))
          .then(() => setReady(true))
          .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
        return unsub;
      }, []);

      useHotkey({ key: "Enter", meta: true }, () => formRef.current?.requestSubmit());
      useHotkey({ key: "Enter", ctrl: true }, () => formRef.current?.requestSubmit());

      const handleSubmit = async () => {
        if (!ready || !pool) return;
        setSubmitting(true);
        try {
          const romValues = form.getValues();
          const { result: unified, rom, formValues } = await estimateRom({
            romValues,
            dataset: "real",
            metrics: metricsByTarget,
            supportingPool: pool,
            supportingLabel: "Most similar past projects",
          });
          setResult({ unified, formValues, rom });
          requestAnimationFrame(() => {
            document
              .getElementById("quote-results")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        } catch (err) {
          // D-16 toast verbatim — no ML jargon, plain English with a CTA.
          toast.error(
            err instanceof Error
              ? "Couldn't produce a ROM estimate. Try again, or open the full Quote tool for more detail."
              : "Couldn't produce a ROM estimate. Try again, or open the full Quote tool for more detail.",
          );
        } finally {
          setSubmitting(false);
        }
      };

      const chips = error
        ? [{ label: "Runtime failed to load", tone: "warning" as const }]
        : ready
          ? [{ label: "Runtime ready", tone: "success" as const }]
          : [{ label: "Warming up", tone: "accent" as const }];

      return (
        <>
          <PageHeader
            eyebrow="Real Data · ROM Quote"
            title="Quick early estimate"
            description="A faster path to a number when you only know the project type and materials cost. Use this for early budget conversations; switch to the full Quote tool when you have more detail."
            chips={chips}
          />
          <DataProvenanceNote variant="real" />

          {!ready && !error && (
            <div className="mt-6 fade-in">
              <PyodideLoader />
            </div>
          )}

          {error && (
            <div
              className="card p-5 mt-6 flex items-start gap-3 text-sm text-danger"
              role="alert"
            >
              <AlertTriangle
                size={18}
                strokeWidth={1.75}
                className="shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  Couldn&apos;t warm up the runtime.
                </div>
                <div className="text-muted mt-1">
                  Refresh the page to try again. Trained models and the Python
                  runtime load once and are cached for subsequent visits.
                </div>
                <pre className="mt-3 text-[11px] text-muted mono whitespace-pre-wrap break-all">
                  {error}
                </pre>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 text-[11px] eyebrow px-3 py-1.5 rounded-sm bg-tealSoft text-tealDark hover:bg-teal hover:text-white transition-colors"
                >
                  Refresh and retry
                </button>
              </div>
            </div>
          )}

          {ready && (
            <div className="mt-6 fade-in grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div>
                <RomForm
                  formRef={formRef}
                  form={form}
                  dropdowns={dropdowns}
                  onSubmit={() => {
                    void handleSubmit();
                  }}
                  submitting={submitting}
                />
              </div>
              <aside className="lg:sticky lg:top-6 self-start">
                {result && (
                  <RomResultPanel
                    result={result.unified}
                    input={result.formValues}
                    rom={result.rom}
                    workspace="real"
                    quoteId={fromQuoteId}
                    existingName={openedQuote?.name}
                    status={openedQuote?.status}
                  />
                )}
              </aside>
            </div>
          )}
        </>
      );
    }
    ```

    Note on dataset/metrics types: keep them aligned with whatever ComparisonQuote uses today. If `metricsByTarget` typing requires casting because the metrics shape differs between the live API type and what `EstimateRomArgs.metrics` expects, mirror the pattern from ComparisonQuote (line 76-82) verbatim.
  </action>

  <verify>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
    <automated>cd frontend && npm run build</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/pages/demo/compare/ComparisonRom.tsx` exists.
    - File contains `export function ComparisonRom`.
    - File contains `estimateRom(` (the predict path is the new one — not aggregateMultiVisionEstimate).
    - File contains `<RomForm` and `<RomResultPanel` (the Wave 2 components).
    - File contains the literal string `Real Data · ROM Quote` (PageHeader eyebrow per Copywriting Contract).
    - File contains the literal string `Quick early estimate` (PageHeader title verbatim).
    - File contains the literal string `A faster path to a number when you only know the project type and materials cost. Use this for early budget conversations; switch to the full Quote tool when you have more detail.` (PageHeader description verbatim).
    - File contains the literal string `Couldn't produce a ROM estimate. Try again, or open the full Quote tool for more detail.` (D-16 runtime-failure toast verbatim).
    - File contains `useSearchParams` and `fromQuote` (D-20 URL-param hydration).
    - File contains `openedQuote.mode === "rom"` (defensive check on hydration — D-20).
    - File contains `dataset: "real"` in the estimateRom call.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
    - `cd frontend && npm run build` exits 0.
  </acceptance_criteria>

  <done>
    ComparisonRom.tsx exists with the locked PageHeader strings, the runtime-failure D-16 toast, fromQuote URL-param hydration, and wires RomForm + RomResultPanel via estimateRom with dataset="real". typecheck + lint + build clean.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create MachineLearningRom.tsx — Synthetic Data ROM page (/ml/rom)</name>
  <files>frontend/src/pages/demo/ml/MachineLearningRom.tsx</files>

  <read_first>
    - frontend/src/pages/demo/compare/ComparisonRom.tsx (just-created in Task 1)
    - frontend/src/pages/demo/MachineLearningQuoteTool.tsx (the REAL synthetic-side implementation — verified live 2026-05-06; the file `frontend/src/pages/demo/ml/MachineLearningQuote.tsx` is just a 2-line re-export shim and MUST NOT be used as the precedent. The implementation file exposes `MachineLearningQuoteTool` and uses `useSyntheticPool` from `@/demo/realProjects`.)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-01 + Copywriting Contract for /ml/rom page)
  </read_first>

  <action>
    Create `frontend/src/pages/demo/ml/MachineLearningRom.tsx`. Same as ComparisonRom but:

    - Imports the synthetic-side projects hook from the verified live path:
      ```typescript
      import { useSyntheticPool } from "@/demo/realProjects";
      ```
      Use `const { data: pool } = useSyntheticPool();` (mirrors `MachineLearningQuoteTool.tsx:56` verbatim).
    - `useModelMetrics("synthetic")`
    - `ensureModelsReady("synthetic")`
    - PageHeader eyebrow = `Synthetic Data · ROM Quote` (Copywriting Contract verbatim)
    - PageHeader title and description identical to ComparisonRom (the user-facing copy is the same — only the data provenance differs)
    - DataProvenanceNote variant="synthetic"
    - estimateRom call with `dataset: "synthetic"`
    - RomResultPanel `workspace="synthetic"`
    - Otherwise structurally identical to ComparisonRom.

    Verbatim PageHeader contract (Copywriting Contract):
    - eyebrow: `Synthetic Data · ROM Quote`
    - title: `Quick early estimate`
    - description: `A faster path to a number when you only know the project type and materials cost. Use this for early budget conversations; switch to the full Quote tool when you have more detail.`

    The export name MUST be `MachineLearningRom` (matches the lazy import in DemoApp Task 3).
  </action>

  <verify>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
    <automated>cd frontend && npm run build</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/pages/demo/ml/MachineLearningRom.tsx` exists.
    - File contains `export function MachineLearningRom`.
    - File contains the literal import line `import { useSyntheticPool } from "@/demo/realProjects";` (verified live; the synthetic-side data hook).
    - File contains `dataset: "synthetic"` in the estimateRom call.
    - File contains the literal string `Synthetic Data · ROM Quote` (PageHeader eyebrow per Copywriting Contract).
    - File contains the literal string `Quick early estimate`.
    - File contains the literal string `A faster path to a number when you only know the project type and materials cost. Use this for early budget conversations; switch to the full Quote tool when you have more detail.` (description verbatim).
    - File contains `<DataProvenanceNote variant="synthetic"` or `variant="synthetic"` (provenance is synthetic).
    - File contains `<RomForm` and `<RomResultPanel`.
    - File contains `<RomResultPanel` with `workspace="synthetic"` (not `"real"`).
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
    - `cd frontend && npm run build` exits 0.
  </acceptance_criteria>

  <done>
    MachineLearningRom.tsx exists with synthetic-side dataset/metrics/projects (via the verified `useSyntheticPool` hook from `@/demo/realProjects`), locked PageHeader copy, workspace="synthetic" propagated. typecheck + lint + build clean.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add /compare/rom + /ml/rom routes to DemoApp.tsx</name>
  <files>frontend/src/DemoApp.tsx</files>

  <read_first>
    - frontend/src/DemoApp.tsx (full file — 92 lines, currently has ComparisonQuote/Compare/Insights + ML mirror)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-01 routes — `/compare/rom` and `/ml/rom`)
  </read_first>

  <action>
    Edit `frontend/src/DemoApp.tsx`:

    1. Add two new lazy imports next to the existing ComparisonQuote / MachineLearningQuote ones (line 7-36):
       ```typescript
       const ComparisonRom = lazy(() =>
         import("@/pages/demo/compare/ComparisonRom").then((m) => ({
           default: m.ComparisonRom,
         })),
       );
       const MachineLearningRom = lazy(() =>
         import("@/pages/demo/ml/MachineLearningRom").then((m) => ({
           default: m.MachineLearningRom,
         })),
       );
       ```

    2. Add two new `<Route>` entries inside the existing `<Route element={<DemoLayout />}>` block, alongside the other Compare-side and ML-side routes:
       - Inside the `compare/*` block (after `compare/quote` route, line 66):
         ```typescript
         <Route path="compare/rom" element={<ComparisonRom />} />
         ```
       - Inside the `ml/*` block (after `ml/quote` route, line 73):
         ```typescript
         <Route path="ml/rom" element={<MachineLearningRom />} />
         ```

    3. Do NOT add any new redirect or alias for the ROM routes (D-01 — they are NEW routes, not aliases of existing ones). The catch-all `<Route path="*" element={<Navigate to="/" replace />} />` (line 87) handles unknown paths unchanged.
  </action>

  <verify>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
    <automated>cd frontend && npm run build</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/DemoApp.tsx` contains `const ComparisonRom = lazy(`.
    - `frontend/src/DemoApp.tsx` contains `const MachineLearningRom = lazy(`.
    - `frontend/src/DemoApp.tsx` contains `path="compare/rom"`.
    - `frontend/src/DemoApp.tsx` contains `path="ml/rom"`.
    - `frontend/src/DemoApp.tsx` contains `<ComparisonRom />` AND `<MachineLearningRom />` element bindings.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
    - `cd frontend && npm run build` exits 0.
  </acceptance_criteria>

  <done>
    DemoApp.tsx contains 2 new lazy imports + 2 new Route entries. typecheck + lint + build clean.
  </done>
</task>

<task type="auto">
  <name>Task 4: Add Real-Data ROM + Synthetic-Data ROM sidebar links to DemoLayout.tsx</name>
  <files>frontend/src/components/DemoLayout.tsx</files>

  <read_first>
    - frontend/src/components/DemoLayout.tsx (full file — 309 lines; line 192-204 is the REAL DATA group, 211-223 is the SYNTHETIC DATA group)
    - .planning/phases/07-rom-quote-mode/07-UI-SPEC.md (D-14 sidebar entries; Copywriting Contract verbatim labels)
  </read_first>

  <action>
    Edit `frontend/src/components/DemoLayout.tsx`:

    1. In the REAL DATA group (currently line 192-204), insert a new `<SidebarLink>` between the existing `Quote` and `Compare` links. The label is `Real-Data ROM` (per D-14 / Copywriting Contract verbatim). Per UI-SPEC §"Sidebar entries (D-14)" the LABEL on the link is `Real-Data ROM` (NOT `ROM` alone, NOT `ROM Quote`). The slot ordering:
       ```typescript
       <SidebarLink to="/compare/quote" label="Quote" />
       <SidebarLink to="/compare/rom" label="Real-Data ROM" />
       <SidebarLink to="/compare/compare" label="Compare" />
       <SidebarLink to="/compare/insights" label="Business Insights" />
       ```

    2. In the SYNTHETIC DATA group (currently line 211-223), insert a new `<SidebarLink>` in the same slot:
       ```typescript
       <SidebarLink to="/ml/quote" label="Quote" />
       <SidebarLink to="/ml/rom" label="Synthetic-Data ROM" />
       <SidebarLink to="/ml/compare" label="Compare" />
       <SidebarLink to="/ml/insights" label="Business Insights" />
       ```

    3. Do NOT change the SubView regex (line 19-21) or the SUB_VIEWS array (line 11-15) — they only affect the mobile bottom-tab strip, which is intentionally unchanged for Phase 7 (ROM is reachable via the sidebar; the mobile sub-view tabs stay quote/compare/insights). If a future phase wants ROM as a mobile sub-view tab, that's a separate phase. Out of scope per UI-SPEC §"Out of scope".
  </action>

  <verify>
    <automated>cd frontend && npm run typecheck</automated>
    <automated>cd frontend && npm run lint</automated>
  </verify>

  <acceptance_criteria>
    - `frontend/src/components/DemoLayout.tsx` contains `to="/compare/rom"` and `label="Real-Data ROM"` (within ~20 chars of each other).
    - `frontend/src/components/DemoLayout.tsx` contains `to="/ml/rom"` and `label="Synthetic-Data ROM"`.
    - `frontend/src/components/DemoLayout.tsx` does NOT contain `label="ROM"` alone (the labels are `Real-Data ROM` / `Synthetic-Data ROM` — D-14 verbatim).
    - The order in the REAL DATA group section: Quote → Real-Data ROM → Compare → Business Insights (verifiable by reading the file and confirming the `<SidebarLink>` declarations appear in that sequence within the REAL DATA section block).
    - The order in the SYNTHETIC DATA group section: Quote → Synthetic-Data ROM → Compare → Business Insights.
    - `cd frontend && npm run typecheck` exits 0.
    - `cd frontend && npm run lint` exits 0.
  </acceptance_criteria>

  <done>
    DemoLayout.tsx contains 2 new SidebarLinks in the locked slot order. typecheck + lint clean.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL `?fromQuote={id}` → ComparisonRom / MachineLearningRom | useSavedQuote validates via savedQuoteSchema. Carry-forward Phase 5 T-05-15 mitigation. |
| Sidebar link click → React Router | Static targets (no user input in the path). |

This plan adds NO network boundary. All routing + persistence is browser-local; same posture as Phase 5/6.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-12 | Tampering | URL param `?fromQuote={id}` | mitigate | useSavedQuote.parse rejects forged IDs; ComparisonRom's `openedQuote.mode === "rom"` defensive check prevents hydrating a full quote into the ROM form even if SavedQuotePage's routing branch is bypassed. |
| T-07-13 | Information Disclosure | URL param `?fromQuote={id}` | accept | Same as Phase 5 — only quotes in this browser's IDB are accessible; the UUID in the URL is not a security secret. |
| T-07-14 | Spoofing | sidebar links → routing | accept | Static link targets; no user input shapes the path. |

Block-on severity: high. T-07-12 is mitigated by zod parse + defensive guard.
</threat_model>

<verification>
After all 4 tasks complete:

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run build
```

All exit 0. The full vitest suite must remain green; no Phase 7 page addition should break a Phase 5/6 test.

Manual UAT (visual sanity, after deployment to dev or local preview):
1. **SC-1**: Visit `/compare/rom` (sidebar entry "Real-Data ROM"). Page header reads "Quick early estimate" + "Real Data · ROM Quote". Form has 3 Selects + 1 currency input. Fill all four → "Compute ROM estimate" enables → click → result panel renders with hero badge "Preliminary" + Why-this-is-preliminary card.
2. **SC-2**: Compare the ROM result panel against `/compare/quote`'s result panel for the same project. ROM hero range is visibly wider (≈1.75× the half-widths). The badge is "Preliminary" instead of "Moderate confidence". The "What drives this estimate" card is absent. The "Hours by work category" card has a single line instead of a per-category H/M/L drilldown.
3. **D-15 sanity banner**: Enter material cost = $1 (intentionally degenerate). Submit. The result panel renders the "This early estimate is unusually wide…" banner.
</verification>

<success_criteria>
1. **SC-1 (ROM workflow produces an estimate)**: `/compare/rom` and `/ml/rom` exist as discoverable sidebar entries; both pages accept the 4-input form; both produce a model-grounded estimate via estimateRom.
2. **SC-2 (preliminary label + visibly wider band)**: RomBadge ("Preliminary") + Why-preliminary card (D-13 verbatim) + ROM_BAND_MULTIPLIER = 1.75× widening, all observable in the rendered chrome.
3. **ROM-01 + ROM-02**: requirement IDs covered for the page-level surfaces; SC-3 + SC-4 land in subsequent plans (07-03 SC-3 unit-test; 07-05 SC-4 round-trip + list integration).

Definition of done:
- 4 files touched (2 NEW pages + 2 MODIFIED files).
- 11 grep-verifiable strings/patterns present.
- `cd frontend && npm run typecheck && npm run lint && npm run build` all exit 0.
</success_criteria>

<output>
After completion, create `.planning/phases/07-rom-quote-mode/07-04-pages-and-routes-SUMMARY.md` documenting:
- Files touched (4) with one-line description of each change.
- Test count delta across the entire suite (vitest baseline pre-plan vs post-plan; expected: 0 since this plan adds no tests — typecheck + build are the gates).
- D-NN traceback for every modification (D-01 routes, D-14 sidebar, D-20 hydration on ComparisonRom side).
- Hand-off note for Plan 07-05 (list integration + re-open + jargon-guard + round-trip): the `/compare/rom` and `/ml/rom` routes are live and reachable via sidebar. Plan 07-05 wires the rest: QuoteRow ROM-badge render, SavedQuotePage routing branch, jargon-guard scope extension, and the SC-4 round-trip integration tests.
</output>
</content>
</invoke>