import { SavedQuote } from "@/api/types";

export function CompareDriversStrip({ quotes }: { quotes: SavedQuote[] }) {
  return (
    <div className="card overflow-hidden">
      <div
        className="grid divide-x hairline"
        style={{ gridTemplateColumns: `repeat(${quotes.length}, minmax(0, 1fr))` }}
      >
        {quotes.map((q, i) => (
          <div key={q.id} className="p-4 space-y-3">
            <div>
              <div
                className={
                  "eyebrow text-[10px] " + (i === 0 ? "text-amber" : "text-muted")
                }
              >
                {i === 0 ? "Anchor · top drivers" : "Top drivers"}
              </div>
              <div className="text-sm font-medium text-ink truncate mt-1">{q.name}</div>
            </div>
            <div className="text-sm text-muted">
              Driver attribution snapshots from quote time are not re-computed here; open the
              cockpit to see live drivers.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
