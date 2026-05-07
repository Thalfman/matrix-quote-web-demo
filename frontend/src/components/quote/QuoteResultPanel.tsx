/** Shared result panel used by both Real and Synthetic Quote tabs - renders estimate, likely range, top drivers, per-category H/M/L confidence, closest matching records, and (when workspace is provided) the Save quote button. */
import { Download, TrendingUp, TrendingDown } from "lucide-react";

import { SaveQuoteButton } from "@/components/quote/SaveQuoteButton";
import { Tooltip, TooltipProvider, GlossaryHelpIcon } from "@/components/Tooltip";
import type { UnifiedQuoteResult } from "@/demo/quoteResult";
import { lookup } from "@/lib/glossary";
import type { QuoteFormValues } from "@/pages/single-quote/schema";

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

export function QuoteResultPanel({
  result,
  input,
  workspace,
  quoteId,
  existingName,
  status,
  restoredFromVersion,
}: {
  result: UnifiedQuoteResult;
  input: QuoteFormValues;
  workspace?: "real" | "synthetic";
  quoteId?: string;
  existingName?: string;
  status?: "draft" | "sent" | "won" | "lost" | "revised";
  restoredFromVersion?: number;
}) {
  return (
    <div className="space-y-6" id="quote-results">
      {/* Your inputs — recap so the user can see what they fed the model */}
      <div className="card p-5">
        <div className="eyebrow text-[10px] text-muted mb-3">Your inputs</div>
        <YourInputsRecap input={input} />
      </div>

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

      {/* Per-vision contribution (Phase 6 D-09 / D-10 — between top drivers
          and per-category breakdown). Hidden when no vision rows. */}
      {result.perVisionContributions && result.perVisionContributions.length > 0 && (
        <div className="card p-5">
          <div className="eyebrow text-xs text-muted mb-3">
            Per-vision contribution
          </div>
          <div className="space-y-3">
            {result.perVisionContributions.map((pvc) => (
              <div key={pvc.rowIndex} className="space-y-1 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink">{pvc.rowLabel}</span>
                  <span className="text-muted tnum shrink-0">
                    {pvc.hoursDelta >= 0 ? "+" : ""}
                    {fmtHrs(pvc.hoursDelta)} hrs
                  </span>
                </div>
                {pvc.topDrivers.length > 0 && (
                  <ul className="text-[12px] text-muted space-y-0.5">
                    {pvc.topDrivers.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        {d.direction === "increases" ? (
                          <TrendingUp size={12} className="text-amber" aria-hidden="true" />
                        ) : (
                          <TrendingDown size={12} className="text-teal" aria-hidden="true" />
                        )}
                        {d.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Save quote (Phase 5 — only render when workspace is known) */}
      {workspace && (
        <SaveQuoteButton
          workspace={workspace}
          formValues={input}
          unifiedResult={result}
          quoteId={quoteId}
          existingName={existingName}
          status={status}
          restoredFromVersion={restoredFromVersion}
          variant="primary"
        />
      )}

      {/* Export — secondary now that Save quote is the primary action (UI-SPEC §"Trigger button placement") */}
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
// Your-inputs recap (UX-01)
// ---------------------------------------------------------------------------

const SECTIONS: ReadonlyArray<{
  title: string;
  rows: ReadonlyArray<[string, (v: QuoteFormValues) => string]>;
}> = [
  {
    title: "Project classification",
    rows: [
      ["Industry segment", (v) => v.industry_segment || "—"],
      ["System category", (v) => v.system_category || "—"],
      ["Automation level", (v) => v.automation_level || "—"],
      ["Includes controls", (v) => yesNo(v.has_controls)],
      ["Includes robotics", (v) => yesNo(v.has_robotics)],
      ["Retrofit project", (v) => yesNo(v.retrofit)],
      ["Duplicate of prior", (v) => yesNo(v.duplicate)],
    ],
  },
  {
    title: "Physical scale",
    rows: [
      ["Stations count", (v) => fmtCount(v.stations_count)],
      ["Robot count", (v) => fmtCount(v.robot_count)],
      ["Fixture sets", (v) => fmtCount(v.fixture_sets)],
      ["Part types", (v) => fmtCount(v.part_types)],
      ["Weldment perimeter (ft)", (v) => fmtDecimal(v.weldment_perimeter_ft)],
      ["Fence length (ft)", (v) => fmtDecimal(v.fence_length_ft)],
      ["Safety doors", (v) => fmtCount(v.safety_doors)],
      ["Safety devices count", (v) => fmtCount(v.safety_devices_count)],
      ["Conveyor length (ft)", (v) => fmtDecimal(v.conveyor_length_ft)],
    ],
  },
  {
    title: "Controls & automation",
    rows: [
      ["PLC family", (v) => v.plc_family || "—"],
      ["HMI family", (v) => v.hmi_family || "—"],
      ["Vision systems", (v) => formatVisionSystems(v.visionRows)],
      ["Panel count", (v) => fmtCount(v.panel_count)],
      ["Servo axes", (v) => fmtCount(v.servo_axes)],
      ["Drive count", (v) => fmtCount(v.drive_count)],
      ["Pneumatic devices", (v) => fmtCount(v.pneumatic_devices)],
    ],
  },
  {
    title: "Product & process",
    rows: [
      ["Product familiarity (1–5)", (v) => fmtCount(v.product_familiarity_score)],
      ["Product rigidity (1–5)", (v) => fmtCount(v.product_rigidity)],
      ["Bulk rigidity (1–5)", (v) => fmtCount(v.bulk_rigidity_score)],
      ["Process complexity (1–5)", (v) => fmtCount(v.process_uncertainty_score)],
      ["Changeover time (min)", (v) => fmtCount(v.changeover_time_min)],
      ["Product deformable", (v) => yesNo(v.is_product_deformable)],
      ["Bulk product", (v) => yesNo(v.is_bulk_product)],
      ["Tricky packaging", (v) => yesNo(v.has_tricky_packaging)],
    ],
  },
  {
    title: "Complexity & indices",
    rows: [
      ["Overall complexity (1–5)", (v) => fmtCount(v.complexity_score_1_5)],
      ["Custom %", (v) => `${fmtCount(v.custom_pct)}%`],
    ],
  },
  {
    title: "Cost",
    rows: [
      ["Estimated materials cost", (v) => fmtMoney(v.estimated_materials_cost)],
    ],
  },
];

/**
 * Resolve a recap row label to a glossary key, if one exists. Returns
 * null when the row has no matching glossary entry — the row renders
 * plainly (no tooltip).
 */
function recapLabelToGlossaryTerm(label: string): string | null {
  const MAP: Record<string, string> = {
    "Industry segment": "Industry Segment",
    "System category": "System Category",
    "Automation level": "Automation Level",
    "PLC family": "PLC Family",
    "HMI family": "HMI Family",
    "Overall complexity (1–5)": "Complexity (1–5)",
  };
  const candidate = MAP[label];
  if (candidate && lookup(candidate)) return candidate;
  return null;
}

function YourInputsRecap({ input }: { input: QuoteFormValues }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="text-[11px] eyebrow text-muted mb-1.5">
              {section.title}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {section.rows.map(([label, get]) => {
                const term = recapLabelToGlossaryTerm(label);
                return (
                  <div key={label} className="contents">
                    <dt className="text-muted truncate">
                      {term ? (
                        <span className="inline-flex items-center gap-1">
                          <span>{label}</span>
                          <Tooltip term={term} side="top">
                            <GlossaryHelpIcon ariaLabel={`What is ${term}?`} />
                          </Tooltip>
                        </span>
                      ) : (
                        label
                      )}
                    </dt>
                    <dd className="text-ink tnum text-right truncate">{get(input)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

function yesNo(b: boolean): string {
  return b ? "Yes" : "No";
}
function fmtCount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString() : "—";
}
/**
 * Reduce a trained-model vision_type label (e.g. "Cognex 2D", "3D Vision",
 * "Keyence IV3") to a short generic category for the inputs-echo block.
 * The full vocabulary stays on the form / per-vision contribution card —
 * the recap only needs the dimension or model token, not the brand.
 */
function categorizeVisionType(type: string): string {
  if (/\b3D\b/i.test(type)) return "3D";
  if (/\b2D\b/i.test(type)) return "2D";
  const parts = type.trim().split(/\s+/);
  return parts[parts.length - 1] || type;
}

/**
 * Format multi-vision rows for the inputs-echo block (D-11). Empty rows render
 * as the em-dash "—"; non-empty rows render as `"2D × 2; 3D × 1"`. Plain
 * counts and the multiplication sign — no jargon.
 */
function formatVisionSystems(rows: QuoteFormValues["visionRows"]): string {
  if (!rows || rows.length === 0) return "—";
  return rows.map((r) => `${categorizeVisionType(r.type)} × ${fmtCount(r.count)}`).join("; ");
}
function fmtDecimal(n: number): string {
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : "—";
}
function fmtMoney(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
