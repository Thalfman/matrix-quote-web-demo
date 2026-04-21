import { useState } from "react";
import { OperationDrivers } from "@/api/types";

function formatSigned(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 0) return "0";
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function humanizeOp(op: string): string {
  return op
    .replace(/_hours$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DriversTab({ drivers }: { drivers: OperationDrivers[] | null | undefined }) {
  const [selected, setSelected] = useState<string>("__all__");

  if (!drivers || drivers.length === 0) {
    return (
      <div className="text-sm text-muted">
        Driver analysis is not available for this estimate.
      </div>
    );
  }

  const available = drivers.filter((d) => d.available);
  const displayed =
    selected === "__all__"
      ? _aggregateAll(available)
      : available.find((d) => d.operation === selected)?.drivers ?? [];

  const max = Math.max(1, ...displayed.map((d) => Math.abs(d.contribution)));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="eyebrow text-[10px] text-muted">Signed contribution</div>
          <div className="text-xs text-muted mt-0.5">vs. model baseline</div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs border hairline rounded-sm px-2 py-1 bg-surface">
          <span className="text-muted sr-only" id="op-label">Operation</span>
          <span className="text-muted" aria-hidden="true">Operation</span>
          <select
            aria-labelledby="op-label"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-transparent font-medium text-ink outline-none"
          >
            <option value="__all__">All</option>
            {available.map((d) => (
              <option key={d.operation} value={d.operation}>
                {humanizeOp(d.operation)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        {displayed.map((d, i) => {
          const pct = (Math.abs(d.contribution) / max) * 50;
          const isPositive = d.contribution > 0;
          const left = isPositive ? "50%" : `${50 - pct}%`;
          const color = isPositive ? "bg-amber" : "bg-teal";
          return (
            <div key={`${d.feature}-${i}`} className="flex items-center gap-2 text-sm">
              <div
                className="w-40 truncate text-ink"
                title={d.value ? `${d.feature}: ${d.value}` : d.feature}
              >
                {d.feature}
                {d.value && <span className="text-muted"> · {d.value}</span>}
              </div>
              <div className="mono tnum w-14 text-right text-ink text-[12px] font-medium">
                {formatSigned(d.contribution)}
              </div>
              <div className="flex-1 relative h-2.5 bg-line rounded-sm">
                <span
                  className="absolute top-0 bottom-0 w-px bg-muted2"
                  style={{ left: "50%" }}
                  aria-hidden="true"
                />
                <div
                  className={"absolute top-0 bottom-0 rounded-sm " + color}
                  style={{ left, width: `${pct}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div className="text-sm text-muted">No drivers to show.</div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t hairline flex items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-amber rounded-sm" aria-hidden="true" />
          Pushes hours up
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-teal rounded-sm" aria-hidden="true" />
          Pulls hours down
        </span>
      </div>

      {available.length < drivers.length && (
        <div className="mt-2 text-xs text-muted">
          Some operations did not return drivers for this quote.
        </div>
      )}
    </div>
  );
}

function _aggregateAll(ops: OperationDrivers[]) {
  const acc = new Map<string, { contribution: number; value: string }>();
  for (const op of ops) {
    for (const d of op.drivers) {
      const prev = acc.get(d.feature);
      if (prev) {
        prev.contribution += d.contribution;
      } else {
        acc.set(d.feature, { contribution: d.contribution, value: d.value });
      }
    }
  }
  return [...acc.entries()]
    .map(([feature, v]) => ({ feature, contribution: v.contribution, value: v.value }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 8);
}
