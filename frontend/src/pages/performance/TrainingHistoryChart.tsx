import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { TrainingRunRow } from "@/api/types";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "../insights/chartTheme";

export function TrainingHistoryChart({ rows }: { rows: TrainingRunRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Training history isn't persisted yet. Once each training run writes a snapshot, this
        chart shows MAPE over time.
      </div>
    );
  }
  const data = rows.map((r) => ({
    date: new Date(r.trained_at).toLocaleDateString(),
    mape: r.overall_mape,
    rows: r.rows,
  }));

  return (
    <div className="card p-4 h-72">
      <div className="eyebrow text-[10px] text-muted mb-2">MAPE · over time</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="date"
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
          <Line
            dataKey="mape"
            stroke={CHART_COLORS.teal}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLORS.teal, stroke: CHART_COLORS.teal }}
            activeDot={{ r: 5, fill: CHART_COLORS.amber, stroke: CHART_COLORS.amber }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
