import { useMemo } from "react";
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";

import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import type { MaterialLaborPoint } from "./portfolioStats";

const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const fmtCurrencyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtCostPerHour = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function CustomTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: { payload?: MaterialLaborPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16 };
  const labelStyle = { color: CHART_COLORS.muted };
  const costPerHour = row.hours > 0 ? row.materialCost / row.hours : 0;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{row.project_name}</div>
      <div style={rowStyle}>
        <span style={labelStyle}>Industry</span>
        <span>{row.industry}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Material cost</span>
        <span className="tnum">{fmtCurrencyFull.format(row.materialCost)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Labor hours</span>
        <span className="tnum">{fmtHours.format(row.hours)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>$ / hour</span>
        <span className="tnum">{fmtCostPerHour.format(costPerHour)}</span>
      </div>
    </div>
  );
}

export function MaterialVsLabor({ data }: { data: MaterialLaborPoint[] }) {
  // Assign each industry a color from a small palette so the scatter reads by segment.
  const industryColor = useMemo(() => {
    const palette = [
      CHART_COLORS.teal,
      CHART_COLORS.amber,
      CHART_COLORS.success,
      CHART_COLORS.danger,
      CHART_COLORS.ink,
      CHART_COLORS.muted,
      CHART_COLORS.tealDark,
      CHART_COLORS.ink2,
    ];
    const assign: Record<string, string> = {};
    let i = 0;
    for (const p of data) {
      if (assign[p.industry] === undefined) {
        assign[p.industry] = palette[i % palette.length];
        i += 1;
      }
    }
    return assign;
  }, [data]);

  const byIndustry = useMemo(() => {
    const g: Record<string, MaterialLaborPoint[]> = {};
    for (const p of data) {
      if (!g[p.industry]) g[p.industry] = [];
      g[p.industry].push(p);
    }
    return g;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="card p-5 text-sm text-muted h-80 flex items-center justify-center text-center">
        No projects with both material cost and labor hours in the current view.
      </div>
    );
  }

  const stationSizes = data.map((p) => Math.max(p.stations, 1));
  const zMin = Math.min(...stationSizes);
  const zMax = Math.max(...stationSizes);

  return (
    <div className="card p-5 h-96 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="eyebrow text-xs text-muted">
          Material cost vs labor hours · sized by stations, colored by industry
        </div>
        <div className="text-xs text-muted mono tnum">{data.length} projects</div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 16, left: 16, bottom: 48 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              type="number"
              dataKey="materialCost"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: number) => fmtCurrency.format(v)}
              label={{
                value: "Material cost (USD)",
                position: "insideBottom",
                offset: -8,
                style: {
                  fontSize: 11,
                  fill: CHART_COLORS.muted,
                  fontFamily: AXIS_TICK.fontFamily,
                },
              }}
            />
            <YAxis
              type="number"
              dataKey="hours"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: number) => fmtHours.format(v)}
              label={{
                value: "Labor hours",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                style: {
                  fontSize: 11,
                  fill: CHART_COLORS.muted,
                  fontFamily: AXIS_TICK.fontFamily,
                },
              }}
            />
            <ZAxis
              type="number"
              dataKey="stations"
              range={[36, 160]}
              domain={[Math.max(zMin, 1), Math.max(zMax, zMin + 1)]}
            />
            <Tooltip content={<CustomTooltip />} cursor={TOOLTIP_CURSOR} />
            {Object.entries(byIndustry).map(([industry, points]) => (
              <Scatter
                key={industry}
                name={industry}
                data={points}
                fill={industryColor[industry] ?? CHART_COLORS.teal}
                fillOpacity={0.75}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {/* Custom compact legend — one swatch per industry, mono-spaced, wrap */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] mono text-muted">
        {Object.keys(byIndustry).map((industry) => (
          <div key={industry} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block w-2 h-2 rounded-sm"
              style={{ backgroundColor: industryColor[industry] ?? CHART_COLORS.teal }}
            />
            <span>{industry}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
