/**
 * VisionRowsField component tests — exercises the first useFieldArray
 * consumer in the repo against a real useForm harness so field-array
 * mutations actually flow through form state (not mocked react-hook-form).
 *
 * Covers (Plan 06-03 success criteria):
 *  1. Empty state ("No vision systems on this project." + Add button, no Remove buttons)
 *  2. Add appends a row with default { type: visionTypeOptions[0], count: 1 } (asserted on form state)
 *  3. Pre-populated rows render one Remove per row; Remove drops by index
 *  4. Add+Add+Remove leaves exactly 1 row
 *  5. Pre-populated row 0 type Select reflects the visionRows[0].type default
 *  6. Empty visionTypeOptions disables the Add button (no row can be added
 *     without a model-vocabulary value to insert)
 */
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { renderWithProviders } from "@/test/render";

import { VisionRowsField } from "../VisionRowsField";
import {
  quoteFormSchema,
  quoteFormDefaults,
  type QuoteFormValues,
  type VisionRow,
} from "../schema";

const DEFAULT_OPTIONS = ["Cognex 2D", "3D Vision", "Keyence IV3"];

// Real useForm harness so useFieldArray actually mutates state under the test.
function Harness({
  defaultRows,
  exposeForm,
  options = DEFAULT_OPTIONS,
}: {
  defaultRows?: VisionRow[];
  exposeForm?: (form: UseFormReturn<QuoteFormValues>) => void;
  options?: string[];
}) {
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { ...quoteFormDefaults, visionRows: defaultRows ?? [] },
    mode: "onChange",
  });
  exposeForm?.(form);
  return <VisionRowsField control={form.control} visionTypeOptions={options} />;
}

describe("VisionRowsField", () => {
  it("renders the empty state when visionRows is empty", () => {
    renderWithProviders(<Harness defaultRows={[]} />);
    expect(
      screen.getByText(/no vision systems on this project/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add vision system/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove vision system/i }),
    ).not.toBeInTheDocument();
  });

  it("Add appends a new row using the first visionTypeOptions value as the default", () => {
    let formRef: UseFormReturn<QuoteFormValues> | null = null;
    renderWithProviders(
      <Harness
        defaultRows={[]}
        exposeForm={(f) => {
          formRef = f;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /add vision system/i }));
    // Empty-state copy disappears.
    expect(
      screen.queryByText(/no vision systems on this project/i),
    ).not.toBeInTheDocument();
    // One Remove button now exists.
    expect(
      screen.getAllByRole("button", { name: /remove vision system/i }),
    ).toHaveLength(1);
    // Form state has one row whose type is the first option from the
    // dropdown vocabulary (data-driven, not hard-coded "2D").
    expect(formRef!.getValues("visionRows")).toEqual([
      { type: "Cognex 2D", count: 1 },
    ]);
  });

  it("renders one row per visionRows entry; Remove drops by index", () => {
    let formRef: UseFormReturn<QuoteFormValues> | null = null;
    renderWithProviders(
      <Harness
        defaultRows={[
          { type: "Cognex 2D", count: 2 },
          { type: "3D Vision", count: 1 },
        ]}
        exposeForm={(f) => {
          formRef = f;
        }}
      />,
    );
    expect(
      screen.getAllByRole("button", { name: /remove vision system/i }),
    ).toHaveLength(2);
    const removes = screen.getAllByRole("button", {
      name: /remove vision system/i,
    });
    fireEvent.click(removes[0]);
    expect(
      screen.getAllByRole("button", { name: /remove vision system/i }),
    ).toHaveLength(1);
    expect(formRef!.getValues("visionRows")).toEqual([
      { type: "3D Vision", count: 1 },
    ]);
  });

  it("Add+Add+Remove leaves exactly 1 row", () => {
    let formRef: UseFormReturn<QuoteFormValues> | null = null;
    renderWithProviders(
      <Harness
        defaultRows={[]}
        exposeForm={(f) => {
          formRef = f;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /add vision system/i }));
    fireEvent.click(screen.getByRole("button", { name: /add vision system/i }));
    expect(
      screen.getAllByRole("button", { name: /remove vision system/i }),
    ).toHaveLength(2);
    fireEvent.click(
      screen.getAllByRole("button", { name: /remove vision system/i })[0],
    );
    expect(formRef!.getValues("visionRows")).toHaveLength(1);
  });

  it("type Select on row 0 reflects the visionRows[0].type default", () => {
    renderWithProviders(<Harness defaultRows={[{ type: "3D Vision", count: 5 }]} />);
    // The Select renders inside Field("Vision type"). Find by role+accessible name.
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("3D Vision");
  });

  it("Add button is disabled when visionTypeOptions is empty", () => {
    // Defensive UX: if /catalog/dropdowns hasn't loaded (or returns no
    // vision_type vocabulary), the Add button must not insert a row with an
    // empty / arbitrary string — the picker disables itself instead.
    renderWithProviders(<Harness defaultRows={[]} options={[]} />);
    const add = screen.getByRole("button", { name: /add vision system/i });
    expect(add).toBeDisabled();
  });
});
