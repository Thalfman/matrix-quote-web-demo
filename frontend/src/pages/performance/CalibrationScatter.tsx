import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { CalibrationPoint } from "@/api/types";
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART_COLORS,
  GRID_STYLE,
  TOOLTIP_STYLE,
} from "../insights/chartTheme";

export function CalibrationScatter({ points }: { points: CalibrationPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted">
        Calibration data isn't available yet. Persist predicted vs actual points during training
        to populate this chart.
      </div>
    );
  }

  const inside = points
    .filter((p) => p.inside_band)
    .map((p) => ({
      mid: (p.predicted_low + p.predicted_high) / 2,
      actual: p.actual,
    }));
  const outside = points
    .filter((p) => !p.inside_band)
    .map((p) => ({
      mid: (p.predicted_low + p.predicted_high) / 2,
      actual: p.actual,
    }));

  const allXY = points.flatMap((p) => [
    (p.predicted_low + p.predicted_high) / 2,
    p.actual,
  ]);
  const max = Math.max(1, ...allXY);

  return (
    <div className="card p-4 h-80">
      <div className="eyebrow text-[10px] text-muted mb-2">
        Confidence calibration · predicted (mid) vs actual
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis
            type="number"
            dataKey="mid"
            name="Predicted (mid)"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            domain={[0, max]}
          />
          <YAxis
            type="number"
            dataKey="actual"
            name="Actual"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            domain={[0, max]}
          />
          <ZAxis range={[36, 36]} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ strokeDasharray: "3 3", stroke: CHART_COLORS.line }}
          />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: max, y: max },
            ]}
            stroke={CHART_COLORS.ink}
            strokeDasharray="2 3"
          />
          <Scatter
            name="Inside 90% band"
            data={inside}
            fill={CHART_COLORS.success}
            fillOpacity={0.85}
          />
          <Scatter
            name="Outside 90% band"
            data={outside}
            fill={CHART_COLORS.danger}
            fillOpacity={0.85}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full bg-success"
          />
          Inside band
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full bg-danger"
          />
          Outside band
        </span>
        <span className="mono">y = x reference</span>
      </div>
    </div>
  );
}
