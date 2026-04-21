export function AccuracyHeatmap({
  operations,
  quarters,
  matrix,
}: {
  operations: string[];
  quarters: string[];
  matrix: (number | null)[][];
}) {
  if (operations.length === 0 || quarters.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Accuracy heatmap populates once per-quarter training history is persisted.
      </div>
    );
  }

  const all = matrix.flat().filter((v): v is number => v != null);
  const max = all.length ? Math.max(...all) : 1;

  // Teal-tint ramp: low MAPE = light teal/paper, high MAPE = deep ink/danger.
  const color = (v: number | null): string => {
    if (v == null) return "#F6F4EF";
    const t = Math.min(1, v / Math.max(max, 1));
    const shades = ["#D7ECF1", "#A9D5DF", "#7ABDCC", "#1F8FA6", "#0D1B2A"];
    return shades[Math.min(shades.length - 1, Math.floor(t * shades.length))];
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b hairline bg-paper/60">
        <div className="eyebrow text-[10px] text-muted">MAPE · operation × quarter</div>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="text-xs">
          <thead>
            <tr>
              <th />
              {quarters.map((q) => (
                <th
                  key={q}
                  className="px-2 py-1 mono text-muted font-normal"
                >
                  {q}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {operations.map((op, r) => (
              <tr key={op}>
                <td className="pr-3 py-1 text-right mono text-[11px] text-muted whitespace-nowrap">
                  {op}
                </td>
                {matrix[r].map((v, c) => (
                  <td
                    key={c}
                    title={v == null ? "no data" : `${v.toFixed(1)}%`}
                    style={{ background: color(v) }}
                    className="w-12 h-7 border border-surface"
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted">
          <span>MAPE:</span>
          <div className="flex items-center gap-0">
            {["#D7ECF1", "#A9D5DF", "#7ABDCC", "#1F8FA6", "#0D1B2A"].map((c) => (
              <span
                key={c}
                aria-hidden="true"
                style={{ background: c }}
                className="w-5 h-3 border border-surface"
              />
            ))}
          </div>
          <span>low → high</span>
        </div>
      </div>
    </div>
  );
}
