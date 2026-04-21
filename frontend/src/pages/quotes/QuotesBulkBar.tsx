import { X } from "lucide-react";

type Props = {
  selectedCount: number;
  onCompare: () => void;
  onClear: () => void;
  canCompare: boolean;
};

export function QuotesBulkBar({ selectedCount, onCompare, onClear, canCompare }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 bg-ink text-white px-4 py-2.5 rounded-sm mb-3">
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="text-white/70 hover:text-white"
      >
        <X size={14} strokeWidth={2} />
      </button>
      <div className="mono text-sm font-semibold">{selectedCount} selected</div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onCompare}
        disabled={!canCompare}
        className={
          "text-sm font-medium transition-colors " +
          (canCompare ? "text-amber hover:text-amber/80" : "text-white/30 cursor-not-allowed")
        }
      >
        {canCompare ? "Compare →" : "Pick 2 or 3 to compare"}
      </button>
    </div>
  );
}
