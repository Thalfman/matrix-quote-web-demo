import { Download, Copy, Trash2, MoreVertical } from "lucide-react";

import { SavedQuoteSummary } from "@/api/types";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function confidenceDots(row: SavedQuoteSummary): number {
  if (row.hours <= 0) return 1;
  const rel = (row.range_high - row.range_low) / row.hours;
  if (rel <= 0.10) return 5;
  if (rel <= 0.20) return 4;
  if (rel <= 0.35) return 3;
  if (rel <= 0.55) return 2;
  return 1;
}

type Props = {
  rows: SavedQuoteSummary[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onRowAction: (id: string, action: "duplicate" | "delete" | "pdf" | "open") => void;
};

export function QuotesTable({ rows, selected, onToggle, onRowAction }: Props) {
  return (
    <div className="card overflow-hidden">
      <div
        className="grid items-center gap-3 px-4 py-2.5 bg-paper/60 border-b hairline"
        style={{ gridTemplateColumns: "32px 2fr 1.5fr 100px 140px 120px 110px 40px" }}
      >
        {[
          "", "Project", "Industry", "Hours", "Range", "Confidence", "Saved", "",
        ].map((h, i) => (
          <div key={i} className="eyebrow text-[10px] text-muted">{h}</div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted">No saved quotes yet.</div>
      ) : (
        rows.map((r) => {
          const dots = confidenceDots(r);
          const isSel = selected.has(r.id);
          return (
            <div
              key={r.id}
              className={
                "grid items-center gap-3 px-4 py-3 border-b hairline last:border-b-0 group transition-colors " +
                (isSel ? "bg-tealSoft/40" : "hover:bg-paper/80")
              }
              style={{ gridTemplateColumns: "32px 2fr 1.5fr 100px 140px 120px 110px 40px" }}
            >
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => onToggle(r.id)}
                aria-label={`Select ${r.name}`}
                className="accent-teal"
              />
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onRowAction(r.id, "open")}
                  className="font-medium text-ink hover:underline truncate text-left block w-full"
                >
                  {r.name}
                </button>
                <div className="text-[11px] text-muted truncate mono">{r.project_name}</div>
              </div>
              <div className="text-[12px] text-muted mono truncate">{r.industry_segment}</div>
              <div className="mono tnum text-ink text-sm font-medium text-right">
                {formatHours(r.hours)}
              </div>
              <div className="mono tnum text-muted text-[12px]">
                {formatHours(r.range_low)}–{formatHours(r.range_high)}
              </div>
              <div
                className="flex items-center gap-1"
                aria-label={`Confidence ${dots} of 5`}
                title={`Confidence ${dots} of 5`}
              >
                {[1, 2, 3, 4, 5].map((k) => (
                  <span
                    key={k}
                    className={
                      "w-1.5 h-1.5 rounded-full " +
                      (k <= dots ? "bg-amber" : "bg-line2")
                    }
                  />
                ))}
              </div>
              <div className="mono tnum text-muted text-[11px]">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
              <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                <details className="relative">
                  <summary className="list-none cursor-pointer inline-flex items-center justify-center w-6 h-6 rounded-sm hover:bg-line">
                    <MoreVertical size={14} strokeWidth={1.75} className="text-muted" />
                  </summary>
                  <div className="absolute right-0 top-7 z-10 w-40 card shadow-md text-sm">
                    <button
                      type="button"
                      onClick={() => onRowAction(r.id, "duplicate")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-paper"
                    >
                      <Copy size={14} strokeWidth={1.75} /> Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => onRowAction(r.id, "pdf")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-paper"
                    >
                      <Download size={14} strokeWidth={1.75} /> Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onRowAction(r.id, "delete")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-paper text-danger"
                    >
                      <Trash2 size={14} strokeWidth={1.75} /> Delete
                    </button>
                  </div>
                </details>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
