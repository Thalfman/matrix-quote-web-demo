import { useMemo } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Tabs } from "@/components/Tabs";
import { useRealProjects } from "@/demo/realProjects";

import { CompareBrowseTab } from "./CompareBrowseTab";
import { CompareFindSimilarTab } from "./CompareFindSimilarTab";

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
        description="Browse ~20–30 real projects side-by-side, or enter your own inputs to find the closest historical matches."
        chips={
          data
            ? [{ label: `${data.length} projects loaded`, tone: "accent" }]
            : []
        }
      />

      {error ? (
        <div className="card p-5 text-sm text-danger mt-6">
          Failed to load real-projects.json — make sure the CSV was dropped at
          <code className="mono mx-1">demo_assets/data/real/projects_real.csv</code>
          and the build pipeline ran.
        </div>
      ) : isLoading || !data ? (
        <div className="card p-5 text-sm text-muted mt-6">Loading real projects…</div>
      ) : (
        <div className="mt-6">
          <Tabs tabs={tabs} defaultId="browse" />
        </div>
      )}
    </>
  );
}
