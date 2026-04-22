import { AlertTriangle } from "lucide-react";

import { DataProvenanceNote } from "@/components/DataProvenanceNote";
import { PageHeader } from "@/components/PageHeader";
import { useSyntheticPool } from "@/demo/realProjects";
import { CompareBrowseTab } from "@/pages/demo/CompareBrowseTab";

function Skeleton() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading training projects">
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

export function MachineLearningCompare() {
  const { data, isLoading, error } = useSyntheticPool();

  return (
    <>
      <PageHeader
        eyebrow="Synthetic Data · Compare"
        title="Compare Training Projects"
        description="Browse the generated training projects and compare two or three side by side. These rows represent what the engine has learned at scale."
        chips={data ? [{ label: `${data.length} training rows`, tone: "accent" }] : []}
      />
      <DataProvenanceNote variant="synthetic" />

      {error ? (
        <div className="card p-5 mt-6 flex items-start gap-3 text-sm text-danger" role="alert">
          <AlertTriangle size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="font-medium">Couldn't load the training projects.</div>
            <div className="text-muted mt-1">
              Refresh the page to try again. If this persists, the demo data
              bundle may be missing from this deployment.
            </div>
          </div>
        </div>
      ) : isLoading || !data ? (
        <Skeleton />
      ) : (
        <div className="mt-6 fade-in">
          <CompareBrowseTab records={data} />
        </div>
      )}
    </>
  );
}
