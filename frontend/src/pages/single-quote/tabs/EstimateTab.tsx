import { useState } from "react";
import { ExplainedQuoteResponse } from "@/api/types";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

const BUCKET_LABELS: Record<string, string> = {
  mechanical:    "Mechanical",
  electrical:    "Electrical",
  controls:      "Controls",
  robotics:      "Robotics",
  assembly:      "Assembly",
  shipping:      "Shipping",
  install:       "Install",
  startup:       "Startup",
  engineering:   "Engineering",
  project_mgmt:  "Project mgmt",
  documentation: "Docs",
  misc:          "Misc",
};

// Short codes for the mono column (fallback to first 3 chars upper).
const BUCKET_CODES: Record<string, string> = {
  mechanical:    "ME",
  electrical:    "EE",
  controls:      "CON",
  robotics:      "ROB",
  assembly:      "ASM",
  shipping:      "SHP",
  install:       "INS",
  startup:       "STU",
  engineering:   "ENG",
  project_mgmt:  "PM",
  documentation: "DOC",
  misc:          "MSC",
};

type Mode = "hours" | "pct";

export function EstimateTab({ result }: { result: ExplainedQuoteResponse }) {
  const [mode, setMode] = useState<Mode>("hours");
  const buckets = Object.entries(result.prediction.sales_buckets ?? {});
  const total = buckets.reduce((s, [, v]) => s + v.p50, 0) || 1;
  const maxBucket = Math.max(1, ...buckets.map(([, v]) => v.p50));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="eyebrow text-[10px] text-muted">Hours by sales bucket</div>
          <div className="text-xs text-muted mt-0.5">
            {buckets.length} buckets · summing to{" "}
            <span className="mono text-ink">{formatHours(total)}</span>
          </div>
        </div>
        <div className="inline-flex text-[10px] mono rounded-sm border hairline overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("hours")}
            className={
              "px-2 py-1 " +
              (mode === "hours" ? "bg-ink text-white" : "text-muted hover:text-ink")
            }
          >
            Hours
          </button>
          <button
            type="button"
            onClick={() => setMode("pct")}
            className={
              "px-2 py-1 " +
              (mode === "pct" ? "bg-ink text-white" : "text-muted hover:text-ink")
            }
          >
            % split
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {buckets.map(([key, v]) => {
          const code = BUCKET_CODES[key] ?? key.slice(0, 3).toUpperCase();
          const label = BUCKET_LABELS[key] ?? key;
          const pct = Math.round((v.p50 / total) * 100);
          const barPct = mode === "hours" ? (v.p50 / maxBucket) * 100 : pct;
          return (
            <div key={key} className="flex items-center gap-3 text-sm">
              <div className="w-14 eyebrow text-[10px] text-muted" title={label}>
                {code}
              </div>
              <div className="mono tnum w-14 text-right text-ink font-medium">
                {formatHours(v.p50)}
              </div>
              <div className="flex-1 h-2.5 bg-line rounded-sm overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-ink"
                  style={{ width: `${barPct}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="mono tnum w-10 text-right text-muted text-[11px]">
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
