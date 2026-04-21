import type { InsightsFilterState } from "./InsightsFilters";

export const DEFAULT_FILTER: InsightsFilterState = {
  industries: new Set(),
  categories: new Set(),
  complexityMin: 1,
  complexityMax: 5,
  search: "",
};

export function isDefaultFilter(f: InsightsFilterState): boolean {
  return (
    f.industries.size === 0 &&
    f.categories.size === 0 &&
    f.complexityMin === 1 &&
    f.complexityMax === 5 &&
    f.search === ""
  );
}
