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
      <div className="text-xs tracking-widest muted mb-3">{label}</div>
      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-[40px] leading-none font-medium numeric text-accent">{value}</span>
        {unit && <span className="muted text-sm">{unit}</span>}
      </div>
      {meta && meta.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-3 pt-4 border-t border-border dark:border-border-dark">
          {meta.map((m) => (
            <div key={m.label}>
              <div className="text-[11px] tracking-widest muted">{m.label.toUpperCase()}</div>
              <div className="text-sm font-medium numeric mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
