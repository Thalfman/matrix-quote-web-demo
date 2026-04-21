import { useSyntheticPool } from "@/demo/realProjects";
import { BusinessInsightsView } from "@/pages/demo/business/BusinessInsightsView";

export function MachineLearningInsights() {
  const { data, isLoading, error } = useSyntheticPool();
  return (
    <BusinessInsightsView
      records={data}
      datasetLabel="ML · Synthetic training pool"
      isLoading={isLoading}
      error={error instanceof Error ? error : error ? new Error(String(error)) : null}
      emptyMessage="No synthetic records found. Make sure synthetic-pool.json is present in demo assets."
    />
  );
}
