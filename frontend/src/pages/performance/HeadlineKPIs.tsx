import { PerformanceHeadline } from "@/api/types";

function KPI({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  accent?: boolean;
}) {
  const txt = value == null ? "—" : `${value.toFixed(1)}${suffix ?? ""}`;
  return (
    <div className="card p-4 relative overflow-hidden">
      {accent && (
        <span aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 bg-amber" />
      )}
      <div className="eyebrow text-[10px] text-muted">{label}</div>
      <div className="display-hero text-3xl tnum mt-2 text-ink">{txt}</div>
    </div>
  );
}

export function HeadlineKPIs({ head }: { head: PerformanceHeadline | undefined }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KPI label="Overall MAPE" value={head?.overall_mape ?? null} suffix="%" accent />
      <KPI label="Within ±10%"  value={head?.within_10_pct ?? null} suffix="%" />
      <KPI label="Within ±20%"  value={head?.within_20_pct ?? null} suffix="%" />
    </div>
  );
}
