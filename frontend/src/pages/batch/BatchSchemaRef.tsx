import { BATCH_SCHEMA } from "./fixtures";

export function BatchSchemaRef() {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b hairline bg-paper/60 flex items-baseline justify-between">
        <div className="eyebrow text-[11px] text-ink">Schema reference</div>
        <div className="text-[11px] text-muted mono">
          {BATCH_SCHEMA.length} fields · {BATCH_SCHEMA.filter((s) => s.required).length} required
        </div>
      </div>
      <div
        className="divide-y hairline"
        role="table"
        aria-label="Schema reference"
      >
        {BATCH_SCHEMA.map((row) => (
          <div
            key={row.field}
            role="row"
            className="grid items-center px-4 py-2"
            style={{ gridTemplateColumns: "1.4fr 1fr 70px" }}
          >
            <div role="cell" className="mono text-[12px] text-ink truncate">{row.field}</div>
            <div role="cell" className="text-[12px] text-muted truncate">{row.type}</div>
            <div
              role="cell"
              className={
                "eyebrow text-[9px] text-right " +
                (row.required ? "text-danger" : "text-muted2")
              }
            >
              {row.required ? "Required" : "Optional"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
