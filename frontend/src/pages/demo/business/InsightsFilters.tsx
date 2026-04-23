import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsNarrow } from "@/lib/useMediaQuery";
import {
  DEFAULT_FILTER,
  activeFilterCount,
  isDefaultFilter,
} from "./insightsFilterDefaults";

export type InsightsFilterState = {
  industries: Set<string>;
  categories: Set<string>;
  complexities: Set<number>;
  search: string;
};

const COMPLEXITY_LEVELS = [1, 2, 3, 4, 5] as const;

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
      aria-pressed={active}
      className={cn(
        "inline-flex items-center rounded-sm text-xs eyebrow",
        "px-3 py-2 md:px-2 md:py-1",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1 focus-visible:ring-offset-paper",
        active
          ? "bg-teal text-white hover:bg-tealDark"
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

  const toggleComplexity = (level: number) => {
    const next = new Set(filter.complexities);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    onChange({ ...filter, complexities: next });
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
  const activeCount = activeFilterCount(filter);
  const isNarrow = useIsNarrow();

  const summary = (
    <div className="flex items-center justify-between gap-x-4 gap-y-1.5 flex-wrap">
      <div className="eyebrow text-xs text-muted">
        Filters
        {activeCount > 0 && (
          <span
            className={cn(
              "ml-2 inline-flex items-center justify-center rounded-sm",
              "bg-teal text-white text-[10px] font-medium px-1.5 py-0.5 tracking-normal normal-case",
            )}
            aria-label={`${activeCount} active filter${activeCount === 1 ? "" : "s"}`}
          >
            {activeCount}
          </span>
        )}
        <span className="ml-2 mono tnum normal-case tracking-normal text-muted">
          Showing{" "}
          <span className="text-ink font-medium">{filteredCount}</span>
          {" "}of{" "}
          <span className="text-ink">{totalCount}</span>
          {" "}projects
        </span>
      </div>
      {!isDefault && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleReset();
          }}
          className={cn(
            "inline-flex items-center gap-1 text-sm text-muted hover:text-danger",
            "transition-colors duration-150 ease-out rounded-sm px-1 -mx-1",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
          )}
        >
          <X size={12} strokeWidth={1.75} aria-hidden="true" />
          Reset filters
        </button>
      )}
    </div>
  );

  const body = (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          type="search"
          placeholder="Search projects..."
          defaultValue={filter.search}
          onChange={(e) => handleSearch(e.target.value)}
          className={cn(
            "w-full text-sm pl-8 pr-3 py-2 rounded-sm border hairline bg-surface",
            "placeholder:text-muted text-ink",
            "focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-0 focus:border-teal",
            "transition-colors duration-150",
          )}
          aria-label="Search projects"
        />
      </div>

      {/* Industry chips */}
      {availableIndustries.length > 0 && (
        <div>
          <div className="eyebrow text-xs text-muted mb-2">Industry</div>
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
          <div className="eyebrow text-xs text-muted mb-2">System category</div>
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

      {/* Complexity levels */}
      <div>
        <div className="flex items-baseline justify-between mb-2 gap-2">
          <div className="eyebrow text-xs text-muted">Complexity</div>
          <div className="text-xs text-muted">
            {filter.complexities.size === 0
              ? "All levels"
              : `${filter.complexities.size} of 5 selected`}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMPLEXITY_LEVELS.map((level) => (
            <Chip
              key={level}
              label={`Level ${level}`}
              active={filter.complexities.has(level)}
              onClick={() => toggleComplexity(level)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const wrapperClass = cn(
    "card p-4 mb-6 md:sticky md:top-4 md:z-20",
    "bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80",
    "shadow-[0_1px_0_rgba(13,27,42,0.04)]",
  );

  if (isNarrow) {
    return (
      <details className={cn(wrapperClass, "group")}>
        <summary
          className={cn(
            "list-none cursor-pointer -m-4 p-4 rounded-sm",
            "flex items-center justify-between gap-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
          )}
        >
          <div className="min-w-0 flex-1">{summary}</div>
          <span
            aria-hidden="true"
            className={cn(
              "shrink-0 text-muted text-xs transition-transform duration-150 ease-out",
              "group-open:rotate-180",
            )}
          >
            ▾
          </span>
        </summary>
        <div className="mt-4">{body}</div>
      </details>
    );
  }

  return (
    <div className={cn(wrapperClass, "space-y-4")}>
      {summary}
      {body}
    </div>
  );
}
