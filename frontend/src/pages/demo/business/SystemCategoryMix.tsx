import {
  Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip,
} from "recharts";

import { AXIS_TICK, CHART_COLORS, TOOLTIP_STYLE } from "@/pages/insights/chartTheme";
import { CategoryRow } from "./portfolioStats";

const SLICE_COLORS = [
  CHART_COLORS.ink,
  CHART_COLORS.amber,
  CHART_COLORS.teal,
  CHART_COLORS.tealDark,
  CHART_COLORS.ink2,
  CHART_COLORS.muted,
];

type TooltipPayloadEntry = {
  name?: string;
  value?: number;
  payload?: { category: string; count: number; total: number };
};

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const count = entry?.value ?? 0;
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{entry?.name}</div>
      <div>Count: {count}</div>
      <div>Share: {pct}%</div>
    </div>
  );
}

export function SystemCategoryMix({ data }: { data: CategoryRow[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="card p-4 h-80">
      <div className="eyebrow text-[10px] text-muted mb-2">
        Share of projects · by system type
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-muted">No data available.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="category"
              cx="40%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.category}
                  fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip total={total} />}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span
                  style={{
                    fontSize: AXIS_TICK.fontSize,
                    fontFamily: AXIS_TICK.fontFamily,
                    color: CHART_COLORS.muted,
                  }}
                >
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
