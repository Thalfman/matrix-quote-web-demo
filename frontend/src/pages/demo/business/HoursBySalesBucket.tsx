import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import { BucketRow } from "./portfolioStats";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function HoursBySalesBucket({ data }: { data: BucketRow[] }) {
  return (
    <div className="card p-4 h-80">
      <div className="eyebrow text-[10px] text-muted mb-2">
        Total p50 hours · all 24 projects
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-muted">No data available.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid {...GRID_STYLE} horizontal={false} />
            <YAxis
              dataKey="bucket"
              type="category"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              width={64}
            />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: number) => fmtHours.format(v)}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={TOOLTIP_CURSOR}
              formatter={(v: number) => [fmtHours.format(v), "Hours"]}
            />
            <Bar dataKey="hours" fill={CHART_COLORS.teal} radius={[0, 1, 1, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
