import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import type { QuoteInput } from "@/api/types";
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
import { QuoteForm } from "@/pages/single-quote/QuoteForm";
import { QuoteResultPanel } from "@/components/quote/QuoteResultPanel";
import { aggregateMultiVisionEstimate } from "@/demo/multiVisionAggregator";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import {
  QuoteFormValues,
  SalesBucket,
  quoteFormDefaults,
  quoteFormSchema,
  transformToQuoteInput,
} from "@/pages/single-quote/schema";

type ResultState = { unified: UnifiedQuoteResult; formValues: QuoteFormValues };

function uniqueStrings(pool: Record<string, unknown>[], field: string): string[] {
  const set = new Set<string>();
  for (const r of pool) {
    const v = r[field];
    if (v != null && String(v).trim()) set.add(String(v));
  }
  return Array.from(set).sort();
}

function buildDropdowns(pool: Record<string, unknown>[]) {
  return {
    industry_segment: uniqueStrings(pool, "industry_segment"),
    system_category: uniqueStrings(pool, "system_category"),
    automation_level: uniqueStrings(pool, "automation_level"),
    plc_family: uniqueStrings(pool, "plc_family"),
    hmi_family: uniqueStrings(pool, "hmi_family"),
    vision_type: uniqueStrings(pool, "vision_type"),
  };
}

export function MachineLearningQuoteTool() {
  const { data: pool } = useSyntheticPool();
  const { data: metricsData } = useModelMetrics("synthetic");

  // Phase 5 BL-01 / WR-07: read URL params so re-saves of an opened-from-list
  // quote append a new version (D-05) and lineage is preserved (D-06
  // restoredFromVersion). Mirrors ComparisonQuote.tsx — same fix, both Quote
  // tools.
  const [searchParams] = useSearchParams();
  const fromQuoteId = searchParams.get("fromQuote") ?? undefined;
  // Schema requires positive integer (z.number().int().min(1)); coerce
  // anything else (NaN, decimals, zero, negatives) to undefined so a
  // malformed URL doesn't surface as a generic save-failure toast.
  const restoreVersionParam = searchParams.get("restoreVersion");
  const parsedRestoreVersion =
    restoreVersionParam !== null ? Number(restoreVersionParam) : NaN;
  const restoredFromVersion =
    Number.isInteger(parsedRestoreVersion) && parsedRestoreVersion > 0
      ? parsedRestoreVersion
      : undefined;
  const { data: openedQuote } = useSavedQuote(fromQuoteId);

  const metricsByTarget = useMemo(
    () =>
      Object.fromEntries(
        (metricsData?.models ?? []).map((m) => [m.target, m]),
      ),
    [metricsData],
  );

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const dropdowns = useMemo(
    () => (pool ? buildDropdowns(pool) : undefined),
    [pool],
  );

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: quoteFormDefaults,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!dropdowns) return;
    const current = form.getValues();
    const patch: Partial<QuoteFormValues> = {};
    if (!current.industry_segment && dropdowns.industry_segment[0])
      patch.industry_segment = dropdowns.industry_segment[0];
    if (!current.system_category && dropdowns.system_category[0])
      patch.system_category = dropdowns.system_category[0];
    if (!current.automation_level && dropdowns.automation_level[0])
      patch.automation_level = dropdowns.automation_level[0];
    if (Object.keys(patch).length) form.reset({ ...current, ...patch });
  }, [dropdowns, form]);

  useEffect(() => {
    const unsub = subscribe((s) => {
      if (s.stage === "error") setError(s.message);
    });
    ensurePyodideReady()
      .then(() => ensureModelsReady("synthetic"))
      .then(() => setReady(true))
      .catch(() => {
        /* error captured via subscribe */
      });
    return unsub;
  }, []);

  useHotkey({ key: "Enter", meta: true }, () => formRef.current?.requestSubmit());
  useHotkey({ key: "Enter", ctrl: true }, () => formRef.current?.requestSubmit());

  const handleSubmit = async () => {
    if (!ready) return;
    const values = form.getValues();
    setSubmitting(true);
    try {
      // D-04: legacy-compat shadow input for similar-projects matching.
      // visionRows[0]?.type and sum(row.count) keep nearestNeighbor distance honest while the model
      // remains single-vision-aware. A true vision-set similarity metric is deferred to v3.
      const inputForMatching: QuoteInput = {
        ...transformToQuoteInput(values),
        vision_type: values.visionRows[0]?.type ?? "None",
        vision_systems_count: values.visionRows.reduce((s, r) => s + r.count, 0),
      };
      const { result } = await aggregateMultiVisionEstimate({
        formValues: values,
        dataset: "synthetic",
        metrics: metricsByTarget,
        supportingPool: pool ?? [],
        supportingLabel: "Most similar training rows",
        inputForMatching,
      });
      setResult({ unified: result, formValues: values });
      requestAnimationFrame(() => {
        document
          .getElementById("quote-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Prediction failed";
      toast.error(msg);
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
        eyebrow="Synthetic Data · Quote"
        title="Machine Learning Quote Tool"
        description="Hour estimates for a new project, produced by models trained on five hundred generated training projects."
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
            <div className="font-medium">Couldn&apos;t warm up the runtime.</div>
            <div className="text-muted mt-1">
              Refresh the page to try again. Trained models and the Python runtime load
              once and are cached for subsequent visits.
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
            <QuoteForm
              formRef={formRef}
              form={form}
              dropdowns={dropdowns}
              onSubmit={(_: Partial<Record<SalesBucket, number>>) => {
                void handleSubmit();
              }}
              submitting={submitting}
            />
          </div>
          <aside className="lg:sticky lg:top-6 self-start">
            {result && (
              <QuoteResultPanel
                result={result.unified}
                input={result.formValues}
                workspace="synthetic"
                quoteId={fromQuoteId}
                existingName={openedQuote?.name}
                status={openedQuote?.status}
                restoredFromVersion={restoredFromVersion}
              />
            )}
          </aside>
        </div>
      )}
    </>
  );
}
