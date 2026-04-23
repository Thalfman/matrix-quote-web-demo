import { SavedQuote } from "@/api/types";
import { useIsNarrow } from "@/lib/useMediaQuery";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function deltaText(current: number, baseTotal: number): { text: string; sign: "+" | "-" | "" } {
  const d = current - baseTotal;
  const pct = baseTotal > 0 ? (d / baseTotal) * 100 : 0;
  const sign = d > 0 ? "+" : d < 0 ? "" : "";
  return {
    text: `${sign}${fmt(d)} (${sign}${pct.toFixed(1)}%)`,
    sign: d > 0 ? "+" : d < 0 ? "-" : "",
  };
}

function deltaColor(i: number, d: number): string {
  if (i === 0) return "text-muted";
  return d > 0 ? "text-amber" : "text-teal";
}

export function CompareHeader({ quotes }: { quotes: SavedQuote[] }) {
  const base = quotes[0];
  const baseTotal = base.prediction.total_p50;
  const isNarrow = useIsNarrow();

  if (isNarrow) {
    return (
      <div className="space-y-4">
        {quotes.map((q, i) => {
          const d = q.prediction.total_p50 - baseTotal;
          const color = deltaColor(i, d);
          const { text: deltaString } = deltaText(q.prediction.total_p50, baseTotal);
          return (
            <div
              key={q.id}
              className={i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3"}
            >
              {i === 0 && <div className="eyebrow text-[10px] text-amber">Anchor</div>}
              <div className="font-medium text-ink truncate">{q.name}</div>
              <div className="text-[11px] text-muted mono truncate">{q.project_name}</div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-baseline">
                <dt className="eyebrow text-[10px] text-muted">Hours</dt>
                <dd className="display-hero text-2xl tnum text-ink">
                  {fmt(q.prediction.total_p50)}
                </dd>
                <dt className="eyebrow text-[10px] text-muted">Range</dt>
                <dd className="text-sm text-muted mono tnum">
                  {fmt(q.prediction.total_p10)}–{fmt(q.prediction.total_p90)}
                </dd>
                <dt className="eyebrow text-[10px] text-muted">Δ vs anchor</dt>
                <dd className={"text-sm mono tnum " + color}>
                  {i === 0 ? "-" : deltaString}
                </dd>
              </dl>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="grid gap-x-4 gap-y-2"
      style={{ gridTemplateColumns: `140px repeat(${quotes.length}, minmax(0, 1fr))` }}
    >
      <div />
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className={
            "py-2 " + (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
          }
        >
          {i === 0 && <div className="eyebrow text-[10px] text-amber">Anchor</div>}
          <div className="font-medium text-ink truncate">{q.name}</div>
          <div className="text-[11px] text-muted mono truncate">{q.project_name}</div>
        </div>
      ))}

      <div className="eyebrow text-[10px] text-muted pt-2">Hours</div>
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className={
            "display-hero text-3xl tnum text-ink " +
            (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
          }
        >
          {fmt(q.prediction.total_p50)}
        </div>
      ))}

      <div className="eyebrow text-[10px] text-muted">Range (90% CI)</div>
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className={
            "text-sm text-muted mono tnum " +
            (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
          }
        >
          {fmt(q.prediction.total_p10)}–{fmt(q.prediction.total_p90)}
        </div>
      ))}

      <div className="eyebrow text-[10px] text-muted">Δ vs anchor</div>
      {quotes.map((q, i) => {
        const d = q.prediction.total_p50 - baseTotal;
        const color = deltaColor(i, d);
        const { text: deltaString } = deltaText(q.prediction.total_p50, baseTotal);
        return (
          <div
            key={q.id}
            className={
              "text-sm mono tnum " +
              color +
              " " +
              (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
            }
          >
            {i === 0 ? "-" : deltaString}
          </div>
        );
      })}
    </div>
  );
}
