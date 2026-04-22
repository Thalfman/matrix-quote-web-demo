import {
  Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip,
} from "recharts";

import { AXIS_TICK, CHART_COLORS, TOOLTIP_STYLE } from "@/pages/insights/chartTheme";
import { CategoryRow } from "./portfolioStats";

type PieSliceLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  percent: number;
  name: string;
  value: number;
};

function renderSliceLabel(props: unknown) {
  const p = props as Partial<PieSliceLabelProps>;
  if (
    p.cx == null || p.cy == null || p.midAngle == null ||
    p.outerRadius == null || p.percent == null ||
    p.name == null || p.value == null
  ) {
    return null;
  }
  if (p.percent < 0.05) return null;
  const RAD = Math.PI / 180;
  const r = p.outerRadius + 14;
  const x = p.cx + r * Math.cos(-p.midAngle * RAD);
  const y = p.cy + r * Math.sin(-p.midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill={CHART_COLORS.ink}
      fontSize={11}
      fontFamily={AXIS_TICK.fontFamily}
      textAnchor={x > p.cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {p.name}: {p.value}
    </text>
  );
}

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

type Props = {
  data: CategoryRow[];
  selectedCategories?: Set<string>;
  onCategoryClick?: (name: string) => void;
};

export function SystemCategoryMix({ data, selectedCategories, onCategoryClick }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const hasSelection = selectedCategories && selectedCategories.size > 0;

  return (
    <div className="card p-4 sm:p-5 h-80 lg:h-96 flex flex-col">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="eyebrow text-xs text-muted">
          Share of projects · by system type
        </div>
        {onCategoryClick && (
          <div className="text-xs eyebrow text-muted">
            Click slice to filter
          </div>
        )}
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-muted">No data available.</div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                cx="40%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                label={renderSliceLabel}
                labelLine={false}
                onClick={
                  onCategoryClick
                    ? (entry: { category?: string }) => {
                        if (entry.category) onCategoryClick(entry.category);
                      }
                    : undefined
                }
                style={onCategoryClick ? { cursor: "pointer" } : undefined}
              >
                {data.map((entry, i) => {
                  const isSelected = hasSelection && selectedCategories!.has(entry.category);
                  const opacity = hasSelection && !isSelected ? 0.4 : 1;
                  return (
                    <Cell
                      key={entry.category}
                      fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                      opacity={opacity}
                      stroke={isSelected ? CHART_COLORS.paper : "none"}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} />
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
        </div>
      )}
    </div>
  );
}
