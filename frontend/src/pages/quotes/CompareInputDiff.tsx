import { SavedQuote } from "@/api/types";

export function CompareInputDiff({ quotes }: { quotes: SavedQuote[] }) {
  const keys = new Set<string>();
  for (const q of quotes) Object.keys(q.inputs).forEach((k) => keys.add(k));

  const diffRows: { field: string; values: string[] }[] = [];
  for (const k of keys) {
    const values = quotes.map((q) => String((q.inputs as Record<string, unknown>)[k] ?? ""));
    if (new Set(values).size > 1) diffRows.push({ field: k, values });
  }

  if (diffRows.length === 0) {
    return (
      <div className="card p-5 text-sm text-muted">
        These scenarios have identical inputs.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div
        className="grid items-center gap-x-4 px-4 py-2 bg-paper/60 border-b hairline"
        style={{
          gridTemplateColumns: `160px repeat(${quotes.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="eyebrow text-[10px] text-muted">Field</div>
        {quotes.map((q, i) => (
          <div
            key={q.id}
            className={
              "eyebrow text-[10px] text-muted " +
              (i === 0 ? "border-l-2 border-l-amber pl-3" : "pl-3")
            }
          >
            {q.name}
          </div>
        ))}
      </div>
      {diffRows.map(({ field, values }) => {
        const anchor = values[0];
        return (
          <div
            key={field}
            className="grid items-center gap-x-4 px-4 py-2.5 border-b hairline last:border-b-0"
            style={{
              gridTemplateColumns: `160px repeat(${quotes.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="mono text-[12px] text-muted truncate">{field}</div>
            {values.map((v, i) => {
              const changed = i > 0 && v !== anchor;
              return (
                <div
                  key={`${field}-${i}`}
                  className={
                    "text-sm truncate " +
                    (i === 0
                      ? "text-ink font-medium border-l-2 border-l-amber pl-3"
                      : changed
                        ? "text-amber font-medium pl-3"
                        : "text-ink pl-3")
                  }
                >
                  {v || "—"}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="px-4 py-2 bg-paper/40 text-[11px] text-muted border-t hairline">
        {diffRows.length} of {keys.size} inputs differ · anchor values highlighted along the left
        amber bar
      </div>
    </div>
  );
}
