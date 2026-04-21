import { InsightsOverview } from "@/api/types";

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
    <div className="card p-4 relative overflow-hidden">
      {accent && (
        <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-amber" />
      )}
      <div className="eyebrow text-[10px] text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="display-hero text-3xl tnum text-ink">{value}</span>
        {suffix && <span className="text-muted text-sm">{suffix}</span>}
      </div>
      {meta && <div className="text-[11px] text-muted mt-1 mono">{meta}</div>}
    </div>
  );
}

export function KpiCards({ data }: { data: InsightsOverview | undefined }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Active quotes · 30d"
        value={(data?.active_quotes_30d ?? 0).toString()}
        meta="scenarios saved"
      />
      <KpiCard
        label="Models trained"
        value={`${data?.models_trained ?? 0}`}
        suffix={`/ ${data?.models_target ?? 12}`}
        meta="per-op LightGBM"
      />
      <KpiCard
        label="Overall MAPE"
        value={data?.overall_mape != null ? data.overall_mape.toFixed(1) : "—"}
        suffix={data?.overall_mape != null ? "%" : ""}
        meta="lower is better"
      />
      <KpiCard
        label="Confidence calibration"
        value={data?.calibration_within_band_pct != null
          ? data.calibration_within_band_pct.toFixed(1)
          : "—"}
        suffix={data?.calibration_within_band_pct != null ? "%" : ""}
        meta="inside 90% CI"
        accent
      />
    </div>
  );
}
