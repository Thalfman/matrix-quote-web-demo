import { CHART_COLORS } from "@/pages/insights/chartTheme";
import type { IndustryDetail } from "./portfolioStats";

const fmtInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});
const fmtPctSigned = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const fmtScore = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const fmtCostPerHour = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function Kpi({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="flex flex-col">
      <span className="eyebrow text-[10px] text-muted">{label}</span>
      <span className="display-hero text-xl tnum leading-none text-ink mt-1">{value}</span>
      {meta && <span className="text-[11px] text-muted mono mt-1">{meta}</span>}
    </div>
  );
}

function ScoreBar({ label, value, max, meta }: {
  label: string;
  value: number | null;
  max: number;
  meta?: string;
}) {
  const pct = value != null ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-[11px] mono tnum text-ink">
          {value == null ? "—" : (max === 1 ? fmtPct.format(value) : fmtScore.format(value))}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-sm bg-line overflow-hidden">
        <div
          aria-hidden="true"
          className="h-full"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: CHART_COLORS.teal,
          }}
        />
      </div>
      {meta && <div className="text-[10px] text-muted mt-0.5 mono">{meta}</div>}
    </div>
  );
}

export function IndustryDeepDive({ detail }: { detail: IndustryDetail }) {
  if (detail.projectCount === 0) {
    return (
      <div className="card p-5 text-sm text-muted">
        No projects in this industry match the current filters.
      </div>
    );
  }

  const overrunValue = detail.medianOverrunPct;
  const overrunDisplay = overrunValue == null ? "—" : fmtPctSigned.format(overrunValue);

  const baseline = detail.portfolioMedianOverrunPct;
  let overrunMeta: string | undefined;
  if (overrunValue != null && baseline != null) {
    const delta = overrunValue - baseline;
    const direction = delta > 0 ? "above" : delta < 0 ? "below" : "matches";
    overrunMeta =
      delta === 0
        ? `matches portfolio (${fmtPctSigned.format(baseline)})`
        : `${fmtPctSigned.format(delta)} ${direction} portfolio (${fmtPctSigned.format(baseline)})`;
  }

  const bucketEntries = Object.entries(detail.bucketsShare)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="eyebrow text-xs text-muted">Industry deep-dive</div>
          <div className="display-hero text-lg text-ink mt-0.5">{detail.industry}</div>
        </div>
        <div className="text-xs text-muted mono tnum">
          {fmtInt.format(detail.projectCount)} project{detail.projectCount === 1 ? "" : "s"}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 pb-4 border-b hairline">
        <Kpi
          label="Projects"
          value={fmtInt.format(detail.projectCount)}
        />
        <Kpi
          label="Avg hours / project"
          value={fmtInt.format(detail.avgHours)}
        />
        <Kpi
          label="Median overrun"
          value={overrunDisplay}
          meta={overrunMeta}
        />
        <Kpi
          label="$ / labor hour"
          value={detail.costPerHour != null ? fmtCostPerHour.format(detail.costPerHour) : "—"}
          meta={detail.costPerHour != null ? "material cost per hour" : undefined}
        />
      </div>

      {/* Risk factors + discipline mix */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="eyebrow text-[11px] text-muted mb-3">Risk & scope factors</div>
          <div className="space-y-3">
            <ScoreBar
              label="Product familiarity"
              value={detail.avgProductFamiliarity}
              max={5}
              meta="0 = unfamiliar · 5 = routine"
            />
            <ScoreBar
              label="Process uncertainty"
              value={detail.avgProcessUncertainty}
              max={5}
              meta="0 = certain · 5 = uncertain"
            />
            <ScoreBar
              label="Custom content"
              value={detail.avgCustomPct}
              max={1}
              meta="share of custom scope"
            />
            <ScoreBar
              label="Tricky packaging"
              value={detail.trickyPackagingShare}
              max={1}
              meta="share of projects flagged"
            />
            <ScoreBar
              label="Retrofit"
              value={detail.retrofitShare}
              max={1}
              meta="share of projects"
            />
            <ScoreBar
              label="Duplicate / reuse"
              value={detail.duplicateShare}
              max={1}
              meta="share based on prior build"
            />
          </div>
        </div>
        <div>
          <div className="eyebrow text-[11px] text-muted mb-3">Discipline mix</div>
          {bucketEntries.length === 0 ? (
            <div className="text-xs text-muted">Not available.</div>
          ) : (
            <div className="space-y-2">
              {bucketEntries.map(([bucket, share]) => (
                <div key={bucket} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted w-16 shrink-0">{bucket}</span>
                  <div className="flex-1 h-2 rounded-sm bg-line overflow-hidden">
                    <div
                      aria-hidden="true"
                      className="h-full"
                      style={{
                        width: `${share * 100}%`,
                        backgroundColor: CHART_COLORS.ink,
                      }}
                    />
                  </div>
                  <span className="text-[11px] mono tnum text-ink w-12 text-right">
                    {fmtPct.format(share)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
