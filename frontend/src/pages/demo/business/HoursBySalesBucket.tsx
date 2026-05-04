import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";

import { Tooltip, TooltipProvider, GlossaryHelpIcon } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, DATA_LABEL, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import { BucketRow } from "./portfolioStats";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

type Metric = "total" | "avg" | "share";

const METRIC_LABELS: Record<Metric, string> = {
  total: "Total",
  avg: "Avg",
  share: "Share %",
};

export function HoursBySalesBucket({ data }: { data: BucketRow[] }) {
  const [metric, setMetric] = useState<Metric>("total");

  const totalHours = data.reduce((s, d) => s + d.hours, 0);

  const chartData = data.map((d) => {
    if (metric === "total") return { ...d, value: d.hours };
    if (metric === "share") return { ...d, value: totalHours > 0 ? d.hours / totalHours : 0 };
    // avg: hours / projectCount. Zero-projectCount buckets never reach the
    // chart (filtered upstream in buildPortfolio), so the guard here is
    // defensive only.
    const pc = d.projectCount;
    const avg = pc > 0 ? d.hours / pc : 0;
    return { ...d, value: avg };
  });

  const tickFormatter = (v: number) =>
    metric === "share" ? fmtPct.format(v) : fmtHours.format(v);

  const tooltipFormatter = (v: number) =>
    metric === "share" ? fmtPct.format(v) : fmtHours.format(v);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="card p-4 sm:p-5 h-80 lg:h-96 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="eyebrow text-xs text-muted flex items-center gap-1">
          <span>
            {metric === "total"
              ? "Total hours · by sales bucket"
              : metric === "avg"
                ? "Avg hours · by sales bucket"
                : "Share of total hours · by sales bucket"}
          </span>
          <Tooltip term="Sales Bucket" side="bottom">
            <GlossaryHelpIcon ariaLabel="What is Sales Bucket?" />
          </Tooltip>
        </div>
        <div
          className="inline-flex rounded-sm border hairline bg-surface p-0.5 gap-0.5"
          role="group"
          aria-label="Hours metric"
        >
          {(["total", "avg", "share"] as Metric[]).map((m) => (
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
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-muted">No data available.</div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
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
                tickFormatter={tickFormatter}
              />
              <RechartsTooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={TOOLTIP_CURSOR}
                formatter={(v: number) => [tooltipFormatter(v), METRIC_LABELS[metric]]}
              />
              <Bar dataKey="value" fill={CHART_COLORS.teal} radius={[0, 1, 1, 0]}>
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={tickFormatter}
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
