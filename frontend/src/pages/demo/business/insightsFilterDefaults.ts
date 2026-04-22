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
