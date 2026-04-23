import { Link, useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { api } from "@/api/client";
import { SavedQuote } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

import { CompareBucketsChart } from "./quotes/CompareBucketsChart";
import { CompareDriversStrip } from "./quotes/CompareDriversStrip";
import { CompareHeader } from "./quotes/CompareHeader";
import { CompareInputDiff } from "./quotes/CompareInputDiff";

export function Compare() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["savedQuote", id],
      queryFn: async () => (await api.get<SavedQuote>(`/quotes/${id}`)).data,
    })),
  });

  const loaded = queries.every((q) => q.data);
  const quotes = loaded ? queries.map((q) => q.data!) : [];

  if (ids.length < 2 || ids.length > 3) {
    return (
      <>
        <PageHeader eyebrow="Quotes · Compare" title="Compare scenarios" />
        <EmptyState
          title="Select 2–3 scenarios to compare"
          body="Open the Saved Quotes list and tick 2 or 3 rows before pressing Compare."
        />
      </>
    );
  }

  return (
    <>
      <Link
        to="/quotes"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-2"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        Back to Saved Quotes
      </Link>
      <PageHeader
        eyebrow="Quotes · Compare"
        title={`Comparing ${ids.length} scenarios`}
        description="Anchor scenario sets the baseline; deltas on other columns are measured against it."
      />

      {!loaded ? (
        <div className="card p-6 text-sm text-muted mb-6">Loading scenarios…</div>
      ) : (
        <div className="space-y-6">
          <div className="card p-5">
            <CompareHeader quotes={quotes} />
          </div>

          <div>
            <div className="eyebrow text-[10px] text-muted mb-2">Per-bucket hours</div>
            <CompareBucketsChart quotes={quotes} />
          </div>

          <div>
            <div className="eyebrow text-[10px] text-muted mb-2">Input differences</div>
            <CompareInputDiff quotes={quotes} />
          </div>

          <div>
            <div className="eyebrow text-[10px] text-muted mb-2">Drivers</div>
            <CompareDriversStrip quotes={quotes} />
          </div>
        </div>
      )}
    </>
  );
}
