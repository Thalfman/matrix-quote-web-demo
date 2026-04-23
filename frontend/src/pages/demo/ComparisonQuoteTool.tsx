import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Tabs } from "@/components/Tabs";
import { useRealProjects } from "@/demo/realProjects";

import { CompareBrowseTab } from "./CompareBrowseTab";
import { CompareFindSimilarTab } from "./CompareFindSimilarTab";

function ComparisonQuoteSkeleton() {
  return (
    <div
      className="mt-6 space-y-4"
      aria-busy="true"
      aria-label="Loading comparison projects"
    >
      <div className="card p-5 space-y-3">
        <div className="h-3 w-40 bg-line rounded-sm animate-pulse" />
        <div className="h-10 w-full bg-line rounded-sm animate-pulse" />
      </div>
      <div className="card p-5 space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1fr_1fr_80px] gap-4 items-center"
          >
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

export function ComparisonQuoteTool() {
  const { data, isLoading, error } = useRealProjects();

  const tabs = useMemo(
    () => [
      {
        id: "browse",
        label: "Browse",
        content: data ? <CompareBrowseTab records={data} /> : null,
      },
      {
        id: "find-similar",
        label: "Find Similar",
        content: data ? <CompareFindSimilarTab records={data} /> : null,
      },
    ],
    [data],
  );

  return (
    <>
      <PageHeader
        eyebrow="Comparison · Real historical data"
        title="Comparison Quote Tool"
        description="Side-by-side views of the real historical pool, with a nearest-match lookup for new project profiles."
        chips={
          data
            ? [{ label: `${data.length} projects loaded`, tone: "accent" }]
            : []
        }
      />

      {error ? (
        <div
          className="card p-5 mt-6 flex items-start gap-3 text-sm text-danger"
          role="alert"
        >
          <AlertTriangle
            size={18}
            strokeWidth={1.75}
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <div className="font-medium">Couldn't load the historical projects.</div>
            <div className="text-muted mt-1">
              Refresh the page to try again. If this persists, the demo dataset
              may not have been bundled with this deployment.
            </div>
          </div>
        </div>
      ) : isLoading || !data ? (
        <ComparisonQuoteSkeleton />
      ) : (
        <div className="mt-6 fade-in">
          <Tabs tabs={tabs} defaultId="browse" />
        </div>
      )}
    </>
  );
}
