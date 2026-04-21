import { act, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { renderWithProviders } from "@/test/render";
import { DEFAULT_FILTER } from "./insightsFilterDefaults";
import { InsightsFilters } from "./InsightsFilters";
import type { InsightsFilterState } from "./InsightsFilters";

const INDUSTRIES = ["Automotive", "Food & Bev", "Pharma"];
const CATEGORIES = ["Assembly", "Welding", "Palletizing"];

function makeFilter(overrides: Partial<InsightsFilterState> = {}): InsightsFilterState {
  return { ...DEFAULT_FILTER, ...overrides };
}

describe("InsightsFilters — chip rendering", () => {
  it("renders all industry chips in the provided order", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={onChange}
        availableIndustries={INDUSTRIES}
        availableCategories={CATEGORIES}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /automotive|food & bev|pharma/i });
    const labels = buttons.map((b) => b.textContent);
    expect(labels).toContain("Automotive");
    expect(labels).toContain("Food & Bev");
    expect(labels).toContain("Pharma");
  });

  it("renders all category chips", () => {
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={vi.fn()}
        availableIndustries={[]}
        availableCategories={CATEGORIES}
        totalCount={5}
        filteredCount={5}
      />,
    );
    expect(screen.getByRole("button", { name: "Assembly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Welding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Palletizing" })).toBeInTheDocument();
  });

  it("does not render industry section when availableIndustries is empty", () => {
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={vi.fn()}
        availableIndustries={[]}
        availableCategories={CATEGORIES}
        totalCount={5}
        filteredCount={5}
      />,
    );
    expect(screen.queryByRole("button", { name: "Automotive" })).not.toBeInTheDocument();
  });
});

describe("InsightsFilters — industry chip toggle", () => {
  it("clicking an inactive industry chip calls onChange with that industry added", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={onChange}
        availableIndustries={INDUSTRIES}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Automotive" }));
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.industries.has("Automotive")).toBe(true);
  });

  it("clicking an active industry chip calls onChange with that industry removed", () => {
    const onChange = vi.fn();
    const filter = makeFilter({ industries: new Set(["Automotive"]) });
    renderWithProviders(
      <InsightsFilters
        filter={filter}
        onChange={onChange}
        availableIndustries={INDUSTRIES}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Automotive" }));
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.industries.has("Automotive")).toBe(false);
  });

  it("aria-pressed is true for an active industry chip", () => {
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter({ industries: new Set(["Food & Bev"]) })}
        onChange={vi.fn()}
        availableIndustries={INDUSTRIES}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const chip = screen.getByRole("button", { name: "Food & Bev" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("aria-pressed is false for an inactive industry chip", () => {
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={vi.fn()}
        availableIndustries={INDUSTRIES}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const chip = screen.getByRole("button", { name: "Automotive" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });
});

describe("InsightsFilters — category chip toggle", () => {
  it("clicking an inactive category chip calls onChange with category added", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={onChange}
        availableIndustries={[]}
        availableCategories={CATEGORIES}
        totalCount={5}
        filteredCount={5}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Assembly" }));
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.categories.has("Assembly")).toBe(true);
  });

  it("clicking an active category chip calls onChange with category removed", () => {
    const onChange = vi.fn();
    const filter = makeFilter({ categories: new Set(["Welding"]) });
    renderWithProviders(
      <InsightsFilters
        filter={filter}
        onChange={onChange}
        availableIndustries={[]}
        availableCategories={CATEGORIES}
        totalCount={5}
        filteredCount={5}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Welding" }));
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.categories.has("Welding")).toBe(false);
  });

  it("aria-pressed flips correctly on active category chip", () => {
    const filter = makeFilter({ categories: new Set(["Assembly"]) });
    renderWithProviders(
      <InsightsFilters
        filter={filter}
        onChange={vi.fn()}
        availableIndustries={[]}
        availableCategories={CATEGORIES}
        totalCount={5}
        filteredCount={5}
      />,
    );
    expect(screen.getByRole("button", { name: "Assembly" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Welding" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("InsightsFilters — complexity slider", () => {
  it("changing the min slider emits onChange with updated complexityMin", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={onChange}
        availableIndustries={[]}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const minSlider = screen.getByRole("slider", { name: /minimum complexity/i });
    fireEvent.change(minSlider, { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.complexityMin).toBe(3);
  });

  it("changing the max slider emits onChange with updated complexityMax", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={onChange}
        availableIndustries={[]}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const maxSlider = screen.getByRole("slider", { name: /maximum complexity/i });
    fireEvent.change(maxSlider, { target: { value: "4" } });
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.complexityMax).toBe(4);
  });

  it("setting min above current max clamps max up to match", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter({ complexityMin: 1, complexityMax: 2 })}
        onChange={onChange}
        availableIndustries={[]}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const minSlider = screen.getByRole("slider", { name: /minimum complexity/i });
    fireEvent.change(minSlider, { target: { value: "5" } });
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.complexityMin).toBe(5);
    expect(nextFilter.complexityMax).toBe(5);
  });
});

describe("InsightsFilters — debounced search input", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fire onChange immediately when search input changes", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={onChange}
        availableIndustries={[]}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const input = screen.getByRole("searchbox", { name: /search projects/i });
    fireEvent.change(input, { target: { value: "alpha" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("fires onChange after the 150ms debounce window", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={onChange}
        availableIndustries={[]}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const input = screen.getByRole("searchbox", { name: /search projects/i });
    fireEvent.change(input, { target: { value: "alpha" } });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.search).toBe("alpha");
  });

  it("only fires once even if the input changes multiple times within the debounce window", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={onChange}
        availableIndustries={[]}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    const input = screen.getByRole("searchbox", { name: /search projects/i });
    fireEvent.change(input, { target: { value: "a" } });
    act(() => vi.advanceTimersByTime(50));
    fireEvent.change(input, { target: { value: "al" } });
    act(() => vi.advanceTimersByTime(50));
    fireEvent.change(input, { target: { value: "alp" } });
    act(() => vi.advanceTimersByTime(150));
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.search).toBe("alp");
  });
});

describe("InsightsFilters — reset", () => {
  it("does not render Reset filters button when filter is default", () => {
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={vi.fn()}
        availableIndustries={INDUSTRIES}
        availableCategories={CATEGORIES}
        totalCount={10}
        filteredCount={10}
      />,
    );
    expect(screen.queryByRole("button", { name: /reset filters/i })).not.toBeInTheDocument();
  });

  it("renders Reset filters button when filter is non-default", () => {
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter({ industries: new Set(["Automotive"]) })}
        onChange={vi.fn()}
        availableIndustries={INDUSTRIES}
        availableCategories={CATEGORIES}
        totalCount={10}
        filteredCount={10}
      />,
    );
    expect(screen.getByRole("button", { name: /reset filters/i })).toBeInTheDocument();
  });

  it("clicking Reset filters calls onChange with the default filter state", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter({ industries: new Set(["Automotive"]), search: "foo" })}
        onChange={onChange}
        availableIndustries={INDUSTRIES}
        availableCategories={CATEGORIES}
        totalCount={10}
        filteredCount={10}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));
    expect(onChange).toHaveBeenCalledOnce();
    const nextFilter: InsightsFilterState = onChange.mock.calls[0][0];
    expect(nextFilter.industries.size).toBe(0);
    expect(nextFilter.categories.size).toBe(0);
    expect(nextFilter.complexityMin).toBe(1);
    expect(nextFilter.complexityMax).toBe(5);
    expect(nextFilter.search).toBe("");
  });
});

describe("InsightsFilters — showing counter", () => {
  it("displays filteredCount of totalCount projects", () => {
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={vi.fn()}
        availableIndustries={[]}
        availableCategories={[]}
        totalCount={42}
        filteredCount={17}
      />,
    );
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows the Showing N of M text", () => {
    renderWithProviders(
      <InsightsFilters
        filter={makeFilter()}
        onChange={vi.fn()}
        availableIndustries={[]}
        availableCategories={[]}
        totalCount={10}
        filteredCount={10}
      />,
    );
    expect(screen.getByText(/showing/i)).toBeInTheDocument();
  });
});
