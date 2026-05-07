/**
 * Phase 7 — D-06 / D-08 / D-13 / D-15. ROM-mode result panel.
 *
 * Sibling of QuoteResultPanel (NOT a fork — UI-SPEC §"Component Map").
 * Renders ROM-flavored chrome:
 *   - Your inputs recap (only the four ROM fields surface visibly)
 *   - Hero estimate with <RomBadge /> instead of CONFIDENCE_LABEL chip (D-08)
 *   - "Why this is preliminary" explanatory card (D-13 verbatim copy)
 *   - Optional sanity-check banner when rom.sanityFlag === true (D-15)
 *   - Combined-totals row (D-06: replaces per-category H/M/L)
 *   - Supporting matches (REMAIN — same as QuoteResultPanel)
 *   - Save quote button with mode="rom" (D-19)
 *   - Export PDF button (REMAIN secondary)
 *
 * HIDDEN (D-06): top-drivers card, per-category H/M/L breakdown,
 * per-vision contributions section. Confidence chip in hero (D-08).
 */
import { Download, Info } from "lucide-react";

import { RomBadge } from "@/components/quote/RomBadge";
import { SaveQuoteButton } from "@/components/quote/SaveQuoteButton";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import type { RomMetadata } from "@/demo/romEstimator";
import { deriveSalesBucket } from "@/lib/savedQuoteSchema";
import type { QuoteFormValues } from "@/pages/single-quote/schema";

// ---------------------------------------------------------------------------
// Verbatim D-13 copy. Pinned to a constant so the jargon-guard test (Plan
// 07-05 Task X) and any future code-search scan reads it from one source.
// ---------------------------------------------------------------------------
export const WHY_PRELIMINARY_COPY =
  "This is a quick early estimate based only on materials cost and the project type. The hours range is wider than a full quote because it does not yet reflect station counts, robotics, vision systems, or other engineering-hour-driving inputs.";

// ---------------------------------------------------------------------------
// Verbatim D-15 copy.
// ---------------------------------------------------------------------------
export const SANITY_BANNER_COPY =
  "This early estimate is unusually wide. Fill in a full quote when you have more details — it will give a tighter range.";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function fmtHrs(n: number): string {
  return Math.round(n).toLocaleString();
}

function fmtMoney(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface RomResultPanelProps {
  result: UnifiedQuoteResult;
  input: QuoteFormValues;
  /** Optional. Present at estimate time (band widening / sanityFlag); absent
   *  when rendering a saved ROM quote on the detail page where ROM metadata
   *  was never persisted. The "preliminary" chrome and ROM badge stay; only
   *  the sanity-divergence banner is gated on this. */
  rom?: RomMetadata;
  workspace?: "real" | "synthetic";
  quoteId?: string;
  existingName?: string;
  status?: "draft" | "sent" | "won" | "lost" | "revised";
  restoredFromVersion?: number;
}

export function RomResultPanel({
  result,
  input,
  rom,
  workspace,
  quoteId,
  existingName,
  status,
  restoredFromVersion,
}: RomResultPanelProps) {
  const salesBucket = deriveSalesBucket(input, "rom");

  return (
    <div className="space-y-6" id="quote-results">
      {/* Your inputs — only the four ROM fields */}
      <div className="card p-5">
        <div className="eyebrow text-[10px] text-muted mb-3">Your inputs</div>
        <RomInputsRecap input={input} />
      </div>

      {/* Hero — RomBadge instead of confidence chip (D-08) */}
      <div className="card p-6">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow text-xs text-muted">Estimated hours</span>
          <RomBadge />
        </div>
        <div className="display-hero text-4xl text-ink tnum mt-2">
          {fmtHrs(result.estimateHours)} hrs
        </div>
        <div className="text-sm text-muted mt-1">
          Likely range {fmtHrs(result.likelyRangeLow)}–{fmtHrs(result.likelyRangeHigh)} hrs
        </div>
      </div>

      {/* "Why this is preliminary" card (D-13) — REPLACES top drivers */}
      <div className="card p-5 flex items-start gap-3">
        <Info
          size={16}
          strokeWidth={1.75}
          className="text-muted shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <div className="eyebrow text-xs text-muted mb-1">
            Why this is preliminary
          </div>
          <p className="text-sm text-ink">{WHY_PRELIMINARY_COPY}</p>
        </div>
      </div>

      {/* Sanity-check banner — only when divergence > 5× (D-15) */}
      {rom?.sanityFlag && (
        <div className="card p-4 text-sm text-ink" role="status">
          {SANITY_BANNER_COPY}
        </div>
      )}

      {/* Combined-totals row — REPLACES per-category H/M/L (D-06) */}
      <div className="card p-5">
        <div className="eyebrow text-xs text-muted mb-3">
          Hours by work category
        </div>
        <div className="text-sm text-ink">
          <span className="font-medium">{salesBucket}</span>:{" "}
          <span className="tnum">{fmtHrs(result.estimateHours)}</span> hrs · range{" "}
          <span className="tnum">{fmtHrs(result.likelyRangeLow)}</span>–
          <span className="tnum">{fmtHrs(result.likelyRangeHigh)}</span>
        </div>
      </div>

      {/* Supporting matches — REMAIN unchanged */}
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

      {/* Save quote — threaded with mode="rom" (D-19) */}
      {workspace && (
        <SaveQuoteButton
          workspace={workspace}
          formValues={input}
          unifiedResult={result}
          quoteId={quoteId}
          existingName={existingName}
          status={status}
          restoredFromVersion={restoredFromVersion}
          mode="rom"
          variant="primary"
        />
      )}

      {/* Export PDF — REMAIN secondary */}
      <button
        type="button"
        onClick={() => window.print()}
        className="no-print w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-paper text-ink text-sm font-medium rounded-sm border hairline hover:bg-line/40 transition-colors"
      >
        <Download size={16} strokeWidth={1.75} aria-hidden="true" />
        Export PDF
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RomInputsRecap — only the four ROM fields (UI-SPEC §"`RomInputsRecap`")
// ---------------------------------------------------------------------------
function RomInputsRecap({ input }: { input: QuoteFormValues }) {
  const rows: Array<[string, string]> = [
    ["Industry segment", input.industry_segment || "—"],
    ["System category", input.system_category || "—"],
    ["Automation level", input.automation_level || "—"],
    ["Estimated materials cost", fmtMoney(input.estimated_materials_cost)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted truncate">{label}</dt>
          <dd className="text-ink tnum text-right truncate">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
