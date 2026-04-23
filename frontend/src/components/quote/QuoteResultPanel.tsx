/** Shared result panel used by both Real and Synthetic Quote tabs - renders estimate, likely range, top drivers, per-category H/M/L confidence, and closest matching records. */
import { Download, TrendingUp, TrendingDown } from "lucide-react";

import type { UnifiedQuoteResult } from "@/demo/quoteResult";

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const CONFIDENCE_LABEL: Record<UnifiedQuoteResult["overallConfidence"], string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  lower: "Lower confidence",
};

const CONFIDENCE_TONE: Record<UnifiedQuoteResult["overallConfidence"], string> = {
  high: "bg-tealSoft text-tealDark",
  moderate: "bg-amberSoft text-ink",
  lower: "bg-amber/10 text-danger",
};

const CONFIDENCE_SHORT: Record<UnifiedQuoteResult["overallConfidence"], string> = {
  high: "H",
  moderate: "M",
  lower: "L",
};

const MAGNITUDE_LABEL: Record<
  UnifiedQuoteResult["topDrivers"][number]["magnitude"],
  string
> = {
  strong: "Strong driver",
  moderate: "Moderate driver",
  minor: "Minor driver",
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtHrs(n: number): string {
  return Math.round(n).toLocaleString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuoteResultPanel({ result }: { result: UnifiedQuoteResult }) {
  return (
    <div className="space-y-6" id="quote-results">
      {/* Hero estimate */}
      <div className="card p-6">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow text-xs text-muted">Estimated hours</span>
          <span
            className={`text-xs eyebrow px-2 py-0.5 rounded-sm ${CONFIDENCE_TONE[result.overallConfidence]}`}
          >
            {CONFIDENCE_LABEL[result.overallConfidence]}
          </span>
        </div>
        <div className="display-hero text-4xl text-ink tnum mt-2">
          {fmtHrs(result.estimateHours)} hrs
        </div>
        <div className="text-sm text-muted mt-1">
          Likely range {fmtHrs(result.likelyRangeLow)}–{fmtHrs(result.likelyRangeHigh)} hrs
        </div>
      </div>

      {/* Top drivers */}
      <div className="card p-5">
        <div className="eyebrow text-xs text-muted mb-3">What drives this estimate</div>
        <ul className="space-y-2">
          {result.topDrivers.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-ink">
                {d.direction === "increases" ? (
                  <TrendingUp size={14} className="text-amber" aria-hidden="true" />
                ) : (
                  <TrendingDown size={14} className="text-teal" aria-hidden="true" />
                )}
                {d.label}
              </span>
              <span className="text-sm eyebrow text-muted shrink-0">
                {MAGNITUDE_LABEL[d.magnitude]}
              </span>
            </li>
          ))}
          {result.topDrivers.length === 0 && (
            <li className="text-sm text-muted">
              No clear drivers. Inputs are similar to typical projects.
            </li>
          )}
        </ul>
      </div>

      {/* Per-category breakdown */}
      <div className="card p-5">
        <div className="eyebrow text-xs text-muted mb-3">Hours by work category</div>
        <div className="space-y-3">
          {result.perCategory.map((c) => (
            <div key={c.label} className="space-y-0.5 text-sm">
              <div className="text-ink">{c.label}</div>
              <div className="flex items-baseline gap-3 text-muted">
                <span className="text-ink tnum">
                  {fmtHrs(c.estimateHours)} hrs
                </span>
                <span className="tnum">
                  {fmtHrs(c.rangeLow)}–{fmtHrs(c.rangeHigh)}
                </span>
                <span
                  className={`ml-auto text-xs eyebrow px-1.5 rounded-sm ${CONFIDENCE_TONE[c.confidence]}`}
                  title={CONFIDENCE_LABEL[c.confidence]}
                >
                  {CONFIDENCE_SHORT[c.confidence]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supporting matches */}
      <div className="card p-5">
        <div className="eyebrow text-xs text-muted mb-3">
          {result.supportingMatches.label}
        </div>
        <div className="space-y-2">
          {result.supportingMatches.items.map((m) => (
            <div
              key={m.projectId}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate text-ink">{m.projectName}</span>
              <span className="text-sm text-muted mono shrink-0">
                {fmtHrs(m.actualHours)} hrs · {(m.similarity * 100).toFixed(0)}% match
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <button
        type="button"
        onClick={() => window.print()}
        className="no-print w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal text-white text-sm font-medium rounded-sm hover:bg-tealDark transition-colors"
      >
        <Download size={16} strokeWidth={1.75} aria-hidden="true" />
        Export PDF
      </button>
    </div>
  );
}
