import { AlertTriangle } from "lucide-react";

import { DataProvenanceNote } from "@/components/DataProvenanceNote";
import { PageHeader } from "@/components/PageHeader";
import { useRealProjects } from "@/demo/realProjects";
import { CompareFindSimilarTab } from "@/pages/demo/CompareFindSimilarTab";

function Skeleton() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading historical projects">
      <div className="card p-5 space-y-3">
        <div className="h-3 w-40 bg-line rounded-sm animate-pulse" />
        <div className="h-10 w-full bg-line rounded-sm animate-pulse" />
      </div>
      <div className="card p-5 space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_1fr_80px] gap-4 items-center">
            <div className="h-3 bg-line rounded-sm animate-pulse" />
            <div className="h-3 bg-line rounded-sm animate-pulse" />
            <div className="h-3 bg-line rounded-sm animate-pulse" />
            <div className="h-3 bg-line rounded-sm animate-pulse ml-auto w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareFindSimilar() {
  const { data, isLoading, error } = useRealProjects();

  return (
    <>
      <PageHeader
        eyebrow="Real Data · Find similar"
        title="Find Similar Projects"
        description="Enter a project profile to surface the three closest historical projects across thirty-three numeric features and six categoricals."
        chips={data ? [{ label: `${data.length} projects`, tone: "accent" }] : []}
      />
      <DataProvenanceNote variant="real" />

      {error ? (
        <div className="card p-5 mt-6 flex items-start gap-3 text-sm text-danger" role="alert">
          <AlertTriangle size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="font-medium">Couldn't load the historical projects.</div>
            <div className="text-muted mt-1">
              Refresh the page to try again. If this persists, the demo dataset
              may not have been bundled with this deployment.
            </div>
          </div>
        </div>
      ) : isLoading || !data ? (
        <Skeleton />
      ) : (
        <div className="mt-6 fade-in">
          <CompareFindSimilarTab records={data} />
        </div>
      )}
    </>
  );
}
