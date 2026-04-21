import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export function Drivers() {
  return (
    <>
      <PageHeader
        eyebrow="Insight"
        title="Drivers & Similar Projects"
        description="Inspect what drives each model's predictions and find historical projects that resemble a target profile."
      />
      <EmptyState title="Feature importance and similar projects pending" />
    </>
  );
}
