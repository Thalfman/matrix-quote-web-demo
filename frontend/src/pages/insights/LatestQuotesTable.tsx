import { Link } from "react-router-dom";
import { SavedQuoteSummary } from "@/api/types";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function LatestQuotesTable({ rows }: { rows: SavedQuoteSummary[] }) {
  if (rows.length === 0) {
    return <div className="card p-6 text-sm text-muted">No saved quotes yet.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline justify-between px-4 py-2.5 bg-paper/60 border-b hairline">
        <div className="eyebrow text-[10px] text-muted">Latest quotes</div>
        <div className="text-[11px] text-muted mono">{rows.length} rows</div>
      </div>
      <div
        className="grid items-center gap-3 px-4 py-2 border-b hairline bg-paper/40"
        style={{ gridTemplateColumns: "2fr 1.5fr 110px 110px" }}
      >
        {["Name", "Project", "Hours", "Saved"].map((h, i) => (
          <div
            key={h}
            className={
              "eyebrow text-[10px] text-muted " + (i === 2 ? "text-right" : "")
            }
          >
            {h}
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          className="grid items-center gap-3 px-4 py-2.5 border-b hairline last:border-b-0 hover:bg-paper/80 transition-colors"
          style={{ gridTemplateColumns: "2fr 1.5fr 110px 110px" }}
        >
          <div className="text-sm text-ink truncate font-medium">{r.name}</div>
          <div className="text-sm text-muted truncate mono">{r.project_name}</div>
          <div className="mono tnum text-ink text-sm text-right">
            {fmt(r.hours)}
          </div>
          <div className="mono tnum text-muted text-[12px]">
            {new Date(r.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
      <div className="px-4 py-2.5 text-right">
        <Link
          to="/quotes"
          className="text-sm text-teal hover:text-tealDark"
        >
          See all saved quotes →
        </Link>
      </div>
    </div>
  );
}
