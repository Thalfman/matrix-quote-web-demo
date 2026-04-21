import { RankedRow } from "./portfolioStats";

/** Escape a cell value for CSV (quote if contains comma, quote, or newline). */
function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serialize RankedRow[] to a CSV string with a header row. */
export function toCsv(rows: RankedRow[]): string {
  const headers = [
    "project_id",
    "project_name",
    "industry",
    "system_category",
    "stations",
    "total_hours",
    "primary_bucket",
  ];

  const headerLine = headers.join(",");
  const dataLines = rows.map((r) =>
    [
      escapeCell(r.project_id),
      escapeCell(r.project_name),
      escapeCell(r.industry),
      escapeCell(r.system_category),
      escapeCell(r.stations),
      escapeCell(r.total_hours),
      escapeCell(r.primary_bucket),
    ].join(","),
  );

  return [headerLine, ...dataLines].join("\n");
}

/** Trigger a browser download of a CSV string. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
