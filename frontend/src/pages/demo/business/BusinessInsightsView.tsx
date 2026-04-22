import { useMemo, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

import { DataProvenanceNote } from "@/components/DataProvenanceNote";
import { PageHeader } from "@/components/PageHeader";
import { ProjectRecord } from "@/demo/realProjects";

import { buildPortfolio, computeIndustryDetail } from "./portfolioStats";
import type { RankedRow } from "./portfolioStats";
import { PortfolioKpis } from "./PortfolioKpis";
import { HoursBySalesBucket } from "./HoursBySalesBucket";
import { HoursByIndustry } from "./HoursByIndustry";
import { SystemCategoryMix } from "./SystemCategoryMix";
import { ComplexityVsHours } from "./ComplexityVsHours";
import { TopProjectsTable } from "./TopProjectsTable";
import { InsightsFilters, InsightsFilterState } from "./InsightsFilters";
import { DEFAULT_FILTER } from "./insightsFilterDefaults";
import { ProjectDetailDrawer } from "./ProjectDetailDrawer";
import { EstimationAccuracy } from "./EstimationAccuracy";
import { DisciplineMixByIndustry } from "./DisciplineMixByIndustry";
import { MaterialVsLabor } from "./MaterialVsLabor";
import { IndustryDeepDive } from "./IndustryDeepDive";
import { RiskFactorCorrelation } from "./RiskFactorCorrelation";

type Props = {
  records: ProjectRecord[] | undefined;
  datasetLabel: string;
  source?: "real" | "synthetic";
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
    <div className="eyebrow text-sm text-muted mb-3">
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

function applyFilter(records: ProjectRecord[], filter: InsightsFilterState): ProjectRecord[] {
  return records.filter((r) => {
    const industry = String(r.industry_segment ?? "Unknown");
    const category = String(r.system_category ?? "Unknown");
    const complexity = Math.round(Number(r.complexity_score_1_5 ?? 0));
    const name = String(r.project_name ?? r.project_id ?? "").toLowerCase();

    if (filter.industries.size > 0 && !filter.industries.has(industry)) return false;
    if (filter.categories.size > 0 && !filter.categories.has(category)) return false;
    if (filter.complexities.size > 0 && !filter.complexities.has(complexity)) return false;
    if (filter.search && !name.includes(filter.search.toLowerCase())) return false;
    return true;
  });
}

export function BusinessInsightsView({
  records,
  datasetLabel,
  source = "real",
  isLoading,
  error,
  emptyMessage = "No projects to chart yet.",
}: Props) {
  const [filter, setFilter] = useState<InsightsFilterState>(DEFAULT_FILTER);
  const [drawerRow, setDrawerRow] = useState<RankedRow | null>(null);

  // Derive available filter options from the full (unfiltered) record set
  const availableIndustries = useMemo(() => {
    if (!records) return [];
    const countMap: Record<string, number> = {};
    for (const r of records) {
      const ind = String(r.industry_segment ?? "Unknown");
      countMap[ind] = (countMap[ind] ?? 0) + 1;
    }
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [records]);

  const availableCategories = useMemo(() => {
    if (!records) return [];
    const countMap: Record<string, number> = {};
    for (const r of records) {
      const cat = String(r.system_category ?? "Unknown");
      countMap[cat] = (countMap[cat] ?? 0) + 1;
    }
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return applyFilter(records, filter);
  }, [records, filter]);

  const portfolio = useMemo(
    () => (filteredRecords.length > 0 ? buildPortfolio(filteredRecords) : null),
    [filteredRecords],
  );

  // Portfolio-wide (unfiltered) median overrun — baseline the deep-dive card
  // compares the selected industry against.
  const portfolioMedianOverrun = useMemo(() => {
    if (!records || records.length === 0) return null;
    return buildPortfolio(records).accuracy.medianOverrunPct;
  }, [records]);

  // Industry deep-dive activates when exactly one industry filter is selected
  // (and no category filter narrows the record set further, to keep the
  // "this is the industry" framing unambiguous).
  const deepDiveIndustry =
    filter.industries.size === 1 ? Array.from(filter.industries)[0] : null;

  const industryDetail = useMemo(() => {
    if (!deepDiveIndustry || filteredRecords.length === 0) return null;
    return computeIndustryDetail(
      filteredRecords,
      deepDiveIndustry,
      portfolioMedianOverrun,
    );
  }, [deepDiveIndustry, filteredRecords, portfolioMedianOverrun]);

  const isEmpty = !isLoading && !error && (!records || records.length === 0);

  const handleIndustryClick = useCallback((name: string) => {
    setFilter((prev) => {
      const next = new Set(prev.industries);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...prev, industries: next };
    });
  }, []);

  const handleCategoryClick = useCallback((name: string) => {
    setFilter((prev) => {
      const next = new Set(prev.categories);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...prev, categories: next };
    });
  }, []);

  const handleRowClick = useCallback((row: RankedRow) => {
    setDrawerRow(row);
  }, []);

  const handleFilterChange = useCallback((next: InsightsFilterState) => {
    setFilter(next);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={`Insights · ${datasetLabel}`}
        title="Business Insights"
        description="Portfolio view of hours, industries, complexity, and the projects that drive the book."
        chips={
          records && records.length > 0
            ? [{ label: `${records.length} projects`, tone: "accent" }]
            : []
        }
      />
      <DataProvenanceNote variant={source} />

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
      ) : records && records.length > 0 ? (
        <div className="mt-6 space-y-10 fade-in">
          {/* Filters panel */}
          <InsightsFilters
            filter={filter}
            onChange={handleFilterChange}
            availableIndustries={availableIndustries}
            availableCategories={availableCategories}
            totalCount={records.length}
            filteredCount={filteredRecords.length}
          />

          {portfolio ? (
            <>
              {/* KPI strip */}
              <section aria-labelledby="insights-01-heading">
                <h2 className="sr-only" id="insights-01-heading">Portfolio KPIs</h2>
                <SectionHeader step="01" title="Portfolio KPIs" />
                <PortfolioKpis kpis={portfolio.kpis} source={source} />
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
                    <HoursByIndustry
                      data={portfolio.industries}
                      selectedIndustries={filter.industries}
                      onIndustryClick={handleIndustryClick}
                    />
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
                    <SystemCategoryMix
                      data={portfolio.categories}
                      selectedCategories={filter.categories}
                      onCategoryClick={handleCategoryClick}
                    />
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

              {/* Row 3: Estimation accuracy (full width) */}
              <section aria-labelledby="insights-06-heading">
                <h2 className="sr-only" id="insights-06-heading">Estimation accuracy</h2>
                <SectionHeader step="06" title="Estimation accuracy" />
                <EstimationAccuracy data={portfolio.accuracy} />
              </section>

              {/* Row 4: Risk factors vs overrun (full width — pairs with accuracy above) */}
              <section aria-labelledby="insights-07-heading">
                <h2 className="sr-only" id="insights-07-heading">Risk factors vs overrun</h2>
                <SectionHeader step="07" title="Risk factors vs overrun" />
                <RiskFactorCorrelation data={portfolio.riskCorrelations} />
              </section>

              {/* Row 5: Discipline mix by industry + Material vs labor */}
              <div className="grid gap-6 lg:grid-cols-2">
                <section aria-labelledby="insights-08-heading">
                  <h2 className="sr-only" id="insights-08-heading">Discipline mix by industry</h2>
                  <SectionHeader step="08" title="Discipline mix by industry" />
                  {portfolio.disciplineByIndustry.length > 0 ? (
                    <DisciplineMixByIndustry data={portfolio.disciplineByIndustry} />
                  ) : (
                    <SectionEmptyCard message="Not available for this dataset." />
                  )}
                </section>
                <section aria-labelledby="insights-09-heading">
                  <h2 className="sr-only" id="insights-09-heading">Material cost vs labor hours</h2>
                  <SectionHeader step="09" title="Material cost vs labor hours" />
                  {portfolio.materialLabor.length > 0 ? (
                    <MaterialVsLabor data={portfolio.materialLabor} />
                  ) : (
                    <SectionEmptyCard message="Not available for this dataset." />
                  )}
                </section>
              </div>

              {/* Conditional industry deep-dive: appears when exactly one industry is filter-selected */}
              {industryDetail && (
                <section aria-labelledby="insights-10-heading">
                  <h2 className="sr-only" id="insights-10-heading">Industry deep-dive</h2>
                  <SectionHeader step="10" title={`Industry deep-dive · ${industryDetail.industry}`} />
                  <IndustryDeepDive detail={industryDetail} />
                </section>
              )}

              {/* Ranked project table (collapsed by default) */}
              <section aria-labelledby="insights-11-heading">
                <h2 className="sr-only" id="insights-11-heading">All projects</h2>
                <details className="group">
                  <summary
                    className="list-none cursor-pointer select-none flex items-center gap-2 mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
                  >
                    <div className="eyebrow text-sm text-muted">
                      11 · All projects
                    </div>
                    <span className="text-sm text-muted mono tnum">
                      ({portfolio.ranked.length})
                    </span>
                    <span
                      aria-hidden="true"
                      className="ml-auto text-sm text-muted transition-transform duration-150 ease-out group-open:rotate-180"
                    >
                      ▾
                    </span>
                  </summary>
                  {portfolio.ranked.length > 0 ? (
                    <TopProjectsTable
                      rows={portfolio.ranked}
                      search={filter.search}
                      onSearchChange={(s) => setFilter((prev) => ({ ...prev, search: s }))}
                      onRowClick={handleRowClick}
                    />
                  ) : (
                    <SectionEmptyCard message="Not available for this dataset." />
                  )}
                </details>
              </section>
            </>
          ) : (
            <div className="card p-6 text-sm text-muted text-center">
              No projects match the current filters. Try resetting the filters.
            </div>
          )}
        </div>
      ) : null}

      {/* Project detail drawer — mounted at root, outside the content flow */}
      <ProjectDetailDrawer row={drawerRow} onClose={() => setDrawerRow(null)} />
    </>
  );
}
