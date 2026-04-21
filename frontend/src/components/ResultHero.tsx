export type HeroMeta = { label: string; value: string };

export function ResultHero({
  label,
  value,
  unit,
  meta,
}: {
  label: string;
  value: string;
  unit?: string;
  meta?: HeroMeta[];
}) {
  return (
    <div className="card p-8 mb-8">
      <div className="eyebrow text-[11px] text-muted mb-3">{label}</div>
      <div className="flex items-baseline gap-3 mb-6">
        <span className="display-hero text-5xl leading-none numeric text-amber">
          {value}
        </span>
        {unit && <span className="text-muted text-sm">{unit}</span>}
      </div>
      {meta && meta.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-3 pt-4 border-t hairline">
          {meta.map((m) => (
            <div key={m.label}>
              <div className="eyebrow text-[10px] text-muted">{m.label}</div>
              <div className="text-sm font-medium numeric mt-0.5 text-ink">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
