import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";

import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import { ScatterPoint } from "./portfolioStats";

const DOT_PALETTE = [
  CHART_COLORS.teal,
  CHART_COLORS.amber,
  CHART_COLORS.ink,
  CHART_COLORS.tealDark,
  CHART_COLORS.muted,
  CHART_COLORS.ink2,
];

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

type TooltipPayloadEntry = {
  payload?: ScatterPoint;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16 };
  const labelStyle = { color: CHART_COLORS.muted };
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{pt.name}</div>
      <div style={rowStyle}>
        <span style={labelStyle}>Industry</span>
        <span>{pt.industry}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Complexity</span>
        <span className="tnum">{pt.complexity.toFixed(1)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Stations</span>
        <span className="tnum">{pt.stations}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Hours</span>
        <span className="tnum">{fmtHours.format(pt.hours)}</span>
      </div>
    </div>
  );
}

export function ComplexityVsHours({ data }: { data: ScatterPoint[] }) {
  // Build a color map keyed by unique industries
  const uniqueIndustries = Array.from(new Set(data.map((d) => d.industry)));
  const colorMap: Record<string, string> = {};
  uniqueIndustries.forEach((ind, i) => {
    colorMap[ind] = DOT_PALETTE[i % DOT_PALETTE.length];
  });

  // Group data by industry for separate Scatter series (to get per-industry colors)
  const byIndustry: Record<string, ScatterPoint[]> = {};
  for (const pt of data) {
    if (!byIndustry[pt.industry]) byIndustry[pt.industry] = [];
    byIndustry[pt.industry].push(pt);
  }

  return (
    <div className="card p-4 h-80 flex flex-col">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="eyebrow text-[10px] text-muted">
          One dot per project · color = industry
        </div>
        <div className="text-[10px] text-muted mono">
          {data.length} projects
        </div>
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-muted">No data available.</div>
      ) : (
        <>
          {/* Custom compact legend so the chart keeps its full plot area */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
            {uniqueIndustries.map((industry) => (
              <span
                key={industry}
                className="inline-flex items-center gap-1.5 text-[10px] text-muted"
                style={{ fontFamily: AXIS_TICK.fontFamily }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    backgroundColor: colorMap[industry],
                  }}
                />
                {industry}
              </span>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 4, right: 8, left: -8, bottom: 16 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  dataKey="complexity"
                  type="number"
                  name="Complexity"
                  domain={[0, 5.5]}
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  label={{
                    value: "Complexity (1–5)",
                    position: "insideBottom",
                    offset: -4,
                    style: {
                      fontSize: 10,
                      fill: CHART_COLORS.muted,
                      fontFamily: AXIS_TICK.fontFamily,
                    },
                  }}
                />
                <YAxis
                  dataKey="hours"
                  type="number"
                  name="Hours"
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  tickFormatter={(v: number) => fmtHours.format(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                {Object.entries(byIndustry).map(([industry, pts]) => (
                  <Scatter
                    key={industry}
                    name={industry}
                    data={pts}
                    fill={colorMap[industry]}
                    opacity={0.85}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
