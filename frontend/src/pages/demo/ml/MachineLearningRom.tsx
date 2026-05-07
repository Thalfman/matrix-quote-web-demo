/**
 * Phase 7 — D-01. /ml/rom — Synthetic Data ROM Quote tool.
 *
 * Pattern-mirror of ComparisonRom (the real-side sibling created in
 * Plan 07-04 Task 1) but with synthetic-side dataset/metrics/projects:
 *   - useSyntheticPool from @/demo/realProjects (verified live —
 *     MachineLearningQuoteTool.tsx uses the same import verbatim;
 *     useSyntheticProjects / useTrainingProjects DO NOT exist).
 *   - useModelMetrics("synthetic")
 *   - ensureModelsReady("synthetic")
 *   - estimateRom with dataset: "synthetic"
 *   - RomResultPanel with workspace="synthetic"
 *   - DataProvenanceNote variant="synthetic"
 *
 * User-facing copy (PageHeader title + description) is identical to
 * ComparisonRom — only the data provenance differs (Copywriting Contract).
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
import { useSyntheticPool } from "@/demo/realProjects";
import { useModelMetrics } from "@/demo/modelMetrics";
import { useHotkey } from "@/lib/useHotkey";
import { useSavedQuote } from "@/hooks/useSavedQuotes";
import { RomForm } from "@/pages/single-quote/RomForm";
import { RomResultPanel } from "@/components/quote/RomResultPanel";
import { estimateRom, type RomMetadata } from "@/demo/romEstimator";
import {
  romFormDefaults,
  romFormSchema,
  type RomFormValues,
} from "@/pages/single-quote/romSchema";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
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

export function MachineLearningRom() {
  const { data: pool } = useSyntheticPool();
  const { data: metricsData } = useModelMetrics("synthetic");

  // D-20: read fromQuote URL param so re-saving an opened ROM quote appends
  // a new version (mirrors ComparisonRom — same Phase 5 BL-01 / WR-07 pattern).
  // `restoreVersion=N` selects an older version to fork from (D-06 lineage).
  const [searchParams] = useSearchParams();
  const fromQuoteId = searchParams.get("fromQuote") ?? undefined;
  const restoreVersionParam = searchParams.get("restoreVersion");
  const parsedRestoreVersion =
    restoreVersionParam !== null ? Number(restoreVersionParam) : NaN;
  const restoredFromVersion =
    Number.isInteger(parsedRestoreVersion) && parsedRestoreVersion > 0
      ? parsedRestoreVersion
      : undefined;
  const { data: openedQuote } = useSavedQuote(fromQuoteId);
  const isRomQuote = openedQuote?.mode === "rom";

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

  // Patch dropdown defaults when the pool loads.
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

  // D-20: hydrate from saved quote when openedQuote arrives. Only hydrate if
  // the saved quote is mode === "rom" — defensive against forged URLs that
  // would otherwise stuff a full quote's values into the ROM form.
  // When `restoreVersion=N` is present, hydrate from that specific version
  // (D-06 fork-on-restore); fall back to latest when N is missing or unmatched.
  useEffect(() => {
    if (!openedQuote) return;
    if (openedQuote.mode === "rom" && openedQuote.versions.length > 0) {
      const target =
        (restoredFromVersion !== undefined
          ? openedQuote.versions.find((vv) => vv.version === restoredFromVersion)
          : undefined) ?? openedQuote.versions[openedQuote.versions.length - 1];
      const v = target.formValues;
      form.reset({
        industry_segment: v.industry_segment,
        system_category: v.system_category,
        automation_level: v.automation_level,
        estimated_materials_cost: v.estimated_materials_cost ?? 0,
      });
    }
  }, [openedQuote, restoredFromVersion, form]);

  useEffect(() => {
    const unsub = subscribe((s) => {
      if (s.stage === "error") setError(s.message);
    });
    ensurePyodideReady()
      .then(() => ensureModelsReady("synthetic"))
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
        dataset: "synthetic",
        metrics: metricsByTarget,
        supportingPool: pool,
        supportingLabel: "Most similar training rows",
      });
      setResult({ unified, formValues, rom });
      requestAnimationFrame(() => {
        document
          .getElementById("quote-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      // D-16 toast verbatim — no ML jargon, plain English with a CTA.
      toast.error(
        "Couldn't produce a ROM estimate. Try again, or open the full Quote tool for more detail.",
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
        eyebrow="Synthetic Data · ROM Quote"
        title="Quick early estimate"
        description="A faster path to a number when you only know the project type and materials cost. Use this for early budget conversations; switch to the full Quote tool when you have more detail."
        chips={chips}
      />
      <DataProvenanceNote variant="synthetic" />

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
                workspace="synthetic"
                quoteId={isRomQuote ? fromQuoteId : undefined}
                existingName={isRomQuote ? openedQuote?.name : undefined}
                status={isRomQuote ? openedQuote?.status : undefined}
                restoredFromVersion={isRomQuote ? restoredFromVersion : undefined}
              />
            )}
          </aside>
        </div>
      )}
    </>
  );
}
