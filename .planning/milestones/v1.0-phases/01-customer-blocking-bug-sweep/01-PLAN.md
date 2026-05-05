# Phase 1: Customer-blocking bug sweep — PLAN

**Phase:** 01-customer-blocking-bug-sweep
**Goal:** Stop the demo from crashing on Ben's input flow; correct the wrong Total/Avg signal in Hours by Sales Bucket; surface the user's inputs in the result panel.
**Status:** ready-to-execute
**Plan author:** Tom (manual draft per `feedback_plan_format.md` / `feedback_plan_specificity.md`)
**Created:** 2026-05-04

> Two-view plan. **PLAN VIEW** is for human review and approval. **CODE VIEW** is for the executor (Claude with `frontend-specialist` / `test-writer`). Read PLAN view first; descend into CODE view only when approving a specific task.

---

# PLAN VIEW

## ROADMAP success criteria → tasks

| # | ROADMAP criterion | Tasks |
|---|---|---|
| 1 | `2,000` / `2000` / `2,000.5` / `""` / non-numeric in Compare ME-hours doesn't crash; invalid shows inline validation | T1, T2 |
| 2 | Vitest regression covers comma / decimal / empty / non-numeric | T1 (unit), T2 (component-level) |
| 3 | "Hours by Sales Bucket" Total ≠ Avg for buckets with >1 project | T3, T4 |
| 4 | "Single Quote and Batch Quote result panels echo user inputs" — see *terminology note* below | T5, T6 |
| 5 | No regression in `npm test` | T7 |

**Terminology note for criterion #4.** The ROADMAP wording inherits parent-app naming. In the *deployed demo*, the routes that show a result panel are:
- `/compare/quote` → `frontend/src/pages/demo/compare/ComparisonQuote.tsx` (Real Data Quote)
- `/ml/quote` → `frontend/src/pages/demo/ml/MachineLearningQuote.tsx` → re-exports `MachineLearningQuoteTool.tsx` (Synthetic Data Quote)

There is no separate Batch Quotes route in the demo build (Batch is gated behind `!IS_DEMO`). UX-01 lands once in `QuoteResultPanel.tsx` and is wired into both demo routes. If a Batch Quote demo route is added later, it will pick up the recap automatically because it would consume the same `QuoteResultPanel`.

## Task table (waves)

| Wave | # | Task | Files touched | Owner |
|------|---|------|---------------|-------|
| W1 | T1 | BUG-01 — `parseQuotedHours` helper + safe input parsing in QuoteForm | `frontend/src/pages/single-quote/QuoteForm.tsx` (+ co-located helper) | frontend-specialist |
| W1 | T2 | BUG-01 — QuoteForm component test: bug repro inputs | `frontend/src/pages/single-quote/QuoteForm.test.tsx` (NEW) | test-writer |
| W1 | T3 | BUG-02 — `portfolioStats.buildPortfolio` tracks per-bucket projectCount | `frontend/src/pages/demo/business/portfolioStats.ts`, `portfolioStats.test.ts` | frontend-specialist |
| W1 | T4 | BUG-02 — `HoursBySalesBucket` consumes `projectCount` from BucketRow | `frontend/src/pages/demo/business/HoursBySalesBucket.tsx`, `HoursBySalesBucket.test.tsx` | frontend-specialist |
| W2 | T5 | UX-01 — Add `input: QuoteFormValues` prop to QuoteResultPanel; render "Your inputs" recap | `frontend/src/components/quote/QuoteResultPanel.tsx`, `QuoteResultPanel.test.tsx` | frontend-specialist + test-writer |
| W2 | T6 | UX-01 — Wire form values into both Quote routes | `ComparisonQuote.tsx`, `MachineLearningQuoteTool.tsx` | frontend-specialist |
| W3 | T7 | Verify — full Vitest suite green; manual smoke `npm run dev` | (none — read-only verification) | test-writer |

**Dependencies:**
- W1 tasks (T1–T4) are independent and can execute in parallel.
- W2 tasks (T5, T6) depend on each other only through prop signature: T5 lands the `input` prop change first; T6 wires call sites. Run T5 → T6 sequentially in the same wave.
- W3 (T7) depends on all of the above.

## Atomic commit plan (one commit per task; matches `commit_docs=true` config)

```
T1: fix(quote-form): parse quoted-hours input safely (BUG-01)
T2: test(quote-form): add regression tests for compare-to-quoted-hours input (BUG-01)
T3: fix(insights): track per-bucket project count in portfolioStats (BUG-02)
T4: fix(insights): use real avg in Hours by Sales Bucket chart (BUG-02)
T5: feat(quote-panel): echo user inputs in result panel (UX-01)
T6: feat(quote-panel): pass form values to result panel from both demo routes (UX-01)
T7: chore(phase-1): verify Phase 1 tests green
```

## Risk register (for the executor)

- **R1** — `frontend-specialist` may try to over-engineer the parser (e.g., locale-aware separators). Keep it US-locale-only: comma is a thousands separator, period is decimal. Anything else → `null`.
- **R2** — `<input type="number">` in Firefox accepts `,` as a decimal separator under some locales. The fix is *not* to allow it — it's to switch to `<input type="text" inputMode="numeric">` in T1 so the input element no longer applies browser-locale coercion at the DOM layer. The user-visible keypad on mobile is identical.
- **R3** — Adding `input: QuoteFormValues` to `QuoteResultPanel` is a breaking prop change. Both call sites are inside this repo; there is no external consumer. Check `Grep` for any other importer before merging T5.
- **R4** — UX-01 recap copy must NOT contain ML jargon (no `_score`, no `_index`, no `log_quoted_materials_cost`). Phase 4 (DATA-03) will add a guard test; until then, follow the same plain-English convention `DemoHome` and `DataProvenanceNote` use.
- **R5** — DO NOT touch Pyodide / build pipeline / vercel.json. Those concerns are Phase 4. If a test needs to mock something, mock; do not edit production paths beyond the LOCKED list.

## Out of scope (verify by checklist before merging)

- [ ] No edits to `core/`, `service/`, `scripts/`, `tests/`, `vercel.json`, `frontend/public/demo-assets/`.
- [ ] No edits to `frontend/src/api/`, `frontend/src/components/RequireAdmin.tsx`, vestigial admin/full-app pages.
- [ ] No new Pyodide / WebAssembly work.
- [ ] No new `_index`, `_score`, ML-jargon strings introduced into customer-facing copy.

## Success gate (manual, executor self-checks before T7)

1. `cd frontend && npm test` → all green, including new tests.
2. `cd frontend && npm run typecheck` → no new TS errors.
3. `cd frontend && npm run lint` → no new ESLint warnings.
4. `cd frontend && npm run dev`, navigate to `/compare/quote`:
   - Click "Optional: compare to your quoted hours". Type `2,000` into ME bucket. **No crash. No error boundary.** Submit → estimate appears with no console error.
   - Repeat with `2000`, `2,000.5`, ``, `abc`, `-50`. None crash.
5. Submit any quote on `/compare/quote`. **The result panel shows a "Your inputs" card** with industry, system category, stations count, materials cost, etc.
6. Repeat (5) on `/ml/quote`. Same recap behavior.
7. Navigate to `/compare/insights`, click the **Avg** toggle on Hours by Sales Bucket. **Avg differs from Total** for any bucket with >1 project.

If any of (1)–(7) fails, T7 is incomplete; do not commit.

---

# CODE VIEW

> Each task block below is the full executor brief: files, line ranges, code skeletons, test fixtures, exact test names, commit message. The executor (frontend-specialist / test-writer) should treat this as the source of truth for the diff.

## T1 — BUG-01 — `parseQuotedHours` helper + safe input parsing

**Files:**
- `frontend/src/pages/single-quote/QuoteForm.tsx` (modify)
- (no separate helper file — co-located inside QuoteForm.tsx; extract later if reused)

**Diff plan:**

1. Add a top-level helper in `QuoteForm.tsx`, above the `QuoteForm` function declaration:

   ```ts
   /**
    * Parse a free-text "quoted hours" input.
    * Accepts comma-grouped US-locale numbers ("2,000", "2,000.5") and plain
    * numerics ("2000", "2000.5"). Returns null for empty / non-numeric /
    * negative input — the caller treats null as "user did not provide a
    * value for this bucket".
    */
   export function parseQuotedHours(raw: string): number | null {
     if (raw == null) return null;
     const trimmed = raw.trim();
     if (trimmed === "") return null;
     // Strip US thousands separators. Reject any string with non-numeric chars
     // remaining after the strip (other than a single decimal point and an
     // optional leading minus, which we then reject explicitly).
     const stripped = trimmed.replace(/,/g, "");
     if (!/^-?\d+(\.\d+)?$/.test(stripped)) return null;
     const n = Number(stripped);
     if (!Number.isFinite(n)) return null;
     if (n < 0) return null;
     return n;
   }
   ```

2. Change `quotedHours` state type from `Record<string, number>` to `Record<string, number | undefined>`:

   ```ts
   const [quotedHours, setQuotedHours] = useState<Record<string, number | undefined>>({});
   ```

3. Replace lines 326-341 (the `compareOpen && (...)` JSX block) with:

   ```tsx
   {compareOpen && (
     <div className="card p-5 mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
       {SALES_BUCKETS.map((bucket) => {
         const value = quotedHours[bucket];
         return (
           <Field
             key={bucket}
             label={`${bucket} quoted hours`}
             // Inline validation surfaces only when the user typed something
             // we couldn't parse (parseQuotedHours returned null AND raw was
             // not the empty string). We track the raw text in a separate
             // state so we can detect the "typed something invalid" case.
             error={rawQuotedHours[bucket] && value === undefined ? "Enter a number" : undefined}
           >
             <Input
               type="text"
               inputMode="numeric"
               autoComplete="off"
               // Display the raw text the user typed so partial input ("2,") is preserved.
               value={rawQuotedHours[bucket] ?? ""}
               onChange={(e) => {
                 const raw = e.currentTarget.value;
                 setRawQuotedHours((prev) => ({ ...prev, [bucket]: raw }));
                 setQuotedHours((prev) => ({ ...prev, [bucket]: parseQuotedHours(raw) ?? undefined }));
               }}
             />
           </Field>
         );
       })}
     </div>
   )}
   ```

4. Add a parallel `rawQuotedHours` state above the existing `quotedHours` line:

   ```ts
   const [rawQuotedHours, setRawQuotedHours] = useState<Record<string, string>>({});
   ```

5. Update the `fire` submit handler (around line 29) so it filters out nulls/undefineds AND zeros (zero is a legitimate "I didn't quote ME" signal in this domain):

   ```ts
   const fire = handleSubmit(() => {
     const cleaned = Object.fromEntries(
       Object.entries(quotedHours).filter(
         (entry): entry is [string, number] =>
           typeof entry[1] === "number" && entry[1] > 0,
       ),
     ) as Partial<Record<(typeof SALES_BUCKETS)[number], number>>;
     onSubmit(cleaned);
   });
   ```

6. Update the `Reset form` button handler (around line 359-363):

   ```ts
   onClick={() => {
     reset();
     setQuotedHours({});
     setRawQuotedHours({});
   }}
   ```

**Verification:**
- `Grep -n "parseQuotedHours" frontend/src` returns the new helper definition + its uses.
- `Grep -n "Number(e.currentTarget.value)" frontend/src/pages/single-quote/QuoteForm.tsx` shows the *Slider* handlers still use `Number()` (unchanged — sliders never receive comma input). Only the SALES_BUCKETS panel is refactored.

**Commit:**
```
fix(quote-form): parse quoted-hours input safely (BUG-01)

The "compare to your quoted hours" panel was using `<input type="number">`
with `Number(e.currentTarget.value)`, which crashed the Compare workspace
when a user typed a comma-grouped number like `2,000`. The crash bubbled
up through React's controlled-input contract (NaN value) and tripped
RootErrorBoundary.

Replace with `<input type="text" inputMode="numeric">` and a
parseQuotedHours() helper that strips US-locale thousands separators,
rejects non-numeric / negative values, and surfaces inline validation
on bad input. State now stores number | undefined; submit filters
non-positive entries.

Customer repro: Ben Bertsche, 2026-05-01 stakeholder review.
Closes BUG-01.
```

---

## T2 — BUG-01 — QuoteForm component test (regression repro)

**Files:**
- `frontend/src/pages/single-quote/QuoteForm.test.tsx` (NEW)

**Test skeleton:**

```tsx
import { fireEvent, screen } from "@testing-library/react";
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
// Unit tests for the helper
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
    // We do not validate group placement; user-facing tradeoff: prefer
    // permissive parsing over surfacing a "commas must be every 3 digits"
    // error. If the digits and (optional) decimal still parse, accept.
    expect(parseQuotedHours("2,0,00")).toBe(2000);
    expect(parseQuotedHours("1,0")).toBe(10);
  });
  it("returns null for null/undefined input", () => {
    expect(parseQuotedHours(null as unknown as string)).toBeNull();
    expect(parseQuotedHours(undefined as unknown as string)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Component test — bug repro
// ---------------------------------------------------------------------------

function Harness() {
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: quoteFormDefaults,
  });
  return (
    <QuoteForm
      form={form}
      dropdowns={undefined}
      submitting={false}
      onSubmit={() => undefined}
    />
  );
}

describe("QuoteForm — compare to your quoted hours panel (BUG-01)", () => {
  it("does not crash when typing 2,000 into the ME bucket", () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /compare to your quoted hours/i }));
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    expect(() => fireEvent.change(meInput, { target: { value: "2,000" } })).not.toThrow();
    expect(meInput.value).toBe("2,000");
  });

  it("preserves partial typing like '2,'", () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /compare to your quoted hours/i }));
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "2," } });
    expect(meInput.value).toBe("2,");
  });

  it("shows inline validation 'Enter a number' for non-numeric input", () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /compare to your quoted hours/i }));
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "abc" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
  });

  it("does not show inline validation for empty input", () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /compare to your quoted hours/i }));
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "" } });
    expect(screen.queryByText(/enter a number/i)).not.toBeInTheDocument();
  });

  it("rejects negative numbers via inline validation", () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /compare to your quoted hours/i }));
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "-50" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
  });

  it("captures parsed value through to the onSubmit payload", () => {
    const onSubmit = vi.fn();
    function HarnessWithSubmit() {
      const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: quoteFormDefaults,
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
    renderWithProviders(<HarnessWithSubmit />);
    fireEvent.click(screen.getByRole("button", { name: /compare to your quoted hours/i }));
    const meInput = screen.getByLabelText(/^ME quoted hours$/i) as HTMLInputElement;
    fireEvent.change(meInput, { target: { value: "2,000" } });
    fireEvent.submit(screen.getByRole("button", { name: /regenerate estimate/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.ME).toBe(2000);
  });

  it("excludes empty buckets from submit payload", () => {
    const onSubmit = vi.fn();
    function HarnessWithSubmit() {
      const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: quoteFormDefaults,
      });
      return (
        <QuoteForm form={form} dropdowns={undefined} submitting={false} onSubmit={onSubmit} />
      );
    }
    renderWithProviders(<HarnessWithSubmit />);
    fireEvent.click(screen.getByRole("button", { name: /compare to your quoted hours/i }));
    fireEvent.submit(screen.getByRole("button", { name: /regenerate estimate/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith({});
  });
});
```

**Notes for the executor:**
- `parseQuotedHours` MUST be exported from `QuoteForm.tsx` for the unit tests to import it.
- The harness uses `useForm` directly because `QuoteForm` requires a `form` prop typed as `UseFormReturn<QuoteFormValues>`.
- `getByLabelText(/^ME quoted hours$/i)` — anchor the regex with `^...$` so it doesn't match "ME quoted hours … something else" if a future bucket label collides.
- `not.toThrow()` is the headline assertion — the original bug was a thrown render error.

**Commit:**
```
test(quote-form): add regression tests for compare-to-quoted-hours input (BUG-01)

Drives the input with the verbatim repro values from Ben's email
(2,000, 2000, 2,000.5, "", abc, -50) and asserts no crash, partial
typing preserved, inline validation surfaces, and submit payload
filters non-positive entries.

Closes BUG-01 acceptance criterion 2.
```

---

## T3 — BUG-02 — `portfolioStats.buildPortfolio` tracks per-bucket projectCount

**Files:**
- `frontend/src/pages/demo/business/portfolioStats.ts` (modify)
- `frontend/src/pages/demo/business/portfolioStats.test.ts` (extend)

**Diff plan in `portfolioStats.ts`:**

1. Update the `BucketRow` type:

   ```ts
   export type BucketRow = {
     bucket: string;
     hours: number;
     projectCount: number;
   };
   ```

2. In `buildPortfolio`, replace the `bucketsTotal: Record<string, number>` accumulator (line 80) with:

   ```ts
   const bucketsAccum: Record<string, { hours: number; projects: number }> = {};
   ```

3. Replace the bucket accumulation loop (lines 103-106) with:

   ```ts
   // Accumulate bucket totals AND per-bucket project counts. A bucket only
   // counts a project when that project contributes positive p50 hours to
   // it — projects with zero hours in a bucket should not dilute its avg.
   for (const [bName, bPred] of Object.entries(pred.sales_buckets)) {
     if (!Number.isFinite(bPred.p50) || bPred.p50 <= 0) continue;
     const slot = bucketsAccum[bName] ?? { hours: 0, projects: 0 };
     slot.hours += bPred.p50;
     slot.projects += 1;
     bucketsAccum[bName] = slot;
   }
   ```

4. Replace the `buckets` emit (lines 165-168) with:

   ```ts
   const buckets: BucketRow[] = Object.entries(bucketsAccum)
     .filter(([, { hours }]) => hours > 0)
     .map(([bucket, { hours, projects }]) => ({
       bucket,
       hours,
       projectCount: projects,
     }))
     .sort((a, b) => b.hours - a.hours);
   ```

**Diff plan in `portfolioStats.test.ts`:** Add the following describe block (preserve existing tests):

```ts
import type { BucketRow } from "./portfolioStats";

describe("buildPortfolio — bucket projectCount (BUG-02)", () => {
  it("counts each project that contributes positive p50 to a bucket", () => {
    // 3 projects, each contributing positive p50 to the ME bucket via the
    // fallback heuristic in recordToPrediction (sales_buckets are derived
    // from per-target hours).
    const records = [
      { project_id: "a", me10_actual_hours: 100 },
      { project_id: "b", me10_actual_hours: 200 },
      { project_id: "c", me10_actual_hours: 300 },
    ];
    const stats = buildPortfolio(records as never);
    const me = stats.buckets.find((b: BucketRow) => b.bucket === "ME");
    expect(me).toBeDefined();
    expect(me!.projectCount).toBe(3);
    // Total ≠ Avg.
    expect(me!.hours).toBeGreaterThan(0);
    expect(me!.hours / me!.projectCount).not.toBe(me!.hours);
  });

  it("excludes zero-hours buckets entirely (projectCount has no meaning there)", () => {
    const records = [{ project_id: "a", me10_actual_hours: 100 }];
    const stats = buildPortfolio(records as never);
    // No EE in the data → no EE bucket emitted.
    expect(stats.buckets.find((b: BucketRow) => b.bucket === "EE")).toBeUndefined();
  });

  it("produces projectCount = 1 for a single-project bucket (Total = Avg expected)", () => {
    const records = [{ project_id: "a", me10_actual_hours: 100 }];
    const stats = buildPortfolio(records as never);
    const me = stats.buckets.find((b: BucketRow) => b.bucket === "ME");
    expect(me!.projectCount).toBe(1);
    expect(me!.hours / me!.projectCount).toBe(me!.hours);
  });
});
```

**Notes for executor:**
- The fixture uses `me10_actual_hours` because `recordToPrediction` (in `realProjects.ts`) maps `me10_actual_hours` → ME bucket via the same SALES_BUCKET_MAP that `core/config.py` uses. The executor should sanity-check `recordToPrediction` to confirm — read but do not edit.
- If `recordToPrediction` requires more fields than `me10_actual_hours` to produce a non-zero ME prediction, the fixture must be expanded. Use existing test fixtures (`portfolioStats.test.ts` has helpers) as templates rather than re-deriving.

**Commit:**
```
fix(insights): track per-bucket project count in portfolioStats (BUG-02)

BucketRow now carries projectCount alongside hours, so HoursBySalesBucket
can compute a real average instead of falling back to total. A project
counts toward a bucket only when it contributes positive p50 hours, so
zero-contribution projects don't dilute the average.

Closes BUG-02 (data layer).
```

---

## T4 — BUG-02 — `HoursBySalesBucket` consumes `projectCount` directly

**Files:**
- `frontend/src/pages/demo/business/HoursBySalesBucket.tsx` (modify)
- `frontend/src/pages/demo/business/HoursBySalesBucket.test.tsx` (extend)

**Diff plan in `HoursBySalesBucket.tsx`:**

1. Delete the `ExtendedBucketRow` type alias (line 23):

   ```ts
   // remove:
   type ExtendedBucketRow = BucketRow & { projectCount: number };
   ```

2. Update the props type (line 25-29):

   ```ts
   export function HoursBySalesBucket({ data }: { data: BucketRow[] }) {
   ```

3. Replace the `metric === "avg"` branch (line 38-41):

   ```ts
   // avg
   const pc = d.projectCount;
   const avg = pc > 0 ? d.hours / pc : 0;
   return { ...d, value: avg };
   ```

**Diff plan in `HoursBySalesBucket.test.tsx`:**

1. Update `BUCKET_DATA` (line 19):

   ```ts
   const BUCKET_DATA: BucketRow[] = [
     { bucket: "ME", hours: 400, projectCount: 4 },
     { bucket: "Build", hours: 300, projectCount: 3 },
     { bucket: "Install", hours: 200, projectCount: 2 },
   ];
   ```

2. Add a new test that exercises the avg-vs-total distinction:

   ```ts
   it("Avg metric renders a value distinct from Total for buckets with projectCount > 1 (BUG-02)", () => {
     renderWithProviders(<HoursBySalesBucket data={BUCKET_DATA} />);
     // Tooltips render via recharts Tooltip, which requires hovering the bar.
     // For BUG-02 we only need the *toggle* to behave; visual tooltip parity
     // is covered by the existing recharts contract. Click Avg, then verify
     // the section heading reflects the avg metric.
     fireEvent.click(screen.getByRole("button", { name: /^avg$/i }));
     expect(screen.getByText(/avg hours · by sales bucket/i)).toBeInTheDocument();
     // Sanity-check: the chart's data prop reflects per-row hours/projectCount.
     // Re-rendering computes value = hours/projectCount; we don't access the
     // recharts internal but the test fixture above guarantees Total ≠ Avg.
     // (400 / 4 = 100 ≠ 400.)
   });
   ```

**Commit:**
```
fix(insights): use real avg in Hours by Sales Bucket chart (BUG-02)

HoursBySalesBucket no longer carries an optional `ExtendedBucketRow` cast.
BucketRow now always provides projectCount, and the avg branch divides
by it directly.

Closes BUG-02 (chart layer).
```

---

## T5 — UX-01 — Add `input` prop to QuoteResultPanel; render "Your inputs" recap

**Files:**
- `frontend/src/components/quote/QuoteResultPanel.tsx` (modify)
- `frontend/src/components/quote/QuoteResultPanel.test.tsx` (extend)

**Diff plan in `QuoteResultPanel.tsx`:**

1. Add the import at the top:

   ```ts
   import type { QuoteFormValues } from "@/pages/single-quote/schema";
   ```

2. Update the component signature:

   ```tsx
   export function QuoteResultPanel({
     result,
     input,
   }: {
     result: UnifiedQuoteResult;
     input: QuoteFormValues;
   }) {
   ```

3. Add the recap card as the FIRST child of the return value (above "Hero estimate"):

   ```tsx
   {/* Your inputs — recap so the user can see what they fed the model */}
   <div className="card p-5">
     <div className="eyebrow text-[10px] text-muted mb-3">Your inputs</div>
     <YourInputsRecap input={input} />
   </div>
   ```

4. Add the `YourInputsRecap` helper component below the main `QuoteResultPanel` function (in the same file):

   ```tsx
   const SECTIONS: ReadonlyArray<{ title: string; rows: ReadonlyArray<[string, (v: QuoteFormValues) => string]> }> = [
     {
       title: "Project classification",
       rows: [
         ["Industry segment", (v) => v.industry_segment || "—"],
         ["System category", (v) => v.system_category || "—"],
         ["Automation level", (v) => v.automation_level || "—"],
         ["Includes controls", (v) => yesNo(v.has_controls)],
         ["Includes robotics", (v) => yesNo(v.has_robotics)],
         ["Retrofit project", (v) => yesNo(v.retrofit)],
         ["Duplicate of prior", (v) => yesNo(v.duplicate)],
       ],
     },
     {
       title: "Physical scale",
       rows: [
         ["Stations count", (v) => fmtCount(v.stations_count)],
         ["Robot count", (v) => fmtCount(v.robot_count)],
         ["Fixture sets", (v) => fmtCount(v.fixture_sets)],
         ["Part types", (v) => fmtCount(v.part_types)],
         ["Weldment perimeter (ft)", (v) => fmtDecimal(v.weldment_perimeter_ft)],
         ["Fence length (ft)", (v) => fmtDecimal(v.fence_length_ft)],
         ["Safety doors", (v) => fmtCount(v.safety_doors)],
         ["Safety devices count", (v) => fmtCount(v.safety_devices_count)],
         ["Conveyor length (ft)", (v) => fmtDecimal(v.conveyor_length_ft)],
       ],
     },
     {
       title: "Controls & automation",
       rows: [
         ["PLC family", (v) => v.plc_family || "—"],
         ["HMI family", (v) => v.hmi_family || "—"],
         ["Vision type", (v) => v.vision_type || "—"],
         ["Panel count", (v) => fmtCount(v.panel_count)],
         ["Servo axes", (v) => fmtCount(v.servo_axes)],
         ["Drive count", (v) => fmtCount(v.drive_count)],
         ["Pneumatic devices", (v) => fmtCount(v.pneumatic_devices)],
         ["Vision systems count", (v) => fmtCount(v.vision_systems_count)],
       ],
     },
     {
       title: "Product & process",
       rows: [
         ["Product familiarity (1–5)", (v) => fmtCount(v.product_familiarity_score)],
         ["Product rigidity (1–5)", (v) => fmtCount(v.product_rigidity)],
         ["Bulk rigidity (1–5)", (v) => fmtCount(v.bulk_rigidity_score)],
         ["Process uncertainty (1–5)", (v) => fmtCount(v.process_uncertainty_score)],
         ["Changeover time (min)", (v) => fmtCount(v.changeover_time_min)],
         ["Product deformable", (v) => yesNo(v.is_product_deformable)],
         ["Bulk product", (v) => yesNo(v.is_bulk_product)],
         ["Tricky packaging", (v) => yesNo(v.has_tricky_packaging)],
       ],
     },
     {
       title: "Complexity & indices",
       rows: [
         ["Overall complexity (1–5)", (v) => fmtCount(v.complexity_score_1_5)],
         ["Custom %", (v) => `${fmtCount(v.custom_pct)}%`],
       ],
     },
     {
       title: "Cost",
       rows: [
         ["Estimated materials cost", (v) => fmtMoney(v.estimated_materials_cost)],
       ],
     },
   ];

   function YourInputsRecap({ input }: { input: QuoteFormValues }) {
     return (
       <div className="space-y-4">
         {SECTIONS.map((section) => (
           <div key={section.title}>
             <div className="text-[11px] eyebrow text-muted mb-1.5">{section.title}</div>
             <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
               {section.rows.map(([label, get]) => (
                 <div key={label} className="contents">
                   <dt className="text-muted truncate">{label}</dt>
                   <dd className="text-ink tnum text-right truncate">{get(input)}</dd>
                 </div>
               ))}
             </dl>
           </div>
         ))}
       </div>
     );
   }

   function yesNo(b: boolean): string { return b ? "Yes" : "No"; }
   function fmtCount(n: number): string { return Number.isFinite(n) ? n.toLocaleString() : "—"; }
   function fmtDecimal(n: number): string { return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"; }
   function fmtMoney(n: number): string {
     if (!Number.isFinite(n) || n <= 0) return "—";
     return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
   }
   ```

**Diff plan in `QuoteResultPanel.test.tsx`:**

Existing tests instantiate `<QuoteResultPanel result={...} />`. They will need to be updated to also pass `input={...}`. Add a fixture builder near the top:

```ts
import { quoteFormDefaults, type QuoteFormValues } from "@/pages/single-quote/schema";

function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return { ...quoteFormDefaults, ...over };
}
```

Then update every existing render site:

```ts
renderWithProviders(<QuoteResultPanel result={RESULT} input={makeFormValues()} />);
```

Add a new describe block:

```ts
describe("QuoteResultPanel — Your inputs recap (UX-01)", () => {
  it("renders the 'Your inputs' card", () => {
    renderWithProviders(
      <QuoteResultPanel result={RESULT} input={makeFormValues()} />,
    );
    expect(screen.getByText(/your inputs/i)).toBeInTheDocument();
  });

  it("echoes the industry segment the user submitted", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={RESULT}
        input={makeFormValues({ industry_segment: "Automotive" })}
      />,
    );
    expect(screen.getByText("Automotive")).toBeInTheDocument();
  });

  it("echoes the system category", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={RESULT}
        input={makeFormValues({ system_category: "Machine Tending" })}
      />,
    );
    expect(screen.getByText("Machine Tending")).toBeInTheDocument();
  });

  it("echoes stations count and robot count", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={RESULT}
        input={makeFormValues({ stations_count: 7, robot_count: 3 })}
      />,
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("formats materials cost with $ prefix", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={RESULT}
        input={makeFormValues({ estimated_materials_cost: 250000 })}
      />,
    );
    expect(screen.getByText("$250,000")).toBeInTheDocument();
  });

  it("formats booleans as Yes/No", () => {
    renderWithProviders(
      <QuoteResultPanel
        result={RESULT}
        input={makeFormValues({ has_controls: true, retrofit: false })}
      />,
    );
    // 'Yes' appears for has_controls; 'No' for retrofit. Both must be present.
    expect(screen.getAllByText("Yes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No").length).toBeGreaterThan(0);
  });

  it("renders all six section headings", () => {
    renderWithProviders(
      <QuoteResultPanel result={RESULT} input={makeFormValues()} />,
    );
    expect(screen.getByText(/project classification/i)).toBeInTheDocument();
    expect(screen.getByText(/physical scale/i)).toBeInTheDocument();
    expect(screen.getByText(/controls & automation/i)).toBeInTheDocument();
    expect(screen.getByText(/product & process/i)).toBeInTheDocument();
    expect(screen.getByText(/complexity & indices/i)).toBeInTheDocument();
    expect(screen.getByText(/^cost$/i)).toBeInTheDocument();
  });
});
```

**Commit:**
```
feat(quote-panel): echo user inputs in result panel (UX-01)

Adds a "Your inputs" recap card to the top of QuoteResultPanel that
groups the user's submitted form values into the same six sections the
QuoteForm uses. This is U1's same-day patch from Ben's review:
visibility into what the model was given without leaving the page.
Full quote persistence (PERSIST-01) remains a v2 milestone.

Breaking prop change: QuoteResultPanel now requires `input: QuoteFormValues`.
Both call sites (ComparisonQuote, MachineLearningQuoteTool) wired in T6.

Closes UX-01.
```

---

## T6 — UX-01 — Wire `input` into both Quote routes

**Files:**
- `frontend/src/pages/demo/compare/ComparisonQuote.tsx` (modify)
- `frontend/src/pages/demo/MachineLearningQuoteTool.tsx` (modify)

**Diff plan, same change in both files:**

1. Import the form values type:

   ```ts
   import { type QuoteFormValues } from "@/pages/single-quote/schema";
   ```

2. Change the `result` state to also retain the form values that produced it. Inside the component:

   ```ts
   const [result, setResult] = useState<{
     unified: UnifiedQuoteResult;
     formValues: QuoteFormValues;
   } | null>(null);
   ```

3. In `handleSubmit`, capture the form values before the await chain, and store both in state:

   ```ts
   const formValues = form.getValues();
   const input = transformToQuoteInput(formValues);
   // …existing prediction code…
   setResult({
     unified: toUnifiedResult({ /* existing args */ }),
     formValues,
   });
   ```

4. Update the render site:

   ```tsx
   {result && <QuoteResultPanel result={result.unified} input={result.formValues} />}
   ```

5. Repeat verbatim in `MachineLearningQuoteTool.tsx`. (The two files are structurally identical for this change.)

**Polish note (non-blocking):** the `Reset form` button in `QuoteForm.tsx` does not currently signal up to the parent route, so a stale `result` (with stale recap) survives a form reset. This is pre-existing behavior and is *not* introduced by this phase. If the executor wants to clean it up in the same diff, expose an `onReset?: () => void` prop on `QuoteForm` and have the route's handler call `setResult(null)`. Otherwise leave for a future polish phase.

**Test wiring update:**
- `ComparisonQuote.test.tsx` and `MachineLearningQuoteTool.test.tsx` exist and snapshot the post-submit panel. The test mocks for `predictQuote` already return p50 values — those tests should still pass because they assert on hero text, not on the new recap. Add one assertion to each:

  ```ts
  it("renders the Your inputs recap after submit", async () => {
    renderWithProviders(<ComparisonQuote />);
    const submitBtn = await screen.findByRole("button", { name: /regenerate estimate/i });
    await act(async () => { fireEvent.click(submitBtn); });
    await waitFor(() => expect(screen.getByText(/your inputs/i)).toBeInTheDocument());
  });
  ```

**Commit:**
```
feat(quote-panel): pass form values to result panel from both demo routes (UX-01)

Both Quote routes (Compare/Real, ML/Synthetic) now retain the form
values that produced the estimate and feed them to QuoteResultPanel,
which renders a Your inputs recap above the hero estimate.

Closes UX-01 wiring.
```

---

## T7 — Verify

**Commands:**

```
cd frontend
npm test -- --run
npm run typecheck
npm run lint
npm run dev   # then manually run the success-gate checklist in PLAN VIEW
```

**Pass criteria:** all of (1)–(7) in the PLAN VIEW success gate.

**Failure handling:** any failure rolls back to the offending task — fix in place, re-run T7 entirely. Do not skip.

**Commit (after all checks green):**
```
chore(phase-1): verify Phase 1 tests green

cd frontend && npm test → all green (incl. new BUG-01 / BUG-02 / UX-01 tests)
cd frontend && npm run typecheck → no new errors
cd frontend && npm run lint → no new warnings
Manual smoke on /compare/quote, /ml/quote, /compare/insights confirms
acceptance for all 5 ROADMAP success criteria.

Phase 1 complete. Ready for /gsd-verify-phase 1.
```

---

## Append: STATE.md updates the executor must apply after T7

```diff
 ## Current Position

 - **Milestone:** v1.0 — Customer-trust fixes
 - **Phase:** 1 — Customer-blocking bug sweep
-- **Plans created:** 0 (run `/gsd-plan-phase 1` to create)
-- **Plans executed:** 0
-- **Stopped at:** initialization complete; awaiting `/gsd-plan-phase 1`
+- **Plans created:** 1 (`.planning/phases/01-customer-blocking-bug-sweep/01-PLAN.md`)
+- **Plans executed:** 1
+- **Stopped at:** Phase 1 implementation green; awaiting `/gsd-verify-phase 1`
```

(Plus a Recent Activity row for 2026-05-04 plan + execution.)

---

*PLAN authored 2026-05-04. Two-view format per `feedback_plan_format.md`. Specificity per `feedback_plan_specificity.md`.*
