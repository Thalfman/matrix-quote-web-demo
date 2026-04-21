import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "./chartTheme";

export function QuotesActivityChart({ rows }: { rows: [string, number][] }) {
  const data = rows.map(([week, count]) => ({ week, count }));
  const lastIndex = data.length - 1;

  return (
    <div className="card p-4 h-64">
      <div className="eyebrow text-[10px] text-muted mb-2">
        Quotes per week · last 26
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-muted">No quote activity yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis
              dataKey="week"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={TOOLTIP_CURSOR}
            />
            <Bar
              dataKey="count"
              radius={[1, 1, 0, 0]}
              fill={CHART_COLORS.ink}
              shape={(props: unknown) => {
                const p = props as {
                  x: number; y: number; width: number; height: number; index: number;
                };
                return (
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.width}
                    height={p.height}
                    fill={p.index === lastIndex ? CHART_COLORS.amber : CHART_COLORS.ink}
                    rx={1}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
