import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { ProjectRecord } from "@/demo/realProjects";

import { buildPortfolio } from "./portfolioStats";
import { PortfolioKpis } from "./PortfolioKpis";
import { HoursBySalesBucket } from "./HoursBySalesBucket";
import { HoursByIndustry } from "./HoursByIndustry";
import { SystemCategoryMix } from "./SystemCategoryMix";
import { ComplexityVsHours } from "./ComplexityVsHours";
import { TopProjectsTable } from "./TopProjectsTable";

type Props = {
  records: ProjectRecord[] | undefined;
  datasetLabel: string;
  isLoading: boolean;
  error: Error | null;
  emptyMessage?: string;
};

/**
 * SectionHeader — shared eyebrow row for the six insights sections.
 * One weight, one size, one letter-spacing. The numeric prefix reads
 * the same Barlow Condensed face as the title; kept in a single
 * text node so test assertions on the full "NN · Label" string match.
 */
function SectionHeader({ step, title }: { step: string; title: string }) {
  return (
    <div className="eyebrow text-[11px] text-muted mb-3">
      {step} · {title}
    </div>
  );
}

/**
 * SectionEmptyCard — renders an honest "Not available" card for chart sections
 * where the dataset does not carry enough overlap to compute the section.
 */
function SectionEmptyCard({ message }: { message: string }) {
  return (
    <div className="card p-5 text-sm text-muted h-80 flex items-center justify-center text-center">
      {message}
    </div>
  );
}

/**
 * SkeletonBlock — a single rounded bg-line rectangle used in skeleton loaders.
 */
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-line rounded animate-pulse ${className ?? ""}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="mt-6 space-y-10" aria-busy="true" aria-label="Loading business insights">
      {/* KPI strip skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-2.5 w-24" />
          </div>
        ))}
      </div>
      {/* Two-column chart row skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-56 w-full" />
          </div>
        ))}
      </div>
      {/* Another two-column row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-56 w-full" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="card p-5 space-y-3">
        <SkeletonBlock className="h-3 w-28" />
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export function BusinessInsightsView({
  records,
  datasetLabel,
  isLoading,
  error,
  emptyMessage = "No projects to chart yet.",
}: Props) {
  const portfolio = useMemo(
    () => (records && records.length > 0 ? buildPortfolio(records) : null),
    [records],
  );

  const isEmpty = !isLoading && !error && (!records || records.length === 0);

  return (
    <>
      <PageHeader
        eyebrow={`Insights · ${datasetLabel}`}
        title="Business Insights"
        description="Portfolio-level view — where hours go, which industries we serve, how complexity drives scope, and which projects dominate the book."
        chips={
          records && records.length > 0
            ? [{ label: `${records.length} projects`, tone: "accent" }]
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
            <div className="font-medium">Couldn't load the insights dataset.</div>
            <div className="text-muted mt-1">
              Refresh the page to try again. If this persists, the demo data
              bundle may be missing from this deployment.
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : isEmpty ? (
        <div className="card p-6 text-sm text-muted mt-6 text-center">
          {emptyMessage}
        </div>
      ) : portfolio ? (
        <div className="mt-6 space-y-10 fade-in">
          {/* KPI strip */}
          <section aria-labelledby="insights-01-heading">
            <h2 className="sr-only" id="insights-01-heading">Portfolio KPIs</h2>
            <SectionHeader step="01" title="Portfolio KPIs" />
            <PortfolioKpis kpis={portfolio.kpis} />
          </section>

          {/* Row 1: Hours by bucket + Hours by industry */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="insights-02-heading">
              <h2 className="sr-only" id="insights-02-heading">Hours by sales bucket</h2>
              <SectionHeader step="02" title="Hours by sales bucket" />
              {portfolio.buckets.length > 0 ? (
                <HoursBySalesBucket data={portfolio.buckets} />
              ) : (
                <SectionEmptyCard message="Not available for this dataset." />
              )}
            </section>
            <section aria-labelledby="insights-03-heading">
              <h2 className="sr-only" id="insights-03-heading">Hours by industry</h2>
              <SectionHeader step="03" title="Hours by industry" />
              {portfolio.industries.length > 0 ? (
                <HoursByIndustry data={portfolio.industries} />
              ) : (
                <SectionEmptyCard message="Not available for this dataset." />
              )}
            </section>
          </div>

          {/* Row 2: System category mix + Complexity vs hours */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="insights-04-heading">
              <h2 className="sr-only" id="insights-04-heading">System category mix</h2>
              <SectionHeader step="04" title="System category mix" />
              {portfolio.categories.length > 0 ? (
                <SystemCategoryMix data={portfolio.categories} />
              ) : (
                <SectionEmptyCard message="Not available for this dataset." />
              )}
            </section>
            <section aria-labelledby="insights-05-heading">
              <h2 className="sr-only" id="insights-05-heading">Complexity vs hours</h2>
              <SectionHeader step="05" title="Complexity vs hours" />
              {portfolio.scatter.length > 0 ? (
                <ComplexityVsHours data={portfolio.scatter} />
              ) : (
                <SectionEmptyCard message="Not available for this dataset." />
              )}
            </section>
          </div>

          {/* Ranked project table */}
          <section aria-labelledby="insights-06-heading">
            <h2 className="sr-only" id="insights-06-heading">All projects</h2>
            <SectionHeader step="06" title="All projects" />
            {portfolio.ranked.length > 0 ? (
              <TopProjectsTable rows={portfolio.ranked} />
            ) : (
              <SectionEmptyCard message="Not available for this dataset." />
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
