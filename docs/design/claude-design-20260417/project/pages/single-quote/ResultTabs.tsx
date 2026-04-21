// frontend/src/pages/single-quote/ResultTabs.tsx
import { useState } from "react";
import { ExplainedQuoteResponse } from "@/api/types";
import { EstimateTab } from "./tabs/EstimateTab";
import { DriversTab } from "./tabs/DriversTab";
import { SimilarTab } from "./tabs/SimilarTab";
import { ScenariosTab } from "./tabs/ScenariosTab";
import { Scenario } from "./Scenario";

type TabId = "estimate" | "drivers" | "similar" | "scenarios";

const TABS: { id: TabId; label: string }[] = [
  { id: "estimate",  label: "Estimate"  },
  { id: "drivers",   label: "Drivers"   },
  { id: "similar",   label: "Similar"   },
  { id: "scenarios", label: "Scenarios" },
];

export function ResultTabs({
  result,
  scenarios,
  onRemoveScenario,
  onCompare,
}: {
  result: ExplainedQuoteResponse;
  scenarios: Scenario[];
  onRemoveScenario: (id: string) => void;
  onCompare: () => void;
}) {
  const [active, setActive] = useState<TabId>("estimate");

  return (
    <div className="card">
      <div
        role="tablist"
        className="flex border-b border-border dark:border-border-dark px-1 sm:px-2"
      >
        {TABS.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={
                "inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px " +
                (selected
                  ? "text-ink dark:text-ink-dark font-semibold border-brand"
                  : "text-muted dark:text-muted-dark border-transparent hover:text-ink dark:hover:text-ink-dark")
              }
            >
              <span>{t.label}</span>
              {t.id === "scenarios" && scenarios.length > 0 && (
                <span
                  aria-label={`${scenarios.length} saved`}
                  className="inline-flex items-center justify-center min-w-[1.25rem] h-5 text-[10px] font-medium bg-brand text-brand-foreground rounded-full px-1.5 leading-none"
                >
                  {scenarios.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="p-5">
        {active === "estimate"  && <EstimateTab result={result} />}
        {active === "drivers"   && <DriversTab   drivers={result.drivers} />}
        {active === "similar"   && <SimilarTab   neighbors={result.neighbors} estimate={result.prediction.total_p50} />}
        {active === "scenarios" && <ScenariosTab scenarios={scenarios} onRemove={onRemoveScenario} onCompare={onCompare} />}
      </div>
    </div>
  );
}
