import type { InsightsFilterState } from "./InsightsFilters";

export const DEFAULT_FILTER: InsightsFilterState = {
  industries: new Set(),
  categories: new Set(),
  complexities: new Set(),
  search: "",
};

export function isDefaultFilter(f: InsightsFilterState): boolean {
  return (
    f.industries.size === 0 &&
    f.categories.size === 0 &&
    f.complexities.size === 0 &&
    f.search === ""
  );
}

export function activeFilterCount(f: InsightsFilterState): number {
  return (
    f.industries.size +
    f.categories.size +
    f.complexities.size +
    (f.search ? 1 : 0)
  );
}
