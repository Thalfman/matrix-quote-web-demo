import { useState, useMemo, KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsNarrow } from "@/lib/useMediaQuery";
import { RankedRow } from "./portfolioStats";
import { toCsv, downloadCsv } from "./csv";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const GRID_COLS = "2.2fr 1.4fr 1.4fr 72px 96px 100px";

type SortKey = "project_name" | "industry" | "stations" | "total_hours";
type SortDir = "asc" | "desc";

type ColDef = {
  label: string;
  align?: "right";
  sortKey?: SortKey;
};

const COLS: ColDef[] = [
  { label: "Project", sortKey: "project_name" },
  { label: "Industry", sortKey: "industry" },
  { label: "System" },
  { label: "Stations", align: "right", sortKey: "stations" },
  { label: "Total hours", align: "right", sortKey: "total_hours" },
  { label: "Primary bucket" },
];

type Props = {
  rows: RankedRow[];
  search?: string;
  onSearchChange?: (s: string) => void;
  onRowClick?: (row: RankedRow) => void;
};

export function TopProjectsTable({
  rows,
  search: externalSearch,
  onSearchChange,
  onRowClick,
}: Props) {
  const [internalSearch, setInternalSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_hours");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const isNarrow = useIsNarrow();

  const search = externalSearch ?? internalSearch;

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.project_name.toLowerCase().includes(q) ||
        r.industry.toLowerCase().includes(q) ||
        r.system_category.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? "");
      const bStr = String(bVal ?? "");
      const cmp = aStr.localeCompare(bStr);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearch(value);
    }
  };

  const handleExportCsv = () => {
    const csv = toCsv(sorted);
    downloadCsv(csv, "business-insights-projects.csv");
  };

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>, row: RankedRow) => {
    if (onRowClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onRowClick(row);
    }
  };

  if (rows.length === 0) {
    return <div className="card p-6 text-sm text-muted">No projects to display.</div>;
  }

  return (
    <div
      className="card overflow-hidden"
      role="table"
      aria-label="Ranked projects by total hours"
    >
      {/* Table header strip */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-paper/60 border-b hairline flex-wrap gap-y-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="eyebrow text-xs text-muted">Ranked by total hours</div>
          <div className="text-sm text-muted mono tnum">
            {sorted.length === rows.length
              ? `${rows.length} projects`
              : `${sorted.length} of ${rows.length} projects`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={12}
              strokeWidth={1.75}
              aria-hidden="true"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={cn(
                "text-sm pl-7 pr-2.5 py-1.5 rounded-sm border hairline bg-surface",
                "placeholder:text-muted text-ink w-36",
                "focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-0 focus:border-teal",
                "transition-colors duration-150",
              )}
              aria-label="Search projects"
            />
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm eyebrow px-2.5 py-1.5 rounded-sm",
              "border hairline bg-surface text-muted hover:text-ink hover:bg-paper",
              "transition-colors duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
            )}
            title="Export filtered rows as CSV"
          >
            <Download size={12} strokeWidth={1.75} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Column headers - hidden on narrow screens where rows render as stacked cards */}
      {!isNarrow && (
      <div
        className="grid items-center gap-3 px-5 py-2.5 border-b hairline bg-paper/40"
        style={{ gridTemplateColumns: GRID_COLS }}
        role="row"
      >
        {COLS.map((col) => {
          const isActive = col.sortKey && sortKey === col.sortKey;
          const isSortable = !!col.sortKey;
          return (
            <div
              key={col.label}
              role="columnheader"
              className={cn(
                "eyebrow text-xs select-none",
                col.align === "right" ? "text-right" : "",
                isActive ? "text-ink" : "text-muted",
                isSortable
                  ? "cursor-pointer hover:text-ink transition-colors duration-150 rounded-sm"
                  : "",
                isSortable
                  ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  : "",
              )}
              onClick={isSortable ? () => handleSort(col.sortKey!) : undefined}
              onKeyDown={
                isSortable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSort(col.sortKey!);
                      }
                    }
                  : undefined
              }
              tabIndex={isSortable ? 0 : undefined}
              aria-sort={
                isSortable
                  ? sortKey === col.sortKey
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined
              }
            >
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  col.align === "right" ? "flex-row-reverse" : "",
                )}
              >
                {col.label}
                {isSortable && (
                  <span
                    aria-hidden="true"
                    className={isActive ? "text-teal" : "text-muted"}
                  >
                    {isActive ? (
                      sortDir === "asc" ? (
                        <ArrowUp size={10} strokeWidth={2} />
                      ) : (
                        <ArrowDown size={10} strokeWidth={2} />
                      )
                    ) : (
                      <ArrowUpDown size={10} strokeWidth={1.75} />
                    )}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      )}

      {/* Rows */}
      {sorted.length === 0 ? (
        <div className="px-5 py-8 text-sm text-muted text-center">
          No projects match the current filters.
        </div>
      ) : (
        sorted.map((r, i) => {
          const rowBase = cn(
            "border-b hairline last:border-b-0",
            "transition-colors duration-150 ease-out",
            onRowClick
              ? "cursor-pointer hover:bg-tealSoft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal"
              : "hover:bg-paper/80",
          );
          const outlierChip = r.outlierDirection && (
            <span
              className={cn(
                "shrink-0 text-[9px] eyebrow tracking-normal normal-case px-1.5 py-0.5 rounded-sm mono",
                r.outlierDirection === "high"
                  ? "bg-danger/10 text-danger"
                  : "bg-success/10 text-success",
              )}
              title={
                r.outlierDirection === "high"
                  ? "Outlier: above peer hours for its complexity tier"
                  : "Outlier: below peer hours for its complexity tier"
              }
              aria-label={r.outlierDirection === "high" ? "High outlier" : "Low outlier"}
            >
              {r.outlierDirection === "high" ? "HIGH" : "LOW"}
            </span>
          );
          return (
            <div
              key={r.project_id || i}
              role={onRowClick ? "button" : "row"}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => handleRowKeyDown(e, r) : undefined}
              className={rowBase}
            >
              {isNarrow ? (
                <div className="px-4 py-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-sm text-ink font-medium truncate"
                      title={r.project_name}
                    >
                      {r.project_name}
                    </span>
                    {outlierChip}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {r.industry}
                    {r.system_category && (
                      <>
                        <span className="mx-1.5 opacity-50">·</span>
                        {r.system_category}
                      </>
                    )}
                  </div>
                  <div className="flex items-baseline flex-wrap gap-x-4 gap-y-0.5 text-xs mono tnum text-muted mt-0.5">
                    <span>
                      <span className="text-muted">Hours </span>
                      <span className="text-ink">{fmtHours.format(r.total_hours)}</span>
                    </span>
                    <span>
                      <span className="text-muted">Stations </span>
                      <span className="text-ink">{r.stations}</span>
                    </span>
                    <span className="eyebrow text-[10px] text-muted tracking-normal normal-case">
                      {r.primary_bucket}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="grid items-center gap-3 px-5 py-3"
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  <div
                    role="cell"
                    className="text-sm text-ink truncate font-medium flex items-center gap-2 min-w-0"
                    title={r.project_name}
                  >
                    <span className="truncate">{r.project_name}</span>
                    {outlierChip}
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
                    className="text-xs eyebrow text-muted truncate"
                    title={r.primary_bucket}
                  >
                    {r.primary_bucket}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
