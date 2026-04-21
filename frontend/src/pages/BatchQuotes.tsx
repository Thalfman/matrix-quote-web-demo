import { PageHeader } from "@/components/PageHeader";

import { BatchDropzone } from "./batch/BatchDropzone";
import { BatchRecentList } from "./batch/BatchRecentList";
import { BatchSchemaRef } from "./batch/BatchSchemaRef";

export function BatchQuotes() {
  return (
    <>
      <PageHeader
        eyebrow="Estimate · Batch"
        title="Batch Quotes"
        description="Upload a CSV or XLSX with project rows and get predictions for all of them in one pass. Batch inference lands in a later slice — this page previews the upload flow."
      />

      <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 mb-8">
        <BatchDropzone />
        <BatchSchemaRef />
      </div>

      <BatchRecentList />
    </>
  );
}
