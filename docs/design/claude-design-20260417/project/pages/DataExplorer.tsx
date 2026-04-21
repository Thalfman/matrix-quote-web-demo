import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export function DataExplorer() {
  return (
    <>
      <PageHeader
        eyebrow="Dataset"
        title="Data Explorer"
        description="Filter the master training dataset and inspect per-operation distributions."
      />
      <EmptyState title="Filters and table pending" />
    </>
  );
}
