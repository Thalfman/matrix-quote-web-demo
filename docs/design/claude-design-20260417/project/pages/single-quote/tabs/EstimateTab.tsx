// frontend/src/pages/single-quote/tabs/EstimateTab.tsx
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
  project_mgmt:  "Project management",
  documentation: "Documentation",
  misc:          "Misc",
};

export function EstimateTab({ result }: { result: ExplainedQuoteResponse }) {
  const buckets = Object.entries(result.prediction.sales_buckets ?? {});
  const total = buckets.reduce((s, [, v]) => s + v.p50, 0) || 1;

  return (
    <div className="space-y-2.5">
      {buckets.map(([key, v]) => {
        const pct = Math.round((v.p50 / total) * 100);
        return (
          <div key={key} className="flex items-center gap-3 text-sm">
            <div className="w-36 text-muted dark:text-muted-dark truncate">
              {BUCKET_LABELS[key] ?? key}
            </div>
            <div className="numeric w-16 text-right text-ink dark:text-ink-dark">
              {formatHours(v.p50)}
            </div>
            <div className="flex-1 h-2 bg-steel-100 dark:bg-steel-700/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="numeric w-10 text-right text-muted dark:text-muted-dark">
              {pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
