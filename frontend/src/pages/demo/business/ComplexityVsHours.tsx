import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";

import { Tooltip, TooltipProvider, GlossaryHelpIcon } from "@/components/Tooltip";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, DATA_LABEL, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import { bucketByComplexity, type LevelRow } from "./complexityBuckets";
import { ScatterPoint } from "./portfolioStats";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

type TooltipPayloadEntry = { payload?: LevelRow };

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16 };
  const labelStyle = { color: CHART_COLORS.muted };
  return (
    <div style={{ ...TOOLTIP_STYLE, maxWidth: 280 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Complexity {row.level}</div>
      <div style={rowStyle}>
        <span style={labelStyle}>Projects</span>
        <span className="tnum">{row.count}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Avg hours</span>
        <span className="tnum">{fmtHours.format(row.avg)}</span>
      </div>
      {row.count > 0 && (
        <div style={rowStyle}>
          <span style={labelStyle}>Range</span>
          <span className="tnum">
            {fmtHours.format(row.min)}–{fmtHours.format(row.max)}
          </span>
        </div>
      )}
      {row.topProjects.length > 0 && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${CHART_COLORS.line}` }}>
          <div style={{ ...labelStyle, marginBottom: 2, fontSize: 11 }}>Projects in this bucket</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {row.topProjects.map((p) => (
              <li
                key={p.projectId || p.projectName}
                style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 180,
                  }}
                >
                  {p.projectName}
                </span>
                <span className="tnum" style={{ color: CHART_COLORS.muted }}>
                  {fmtHours.format(p.hours)}
                </span>
              </li>
            ))}
            {row.overflow > 0 && (
              <li style={{ fontSize: 11, color: CHART_COLORS.muted, marginTop: 2 }}>
                +{row.overflow} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

type Props = {
  data: ScatterPoint[];
};

export function ComplexityVsHours({ data }: Props) {
  const rows = bucketByComplexity(data);
  const hasAny = rows.some((r) => r.count > 0);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="card p-4 sm:p-5 h-80 lg:h-96 flex flex-col">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <div className="eyebrow text-xs text-muted flex items-center gap-1">
            <span>Average hours per complexity level</span>
            <Tooltip term="Complexity (1–5)" side="bottom">
              <GlossaryHelpIcon ariaLabel="What is Complexity (1–5)?" />
            </Tooltip>
          </div>
          <div className="text-xs text-muted mono tnum">{data.length} projects</div>
        </div>
        {!hasAny ? (
          <div className="text-sm text-muted">No data available.</div>
        ) : (
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 16, right: 16, left: -4, bottom: 28 }}>
                <CartesianGrid {...GRID_STYLE} vertical={false} />
                <XAxis
                  dataKey="level"
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  label={{
                    value: "Complexity (1–5)",
                    position: "insideBottom",
                    offset: -4,
                    style: {
                      fontSize: 11,
                      fill: CHART_COLORS.muted,
                      fontFamily: AXIS_TICK.fontFamily,
                    },
                  }}
                />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  tickFormatter={(v: number) => fmtHours.format(v)}
                  label={{
                    value: "Avg hours",
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
                <RechartsTooltip content={<CustomTooltip />} cursor={TOOLTIP_CURSOR} />
                <Bar dataKey="avg" fill={CHART_COLORS.teal} radius={[1, 1, 0, 0]}>
                  <LabelList
                    dataKey="avg"
                    position="top"
                    formatter={(v: number) => (v > 0 ? fmtHours.format(v) : "")}
                    style={DATA_LABEL}
                  />
                  <LabelList
                    dataKey="count"
                    position="insideBottom"
                    formatter={(v: number) => (v > 0 ? `n=${v}` : "")}
                    style={{
                      fontSize: 10,
                      fill: "#FFFFFF",
                      fontFamily: AXIS_TICK.fontFamily,
                    }}
                    offset={6}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
