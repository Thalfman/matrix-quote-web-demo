import { PortfolioKpis as PortfolioKpisType } from "./portfolioStats";

const fmtInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function KpiCard({
  label,
  value,
  suffix,
  accent,
  meta,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
  meta?: string;
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      {accent && (
        <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-amber" />
      )}
      <div className="eyebrow text-[10px] text-muted">{label}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="display-hero text-3xl tnum leading-none text-ink">{value}</span>
        {suffix && <span className="text-muted text-sm">{suffix}</span>}
      </div>
      {meta && <div className="text-[11px] text-muted mt-2 mono">{meta}</div>}
    </div>
  );
}

export function PortfolioKpis({
  kpis,
  source = "real",
}: {
  kpis: PortfolioKpisType;
  source?: "real" | "synthetic";
}) {
  const costDisplay =
    kpis.avgMaterialsCost != null ? fmtCurrency.format(kpis.avgMaterialsCost) : "—";

  const projectsMeta = source === "synthetic" ? "synthetic pool" : "real historical";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Projects"
        value={fmtInt.format(kpis.projectCount)}
        meta={projectsMeta}
        accent
      />
      <KpiCard
        label="Total hours"
        value={fmtInt.format(kpis.totalHours)}
        meta="sum of all actuals"
      />
      <KpiCard
        label="Avg hours / project"
        value={fmtInt.format(kpis.avgHours)}
        meta={`median ${fmtInt.format(kpis.medianHours)}`}
      />
      <KpiCard
        label="Avg materials cost"
        value={costDisplay}
        meta="log-mean USD"
      />
    </div>
  );
}
