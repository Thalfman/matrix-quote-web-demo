import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { SALES_BUCKETS } from "@/demo/realProjects";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import type { DisciplineByIndustryRow } from "./portfolioStats";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

type Metric = "hours" | "share";

// Palette across the nine buckets — reuses tokens from chartTheme.
const BUCKET_COLORS: Record<string, string> = {
  ME: CHART_COLORS.ink,
  EE: CHART_COLORS.teal,
  PM: CHART_COLORS.amber,
  Docs: CHART_COLORS.muted,
  Build: CHART_COLORS.tealDark,
  Robot: CHART_COLORS.success,
  Controls: CHART_COLORS.ink2,
  Install: CHART_COLORS.muted2,
  Travel: CHART_COLORS.danger,
};

export function DisciplineMixByIndustry({ data }: { data: DisciplineByIndustryRow[] }) {
  const [metric, setMetric] = useState<Metric>("share");

  // Flatten { industry, buckets: {ME:100,...} } → { industry, ME:100, EE:20, ... }
  // For share: normalize by row total.
  const chartData = useMemo(() => {
    return data.map((row) => {
      const flat: Record<string, number | string> = {
        industry: row.industry,
        projectCount: row.projectCount,
        total: row.total,
      };
      for (const b of SALES_BUCKETS) {
        const v = row.buckets[b] ?? 0;
        flat[b] = metric === "share" && row.total > 0 ? v / row.total : v;
      }
      return flat;
    });
  }, [data, metric]);

  const activeBuckets = useMemo(() => {
    const present = new Set<string>();
    for (const row of data) {
      for (const b of SALES_BUCKETS) {
        if ((row.buckets[b] ?? 0) > 0) present.add(b);
      }
    }
    return SALES_BUCKETS.filter((b) => present.has(b));
  }, [data]);

  const hasData = data.length > 0 && activeBuckets.length > 0;

  return (
    <div className="card p-4 sm:p-5 h-96 lg:h-[28rem] flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="eyebrow text-xs text-muted">
          {metric === "share"
            ? "Discipline mix · share of hours per industry"
            : "Discipline mix · total hours per industry"}
        </div>
        <div
          className="inline-flex rounded-sm border hairline bg-surface p-0.5 gap-0.5"
          role="group"
          aria-label="Discipline metric"
        >
          {(["share", "hours"] as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={cn(
                "text-xs eyebrow px-2 py-1 rounded-sm transition-colors duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal",
                metric === m ? "bg-ink text-white" : "text-muted hover:text-ink",
              )}
              aria-pressed={metric === m}
            >
              {m === "share" ? "Share %" : "Total"}
            </button>
          ))}
        </div>
      </div>
      {!hasData ? (
        <div className="text-sm text-muted">No data available.</div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 24 }}
              stackOffset={metric === "share" ? "expand" : undefined}
            >
              <CartesianGrid {...GRID_STYLE} horizontal={false} />
              <YAxis
                dataKey="industry"
                type="category"
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                width={120}
              />
              <XAxis
                type="number"
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                tickFormatter={(v: number) =>
                  metric === "share" ? fmtPct.format(v) : fmtHours.format(v)
                }
                domain={metric === "share" ? [0, 1] : undefined}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={TOOLTIP_CURSOR}
                formatter={(value: number, name: string) => [
                  metric === "share" ? fmtPct.format(value) : fmtHours.format(value),
                  name,
                ]}
              />
              <Legend
                iconSize={8}
                iconType="square"
                wrapperStyle={{
                  fontSize: 11,
                  fontFamily: AXIS_TICK.fontFamily,
                  color: CHART_COLORS.muted,
                  paddingTop: 4,
                }}
              />
              {activeBuckets.map((b) => (
                <Bar
                  key={b}
                  dataKey={b}
                  stackId="mix"
                  fill={BUCKET_COLORS[b] ?? CHART_COLORS.muted}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
