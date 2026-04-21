import {
  useCalibration,
  useMetricsHistory,
  usePerformanceHeadline,
} from "@/api/quote";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { MetricsSummary } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";

import { HeadlineKPIs } from "./performance/HeadlineKPIs";
import { MapeByOperation } from "./performance/MapeByOperation";
import { CalibrationScatter } from "./performance/CalibrationScatter";
import { TrainingHistoryChart } from "./performance/TrainingHistoryChart";

export function ModelPerformance() {
  const { data: summary } = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => (await api.get<MetricsSummary>("/metrics")).data,
  });
  const { data: headline } = usePerformanceHeadline();
  const { data: calibration } = useCalibration();
  const { data: history } = useMetricsHistory();

  return (
    <>
      <PageHeader
        eyebrow="Insights · Accuracy"
        title="Estimate Accuracy"
        description="How well the model predicts actuals across operations, confidence bands, and training runs."
      />

      <div className="mb-6">
        <HeadlineKPIs head={headline} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Per-operation MAPE</div>
          <MapeByOperation rows={summary?.metrics ?? []} />
        </div>
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Calibration</div>
          <CalibrationScatter points={calibration ?? []} />
        </div>
      </div>

      <div>
        <div className="eyebrow text-[10px] text-muted mb-2">Training history</div>
        <TrainingHistoryChart rows={history ?? []} />
      </div>
    </>
  );
}
