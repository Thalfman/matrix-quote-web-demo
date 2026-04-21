import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MetricRow } from "@/api/types";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "../insights/chartTheme";

export function MapeByOperation({ rows }: { rows: MetricRow[] }) {
  const anyMape = rows.some((r) => r.mape != null);
  const data = rows
    .map((r) => ({
      op: r.target.replace(/_hours$/, ""),
      mape: anyMape ? r.mape ?? 0 : r.mae ?? 0,
    }))
    .sort((a, b) => b.mape - a.mape);

  if (data.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        No training metrics yet. Once the models are trained, per-operation accuracy appears here.
      </div>
    );
  }

  return (
    <div className="card p-4 h-72">
      <div className="eyebrow text-[10px] text-muted mb-2">
        {anyMape ? "MAPE · by operation" : "MAE · by operation (hours)"}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="op"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} />
          <Bar dataKey="mape" fill={CHART_COLORS.ink} radius={[1, 1, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
