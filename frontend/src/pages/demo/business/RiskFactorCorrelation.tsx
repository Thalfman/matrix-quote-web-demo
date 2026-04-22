import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, DATA_LABEL, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import type { RiskCorrelationRow } from "./portfolioStats";

const fmtR = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: "exceptZero",
});

function RowTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: { payload?: RiskCorrelationRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16 };
  const labelStyle = { color: CHART_COLORS.muted };
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
      <div style={rowStyle}>
        <span style={labelStyle}>Correlation (r)</span>
        <span className="tnum">{fmtR.format(row.correlation)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Projects</span>
        <span className="tnum">{row.n}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Reading</span>
        <span>{row.meaning}</span>
      </div>
    </div>
  );
}

export function RiskFactorCorrelation({ data }: { data: RiskCorrelationRow[] }) {
  const hasData = data.length > 0 && data.some((r) => r.n >= 3);

  if (!hasData) {
    return (
      <div className="card p-4 sm:p-5 text-sm text-muted h-96 lg:h-[28rem] flex items-center justify-center text-center">
        Not enough projects with both risk-factor inputs and billed actuals to correlate.
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-5 h-96 lg:h-[28rem] flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="eyebrow text-xs text-muted">
          Risk factors vs. overrun % · Pearson r (ranked by strength)
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 4, bottom: 16 }}
          >
            <CartesianGrid {...GRID_STYLE} horizontal={false} />
            <YAxis
              dataKey="label"
              type="category"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              width={150}
            />
            <XAxis
              type="number"
              domain={[-1, 1]}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: number) => fmtR.format(v)}
            />
            <ReferenceLine x={0} stroke={CHART_COLORS.muted} />
            <Tooltip content={<RowTooltip />} cursor={TOOLTIP_CURSOR} />
            <Bar dataKey="correlation" radius={[0, 1, 1, 0]}>
              {data.map((row) => (
                <Cell
                  key={row.factor}
                  fill={row.correlation > 0 ? CHART_COLORS.danger : CHART_COLORS.success}
                  fillOpacity={row.n < 3 ? 0.25 : 0.9}
                />
              ))}
              <LabelList
                dataKey="correlation"
                position="right"
                formatter={(v: number) => fmtR.format(v)}
                style={DATA_LABEL}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[11px] text-muted mt-2 mono">
        Positive r = the factor goes up with overrun %. Negative r = it goes down.
        Values near 0 carry no signal.
      </div>
    </div>
  );
}
