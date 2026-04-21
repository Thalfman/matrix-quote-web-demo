import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
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

type ExtendedBucketRow = BucketRow & { projectCount: number };

export function HoursBySalesBucket({
  data,
}: {
  data: (BucketRow | ExtendedBucketRow)[];
}) {
  const [metric, setMetric] = useState<Metric>("total");

  const totalHours = data.reduce((s, d) => s + d.hours, 0);

  const chartData = data.map((d) => {
    if (metric === "total") return { ...d, value: d.hours };
    if (metric === "share") return { ...d, value: totalHours > 0 ? d.hours / totalHours : 0 };
    // avg: if projectCount is available use it, otherwise fall back to total
    const pc = (d as ExtendedBucketRow).projectCount;
    const avg = pc && pc > 0 ? d.hours / pc : d.hours;
    return { ...d, value: avg };
  });

  const tickFormatter = (v: number) =>
    metric === "share" ? fmtPct.format(v) : fmtHours.format(v);

  const tooltipFormatter = (v: number) =>
    metric === "share" ? fmtPct.format(v) : fmtHours.format(v);

  return (
    <div className="card p-5 h-80 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="eyebrow text-[10px] text-muted">
          {metric === "total"
            ? "Total p50 hours · by sales bucket"
            : metric === "avg"
              ? "Avg p50 hours · by sales bucket"
              : "Share of total hours · by sales bucket"}
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
                "text-[10px] eyebrow px-2 py-1 rounded-sm transition-colors duration-150 ease-out",
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
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={TOOLTIP_CURSOR}
                formatter={(v: number) => [tooltipFormatter(v), METRIC_LABELS[metric]]}
              />
              <Bar dataKey="value" fill={CHART_COLORS.teal} radius={[0, 1, 1, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
