import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
            tick={{ fontSize: 11, fill: "#5A6573", fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "#E5E1D8" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#5A6573", fontFamily: "JetBrains Mono" }}
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
            wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }}
            iconType="square"
          />
          {quotes.map((q, i) => (
            <Bar
              key={q.id}
              dataKey={q.name || `Q${i + 1}`}
              fill={BAR_COLORS[i % BAR_COLORS.length]}
              radius={[1, 1, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
