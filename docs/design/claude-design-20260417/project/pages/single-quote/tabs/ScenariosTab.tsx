// frontend/src/pages/single-quote/tabs/ScenariosTab.tsx
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
      <div className="text-sm text-muted dark:text-muted-dark">
        No scenarios saved yet this session. Click{" "}
        <span className="text-ink dark:text-ink-dark font-medium">Save scenario</span>{" "}
        to start building a comparison.
      </div>
    );
  }

  const canCompare = scenarios.length >= 2;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="card p-3 flex items-center gap-3 hover:border-steel-300 dark:hover:border-steel-600 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-ink dark:text-ink-dark truncate">{s.name}</div>
              <div className="text-xs text-muted dark:text-muted-dark">
                {new Date(s.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="numeric text-sm text-ink dark:text-ink-dark shrink-0">
              {formatHours(s.result.prediction.total_p50)} hrs
            </div>
            <button
              type="button"
              onClick={() => onRemove(s.id)}
              className="text-xs text-muted dark:text-muted-dark hover:text-danger transition-colors shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCompare}
          disabled={!canCompare}
          className={
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors " +
            (canCompare
              ? "bg-brand text-brand-foreground hover:bg-brand-hover"
              : "bg-steel-100 dark:bg-steel-700/40 text-muted dark:text-muted-dark cursor-not-allowed")
          }
        >
          Compare {scenarios.length} scenario{scenarios.length === 1 ? "" : "s"}
        </button>
        {!canCompare && (
          <span className="text-xs text-muted dark:text-muted-dark">
            need at least 2
          </span>
        )}
      </div>
    </div>
  );
}
