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
      <div role="tablist" className="flex items-center border-b hairline">
        {TABS.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={
                "flex-1 px-4 py-3 text-sm border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 justify-center " +
                (selected
                  ? "border-teal text-ink font-medium"
                  : "border-transparent text-muted hover:text-ink")
              }
            >
              <span>{t.label}</span>
              {t.id === "scenarios" && scenarios.length > 0 && (
                <span
                  aria-label={`${scenarios.length} saved`}
                  className="mono text-[10px] bg-ink text-white rounded-full w-4 h-4 grid place-items-center"
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
