import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { renderWithProviders } from "@/test/render";
import { QuoteForm, parseQuotedHours } from "./QuoteForm";
import {
  quoteFormDefaults,
  quoteFormSchema,
  type QuoteFormValues,
} from "./schema";

// ---------------------------------------------------------------------------
// parseQuotedHours unit tests (BUG-01 helper coverage)
// ---------------------------------------------------------------------------

describe("parseQuotedHours", () => {
  it("parses 2,000 as 2000", () => {
    expect(parseQuotedHours("2,000")).toBe(2000);
  });
  it("parses 2000 as 2000", () => {
    expect(parseQuotedHours("2000")).toBe(2000);
  });
  it("parses 2,000.5 as 2000.5", () => {
    expect(parseQuotedHours("2,000.5")).toBe(2000.5);
  });
  it("parses 0 as 0", () => {
    expect(parseQuotedHours("0")).toBe(0);
  });
  it("returns null for empty string", () => {
    expect(parseQuotedHours("")).toBeNull();
  });
  it("returns null for whitespace-only string", () => {
    expect(parseQuotedHours("   ")).toBeNull();
  });
  it("returns null for non-numeric text", () => {
    expect(parseQuotedHours("abc")).toBeNull();
    expect(parseQuotedHours("1.2.3")).toBeNull();
  });
  it("returns null for negative numbers", () => {
    expect(parseQuotedHours("-50")).toBeNull();
    expect(parseQuotedHours("-1,000")).toBeNull();
  });
  it("tolerates irregular comma grouping (commas always strip)", () => {
    // Permissive parsing: we don't validate that commas land every 3 digits.
    // If digits + optional decimal still parse, accept.
    expect(parseQuotedHours("2,0,00")).toBe(2000);
    expect(parseQuotedHours("1,0")).toBe(10);
  });
  it("returns null for null/undefined input", () => {
    expect(parseQuotedHours(null)).toBeNull();
    expect(parseQuotedHours(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// QuoteForm component test — bug repro
// ---------------------------------------------------------------------------

// Defaults that pass zod validation so handleSubmit fires its callback.
// quoteFormDefaults has empty industry_segment / system_category /
// automation_level (requiredString); fill them so submit-path tests work.
const HARNESS_DEFAULTS: QuoteFormValues = {
  ...quoteFormDefaults,
  industry_segment: "Automotive",
  system_category: "Machine Tending",
  automation_level: "Robotic",
};

function Harness({
  onSubmit = () => undefined,
}: {
  onSubmit?: (q: Partial<Record<string, number>>) => void;
}) {
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: HARNESS_DEFAULTS,
  });
  return (
    <QuoteForm
      form={form}
      dropdowns={undefined}
      submitting={false}
      onSubmit={onSubmit}
    />
  );
}

function openComparePanel() {
  fireEvent.click(
    screen.getByRole("button", { name: /compare to your quoted hours/i }),
  );
}

describe("QuoteForm — compare to your quoted hours panel (BUG-01)", () => {
  it("does not crash when typing 2,000 into the ME bucket", () => {
    renderWithProviders(<Harness />);
    openComparePanel();
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    expect(() =>
      fireEvent.change(meInput, { target: { value: "2,000" } }),
    ).not.toThrow();
    expect(meInput.value).toBe("2,000");
  });

  it("does not crash for 2000 / 2,000.5 / empty / abc / -50", () => {
    renderWithProviders(<Harness />);
    openComparePanel();
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    for (const v of ["2000", "2,000.5", "", "abc", "-50"]) {
      expect(() =>
        fireEvent.change(meInput, { target: { value: v } }),
      ).not.toThrow();
      expect(meInput.value).toBe(v);
    }
  });

  it("preserves partial typing like '2,'", () => {
    renderWithProviders(<Harness />);
    openComparePanel();
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "2," } });
    expect(meInput.value).toBe("2,");
  });

  it("shows inline 'Enter a number' validation for non-numeric input", () => {
    renderWithProviders(<Harness />);
    openComparePanel();
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "abc" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
  });

  it("does not show inline validation for empty input", () => {
    renderWithProviders(<Harness />);
    openComparePanel();
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "abc" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
    fireEvent.change(meInput, { target: { value: "" } });
    expect(screen.queryByText(/enter a number/i)).not.toBeInTheDocument();
  });

  it("rejects negative numbers via inline validation", () => {
    renderWithProviders(<Harness />);
    openComparePanel();
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "-50" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
  });

  it("captures parsed value through to the onSubmit payload (2,000 → 2000)", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);
    openComparePanel();
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "2,000" } });
    fireEvent.click(
      screen.getByRole("button", { name: /regenerate estimate/i }),
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0] as Record<string, number>;
    expect(payload.ME).toBe(2000);
  });

  it("excludes invalid (non-numeric) buckets from submit payload", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);
    openComparePanel();
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "abc" } });
    fireEvent.click(
      screen.getByRole("button", { name: /regenerate estimate/i }),
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0] as Record<string, number>;
    expect(payload.ME).toBeUndefined();
  });

  it("excludes empty buckets from submit payload", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);
    fireEvent.click(
      screen.getByRole("button", { name: /regenerate estimate/i }),
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({}));
  });
});
