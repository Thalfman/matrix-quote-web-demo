import { useMemo } from "react";

import { PageHeader } from "@/components/PageHeader";
import { useRealProjects } from "@/demo/realProjects";

import { buildPortfolio } from "./business/portfolioStats";
import { PortfolioKpis } from "./business/PortfolioKpis";
import { HoursBySalesBucket } from "./business/HoursBySalesBucket";
import { HoursByIndustry } from "./business/HoursByIndustry";
import { SystemCategoryMix } from "./business/SystemCategoryMix";
import { ComplexityVsHours } from "./business/ComplexityVsHours";
import { TopProjectsTable } from "./business/TopProjectsTable";

export function BusinessInsights() {
  const { data, isLoading, error } = useRealProjects();

  const portfolio = useMemo(
    () => (data ? buildPortfolio(data) : null),
    [data],
  );

  return (
    <>
      <PageHeader
        eyebrow="Insights · Portfolio"
        title="Business Insights"
        description="Portfolio-level view of the 24 real projects — where hours go, which industries we serve, how complexity drives scope, and which projects dominate the book."
        chips={
          data
            ? [{ label: `${data.length} projects`, tone: "accent" }]
            : []
        }
      />

      {error ? (
        <div className="card p-5 text-sm text-danger mt-6">
          Failed to load real-projects.json — make sure the CSV was dropped at
          <code className="mono mx-1">demo_assets/data/real/projects_real.csv</code>
          and the build pipeline ran.
        </div>
      ) : isLoading || !data || !portfolio ? (
        <div className="card p-5 text-sm text-muted mt-6">Loading real projects…</div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* KPI strip */}
          <section>
            <div className="eyebrow text-[10px] text-muted mb-2">
              01 · Portfolio KPIs
            </div>
            <PortfolioKpis kpis={portfolio.kpis} />
          </section>

          {/* Row 1: Hours by bucket + Hours by industry */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <div className="eyebrow text-[10px] text-muted mb-2">
                02 · Hours by sales bucket
              </div>
              <HoursBySalesBucket data={portfolio.buckets} />
            </section>
            <section>
              <div className="eyebrow text-[10px] text-muted mb-2">
                03 · Hours by industry
              </div>
              <HoursByIndustry data={portfolio.industries} />
            </section>
          </div>

          {/* Row 2: System category mix + Complexity vs hours */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <div className="eyebrow text-[10px] text-muted mb-2">
                04 · System category mix
              </div>
              <SystemCategoryMix data={portfolio.categories} />
            </section>
            <section>
              <div className="eyebrow text-[10px] text-muted mb-2">
                05 · Complexity vs hours
              </div>
              <ComplexityVsHours data={portfolio.scatter} />
            </section>
          </div>

          {/* Ranked project table */}
          <section>
            <div className="eyebrow text-[10px] text-muted mb-2">
              06 · All projects
            </div>
            <TopProjectsTable rows={portfolio.ranked} />
          </section>
        </div>
      )}
    </>
  );
}
