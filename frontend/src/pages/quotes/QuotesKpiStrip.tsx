import { SavedQuoteSummary } from "@/api/types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function QuotesKpiStrip({ rows }: { rows: SavedQuoteSummary[] }) {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const recent = rows.filter((r) => now - new Date(r.created_at).getTime() <= sevenDays);
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const avgHours = rows.length > 0 ? totalHours / rows.length : 0;

  // High-confidence = CI band narrower than 25% of total p50.
  const highConf = rows.filter((r) => {
    const band = r.range_high - r.range_low;
    return r.hours > 0 && band / r.hours <= 0.25;
  });
  const highConfPct =
    rows.length > 0 ? Math.round((highConf.length / rows.length) * 100) : 0;

  const cards: {
    label: string;
    value: string;
    meta?: string;
    accent?: boolean;
  }[] = [
    { label: "Total saved", value: fmt(rows.length), meta: "all time" },
    { label: "Last 7 days",  value: fmt(recent.length), meta: `${recent.length === 1 ? "scenario" : "scenarios"}` },
    { label: "Avg hours",    value: fmt(avgHours),     meta: "across saved" },
    { label: "High confidence", value: `${highConfPct}%`, meta: "narrow 90% CI", accent: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="card p-4 relative overflow-hidden">
          {c.accent && (
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 right-0 h-1 bg-amber"
            />
          )}
          <div className="eyebrow text-[10px] text-muted">{c.label}</div>
          <div className="display-hero text-3xl tnum mt-2 text-ink">{c.value}</div>
          {c.meta && <div className="text-[11px] text-muted mt-1">{c.meta}</div>}
        </div>
      ))}
    </div>
  );
}
