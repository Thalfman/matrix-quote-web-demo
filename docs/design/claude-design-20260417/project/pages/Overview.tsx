import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export function Overview() {
  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="System Overview"
        description="Dataset health and model status at a glance."
      />
      <EmptyState
        title="Admin overview pending"
        body="KPI grid, upload history, and per-op metrics land in a later slice."
      />
    </>
  );
}
