import { useRealProjects } from "@/demo/realProjects";
import { BusinessInsightsView } from "@/pages/demo/business/BusinessInsightsView";

export function ComparisonInsights() {
  const { data, isLoading, error } = useRealProjects();
  return (
    <BusinessInsightsView
      records={data}
      datasetLabel="Comparison · Real projects"
      isLoading={isLoading}
      error={error instanceof Error ? error : error ? new Error(String(error)) : null}
      emptyMessage="No real projects found. Make sure real-projects.json is present in demo assets."
    />
  );
}
