import { useMemo, useState, useCallback } from "react";
import { AlertTriangle, Download } from "lucide-react";

import { DataProvenanceNote } from "@/components/DataProvenanceNote";
import { PageHeader } from "@/components/PageHeader";
import { ProjectRecord } from "@/demo/realProjects";
import { cn } from "@/lib/utils";

import { buildPortfolio, computeIndustryDetail } from "./portfolioStats";
import type { RankedRow, PortfolioStats } from "./portfolioStats";
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
import {
  buildInsightsPack,
  buildPortfolioJson,
  downloadBlob,
  jsonFilename,
  packFilename,
} from "./exportPack";

type Props = {
  records: ProjectRecord[] | undefined;
  datasetLabel: string;
  source?: "real" | "synthetic";
  isLoading: boolean;
  error: Error | null;
  emptyMessage?: string;
};

/**
 * SectionHeader - eyebrow row above each chart section.
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="eyebrow text-sm text-muted mb-3">
      {title}
    </div>
  );
}

/**
 * SectionEmptyCard - renders an honest "Not available" card for chart sections
 * where the dataset does not carry enough overlap to compute the section.
 */
function SectionEmptyCard({ message }: { message: string }) {
  return (
    <div className="card p-4 sm:p-5 text-sm text-muted h-80 lg:h-96 flex items-center justify-center text-center">
      {message}
    </div>
  );
}

/**
 * SkeletonBlock - a single rounded bg-line rectangle used in skeleton loaders.
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

type TabId = "overview" | "accuracy" | "mix" | "projects";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",  label: "Overview"  },
  { id: "accuracy",  label: "Accuracy"  },
  { id: "mix",       label: "Mix"       },
  { id: "projects",  label: "Projects"  },
];

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
  const [activeTab, setActiveTab] = useState<TabId>("overview");

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

  // Portfolio-wide (unfiltered) median overrun - baseline the deep-dive card
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

  const [isPackBuilding, setIsPackBuilding] = useState(false);
  const handleDownloadPack = useCallback(async (pack: PortfolioStats) => {
    setIsPackBuilding(true);
    try {
      const now = new Date();
      const blob = await buildInsightsPack(pack, datasetLabel, now);
      downloadBlob(blob, packFilename(datasetLabel, now));
    } finally {
      setIsPackBuilding(false);
    }
  }, [datasetLabel]);

  // CONTEXT D-07: secondary engineer-side affordance. Synchronous —
  // buildPortfolioJson is pure JSON.stringify. Disabled during pack build
  // to avoid any race with the primary handler (D-07).
  const handleDownloadJson = useCallback((pack: PortfolioStats) => {
    const now = new Date();
    const json = buildPortfolioJson(pack);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    downloadBlob(blob, jsonFilename(datasetLabel, now));
  }, [datasetLabel]);

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

          {/* Tab bar + page-level download action in one row.
              On narrow screens the tabs scroll horizontally, and the
              download button wraps to the next line via flex-wrap. */}
          <div className="flex items-end gap-3 flex-wrap -mt-6 border-b hairline">
            <div
              role="tablist"
              aria-label="Business insights views"
              className="flex gap-0 overflow-x-auto -mb-px"
            >
              {TABS.map((t) => {
                const selected = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    id={`insights-tab-${t.id}`}
                    aria-selected={selected}
                    aria-controls={`insights-panel-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "shrink-0 px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap",
                      "transition-[color,border-color] duration-150 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
                      selected
                        ? "border-teal text-ink font-medium"
                        : "border-transparent text-muted hover:text-ink",
                    )}
                  >
                    {t.label}
                    {t.id === "projects" && portfolio && (
                      <span className="ml-1.5 mono text-[10px] text-muted tnum">
                        ({portfolio.ranked.length})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {portfolio && (
              <div className="ml-auto pb-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownloadPack(portfolio)}
                  disabled={isPackBuilding}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm eyebrow px-2.5 py-1.5 rounded-sm",
                    "border hairline bg-surface text-muted hover:text-ink hover:bg-paper",
                    "transition-colors duration-150 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                  title="Download a zip with the spreadsheet (Excel/Numbers/Sheets), the one-page summary, and a README."
                >
                  <Download size={12} strokeWidth={1.75} aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {isPackBuilding ? "Building…" : "Download insights pack"}
                  </span>
                  <span className="sm:hidden">
                    {isPackBuilding ? "Building…" : "Pack"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadJson(portfolio)}
                  disabled={isPackBuilding}
                  aria-label="Download raw portfolio JSON for engineers"
                  className={cn(
                    "text-xs text-muted hover:text-ink hover:underline",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                  title="Download the full structured portfolio data as a single JSON file."
                >
                  Download raw JSON (for engineers)
                </button>
              </div>
            )}
          </div>

          {portfolio ? (
            <div
              role="tabpanel"
              id={`insights-panel-${activeTab}`}
              aria-labelledby={`insights-tab-${activeTab}`}
              className="space-y-8 sm:space-y-10"
            >
              {activeTab === "overview" && (
                <>
                  {/* Industry deep-dive sits at the top of Overview when a
                      single industry is selected - it's the most context-rich
                      snapshot for that slice. */}
                  {industryDetail && (
                    <section aria-labelledby="insights-deepdive-heading">
                      <h2 className="sr-only" id="insights-deepdive-heading">Industry deep-dive</h2>
                      <SectionHeader title={`Industry deep-dive · ${industryDetail.industry}`} />
                      <IndustryDeepDive detail={industryDetail} />
                    </section>
                  )}

                  <section aria-labelledby="insights-kpis-heading">
                    <h2 className="sr-only" id="insights-kpis-heading">Portfolio KPIs</h2>
                    <SectionHeader title="Portfolio KPIs" />
                    <PortfolioKpis kpis={portfolio.kpis} source={source} />
                  </section>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <section aria-labelledby="insights-industry-heading">
                      <h2 className="sr-only" id="insights-industry-heading">Hours by industry</h2>
                      <SectionHeader title="Hours by industry" />
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
                    <section aria-labelledby="insights-category-heading">
                      <h2 className="sr-only" id="insights-category-heading">System category mix</h2>
                      <SectionHeader title="System category mix" />
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
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <section aria-labelledby="insights-bucket-heading">
                      <h2 className="sr-only" id="insights-bucket-heading">Hours by sales bucket</h2>
                      <SectionHeader title="Hours by sales bucket" />
                      {portfolio.buckets.length > 0 ? (
                        <HoursBySalesBucket data={portfolio.buckets} />
                      ) : (
                        <SectionEmptyCard message="Not available for this dataset." />
                      )}
                    </section>
                    <section aria-labelledby="insights-complexity-heading">
                      <h2 className="sr-only" id="insights-complexity-heading">Complexity vs hours</h2>
                      <SectionHeader title="Complexity vs hours" />
                      {portfolio.scatter.length > 0 ? (
                        <ComplexityVsHours data={portfolio.scatter} />
                      ) : (
                        <SectionEmptyCard message="Not available for this dataset." />
                      )}
                    </section>
                  </div>
                </>
              )}

              {activeTab === "accuracy" && (
                <>
                  <section aria-labelledby="insights-accuracy-heading">
                    <h2 className="sr-only" id="insights-accuracy-heading">Estimation accuracy</h2>
                    <SectionHeader title="Estimation accuracy" />
                    <EstimationAccuracy data={portfolio.accuracy} />
                  </section>
                  <section aria-labelledby="insights-risk-heading">
                    <h2 className="sr-only" id="insights-risk-heading">Risk factors vs overrun</h2>
                    <SectionHeader title="Risk factors vs overrun" />
                    <RiskFactorCorrelation data={portfolio.riskCorrelations} />
                  </section>
                </>
              )}

              {activeTab === "mix" && (
                <>
                  <section aria-labelledby="insights-discipline-heading">
                    <h2 className="sr-only" id="insights-discipline-heading">Discipline mix by industry</h2>
                    <SectionHeader title="Discipline mix by industry" />
                    {portfolio.disciplineByIndustry.length > 0 ? (
                      <DisciplineMixByIndustry data={portfolio.disciplineByIndustry} />
                    ) : (
                      <SectionEmptyCard message="Not available for this dataset." />
                    )}
                  </section>
                  <section aria-labelledby="insights-material-heading">
                    <h2 className="sr-only" id="insights-material-heading">Material cost vs labor hours</h2>
                    <SectionHeader title="Material cost vs labor hours" />
                    {portfolio.materialLabor.length > 0 ? (
                      <MaterialVsLabor data={portfolio.materialLabor} />
                    ) : (
                      <SectionEmptyCard message="Not available for this dataset." />
                    )}
                  </section>
                </>
              )}

              {activeTab === "projects" && (
                <section aria-labelledby="insights-projects-heading">
                  <h2 className="sr-only" id="insights-projects-heading">All projects</h2>
                  <SectionHeader title={`All projects · ${portfolio.ranked.length}`} />
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
                </section>
              )}
            </div>
          ) : (
            <div className="card p-6 text-sm text-muted text-center">
              No projects match the current filters. Try resetting the filters.
            </div>
          )}
        </div>
      ) : null}

      {/* Project detail drawer - mounted at root, outside the content flow */}
      <ProjectDetailDrawer row={drawerRow} onClose={() => setDrawerRow(null)} />
    </>
  );
}
