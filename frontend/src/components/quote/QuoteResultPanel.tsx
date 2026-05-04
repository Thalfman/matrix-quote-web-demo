/** Shared result panel used by both Real and Synthetic Quote tabs — renders estimate, likely range, top drivers, per-category H/M/L confidence, and closest matching records. */
import { TrendingUp, TrendingDown } from "lucide-react";

import type { UnifiedQuoteResult } from "@/demo/quoteResult";
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
}: {
  result: UnifiedQuoteResult;
  input: QuoteFormValues;
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
          <span className="eyebrow text-[10px] text-muted">Estimated hours</span>
          <span
            className={`text-[10px] eyebrow px-2 py-0.5 rounded-sm ${CONFIDENCE_TONE[result.overallConfidence]}`}
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
        <div className="eyebrow text-[10px] text-muted mb-3">What drives this estimate</div>
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
              <span className="text-[11px] eyebrow text-muted shrink-0">
                {MAGNITUDE_LABEL[d.magnitude]}
              </span>
            </li>
          ))}
          {result.topDrivers.length === 0 && (
            <li className="text-sm text-muted">
              No clear drivers — inputs are similar to typical projects.
            </li>
          )}
        </ul>
      </div>

      {/* Per-category breakdown */}
      <div className="card p-5">
        <div className="eyebrow text-[10px] text-muted mb-3">Hours by work category</div>
        <div className="space-y-1.5">
          {result.perCategory.map((c) => (
            <div
              key={c.label}
              className="grid grid-cols-12 gap-2 items-baseline text-sm"
            >
              <span className="col-span-6 text-ink truncate">{c.label}</span>
              <span className="col-span-2 text-ink tnum text-right">
                {fmtHrs(c.estimateHours)} hrs
              </span>
              <span className="col-span-3 text-[11px] text-muted tnum text-right">
                {fmtHrs(c.rangeLow)}–{fmtHrs(c.rangeHigh)}
              </span>
              <span
                className={`col-span-1 text-[10px] eyebrow text-center rounded-sm ${CONFIDENCE_TONE[c.confidence]}`}
                title={CONFIDENCE_LABEL[c.confidence]}
              >
                {CONFIDENCE_SHORT[c.confidence]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Supporting matches */}
      <div className="card p-5">
        <div className="eyebrow text-[10px] text-muted mb-3">
          {result.supportingMatches.label}
        </div>
        <div className="space-y-2">
          {result.supportingMatches.items.map((m) => (
            <div
              key={m.projectId}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate text-ink">{m.projectName}</span>
              <span className="text-[11px] text-muted mono shrink-0">
                {fmtHrs(m.actualHours)} hrs · {(m.similarity * 100).toFixed(0)}% match
              </span>
            </div>
          ))}
        </div>
      </div>
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
      ["Vision type", (v) => v.vision_type || "—"],
      ["Panel count", (v) => fmtCount(v.panel_count)],
      ["Servo axes", (v) => fmtCount(v.servo_axes)],
      ["Drive count", (v) => fmtCount(v.drive_count)],
      ["Pneumatic devices", (v) => fmtCount(v.pneumatic_devices)],
      ["Vision systems count", (v) => fmtCount(v.vision_systems_count)],
    ],
  },
  {
    title: "Product & process",
    rows: [
      ["Product familiarity (1–5)", (v) => fmtCount(v.product_familiarity_score)],
      ["Product rigidity (1–5)", (v) => fmtCount(v.product_rigidity)],
      ["Bulk rigidity (1–5)", (v) => fmtCount(v.bulk_rigidity_score)],
      ["Process uncertainty (1–5)", (v) => fmtCount(v.process_uncertainty_score)],
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

function YourInputsRecap({ input }: { input: QuoteFormValues }) {
  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="text-[11px] eyebrow text-muted mb-1.5">
            {section.title}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {section.rows.map(([label, get]) => (
              <div key={label} className="contents">
                <dt className="text-muted truncate">{label}</dt>
                <dd className="text-ink tnum text-right truncate">{get(input)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function yesNo(b: boolean): string {
  return b ? "Yes" : "No";
}
function fmtCount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString() : "—";
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
