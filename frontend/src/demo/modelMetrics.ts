/** Fetches `model_metrics_{real|synthetic}.json` and exposes per-target R²/MAE data used by the adapter to compute confidence chips. */
import { useQuery } from "@tanstack/react-query";

import { DEMO_ASSETS } from "@/lib/demoMode";

export type ModelMetric = { target: string; rows: number; mae: number; r2: number };

export function useModelMetrics(dataset: "real" | "synthetic") {
  return useQuery<{ models: ModelMetric[] }>({
    queryKey: ["demo", "modelMetrics", dataset],
    queryFn: async () => {
      const res = await fetch(`${DEMO_ASSETS}/model_metrics_${dataset}.json`);
      if (!res.ok) throw new Error(`model_metrics_${dataset}.json ${res.status}`);
      return res.json() as Promise<{ models: ModelMetric[] }>;
    },
    staleTime: Infinity,
  });
}
