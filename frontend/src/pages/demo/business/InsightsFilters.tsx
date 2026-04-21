import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DEFAULT_FILTER, isDefaultFilter } from "./insightsFilterDefaults";

export type InsightsFilterState = {
  industries: Set<string>;
  categories: Set<string>;
  complexityMin: number;
  complexityMax: number;
  search: string;
};

type Props = {
  filter: InsightsFilterState;
  onChange: (next: InsightsFilterState) => void;
  availableIndustries: string[];
  availableCategories: string[];
  totalCount: number;
  filteredCount: number;
};

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-sm text-[11px] eyebrow",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1",
        active
          ? "bg-teal text-white"
          : "bg-line text-muted hover:bg-line2 hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

export function InsightsFilters({
  filter,
  onChange,
  availableIndustries,
  availableCategories,
  totalCount,
  filteredCount,
}: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const toggleIndustry = (name: string) => {
    const next = new Set(filter.industries);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange({ ...filter, industries: next });
  };

  const toggleCategory = (name: string) => {
    const next = new Set(filter.categories);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange({ ...filter, categories: next });
  };

  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filter, search: value });
    }, 150);
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_FILTER });
  };

  const isDefault = isDefaultFilter(filter);

  return (
    <div className="card p-4 mb-6 space-y-4 sticky top-4 z-10 bg-paper/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] text-muted mono tnum">
          Showing{" "}
          <span className="text-ink font-medium">{filteredCount}</span>
          {" "}of{" "}
          <span className="text-ink">{totalCount}</span>
          {" "}projects
        </div>
        {!isDefault && (
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              "inline-flex items-center gap-1 text-[11px] text-muted hover:text-danger",
              "transition-colors duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm",
            )}
          >
            <X size={12} strokeWidth={1.75} aria-hidden="true" />
            Reset filters
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <input
          type="search"
          placeholder="Search projects..."
          defaultValue={filter.search}
          onChange={(e) => handleSearch(e.target.value)}
          className={cn(
            "w-full text-sm px-3 py-2 rounded-sm border hairline bg-surface",
            "placeholder:text-muted text-ink",
            "focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-0",
            "transition-colors duration-150",
          )}
          aria-label="Search projects"
        />
      </div>

      {/* Industry chips */}
      {availableIndustries.length > 0 && (
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">Industry</div>
          <div className="flex flex-wrap gap-1.5">
            {availableIndustries.map((ind) => (
              <Chip
                key={ind}
                label={ind}
                active={filter.industries.has(ind)}
                onClick={() => toggleIndustry(ind)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category chips */}
      {availableCategories.length > 0 && (
        <div>
          <div className="eyebrow text-[10px] text-muted mb-2">System category</div>
          <div className="flex flex-wrap gap-1.5">
            {availableCategories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                active={filter.categories.has(cat)}
                onClick={() => toggleCategory(cat)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Complexity range */}
      <div>
        <div className="eyebrow text-[10px] text-muted mb-2">
          Complexity range:{" "}
          <span className="text-ink tnum">
            {filter.complexityMin}–{filter.complexityMax}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted mono">1</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={filter.complexityMin}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChange({
                ...filter,
                complexityMin: val,
                complexityMax: Math.max(val, filter.complexityMax),
              });
            }}
            className="flex-1 accent-teal"
            aria-label="Minimum complexity"
          />
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={filter.complexityMax}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChange({
                ...filter,
                complexityMax: val,
                complexityMin: Math.min(val, filter.complexityMin),
              });
            }}
            className="flex-1 accent-teal"
            aria-label="Maximum complexity"
          />
          <span className="text-[11px] text-muted mono">5</span>
        </div>
      </div>
    </div>
  );
}
