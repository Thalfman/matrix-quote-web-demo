import { Scenario } from "../Scenario";

function formatHours(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function ScenariosTab({
  scenarios,
  onRemove,
  onCompare,
}: {
  scenarios: Scenario[];
  onRemove: (id: string) => void;
  onCompare: () => void;
}) {
  if (scenarios.length === 0) {
    return (
      <div className="text-sm text-muted">
        No scenarios saved yet this session. Click{" "}
        <span className="text-ink font-medium">Save scenario</span> to start building a
        comparison.
      </div>
    );
  }

  const canCompare = scenarios.length >= 2;
  // "Current" = the most recently added scenario.
  const currentId = scenarios[scenarios.length - 1]?.id;

  return (
    <div>
      <div className="eyebrow text-[10px] text-muted mb-3">Saved this session</div>
      <div className="space-y-2">
        {scenarios.map((s) => {
          const isCurrent = s.id === currentId;
          return (
            <div
              key={s.id}
              className={
                "border hairline rounded-sm px-3 py-2.5 flex items-center gap-3 " +
                (isCurrent ? "ring-1 ring-teal/30" : "")
              }
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-ink">
                  {s.name}
                  {isCurrent && (
                    <span className="mono text-[10px] text-teal ml-2">current</span>
                  )}
                </div>
                <div className="text-[11px] text-muted mono">
                  {new Date(s.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="mono tnum text-sm text-ink">
                {formatHours(s.result.prediction.total_p50)}
              </div>
              <span className="text-[11px] text-muted">hrs</span>
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                className="text-[11px] text-muted hover:text-danger transition-colors ml-2"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onCompare}
        disabled={!canCompare}
        className={
          "mt-3 w-full text-sm py-2 rounded-sm transition-colors " +
          (canCompare
            ? "border border-ink text-ink hover:bg-ink hover:text-white"
            : "border hairline text-muted cursor-not-allowed")
        }
      >
        Compare {scenarios.length} scenario{scenarios.length === 1 ? "" : "s"} →
      </button>
      {!canCompare && (
        <div className="mt-1 text-[11px] text-muted text-center">
          Need at least 2 to compare
        </div>
      )}
    </div>
  );
}
