import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { MetricsSummary } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export function ModelPerformance() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => (await api.get<MetricsSummary>("/metrics")).data,
  });

  return (
    <>
      <PageHeader
        eyebrow="Model"
        title="Model Performance"
        description="Per-operation MAE, R², and sample counts from the latest training run."
        chips={
          data
            ? [
                {
                  label: data.models_ready
                    ? `${data.metrics.length} Models`
                    : "Not trained",
                  tone: data.models_ready ? "accent" : "warning",
                },
              ]
            : undefined
        }
      />
      {isLoading && <EmptyState title="Loading metrics..." />}
      {!isLoading && (!data || data.metrics.length === 0) && (
        <EmptyState
          title="No models trained"
          body="Models have not been trained yet. Please check back later."
        />
      )}
      {!isLoading && data && data.metrics.length > 0 && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left muted border-b border-border dark:border-border-dark">
                <th className="py-2 pr-4">Target</th>
                <th className="py-2 pr-4">Rows</th>
                <th className="py-2 pr-4">MAE</th>
                <th className="py-2 pr-4">R²</th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.map((m) => (
                <tr key={m.target} className="border-b border-border/50 dark:border-border-dark/50 last:border-0">
                  <td className="py-2 pr-4">{m.target}</td>
                  <td className="py-2 pr-4 numeric">{m.rows ?? "—"}</td>
                  <td className="py-2 pr-4 numeric">{m.mae != null ? m.mae.toFixed(1) : "—"}</td>
                  <td className="py-2 pr-4 numeric">{m.r2 != null ? m.r2.toFixed(2) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
