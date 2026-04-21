import { useInsightsOverview } from "@/api/quote";
import { PageHeader } from "@/components/PageHeader";

import { KpiCards } from "./insights/KpiCards";
import { QuotesActivityChart } from "./insights/QuotesActivityChart";
import { LatestQuotesTable } from "./insights/LatestQuotesTable";
import { AccuracyHeatmap } from "./insights/AccuracyHeatmap";

export function ExecutiveOverview() {
  const { data } = useInsightsOverview();

  return (
    <>
      <PageHeader
        eyebrow="Insights · Executive"
        title="Executive Overview"
        description="Pipeline activity, model accuracy, and per-operation trends at a glance."
      />

      <div className="mb-6">
        <KpiCards data={data} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Pipeline activity</div>
          <QuotesActivityChart rows={data?.quotes_activity ?? []} />
        </div>
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Latest saved</div>
          <LatestQuotesTable rows={data?.latest_quotes ?? []} />
        </div>
      </div>

      <div>
        <div className="eyebrow text-[10px] text-muted mb-2">Accuracy heatmap</div>
        <AccuracyHeatmap
          operations={data?.operations ?? []}
          quarters={data?.quarters ?? []}
          matrix={data?.accuracy_heatmap ?? []}
        />
      </div>
    </>
  );
}
