// frontend/src/pages/single-quote/HeroEstimate.tsx
import { ExplainedQuoteResponse } from "@/api/types";
import { useCountUp } from "@/lib/useCountUp";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function confidenceDots(rel: number): number {
  // Smaller rel_width = higher confidence; map to 1..5 dots.
  if (rel <= 0.10) return 5;
  if (rel <= 0.20) return 4;
  if (rel <= 0.35) return 3;
  if (rel <= 0.55) return 2;
  return 1;
}

function confidenceLabel(dots: number): string {
  return ["Weak", "Weak", "Moderate", "Strong", "Very Strong", "Very Strong"][dots];
}

export function HeroEstimate({ result }: { result: ExplainedQuoteResponse }) {
  const total = result.prediction.total_p50;
  const low   = result.prediction.total_p10;
  const high  = result.prediction.total_p90;
  const rel   = high > 0 ? (high - low) / Math.max(1, total) : 1;
  const animated = useCountUp(total);
  const dots = confidenceDots(rel);

  return (
    <div className="card p-6 bg-gradient-to-br from-navy-900/[0.03] to-transparent">
      <div className="text-[10px] tracking-widest text-muted font-semibold">
        ESTIMATED HOURS
      </div>
      <div className="mt-2 text-display numeric leading-none text-ink">
        {formatHours(animated)}
      </div>
      <div className="mt-3 text-sm text-muted">
        Range {formatHours(low)} – {formatHours(high)} · 90% CI
      </div>
      <div className="mt-3 flex items-center gap-2.5 text-sm">
        <span className="text-muted">Confidence</span>
        <span aria-hidden="true" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={
                "w-1.5 h-1.5 rounded-full " +
                (i <= dots ? "bg-brand" : "bg-steel-300 dark:bg-steel-600")
              }
            />
          ))}
        </span>
        <span className="font-medium text-ink">{confidenceLabel(dots)}</span>
      </div>
    </div>
  );
}
