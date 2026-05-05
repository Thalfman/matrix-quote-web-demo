import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { SaveQuoteButton } from "@/components/quote/SaveQuoteButton";
import { ProjectRecord, recordToSavedQuote, recordToSummary } from "@/demo/realProjects";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import { transformToFormValues } from "@/lib/savedQuoteSchema";
import { QuotesBulkBar } from "@/pages/quotes/QuotesBulkBar";
import { QuotesFilters } from "@/pages/quotes/QuotesFilters";
import { QuotesTable } from "@/pages/quotes/QuotesTable";
import { CompareBucketsChart } from "@/pages/quotes/CompareBucketsChart";
import { CompareHeader } from "@/pages/quotes/CompareHeader";
import { CompareInputDiff } from "@/pages/quotes/CompareInputDiff";

type Filter = { project: string | null; industry: string | null; search: string };

type Props = { records: ProjectRecord[] };

export function CompareBrowseTab({ records }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [filter, setFilter] = useState<Filter>({ project: null, industry: null, search: "" });

  const summaries = useMemo(
    () => records.map((r, i) => recordToSummary(r, i)),
    [records],
  );

  const projects = useMemo(
    () => Array.from(new Set(summaries.map((s) => s.project_name))).sort(),
    [summaries],
  );
  const industries = useMemo(
    () => Array.from(new Set(summaries.map((s) => s.industry_segment).filter(Boolean))).sort(),
    [summaries],
  );

  const filteredSummaries = summaries.filter((s) => {
    if (filter.project && s.project_name !== filter.project) return false;
    if (filter.industry && s.industry_segment !== filter.industry) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (![s.name, s.project_name, s.industry_segment].some((x) =>
        (x ?? "").toLowerCase().includes(q),
      )) {
        return false;
      }
    }
    return true;
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 3) return prev;
        next.add(id);
      }
      return next;
    });

  const selectedQuotes = useMemo(() => {
    const byId = new Map(records.map((r, i) => [String(r.project_id ?? `real-${i}`), { r, i }]));
    return Array.from(selected)
      .map((id) => byId.get(id))
      .filter((x): x is { r: ProjectRecord; i: number } => !!x)
      .map(({ r, i }) => recordToSavedQuote(r, i));
  }, [selected, records]);

  const canCompare = selected.size === 2 || selected.size === 3;

  if (showCompare && canCompare) {
    return (
      <div className="space-y-6 fade-in">
        <button
          type="button"
          onClick={() => setShowCompare(false)}
          className={
            "inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink" +
            " transition-colors duration-150 ease-out" +
            " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
          }
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Back to project list
        </button>

        <div className="card p-5">
          <CompareHeader quotes={selectedQuotes} />
        </div>

        {/*
          Phase 5 D-13: Compare-side save. I1 simplification — the FIRST
          selected project's record-derived prediction is the saveable shape.
          `compareInputs.humanQuotedByBucket` carries the human comparator
          number when one is supplied (the CompareBrowseTab UI itself does not
          collect human numbers; the field is reserved for QuoteForm-side use).
        */}
        {selectedQuotes.length > 0 && (() => {
          const head = selectedQuotes[0];
          const formValues = transformToFormValues(head.inputs);
          const unifiedResult: UnifiedQuoteResult = {
            estimateHours: head.prediction.total_p50,
            likelyRangeLow: head.prediction.total_p10,
            likelyRangeHigh: head.prediction.total_p90,
            overallConfidence: "high",
            perCategory: [],
            topDrivers: [],
            supportingMatches: {
              label: "Most similar past projects",
              items: [],
            },
          };
          return (
            <div className="flex justify-end">
              <SaveQuoteButton
                workspace="real"
                formValues={formValues}
                unifiedResult={unifiedResult}
                compareInputs={{ humanQuotedByBucket: {} }}
                variant="compact"
              />
            </div>
          );
        })()}

        <div>
          <div className="eyebrow text-sm text-muted mb-3">Per-bucket hours (actuals)</div>
          <CompareBucketsChart quotes={selectedQuotes} />
        </div>

        <div>
          <div className="eyebrow text-sm text-muted mb-3">Input differences</div>
          <CompareInputDiff quotes={selectedQuotes} />
        </div>

        <div className="card p-5 text-xs text-muted leading-relaxed">
          Hours shown are each project's recorded actuals. The ±15% band is a visual
          reference; historical data does not carry a learned interval.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <QuotesFilters
        projects={projects}
        industries={industries}
        project={filter.project}
        industry={filter.industry}
        search={filter.search}
        onChange={setFilter}
      />

      <QuotesBulkBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        onCompare={() => setShowCompare(true)}
        canCompare={canCompare}
      />

      <QuotesTable
        rows={filteredSummaries}
        selected={selected}
        onToggle={toggle}
        onRowAction={() => {
          /* row actions (duplicate/pdf/delete/open) are not meaningful in the static demo. */
        }}
      />
    </div>
  );
}
