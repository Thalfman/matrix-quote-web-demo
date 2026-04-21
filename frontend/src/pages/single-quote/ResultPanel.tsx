import { Download, Save } from "lucide-react";
import { ExplainedQuoteResponse } from "@/api/types";
import { HeroEstimate } from "./HeroEstimate";
import { ResultTabs } from "./ResultTabs";
import { ResultSkeleton } from "./ResultSkeleton";
import { Scenario } from "./Scenario";

type Props = {
  result: ExplainedQuoteResponse | null;
  isLoading: boolean;
  scenarios: Scenario[];
  onSaveScenario: () => void;
  onExportPdf: () => void;
  onRemoveScenario: (id: string) => void;
  onCompare: () => void;
  hideSaveExport?: boolean;
};

export function ResultPanel({
  result,
  isLoading,
  scenarios,
  onSaveScenario,
  onExportPdf,
  onRemoveScenario,
  onCompare,
  hideSaveExport = false,
}: Props) {
  if (isLoading) return <ResultSkeleton />;

  if (!result) {
    return (
      <div className="card p-8">
        <div className="eyebrow text-[11px] text-muted">Results</div>
        <p className="display-hero text-xl mt-3 text-ink">
          Fill the form and generate an estimate.
        </p>
        <p className="mt-1 text-sm text-muted">
          You'll see confidence intervals, drivers, and similar past projects here.
        </p>
      </div>
    );
  }

  const opsCount = result.drivers?.filter((d) => d.available).length ?? 0;

  return (
    <div className="space-y-4" id="quote-results">
      <HeroEstimate result={result} />
      <ResultTabs
        result={result}
        scenarios={scenarios}
        onRemoveScenario={onRemoveScenario}
        onCompare={onCompare}
      />
      {!hideSaveExport && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveScenario}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-ink text-ink text-sm font-medium rounded-sm hover:bg-ink hover:text-white transition-colors"
          >
            <Save size={16} strokeWidth={1.75} aria-hidden="true" />
            Save scenario
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal text-white text-sm font-medium rounded-sm hover:bg-tealDark transition-colors"
          >
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            Export PDF
          </button>
        </div>
      )}
      <div className="flex items-center justify-between text-[11px] text-muted mono px-1">
        <span>model · current</span>
        <span>{opsCount} ops</span>
      </div>
    </div>
  );
}
