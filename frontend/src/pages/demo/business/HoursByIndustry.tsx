import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import { IndustryRow } from "./portfolioStats";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

type TooltipPayloadEntry = {
  payload?: IndustryRow;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div>Avg hours: {fmtHours.format(row?.avgHours ?? 0)}</div>
      <div>Projects: {row?.projectCount ?? 0}</div>
      <div>Total hours: {fmtHours.format(row?.totalHours ?? 0)}</div>
    </div>
  );
}

export function HoursByIndustry({ data }: { data: IndustryRow[] }) {
  return (
    <div className="card p-4 h-80">
      <div className="eyebrow text-[10px] text-muted mb-2">
        Average hours per project · by industry
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-muted">No data available.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 32 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis
              dataKey="industry"
              tick={(props: { x: number; y: number; payload: { value: string } }) => (
                <text
                  x={props.x}
                  y={props.y + 8}
                  textAnchor="end"
                  transform={`rotate(-30, ${props.x}, ${props.y + 8})`}
                  fontSize={AXIS_TICK.fontSize}
                  fill={AXIS_TICK.fill}
                  fontFamily={AXIS_TICK.fontFamily}
                >
                  {props.payload.value}
                </text>
              )}
              axisLine={AXIS_LINE}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: number) => fmtHours.format(v)}
            />
            <Tooltip content={<CustomTooltip />} cursor={TOOLTIP_CURSOR} />
            <Bar dataKey="avgHours" fill={CHART_COLORS.ink} radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
