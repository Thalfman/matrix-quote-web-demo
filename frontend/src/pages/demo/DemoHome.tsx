import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { DEMO_ASSETS } from "@/lib/demoMode";
import { PageHeader } from "@/components/PageHeader";

type Manifest = {
  built_at: string;
  real_count: number;
  synthetic_count: number;
};

export function DemoHome() {
  const { data: manifest } = useQuery<Manifest>({
    queryKey: ["demo", "manifest"],
    queryFn: async () => {
      const res = await fetch(`${DEMO_ASSETS}/manifest.json`);
      if (!res.ok) throw new Error(`manifest.json ${res.status}`);
      return res.json();
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Matrix · Demo"
        title="Pick a tool"
        description="Two ways to explore the quoting engine. The comparison tool is driven by real historical projects. The machine-learning tool runs the trained models live in your browser via Pyodide."
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Link
          to="/compare-tool"
          className="card p-6 flex flex-col gap-4 hover:border-teal transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow text-[11px] text-teal">Comparison · Real data</span>
            <span className="text-[10px] eyebrow px-2 py-1 rounded-sm bg-tealSoft text-tealDark">
              {manifest ? `${manifest.real_count} projects` : "loading…"}
            </span>
          </div>
          <h2 className="display-hero text-2xl leading-none">Comparison Quote Tool</h2>
          <p className="text-sm text-muted">
            Browse 20–30 real projects side-by-side, or enter your own inputs and surface
            the three closest matches from the historical pool.
          </p>
          <div className="mt-auto text-xs text-teal font-medium">Open →</div>
        </Link>

        <Link
          to="/ml-tool"
          className="card p-6 flex flex-col gap-4 hover:border-teal transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow text-[11px] text-amber">Machine Learning · Synthetic</span>
            <span className="text-[10px] eyebrow px-2 py-1 rounded-sm bg-amberSoft text-ink">
              {manifest ? `${manifest.synthetic_count} synthetic rows` : "loading…"}
            </span>
          </div>
          <h2 className="display-hero text-2xl leading-none">Machine Learning Quote Tool</h2>
          <p className="text-sm text-muted">
            Fill in project parameters and let 12 Gradient Boosting models (running in your
            browser via Pyodide) predict hours with P10–P90 confidence intervals.
          </p>
          <div className="mt-auto text-xs text-amber font-medium">Open →</div>
        </Link>
      </div>
    </>
  );
}
