import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import {
  AXIS_LINE, AXIS_TICK, CHART_COLORS, DATA_LABEL, GRID_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE,
} from "@/pages/insights/chartTheme";
import type { AccuracyBucketRow, AccuracyPoint, AccuracyStats } from "./portfolioStats";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtPctSigned = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const fmtPct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

type View = "scatter" | "bucket";

function ScatterTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: { payload?: AccuracyPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16 };
  const labelStyle = { color: CHART_COLORS.muted };
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{row.project_name}</div>
      <div style={rowStyle}>
        <span style={labelStyle}>Industry</span>
        <span>{row.industry}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Quoted</span>
        <span className="tnum">{fmtHours.format(row.quoted)} h</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Actual</span>
        <span className="tnum">{fmtHours.format(row.actual)} h</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Overrun</span>
        <span className="tnum">{fmtPctSigned.format(row.overrunPct)}</span>
      </div>
    </div>
  );
}

function BucketTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: { payload?: AccuracyBucketRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16 };
  const labelStyle = { color: CHART_COLORS.muted };
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{row.bucket}</div>
      <div style={rowStyle}>
        <span style={labelStyle}>Overrun</span>
        <span className="tnum">{fmtPctSigned.format(row.overrunPct)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Quoted</span>
        <span className="tnum">{fmtHours.format(row.quoted)} h</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Actual</span>
        <span className="tnum">{fmtHours.format(row.actual)} h</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Projects</span>
        <span className="tnum">{row.projectCount}</span>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, tone = "ink" }: {
  label: string;
  value: string;
  tone?: "ink" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger" ? "text-danger"
    : tone === "success" ? "text-success"
    : "text-ink";
  return (
    <div className="flex flex-col">
      <span className="eyebrow text-[10px] text-muted">{label}</span>
      <span className={cn("mono tnum text-sm", toneClass)}>{value}</span>
    </div>
  );
}

export function EstimationAccuracy({ data }: { data: AccuracyStats }) {
  const [view, setView] = useState<View>("scatter");

  const hasData = data.projectsWithQuote > 0;

  // Scatter domain: pad 5% on both axes using the combined max.
  const scatterMax = useMemo(() => {
    if (data.points.length === 0) return 100;
    let m = 0;
    for (const p of data.points) {
      if (p.quoted > m) m = p.quoted;
      if (p.actual > m) m = p.actual;
    }
    return Math.ceil(m * 1.05);
  }, [data.points]);

  const portfolioTone = data.portfolioOverrunPct > 0 ? "danger" : "success";
  const medianTone = data.medianOverrunPct > 0 ? "danger" : "success";

  if (!hasData) {
    return (
      <div className="card p-4 sm:p-5 text-sm text-muted h-96 lg:h-[28rem] flex items-center justify-center text-center">
        No projects with both a sales quote and billed actuals in the current view.
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-5 h-96 lg:h-[28rem] flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="eyebrow text-xs text-muted">
          {view === "scatter"
            ? "Quoted vs actual hours · diagonal = perfect estimate"
            : "Overrun % by sales bucket · positive = went over"}
        </div>
        <div
          className="inline-flex rounded-sm border hairline bg-surface p-0.5 gap-0.5"
          role="group"
          aria-label="Accuracy view"
        >
          {(["scatter", "bucket"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "text-xs eyebrow px-2 py-1 rounded-sm transition-colors duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal",
                view === v ? "bg-ink text-white" : "text-muted hover:text-ink",
              )}
              aria-pressed={view === v}
            >
              {v === "scatter" ? "Scatter" : "By bucket"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 pb-3 border-b hairline">
        <SummaryChip
          label="Portfolio overrun"
          value={fmtPctSigned.format(data.portfolioOverrunPct)}
          tone={portfolioTone}
        />
        <SummaryChip
          label="Median overrun"
          value={fmtPctSigned.format(data.medianOverrunPct)}
          tone={medianTone}
        />
        <SummaryChip
          label="Quoted hours"
          value={fmtHours.format(data.totalQuoted)}
        />
        <SummaryChip
          label="Actual hours"
          value={fmtHours.format(data.totalActual)}
        />
      </div>

      <div className="flex-1 min-h-0">
        {view === "scatter" ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 4, right: 16, left: 4, bottom: 24 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                type="number"
                dataKey="quoted"
                domain={[0, scatterMax]}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                tickFormatter={(v: number) => fmtHours.format(v)}
                label={{
                  value: "Quoted hours",
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
                dataKey="actual"
                domain={[0, scatterMax]}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                tickFormatter={(v: number) => fmtHours.format(v)}
                label={{
                  value: "Actual hours",
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
              <ZAxis range={[48, 48]} />
              <ReferenceLine
                segment={[{ x: 0, y: 0 }, { x: scatterMax, y: scatterMax }]}
                stroke={CHART_COLORS.muted}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
              <Tooltip content={<ScatterTooltip />} cursor={TOOLTIP_CURSOR} />
              <Scatter data={data.points}>
                {data.points.map((p) => (
                  <Cell
                    key={p.project_id}
                    fill={p.overrunPct > 0 ? CHART_COLORS.danger : CHART_COLORS.success}
                    fillOpacity={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.byBucket}
              layout="vertical"
              margin={{ top: 4, right: 32, left: 4, bottom: 4 }}
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
                tickFormatter={(v: number) => fmtPct.format(v)}
              />
              <ReferenceLine x={0} stroke={CHART_COLORS.muted} />
              <Tooltip content={<BucketTooltip />} cursor={TOOLTIP_CURSOR} />
              <Bar dataKey="overrunPct" radius={[0, 1, 1, 0]}>
                {data.byBucket.map((row) => (
                  <Cell
                    key={row.bucket}
                    fill={row.overrunPct > 0 ? CHART_COLORS.danger : CHART_COLORS.success}
                  />
                ))}
                <LabelList
                  dataKey="overrunPct"
                  position="right"
                  formatter={(v: number) => fmtPctSigned.format(v)}
                  style={DATA_LABEL}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
