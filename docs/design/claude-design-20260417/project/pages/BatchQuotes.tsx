import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export function BatchQuotes() {
  return (
    <>
      <PageHeader
        eyebrow="Estimate"
        title="Batch Quotes"
        description="Upload a CSV or Excel file with many project rows and get predictions for all of them in one pass."
      />
      <EmptyState title="Batch upload pending" body="File input and results table land in a later slice." />
    </>
  );
}
