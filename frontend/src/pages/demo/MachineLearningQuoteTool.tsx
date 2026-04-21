import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import { DropdownOptions, ExplainedQuoteResponse } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { PyodideLoader } from "@/components/PyodideLoader";
import { ensurePyodideReady, predictQuote, subscribe } from "@/demo/pyodideClient";
import { useSyntheticPool } from "@/demo/realProjects";
import { useHotkey } from "@/lib/useHotkey";
import { QuoteForm } from "@/pages/single-quote/QuoteForm";
import { ResultPanel } from "@/pages/single-quote/ResultPanel";
import {
  QuoteFormValues,
  SalesBucket,
  quoteFormDefaults,
  quoteFormSchema,
  transformToQuoteInput,
} from "@/pages/single-quote/schema";

function uniqueStrings(pool: Record<string, unknown>[], field: string): string[] {
  const set = new Set<string>();
  for (const r of pool) {
    const v = r[field];
    if (v != null && String(v).trim()) set.add(String(v));
  }
  return Array.from(set).sort();
}

function buildDropdowns(pool: Record<string, unknown>[]): DropdownOptions {
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
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainedQuoteResponse | null>(null);
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
      if (s.stage === "ready") setReady(true);
      if (s.stage === "error") setError(s.message);
    });
    ensurePyodideReady().catch(() => {
      /* error captured via subscribe */
    });
    return unsub;
  }, []);

  useHotkey({ key: "Enter", meta: true }, () => formRef.current?.requestSubmit());
  useHotkey({ key: "Enter", ctrl: true }, () => formRef.current?.requestSubmit());

  const handleSubmit = async () => {
    if (!ready) return;
    const values = form.getValues();
    const input = transformToQuoteInput(values);
    setSubmitting(true);
    try {
      const prediction = await predictQuote(input);
      setResult({ prediction, drivers: null, neighbors: null });
      requestAnimationFrame(() => {
        document.getElementById("quote-results")?.scrollIntoView({
          behavior: "smooth", block: "start",
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Prediction failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const chips = error
    ? [{ label: "Pyodide failed to load", tone: "warning" as const }]
    : ready
      ? [{ label: "Runtime ready", tone: "success" as const }]
      : [{ label: "Warming up", tone: "accent" as const }];

  return (
    <>
      <PageHeader
        eyebrow="Machine Learning · Client-side"
        title="Machine Learning Quote Tool"
        description="Twelve Gradient Boosting models run directly in your browser. The first visit warms up the runtime and caches ~30 MB of packages; every estimate after that is instant."
        chips={chips}
      />

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
          <div>
            <div className="font-medium">Couldn't warm up the in-browser runtime.</div>
            <div className="text-muted mt-1">
              Refresh the page to try again. Trained models and the Python runtime load
              once; subsequent visits use the browser's cache.
            </div>
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
            <ResultPanel
              result={result}
              isLoading={submitting}
              scenarios={[]}
              onSaveScenario={() => {
                /* no-op in demo */
              }}
              onExportPdf={() => {
                /* no-op in demo */
              }}
              onRemoveScenario={() => {
                /* no-op in demo */
              }}
              onCompare={() => {
                /* no-op in demo */
              }}
              hideSaveExport
            />
          </aside>
        </div>
      )}
    </>
  );
}
