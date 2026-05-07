import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/api/client";
import { downloadAdHocPdf, useDropdowns, useSaveScenario, useSingleQuote } from "@/api/quote";
import { ExplainedQuoteResponse, HealthResponse } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ensureDisplayName } from "@/lib/displayName";
import { useHotkey } from "@/lib/useHotkey";

import { ResultPanel } from "./single-quote/ResultPanel";
import { Scenario } from "./single-quote/Scenario";
import { QuoteForm } from "./single-quote/QuoteForm";
import {
  QuoteFormValues,
  SalesBucket,
  quoteFormDefaults,
  quoteFormSchema,
  transformToQuoteInput,
} from "./single-quote/schema";

export function SingleQuote() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<HealthResponse>("/health")).data,
  });
  const { data: dropdowns } = useDropdowns();
  const mutate = useSingleQuote();
  const save = useSaveScenario();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: quoteFormDefaults,
    mode: "onBlur",
  });

  const [result, setResult] = useState<ExplainedQuoteResponse | null>(null);
  const [quotedHoursByBucket, setQuotedHoursByBucket] =
    useState<Partial<Record<SalesBucket, number>>>({});
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

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

  useHotkey({ key: "Enter", meta: true }, () => formRef.current?.requestSubmit());
  useHotkey({ key: "Enter", ctrl: true }, () => formRef.current?.requestSubmit());

  const modelsReady = health?.models_ready ?? false;

  if (!modelsReady) {
    return (
      <>
        <PageHeader
          eyebrow="Estimate · Cockpit"
          title="Single Quote"
          description="Enter project parameters to generate an hour estimate with confidence intervals, driver attribution, and similar historical projects."
          chips={[{ label: "Models not trained", tone: "warning" }]}
        />
        <EmptyState
          title="Models are not trained"
          body="An admin needs to upload a project-hours dataset and train the per-operation models before quotes can be generated."
        />
      </>
    );
  }

  async function handleSubmit(quoted: Partial<Record<SalesBucket, number>>) {
    const values = quoteFormSchema.parse(form.getValues());
    const payload = transformToQuoteInput(values);
    try {
      const res = await mutate.mutateAsync(payload);
      setResult(res);
      setQuotedHoursByBucket(quoted);
      sessionStorage.setItem("matrix.singlequote.last", JSON.stringify(values));
      requestAnimationFrame(() => {
        document.getElementById("quote-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to generate estimate";
      toast.error(detail);
    }
  }

  const onSaveScenario = async () => {
    if (!result) return;
    const values = quoteFormSchema.parse(form.getValues());
    const name = prompt("Name this scenario", `Scenario ${scenarios.length + 1}`);
    if (!name) return;
    const projectName = prompt("Project name", "") ?? "";
    if (!projectName) return;
    try {
      await save.mutateAsync({
        name,
        project_name: projectName,
        inputs: transformToQuoteInput(values),
        prediction: result.prediction,
        quoted_hours_by_bucket: quotedHoursByBucket as Record<string, number>,
      });
      // Keep local session list in sync (Plan B tests rely on this).
      setScenarios((s) => [
        ...s,
        {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          inputs: transformToQuoteInput(values),
          result,
          quotedHoursByBucket,
        },
      ]);
      toast.success(`Saved "${name}"`);
    } catch {
      toast.error("Could not save scenario");
    }
  };

  const onExportPdf = async () => {
    if (!result) return;
    const values = quoteFormSchema.parse(form.getValues());
    const projectName = prompt("Project name for the PDF", "") ?? "";
    if (!projectName) return;
    try {
      await downloadAdHocPdf({
        name: "Draft",
        project_name: projectName,
        created_by: ensureDisplayName(),
        inputs: transformToQuoteInput(values),
        prediction: result.prediction,
      });
    } catch {
      toast.error("Could not generate PDF");
    }
  };

  const onRemoveScenario = (id: string) =>
    setScenarios((s) => s.filter((x) => x.id !== id));

  const onCompare = () => {
    navigate("/quotes");
  };

  return (
    <>
      <PageHeader
        eyebrow="Estimate · Cockpit"
        title="Single Quote"
        description="Enter project parameters to generate an hour estimate with confidence intervals, driver attribution, and similar historical projects."
        chips={[{ label: "Models ready", tone: "success" }]}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <QuoteForm
            formRef={formRef}
            form={form}
            dropdowns={dropdowns}
            onSubmit={handleSubmit}
            submitting={mutate.isPending}
          />
        </div>
        <aside className="lg:sticky lg:top-6 self-start">
          <ResultPanel
            result={result}
            isLoading={mutate.isPending}
            scenarios={scenarios}
            onSaveScenario={onSaveScenario}
            onExportPdf={onExportPdf}
            onRemoveScenario={onRemoveScenario}
            onCompare={onCompare}
          />
        </aside>
      </div>
    </>
  );
}
