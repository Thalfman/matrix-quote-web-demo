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

  // CI rail math - clamp marker position to [10%, 90%] of rail.
  const range = Math.max(1, high - low);
  const leftPct  = Math.max(0, Math.min(100, ((low - low) / range) * 100));  // always 0
  const rightPct = Math.max(0, Math.min(100, 100 - ((high - low) / range) * 100));  // always 0
  const markerPct = Math.max(0, Math.min(100, ((total - low) / range) * 100));
  const bandPercent = Math.round((rel / 2) * 100);

  return (
    <div className="card relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber via-amber/70 to-transparent"
      />
      <div className="p-6 pt-7">
        <div className="flex items-center justify-between">
          <div className="eyebrow text-[11px] text-muted">Estimated hours</div>
        </div>

        <div className="mt-3 flex items-end gap-4">
          <div className="display-hero text-[76px] leading-none tracking-tight text-ink tnum">
            {formatHours(animated)}
          </div>
          <div className="pb-3">
            <div className="eyebrow text-[10px] text-muted">hrs</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-[11px] text-muted mono">
            <span>p10 · {formatHours(low)}</span>
            <span className="eyebrow text-[10px]">90% CI</span>
            <span>p90 · {formatHours(high)}</span>
          </div>
          <div className="relative h-2 mt-2 bg-line rounded-full">
            <div
              className="absolute inset-y-0 bg-teal/30 rounded-full"
              style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
              aria-hidden="true"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-ink border-2 border-amber shadow-sm"
              style={{ left: `calc(${markerPct}% - 6px)` }}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">Confidence</span>
              <span aria-hidden="true" className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={
                      "w-1.5 h-1.5 rounded-full " +
                      (i <= dots ? "bg-amber" : "bg-line2")
                    }
                  />
                ))}
              </span>
              <span className="font-medium text-ink">{confidenceLabel(dots)}</span>
            </div>
            <div className="text-xs text-muted">
              ±<span className="mono">{bandPercent}%</span> band
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
