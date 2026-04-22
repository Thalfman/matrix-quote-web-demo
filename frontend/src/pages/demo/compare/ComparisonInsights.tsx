import { useRealProjects } from "@/demo/realProjects";
import { BusinessInsightsView } from "@/pages/demo/business/BusinessInsightsView";

export function ComparisonInsights() {
  const { data, isLoading, error } = useRealProjects();
  return (
    <BusinessInsightsView
      records={data}
      datasetLabel="Real Data · Historical projects"
      source="real"
      isLoading={isLoading}
      error={error instanceof Error ? error : error ? new Error(String(error)) : null}
      emptyMessage="No historical projects found. Make sure the demo data bundle is loaded."
    />
  );
}
