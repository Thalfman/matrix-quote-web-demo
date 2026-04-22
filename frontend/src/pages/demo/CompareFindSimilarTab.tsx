import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { DropdownOptions, QuoteInput, SavedQuote } from "@/api/types";
import { ProjectRecord, recordToSavedQuote, useDemoManifest } from "@/demo/realProjects";
import { nearestK } from "@/lib/nearestNeighbor";
import { QuoteForm } from "@/pages/single-quote/QuoteForm";
import {
  QuoteFormValues,
  quoteFormDefaults,
  quoteFormSchema,
  transformToQuoteInput,
} from "@/pages/single-quote/schema";
import { CompareBucketsChart } from "@/pages/quotes/CompareBucketsChart";
import { CompareHeader } from "@/pages/quotes/CompareHeader";
import { CompareInputDiff } from "@/pages/quotes/CompareInputDiff";

type Props = { records: ProjectRecord[] };

function uniqueStrings(records: ProjectRecord[], field: string): string[] {
  const set = new Set<string>();
  for (const r of records) {
    const v = r[field];
    if (v != null && String(v).trim()) set.add(String(v));
  }
  return Array.from(set).sort();
}

function buildDropdowns(records: ProjectRecord[]): DropdownOptions {
  return {
    industry_segment: uniqueStrings(records, "industry_segment"),
    system_category: uniqueStrings(records, "system_category"),
    automation_level: uniqueStrings(records, "automation_level"),
    plc_family: uniqueStrings(records, "plc_family"),
    hmi_family: uniqueStrings(records, "hmi_family"),
    vision_type: uniqueStrings(records, "vision_type"),
  };
}

function anchorFromInput(input: QuoteInput): SavedQuote {
  return {
    id: "user-input",
    name: "Your inputs",
    project_name: "User scenario",
    client_name: null,
    notes: null,
    inputs: input,
    prediction: {
      ops: {},
      total_p50: 0,
      total_p10: 0,
      total_p90: 0,
      sales_buckets: {},
    },
    quoted_hours_by_bucket: null,
    created_at: new Date().toISOString(),
    created_by: "demo",
  };
}

export function CompareFindSimilarTab({ records }: Props) {
  const { data: manifest } = useDemoManifest();
  const dropdowns = useMemo(() => buildDropdowns(records), [records]);
  const [matches, setMatches] = useState<SavedQuote[] | null>(null);
  const [userAnchor, setUserAnchor] = useState<SavedQuote | null>(null);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      ...quoteFormDefaults,
      industry_segment: dropdowns.industry_segment[0] ?? "",
      system_category: dropdowns.system_category[0] ?? "",
      automation_level: dropdowns.automation_level[0] ?? "",
      plc_family: dropdowns.plc_family[0] ?? quoteFormDefaults.plc_family,
      hmi_family: dropdowns.hmi_family[0] ?? quoteFormDefaults.hmi_family,
      vision_type: dropdowns.vision_type[0] ?? quoteFormDefaults.vision_type,
    },
    mode: "onBlur",
  });

  const handleSubmit = () => {
    if (!manifest) return;
    const values = form.getValues();
    const input = transformToQuoteInput(values);
    const scored = nearestK(input, records, manifest.feature_stats, 3);
    const matched = scored.map(({ record }, i) => recordToSavedQuote(record, i));
    setUserAnchor(anchorFromInput(input));
    setMatches(matched);
    requestAnimationFrame(() => {
      document.getElementById("find-similar-results")?.scrollIntoView({
        behavior: "smooth", block: "start",
      });
    });
  };

  const quotes = matches && userAnchor ? [userAnchor, ...matches] : [];

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-paper/40 text-xs text-muted leading-relaxed">
        Fill out the form and press <strong className="text-ink">Regenerate estimate</strong>{" "}
        to surface the three closest historical projects, ranked by weighted distance across
        thirty-three numeric features and six categoricals.
      </div>

      <QuoteForm
        dropdowns={dropdowns}
        submitting={false}
        form={form}
        onSubmit={handleSubmit}
      />

      {quotes.length > 0 && (
        <div id="find-similar-results" className="space-y-6 pt-6 border-t hairline fade-in">
          <div className="eyebrow text-sm text-muted">
            Nearest {matches?.length ?? 0} projects · anchor = your inputs
          </div>

          <div className="card p-5">
            <CompareHeader quotes={quotes} />
          </div>

          <div>
            <div className="eyebrow text-sm text-muted mb-3">Per-bucket hours (matched actuals)</div>
            <CompareBucketsChart quotes={quotes} />
          </div>

          <div>
            <div className="eyebrow text-sm text-muted mb-3">Input differences</div>
            <CompareInputDiff quotes={quotes} />
          </div>
        </div>
      )}
    </div>
  );
}
