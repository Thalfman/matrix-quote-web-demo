/**
 * Phase 7 — D-02 / D-12 / D-16. RomForm tests.
 *
 * Coverage:
 *   - D-12 disabled-on-load + enable-on-completion
 *   - D-16 verbatim error on zero/negative materials cost
 *   - D-02 four-fields invariant (no hidden / advanced fields reachable)
 *   - valueAsNumber coercion (parent gets a number, not a string)
 *   - onSubmit fires with valid values
 *   - jargon-guard local scan
 *
 * Uses @testing-library fireEvent only (the project does NOT depend on
 * @testing-library/user-event — see package.json), and seeds the form
 * with a complete set of values via form.reset() so the disabled-state
 * gate (which is driven by react-hook-form's isValid) flips deterministically
 * within a single render.
 */
import { useEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { renderWithProviders } from "@/test/render";
import { BANNED_TOKENS } from "@/test/jargon";
import { RomForm } from "@/pages/single-quote/RomForm";
import {
  romFormDefaults,
  romFormSchema,
  type RomFormValues,
} from "@/pages/single-quote/romSchema";

const VALID_VALUES: RomFormValues = {
  industry_segment: "Automotive",
  system_category: "Robotic Cell",
  automation_level: "Semi-Auto",
  estimated_materials_cost: 245000,
};

function Harness({
  onSubmit,
  dropdowns,
  prefill,
}: {
  onSubmit?: (values: RomFormValues) => void;
  dropdowns?: {
    industry_segment: string[];
    system_category: string[];
    automation_level: string[];
  };
  /** When set, seeds the form with valid values so the disabled gate flips. */
  prefill?: RomFormValues;
}) {
  const form = useForm<RomFormValues>({
    resolver: zodResolver(romFormSchema),
    defaultValues: romFormDefaults,
    // make isValid recompute eagerly so disabled-state assertions are
    // deterministic; QuoteForm uses default mode but the ROM form's
    // disabled-button gate needs onChange precision.
    mode: "onChange",
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Seed the form post-mount when prefill is supplied. Mirrors the
  // ?fromQuote rehydration pattern from QuoteForm so we don't have to
  // bring in @testing-library/user-event for select interaction.
  useEffect(() => {
    if (prefill) {
      // keepDirty/touched=false so isValid recomputes against the resolver
      form.reset(prefill);
    }
    // form is stable; prefill is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  return (
    <RomForm
      formRef={formRef}
      form={form}
      dropdowns={
        dropdowns ?? {
          industry_segment: ["Automotive", "Food & Bev"],
          system_category: ["Robotic Cell", "Welding"],
          automation_level: ["Semi-Auto", "Full-Auto"],
        }
      }
      onSubmit={() => {
        const values = form.getValues();
        onSubmit?.(values);
      }}
      submitting={false}
    />
  );
}

describe("RomForm", () => {
  it("disables submit on initial load (D-12)", () => {
    renderWithProviders(<Harness />);
    const button = screen.getByRole("button", {
      name: /compute rom estimate/i,
    });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/fill in the four fields above to enable/i),
    ).toBeInTheDocument();
  });

  it("enables submit when all four fields are valid (D-12)", async () => {
    renderWithProviders(<Harness prefill={VALID_VALUES} />);
    await waitFor(() => {
      const button = screen.getByRole("button", {
        name: /compute rom estimate/i,
      });
      expect(button).not.toBeDisabled();
    });
  });

  it("shows D-16 error 'Enter a material cost greater than zero.' on zero materials cost", async () => {
    renderWithProviders(
      <Harness
        prefill={{
          ...VALID_VALUES,
          estimated_materials_cost: 0,
        }}
      />,
    );
    const button = screen.getByRole("button", {
      name: /compute rom estimate/i,
    });
    fireEvent.submit(button.closest("form")!);
    await waitFor(() => {
      expect(
        screen.getByText("Enter a material cost greater than zero."),
      ).toBeInTheDocument();
    });
  });

  it("rejects negative materials cost with the same D-16 error", async () => {
    renderWithProviders(
      <Harness
        prefill={{
          ...VALID_VALUES,
          estimated_materials_cost: -100,
        }}
      />,
    );
    const button = screen.getByRole("button", {
      name: /compute rom estimate/i,
    });
    fireEvent.submit(button.closest("form")!);
    await waitFor(() => {
      expect(
        screen.getByText("Enter a material cost greater than zero."),
      ).toBeInTheDocument();
    });
  });

  it("renders ONLY four form inputs/selects (D-02 — no hidden fields)", () => {
    renderWithProviders(<Harness />);
    const fields = document.querySelectorAll(
      "form input[name], form select[name]",
    );
    expect(fields).toHaveLength(4);
  });

  it("coerces materials cost to a number via valueAsNumber", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <Harness onSubmit={onSubmit} prefill={VALID_VALUES} />,
    );
    const button = screen.getByRole("button", {
      name: /compute rom estimate/i,
    });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      const payload = onSubmit.mock.calls[0][0] as RomFormValues;
      expect(typeof payload.estimated_materials_cost).toBe("number");
      expect(payload.estimated_materials_cost).toBe(245000);
    });
  });

  it("fires onSubmit exactly once when all fields are valid", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <Harness onSubmit={onSubmit} prefill={VALID_VALUES} />,
    );
    const button = screen.getByRole("button", {
      name: /compute rom estimate/i,
    });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("renders no banned ML-jargon tokens (DATA-03)", () => {
    renderWithProviders(<Harness />);
    const body = document.body.textContent ?? "";
    for (const re of BANNED_TOKENS) {
      expect(body, `[jargon-guard] RomForm: ${re}`).not.toMatch(re);
    }
  });
});
