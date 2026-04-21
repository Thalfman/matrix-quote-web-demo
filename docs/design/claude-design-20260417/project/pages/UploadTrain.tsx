import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export function UploadTrain() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Upload & Train"
        description="Upload the latest project-hours Excel export, merge into master, and retrain all per-operation models."
      />
      <EmptyState title="Training workflow pending" body="File upload + progress UI land in a later slice." />
    </>
  );
}
