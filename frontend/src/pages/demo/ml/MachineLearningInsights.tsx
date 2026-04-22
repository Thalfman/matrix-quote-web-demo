import { useSyntheticPool } from "@/demo/realProjects";
import { BusinessInsightsView } from "@/pages/demo/business/BusinessInsightsView";

export function MachineLearningInsights() {
  const { data, isLoading, error } = useSyntheticPool();
  return (
    <BusinessInsightsView
      records={data}
      datasetLabel="Synthetic Data · Training projects"
      source="synthetic"
      isLoading={isLoading}
      error={error instanceof Error ? error : error ? new Error(String(error)) : null}
      emptyMessage="No training records found. Make sure the demo data bundle is loaded."
    />
  );
}
