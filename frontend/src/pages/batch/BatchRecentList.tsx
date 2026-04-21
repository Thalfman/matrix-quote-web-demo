import { SAMPLE_RECENT_BATCHES } from "./fixtures";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function BatchRecentList() {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
        <div className="eyebrow text-[11px] text-ink">Recent batches</div>
        <div className="text-[11px] text-muted mono">sample data</div>
      </div>
      <div
        className="grid items-center gap-x-3 px-4 py-2 border-b hairline bg-paper/40"
        style={{
          gridTemplateColumns: "2fr 80px 90px 110px 110px 110px 90px",
        }}
      >
        {["File", "Rows", "OK", "Total hrs", "Median", "Ran", ""].map((h, i) => (
          <div
            key={i}
            className={
              "eyebrow text-[10px] text-muted " +
              (i >= 1 && i <= 5 ? "text-right" : "")
            }
          >
            {h}
          </div>
        ))}
      </div>

      {SAMPLE_RECENT_BATCHES.map((b) => (
        <div
          key={b.id}
          className="grid items-center gap-x-3 px-4 py-3 border-b hairline last:border-b-0 hover:bg-paper/80 transition-colors"
          style={{
            gridTemplateColumns: "2fr 80px 90px 110px 110px 110px 90px",
          }}
        >
          <div className="min-w-0">
            <div className="mono text-[13px] text-ink truncate">{b.fileName}</div>
            <div className="text-[11px] text-muted">{b.id}</div>
          </div>
          <div className="mono tnum text-right text-ink">{fmt(b.rows)}</div>
          <div className="mono tnum text-right text-success">
            {fmt(b.okCount)}
            <span className="text-[10px] text-muted ml-1">/ {fmt(b.rows)}</span>
          </div>
          <div className="mono tnum text-right text-ink">{fmt(b.totalHours)}</div>
          <div className="mono tnum text-right text-muted">{fmt(b.medianHours)}</div>
          <div className="text-right text-[12px] text-muted">{relativeTime(b.runAt)}</div>
          <div className="text-right">
            <button
              type="button"
              className="text-[12px] text-teal hover:text-tealDark"
            >
              Open
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
