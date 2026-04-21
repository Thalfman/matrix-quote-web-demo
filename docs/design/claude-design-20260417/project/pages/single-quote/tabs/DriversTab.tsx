// frontend/src/pages/single-quote/tabs/DriversTab.tsx
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
      <div className="text-sm text-muted dark:text-muted-dark">
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-muted dark:text-muted-dark" htmlFor="op-select">Operation</label>
        <select
          id="op-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-md px-2 py-1 text-sm text-ink dark:text-ink-dark"
        >
          <option value="__all__">All</option>
          {available.map((d) => (
            <option key={d.operation} value={d.operation}>
              {humanizeOp(d.operation)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {displayed.map((d, i) => {
          const pct = (Math.abs(d.contribution) / max) * 50;
          const isPositive = d.contribution > 0;
          return (
            <div key={`${d.feature}-${i}`} className="flex items-center gap-2 text-sm">
              <div
                className="w-48 text-ink dark:text-ink-dark truncate"
                title={d.value ? `${d.feature}: ${d.value}` : d.feature}
              >
                {d.feature}
                {d.value && <span className="text-muted dark:text-muted-dark"> · {d.value}</span>}
              </div>
              <div className="numeric w-16 text-right text-ink dark:text-ink-dark">
                {formatSigned(d.contribution)} hrs
              </div>
              <div className="flex-1 relative h-2 bg-steel-100 dark:bg-steel-700/40 rounded-full">
                <span
                  className="absolute top-[-2px] bottom-[-2px] w-px bg-steel-400 dark:bg-steel-500"
                  style={{ left: "50%" }}
                  aria-hidden="true"
                />
                <div
                  className={"absolute top-0 h-2 " + (isPositive ? "bg-brand" : "bg-warning")}
                  style={{
                    left: isPositive ? "50%" : `${50 - pct}%`,
                    width: `${pct}%`,
                    borderTopRightRadius: isPositive ? 999 : 0,
                    borderBottomRightRadius: isPositive ? 999 : 0,
                    borderTopLeftRadius: !isPositive ? 999 : 0,
                    borderBottomLeftRadius: !isPositive ? 999 : 0,
                  }}
                />
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div className="text-sm text-muted dark:text-muted-dark">No drivers to show.</div>
        )}
      </div>

      {available.length < drivers.length && (
        <div className="text-xs text-muted dark:text-muted-dark">
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
