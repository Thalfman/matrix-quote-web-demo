import { RankedRow } from "./portfolioStats";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const GRID_COLS = "2.2fr 1.4fr 1.4fr 72px 96px 100px";

const COLS: { label: string; align?: "right" }[] = [
  { label: "Project" },
  { label: "Industry" },
  { label: "System" },
  { label: "Stations", align: "right" },
  { label: "Total hours", align: "right" },
  { label: "Primary bucket" },
];

export function TopProjectsTable({ rows }: { rows: RankedRow[] }) {
  if (rows.length === 0) {
    return <div className="card p-6 text-sm text-muted">No projects to display.</div>;
  }

  return (
    <div
      className="card overflow-hidden"
      role="table"
      aria-label="Ranked projects by total p50 hours"
    >
      <div
        className="flex items-baseline justify-between px-5 py-3 bg-paper/60 border-b hairline"
      >
        <div className="eyebrow text-[10px] text-muted">Ranked by total p50 hours</div>
        <div className="text-[11px] text-muted mono tnum">{rows.length} projects</div>
      </div>

      {/* Header */}
      <div
        className="grid items-center gap-3 px-5 py-2.5 border-b hairline bg-paper/40"
        style={{ gridTemplateColumns: GRID_COLS }}
        role="row"
      >
        {COLS.map((col) => (
          <div
            key={col.label}
            role="columnheader"
            className={
              "eyebrow text-[10px] text-muted" + (col.align === "right" ? " text-right" : "")
            }
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((r, i) => (
        <div
          key={r.project_id || i}
          role="row"
          className="grid items-center gap-3 px-5 py-3 border-b hairline last:border-b-0 hover:bg-paper/80 transition-colors duration-150 ease-out"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div
            role="cell"
            className="text-sm text-ink truncate font-medium"
            title={r.project_name}
          >
            {r.project_name}
          </div>
          <div role="cell" className="text-sm text-muted truncate" title={r.industry}>
            {r.industry}
          </div>
          <div role="cell" className="text-sm text-muted truncate" title={r.system_category}>
            {r.system_category}
          </div>
          <div role="cell" className="mono tnum text-ink text-sm text-right">
            {r.stations}
          </div>
          <div role="cell" className="mono tnum text-ink text-sm text-right">
            {fmtHours.format(r.total_hours)}
          </div>
          <div
            role="cell"
            className="text-[11px] eyebrow text-muted truncate"
            title={r.primary_bucket}
          >
            {r.primary_bucket}
          </div>
        </div>
      ))}
    </div>
  );
}
