import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";

import { Tooltip, TooltipProvider, GlossaryHelpIcon } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import { useIsNarrow } from "@/lib/useMediaQuery";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, DATA_LABEL, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import { IndustryRow } from "./portfolioStats";

function truncateLabel(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

type Metric = "total" | "avg";

type TooltipPayloadEntry = {
  payload?: IndustryRow;
};

function CustomTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {metric === "avg" ? (
        <>
          <div>Avg hours: {fmtHours.format(row?.avgHours ?? 0)}</div>
          <div>Projects: {row?.projectCount ?? 0}</div>
        </>
      ) : (
        <>
          <div>Total hours: {fmtHours.format(row?.totalHours ?? 0)}</div>
          <div>Projects: {row?.projectCount ?? 0}</div>
        </>
      )}
    </div>
  );
}

type Props = {
  data: IndustryRow[];
  selectedIndustries?: Set<string>;
  onIndustryClick?: (name: string) => void;
};

export function HoursByIndustry({
  data,
  selectedIndustries,
  onIndustryClick,
}: Props) {
  const [metric, setMetric] = useState<Metric>("avg");
  const isNarrow = useIsNarrow();

  const hasSelection = selectedIndustries && selectedIndustries.size > 0;

  const getBarColor = (industry: string) => {
    if (!hasSelection) return CHART_COLORS.ink;
    return selectedIndustries!.has(industry) ? CHART_COLORS.teal : CHART_COLORS.ink;
  };

  const chartData = data.map((d) => ({
    ...d,
    value: metric === "avg" ? d.avgHours : d.totalHours,
  }));

  return (
    <TooltipProvider delayDuration={200}>
    <div className="card p-4 sm:p-5 h-80 lg:h-96 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="eyebrow text-xs text-muted flex items-center gap-1">
          <span>
            {metric === "avg"
              ? "Average hours per project · by industry"
              : "Total hours · by industry"}
          </span>
          <Tooltip term="Industry Segment" side="bottom">
            <GlossaryHelpIcon ariaLabel="What is Industry Segment?" />
          </Tooltip>
        </div>
        <div
          className="inline-flex rounded-sm border hairline bg-surface p-0.5 gap-0.5"
          role="group"
          aria-label="Hours metric"
        >
          {(["avg", "total"] as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={cn(
                "text-xs eyebrow px-2 py-1 rounded-sm transition-colors duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal",
                metric === m
                  ? "bg-ink text-white"
                  : "text-muted hover:text-ink",
              )}
              aria-pressed={metric === m}
            >
              {m === "avg" ? "Avg" : "Total"}
            </button>
          ))}
        </div>
      </div>
      {onIndustryClick && (
        <div className="text-xs eyebrow text-muted mb-1">
          {hasSelection
            ? "Selected shown in teal · click to toggle"
            : "Click a bar to filter"}
        </div>
      )}
      {data.length === 0 ? (
        <div className="text-sm text-muted">No data available.</div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 4,
                right: 8,
                left: -8,
                bottom: isNarrow ? 56 : 32,
              }}
              onClick={
                onIndustryClick
                  ? (e) => {
                      const name = e?.activeLabel;
                      if (name) onIndustryClick(String(name));
                    }
                  : undefined
              }
            >
              <CartesianGrid {...GRID_STYLE} vertical={false} />
              <XAxis
                dataKey="industry"
                tick={(props: { x: number; y: number; payload: { value: string } }) => (
                  <text
                    x={props.x}
                    y={props.y + 8}
                    textAnchor="end"
                    transform={`rotate(${isNarrow ? -45 : -30}, ${props.x}, ${props.y + 8})`}
                    fontSize={AXIS_TICK.fontSize}
                    fill={AXIS_TICK.fill}
                    fontFamily={AXIS_TICK.fontFamily}
                    style={onIndustryClick ? { cursor: "pointer" } : undefined}
                  >
                    {isNarrow
                      ? truncateLabel(props.payload.value, 10)
                      : props.payload.value}
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
              <RechartsTooltip
                content={<CustomTooltip metric={metric} />}
                cursor={TOOLTIP_CURSOR}
              />
              <Bar
                dataKey="value"
                radius={[1, 1, 0, 0]}
                style={onIndustryClick ? { cursor: "pointer" } : undefined}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.industry}
                    fill={getBarColor(entry.industry)}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: number) => fmtHours.format(v)}
                  style={DATA_LABEL}
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
