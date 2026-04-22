import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmtHours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

import { SavedQuote } from "@/api/types";

// Match the palette: anchor = ink, second = amber, third = teal.
const BAR_COLORS = ["#0D1B2A", "#F2B61F", "#1F8FA6"];

export function CompareBucketsChart({ quotes }: { quotes: SavedQuote[] }) {
  const allBuckets = new Set<string>();
  quotes.forEach((q) =>
    Object.keys(q.prediction.sales_buckets ?? {}).forEach((k) => allBuckets.add(k)),
  );

  const data = Array.from(allBuckets).map((bucket) => {
    const row: Record<string, number | string> = { bucket };
    quotes.forEach((q, i) => {
      row[q.name || `Q${i + 1}`] = q.prediction.sales_buckets?.[bucket]?.p50 ?? 0;
    });
    return row;
  });

  return (
    <div className="card p-4 h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 12, fill: "#5A6573", fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "#E5E1D8" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#5A6573", fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "#E5E1D8" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E1D8",
              borderRadius: 2,
              fontSize: 12,
              fontFamily: "Inter",
            }}
            cursor={{ fill: "rgba(31, 143, 166, 0.06)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, fontFamily: "Inter" }}
            iconType="square"
          />
          {quotes.map((q, i) => {
            const dataKey = q.name || `Q${i + 1}`;
            return (
              <Bar
                key={q.id}
                dataKey={dataKey}
                fill={BAR_COLORS[i % BAR_COLORS.length]}
                radius={[1, 1, 0, 0]}
              >
                <LabelList
                  dataKey={dataKey}
                  position="top"
                  formatter={(v: number) => fmtHours.format(v)}
                  style={{ fontSize: 11, fill: "#0D1B2A", fontFamily: "JetBrains Mono" }}
                />
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
