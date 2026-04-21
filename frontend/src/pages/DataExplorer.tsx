import { Search } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { SAMPLE_HISTOGRAM } from "./admin/fixtures";

const FILTERS = [
  { label: "Industry", value: "All" },
  { label: "Automation", value: "All" },
  { label: "Year", value: "All" },
];

export function DataExplorer() {
  const max = Math.max(1, ...SAMPLE_HISTOGRAM);

  return (
    <>
      <PageHeader
        eyebrow="Admin · Data"
        title="Data Explorer"
        description="Filter the master training dataset and inspect per-operation distributions. Functional filters land with the admin dataset endpoint."
      />

      {/* Filter bar */}
      <div className="card flex items-stretch overflow-hidden mb-6">
        <div className="relative flex-1 min-w-0 flex items-center">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search project or client"
            className="flex-1 bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted"
          />
        </div>
        {FILTERS.map((f) => (
          <div key={f.label} className="flex items-center">
            <div className="w-px bg-line" aria-hidden="true" />
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="eyebrow text-[10px] text-muted">{f.label}</span>
              <span className="text-sm text-muted">{f.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="eyebrow text-[10px] text-muted">Filtered projects</div>
          <div className="display-hero text-4xl tnum mt-2 text-ink">1,284</div>
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t hairline">
            {[
              { label: "Median hrs", value: "920" },
              { label: "Mean hrs",   value: "1,034" },
              { label: "p10 hrs",    value: "412" },
              { label: "p90 hrs",    value: "2,187" },
            ].map((s) => (
              <div key={s.label}>
                <div className="eyebrow text-[9px] text-muted">{s.label}</div>
                <div className="mono tnum text-ink text-base mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="eyebrow text-[10px] text-muted mb-3">Hours distribution</div>
          <div className="flex items-end gap-1 h-[140px]">
            {SAMPLE_HISTOGRAM.map((v, i) => {
              const height = (v / max) * 100;
              // Amber the middle buckets (~7–11) to match the design.
              const highlight = i >= 7 && i <= 11;
              return (
                <div
                  key={i}
                  className={
                    "flex-1 rounded-t-sm " + (highlight ? "bg-amber" : "bg-ink")
                  }
                  style={{ height: `${height}%` }}
                  aria-hidden="true"
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted mono">
            <span>0</span>
            <span>1,500</span>
            <span>3,000+</span>
          </div>
        </div>
      </div>

      <div className="card p-5 text-center">
        <div className="eyebrow text-[10px] text-muted">Data table</div>
        <div className="text-sm text-muted mt-2">
          Sortable rows with per-project drill-downs land when the admin dataset endpoint ships.
        </div>
      </div>
    </>
  );
}
