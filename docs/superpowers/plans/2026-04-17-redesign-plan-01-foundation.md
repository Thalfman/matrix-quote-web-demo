# Matrix Quote Web — Redesign Plan 1: Design Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the new design system (palette, typography, global utilities) and update every shared primitive + Layout shell so downstream plans (2–7) can restyle individual pages against a consistent foundation.

**Architecture:** Replace the current electric-blue / slate palette with the design's paper + near-black navy + teal + hero-amber palette, extracted directly from `docs/design/claude-design-20260417/project/Cockpit Redesign.html`. Add two new display fonts (Barlow Condensed, JetBrains Mono). Rewrite `globals.css` with new utility classes (`.eyebrow`, `.display-hero`, `.mono`, `.hairline`, `.tnum`). Retain `brand` / `navy` / `steel` / `accent` tailwind tokens as **aliases** pointing at new palette values so the 21 pages that hardcode old class names still render plausibly during the incremental migration (plans 2–7 replace those class references; Plan 7 deletes the aliases).

**Tech Stack:** Tailwind 3.4 (config swap), Vite HTML (font preload), React 18 (primitives rewrite), Vitest (component tests).

---

## Design reference

All HTML mocks and reference React components live under `docs/design/claude-design-20260417/project/` (committed to repo during setup).

**Canonical source of truth for this plan:** `docs/design/claude-design-20260417/project/Cockpit Redesign.html` lines 10–65 (tailwind config block + root CSS).

**Palette (all hex, from the canonical mock):**

| Token | Value | Use |
|---|---|---|
| `ink` | `#0D1B2A` | Primary text, sidebar background |
| `ink2` | `#1E2B3A` | Ink hover, secondary dark surfaces |
| `paper` | `#F6F4EF` | Page canvas |
| `surface` | `#FFFFFF` | Card background |
| `line` | `#E5E1D8` | Hairline borders, dividers |
| `line2` | `#D8D3C6` | Stronger dividers (empty pips, disabled) |
| `muted` | `#5A6573` | Secondary text |
| `muted2` | `#8A94A1` | Tertiary text |
| `amber` | `#F2B61F` | **Hero estimate only** + key status pips |
| `amberSoft` | `#FAEBB5` | Amber-on-paper background wash |
| `teal` | `#1F8FA6` | Primary interactive / links / focus |
| `tealDark` | `#177082` | Teal hover |
| `tealSoft` | `#D7ECF1` | Teal tint background |
| `success` | `#2F8F6F` | Success text + dots |
| `danger` | `#B5412B` | Danger text + dots |

**Typography:**
- Sans: `Inter` (400/500/600/700) — already loaded; keep
- Display / eyebrow: `Barlow Condensed` (500/600/700) — NEW
- Mono: `JetBrains Mono` (400/500/600) — NEW

**Known drift after this plan lands:** 21 files (listed in Appendix A) still reference `brand-*`, `navy-*`, `steel-*`, `accent-*`, and `-dark` variants. These continue to render via **aliases** (see Task 2) until plans 2–7 replace them surface-by-surface. Plan 7 removes the aliases.

---

## Prerequisites

- None. This is the foundation plan — it must land first. Branch off `main` (currently at `a38828c`).
- `docs/design/claude-design-20260417/` must exist in the repo (committed during plan setup). If not present, stop and ask the user.

---

## File Structure

**Modified:**
- `frontend/index.html` — add font imports, drop `dark:` body classes
- `frontend/tailwind.config.js` — full palette + font families + aliases
- `frontend/src/styles/globals.css` — utility classes + base styles
- `frontend/src/components/Layout.tsx` — navy sidebar + top strip + breadcrumb
- `frontend/src/components/PageHeader.tsx` — display-hero title + teal eyebrow
- `frontend/src/components/Section.tsx` — mono step number + eyebrow title + hairline
- `frontend/src/components/Field.tsx` — eyebrow label
- `frontend/src/components/Input.tsx` — hairline + teal focus
- `frontend/src/components/Select.tsx` — hairline + teal focus
- `frontend/src/components/Switch.tsx` — teal check + hairline
- `frontend/src/components/Slider.tsx` — teal accent
- `frontend/src/components/Tabs.tsx` — teal underline + font-medium active
- `frontend/src/components/EmptyState.tsx` — minimal token swap
- `frontend/src/components/ConfidenceDot.tsx` — minimal token swap
- `frontend/src/components/ResultHero.tsx` — minimal token swap (fully replaced in Plan 2)
- `frontend/src/components/DemoChip.tsx` — teal tint (via `brand` alias)
- `frontend/src/components/UserPill.tsx` — ink avatar + muted label
- `frontend/src/components/Layout.test.tsx` — DOM assertions keep behavior, drop palette assertions

**Unchanged in this plan (updated in later plans):**
- All `pages/**` files (Plan 2–6 restyle)
- `styles/dark-mode.css`, `lib/theme-toggle.js` (Plan 7 creates these)
- PDF Jinja template under `backend/app/templates/pdf/` (Plan 7)

---

## Tasks

### Task 1: Add Barlow Condensed + JetBrains Mono to index.html

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Replace the Google Fonts link**

Open `frontend/index.html`. Replace the existing `<link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet" />` block (lines 10–13) with:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Update the body class list**

Replace line 15 of `frontend/index.html`:

```html
  <body class="bg-bg text-ink dark:bg-bg-dark dark:text-ink-dark font-sans antialiased">
```

with:

```html
  <body class="bg-paper text-ink font-sans antialiased">
```

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "style(foundation): load Barlow Condensed + JetBrains Mono"
```

---

### Task 2: Replace tailwind.config.js with design palette

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Overwrite `frontend/tailwind.config.js`**

Replace the entire file with:

```js
var config = {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                // ===== Design tokens (canonical) =====
                ink:       { DEFAULT: "#0D1B2A", dark: "#EDEBE4" },
                ink2:      "#1E2B3A",
                paper:     "#F6F4EF",
                surface:   { DEFAULT: "#FFFFFF", dark: "#15212F" },
                line:      "#E5E1D8",
                line2:     "#D8D3C6",
                muted:     { DEFAULT: "#5A6573", dark: "#92A0B3" },
                muted2:    "#8A94A1",
                amber:     "#F2B61F",
                amberSoft: "#FAEBB5",
                teal:      "#1F8FA6",
                tealDark:  "#177082",
                tealSoft:  "#D7ECF1",
                success:   "#2F8F6F",
                warning:   "#F2B61F",
                danger:    "#B5412B",

                // ===== Aliases (for incremental migration — removed in Plan 7) =====
                // bg = paper. Kept because index.html references `bg-bg-dark` in some pages.
                bg:        { DEFAULT: "#F6F4EF", dark: "#0A1420" },
                border:    { DEFAULT: "#E5E1D8", dark: "#25334A" },
                // brand = teal. Existing code uses bg-brand / text-brand — aliased to the new teal.
                brand: {
                    DEFAULT: "#1F8FA6",
                    hover:   "#177082",
                    pressed: "#125562",
                    subtle:  "#D7ECF1",
                    foreground: "#FFFFFF",
                },
                // accent = teal, matches brand semantics for focus rings.
                accent: {
                    DEFAULT: "#1F8FA6",
                    foreground: "#FFFFFF",
                },
                // navy = ink. Preserves navy-900/800 numeric usages.
                navy: {
                    DEFAULT: "#0D1B2A",
                    600: "#1E2B3A",
                    700: "#15212F",
                    800: "#0D1B2A",
                    900: "#0A1420",
                },
                // steel = line + muted family. Approximations — good enough for migration.
                steel: {
                    100: "#F6F4EF",
                    200: "#E5E1D8",
                    300: "#D8D3C6",
                    400: "#8A94A1",
                    500: "#5A6573",
                    600: "#25334A",
                    700: "#15212F",
                },
            },
            fontFamily: {
                sans:    ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
                display: ['"Barlow Condensed"', "Inter", "sans-serif"],
                mono:    ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
            },
            fontSize: {
                display: ["56px", { lineHeight: "60px", fontWeight: "600", letterSpacing: "-0.02em" }],
            },
            maxWidth: {
                content: "1400px",
            },
            borderRadius: {
                card: "2px",
            },
        },
    },
    plugins: [],
};
export default config;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "style(foundation): replace palette with design system + compat aliases"
```

---

### Task 3: Rewrite globals.css with design utilities

**Files:**
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Overwrite the file**

Replace `frontend/src/styles/globals.css` entirely with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* =======================================================
   Matrix Quote · Design system base
   Light-mode primary. Dark mode layered in Plan 7.
======================================================= */

:focus-visible {
  outline: 2px solid #1F8FA6;
  outline-offset: 2px;
  border-radius: 2px;
}

@layer base {
  :root {
    color-scheme: light;
    --density-y: 1rem;
    --density-x: 1.25rem;
  }
  body {
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
    font-weight: 400;
    line-height: 1.6;
    @apply bg-paper text-ink;
  }
  h1, h2, h3 {
    font-weight: 500;
    letter-spacing: -0.01em;
  }
}

@layer components {
  .card {
    @apply bg-surface border border-line rounded-card;
  }
  .muted {
    @apply text-muted;
  }
  .numeric {
    @apply font-mono tabular-nums;
  }
  .eyebrow {
    font-family: "Barlow Condensed", Inter, sans-serif;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .display-hero {
    font-family: "Barlow Condensed", Inter, sans-serif;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .mono {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    font-variant-numeric: tabular-nums;
  }
  .tnum {
    font-variant-numeric: tabular-nums;
  }
  .hairline {
    border-color: #E5E1D8;
  }
  .pad-y { padding-top: var(--density-y); padding-bottom: var(--density-y); }
  .pad-x { padding-left: var(--density-x); padding-right: var(--density-x); }
  .density-compact { --density-y: 0.625rem; --density-x: 0.875rem; }
  .density-comfy   { --density-y: 1rem;     --density-x: 1.25rem; }
}
```

- [ ] **Step 2: Run dev server and visually smoke-check**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/` in a browser. Confirm:
- Background is warm off-white (paper `#F6F4EF`), not cold blue.
- Inter font renders (no serif fallback).
- No console errors about missing Tailwind classes.

Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/globals.css
git commit -m "style(foundation): new globals.css with eyebrow, mono, hairline, density utilities"
```

---

### Task 4: Rewrite Layout.tsx — navy sidebar + wordmark + top strip

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

**Design reference:** `docs/design/claude-design-20260417/project/Cockpit Redesign.html` lines 108–164.

- [ ] **Step 1: Overwrite Layout.tsx**

Replace the entire file with:

```tsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { HealthResponse } from "@/api/types";
import { cn } from "@/lib/utils";
import { DemoChip } from "@/components/DemoChip";
import { UserPill } from "@/components/UserPill";

type NavEntry = { to: string; label: string; end?: boolean };
type NavGroup = { label: string; items: NavEntry[] };

const PUBLIC_NAV: NavGroup[] = [
  {
    label: "Estimate",
    items: [
      { to: "/", label: "Single Quote", end: true },
      { to: "/batch", label: "Batch Quotes" },
    ],
  },
  {
    label: "Quotes",
    items: [{ to: "/quotes", label: "Saved Quotes" }],
  },
  {
    label: "Insights",
    items: [
      { to: "/performance", label: "Estimate Accuracy" },
      { to: "/insights", label: "Executive Overview" },
    ],
  },
];

const ADMIN_NAV: NavGroup = {
  label: "Admin",
  items: [
    { to: "/admin", label: "Overview", end: true },
    { to: "/admin/train", label: "Upload & Train" },
    { to: "/admin/data", label: "Data Explorer" },
    { to: "/admin/drivers", label: "Drivers & Similar" },
  ],
};

export function Layout() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<HealthResponse>("/health")).data,
    refetchInterval: 60_000,
  });

  const groups = isAdminRoute ? [ADMIN_NAV] : PUBLIC_NAV;
  const modelsReady = health?.models_ready ?? false;

  // Breadcrumb derives label from the active nav entry.
  const allEntries = [...PUBLIC_NAV.flatMap((g) => g.items), ...ADMIN_NAV.items];
  const active = allEntries.find((e) =>
    e.end ? pathname === e.to : pathname.startsWith(e.to),
  );
  const sectionLabel = isAdminRoute ? "Admin" : "Estimate";

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-ink text-white p-6 gap-8">
        <div>
          <div className="display-hero text-2xl tracking-tight leading-none">Matrix</div>
          <div className="eyebrow text-[10px] text-white/50 mt-1">Quote Estimation</div>
        </div>

        {groups.map((group) => (
          <nav key={group.label} className="flex flex-col gap-1">
            <div className="eyebrow text-[10px] text-white/40 mb-1 px-3">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "text-sm px-3 py-2 rounded-sm transition-colors",
                    isActive
                      ? "bg-white/5 border-l-2 border-amber text-white font-medium"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ))}

        <div className="mt-auto">
          <div className="eyebrow text-[10px] text-white/40 mb-2">Model Status</div>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="relative flex w-1.5 h-1.5">
              {modelsReady && (
                <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
              )}
              <span
                className={cn(
                  "relative w-1.5 h-1.5 rounded-full",
                  modelsReady ? "bg-success" : "bg-danger",
                )}
              />
            </span>
            {modelsReady ? "Ready · models online" : "Not trained"}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile top bar — below lg breakpoint */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b hairline bg-surface">
          <div className="display-hero text-lg leading-none">Matrix</div>
          <div className="flex items-center gap-2">
            <DemoChip />
            <UserPill />
          </div>
        </div>

        {/* Desktop top strip — breadcrumb + demo + user */}
        <div className="hidden lg:block border-b hairline bg-white/60 backdrop-blur">
          <div className="max-w-content mx-auto px-8 h-12 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted">
              <span>{sectionLabel}</span>
              <span className="text-muted2">/</span>
              <span className="text-ink font-medium">{active?.label ?? ""}</span>
            </div>
            <div className="flex items-center gap-3">
              <DemoChip />
              <span className="w-px h-4 bg-line" />
              <UserPill />
            </div>
          </div>
        </div>

        <div className="max-w-content mx-auto px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "style(foundation): navy sidebar with amber active rail and breadcrumb top strip"
```

---

### Task 5: Verify Layout.test.tsx still passes + reinforce behavior-level assertions

**Files:**
- Modify: `frontend/src/components/Layout.test.tsx`

- [ ] **Step 1: Run the existing test**

```bash
cd frontend && npm run test -- Layout.test
```

Expected: PASS. The test only asserts link roles + href, which the new Layout preserves.

- [ ] **Step 2: Extend with a test for the amber active rail**

Open `frontend/src/components/Layout.test.tsx`. Add this test inside the `describe` block (just before the closing `});` on line 45):

```tsx
  it("applies the amber active rail to the current route pill", async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === "/health") return { data: { status: "ok", models_ready: true } };
      throw new Error(`Unexpected GET ${url}`);
    });

    renderWithProviders(<Layout />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /single quote/i })).toBeInTheDocument(),
    );

    const singleQuoteLink = screen.getByRole("link", { name: /single quote/i });
    // Active link carries border-l-2 + border-amber (amber active rail).
    expect(singleQuoteLink.className).toMatch(/border-amber/);
  });
```

- [ ] **Step 3: Run to verify**

```bash
cd frontend && npm run test -- Layout.test
```

Expected: 2 passing tests.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Layout.test.tsx
git commit -m "test(foundation): assert amber active rail on Layout nav"
```

---

### Task 6: Restyle PageHeader — display-hero title + teal eyebrow

**Files:**
- Modify: `frontend/src/components/PageHeader.tsx`

**Design reference:** `docs/design/claude-design-20260417/project/Cockpit Redesign.html` lines 168–182.

- [ ] **Step 1: Overwrite PageHeader.tsx**

Replace the entire file with:

```tsx
import { cn } from "@/lib/utils";

type ChipTone = "success" | "warning" | "accent" | "muted";

export type Chip = { label: string; tone?: ChipTone };

const toneClasses: Record<ChipTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-amberSoft text-ink",
  accent:  "bg-tealSoft text-tealDark",
  muted:   "bg-line text-muted",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  chips,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  chips?: Chip[];
}) {
  return (
    <header className="flex items-end justify-between gap-6 pb-6 mb-8 border-b hairline flex-wrap">
      <div>
        {eyebrow && <div className="eyebrow text-[11px] text-teal">{eyebrow}</div>}
        <h1 className="display-hero text-4xl leading-none mt-2 text-ink">{title}</h1>
        {description && (
          <p className="text-sm text-muted mt-3 max-w-xl">{description}</p>
        )}
      </div>
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.label}
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-sm text-xs",
                toneClasses[c.tone ?? "muted"],
              )}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PageHeader.tsx
git commit -m "style(foundation): PageHeader with display-hero title and teal eyebrow"
```

---

### Task 7: Restyle Section — mono step number + eyebrow title + hairline rule

**Files:**
- Modify: `frontend/src/components/Section.tsx`

**Design reference:** `docs/design/claude-design-20260417/project/Cockpit Redesign.html` lines 193–199.

- [ ] **Step 1: Overwrite Section.tsx**

Replace the entire file with:

```tsx
import { ReactNode } from "react";

export function Section({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-4 mb-3">
        <span className="mono text-[11px] text-teal">{step}</span>
        <h2 className="eyebrow text-[12px] text-ink">{title}</h2>
        <span className="flex-1 h-px bg-line" />
        {description && (
          <span className="text-[11px] text-muted">{description}</span>
        )}
      </div>
      <div className="card p-5">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Section.tsx
git commit -m "style(foundation): Section with mono step + eyebrow title + hairline rule"
```

---

### Task 8: Restyle Field — eyebrow label

**Files:**
- Modify: `frontend/src/components/Field.tsx`

- [ ] **Step 1: Overwrite Field.tsx**

Replace the entire file with:

```tsx
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="eyebrow text-[10px] text-muted block mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="text-[11px] text-muted block mt-1">{hint}</span>}
      {error && <span className="text-[11px] text-danger block mt-1">{error}</span>}
    </label>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Field.tsx
git commit -m "style(foundation): Field label in eyebrow type"
```

---

### Task 9: Restyle Input + Select — hairline + teal focus

**Files:**
- Modify: `frontend/src/components/Input.tsx`
- Modify: `frontend/src/components/Select.tsx`

- [ ] **Step 1: Overwrite Input.tsx**

```tsx
import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-sm border hairline bg-surface",
          "px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal",
          "disabled:opacity-50",
          className,
        )}
        {...rest}
      />
    );
  },
);
```

- [ ] **Step 2: Overwrite Select.tsx**

```tsx
import { SelectHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  options: string[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { options, placeholder, className, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-sm border hairline bg-surface",
        "px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal",
        className,
      )}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Input.tsx frontend/src/components/Select.tsx
git commit -m "style(foundation): Input + Select with hairline borders and teal focus"
```

---

### Task 10: Restyle Switch + Slider — teal check + teal accent

**Files:**
- Modify: `frontend/src/components/Switch.tsx`
- Modify: `frontend/src/components/Slider.tsx`

- [ ] **Step 1: Overwrite Switch.tsx**

```tsx
import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export const Switch = forwardRef<HTMLInputElement, Props>(function Switch(
  { label, checked, className, ...rest },
  ref,
) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 cursor-pointer select-none",
        "px-3 py-2 rounded-sm border hairline bg-surface",
        checked && "border-teal bg-tealSoft",
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        className="accent-teal"
        {...rest}
      />
      <span className={cn("text-sm", checked ? "text-ink" : "text-muted")}>{label}</span>
    </label>
  );
});
```

- [ ] **Step 2: Overwrite Slider.tsx**

```tsx
import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  unit?: string;
};

export const Slider = forwardRef<HTMLInputElement, Props>(function Slider(
  { className, value, unit, min = 1, max = 5, step = 1, ...rest },
  ref,
) {
  return (
    <div className="flex items-center gap-3">
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={cn("flex-1 accent-teal", className)}
        {...rest}
      />
      <span className="mono text-sm tabular-nums min-w-[3ch] text-right text-ink">
        {value}
        {unit ?? ""}
      </span>
    </div>
  );
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Switch.tsx frontend/src/components/Slider.tsx
git commit -m "style(foundation): Switch + Slider in teal accent with hairline surfaces"
```

---

### Task 11: Restyle Tabs — teal underline + font-medium active

**Files:**
- Modify: `frontend/src/components/Tabs.tsx`

- [ ] **Step 1: Overwrite Tabs.tsx**

```tsx
import { ReactNode, useState } from "react";

import { cn } from "@/lib/utils";

export type TabDef = { id: string; label: string; content: ReactNode };

export function Tabs({ tabs, defaultId }: { tabs: TabDef[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active);
  return (
    <div>
      <div
        role="tablist"
        className="flex gap-0 border-b hairline mb-4"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
              active === t.id
                ? "border-teal text-ink font-medium"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Tabs.tsx
git commit -m "style(foundation): Tabs with teal active underline"
```

---

### Task 12: Update DemoChip, UserPill, EmptyState, ConfidenceDot, ResultHero for new tokens

**Files:**
- Modify: `frontend/src/components/DemoChip.tsx`
- Modify: `frontend/src/components/UserPill.tsx`
- Modify: `frontend/src/components/EmptyState.tsx`
- Modify: `frontend/src/components/ConfidenceDot.tsx`
- Modify: `frontend/src/components/ResultHero.tsx`

- [ ] **Step 1: Overwrite DemoChip.tsx**

```tsx
import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

type DemoStatus = { is_demo: boolean; enabled_env: boolean; has_real_data: boolean };

export function DemoChip() {
  const { data } = useQuery<DemoStatus>({
    queryKey: ["demoStatus"],
    queryFn: async () => (await api.get<DemoStatus>("/demo/status")).data,
    refetchInterval: 60_000,
  });
  if (!data?.is_demo) return null;
  return (
    <div
      title="Demo data is loaded. Estimates and insights come from a synthetic dataset."
      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-teal/30 bg-tealSoft text-tealDark text-[11px] font-semibold"
    >
      <Sparkles size={12} strokeWidth={1.75} />
      Demo mode
    </div>
  );
}
```

- [ ] **Step 2: Overwrite UserPill.tsx**

```tsx
import { useEffect, useState } from "react";
import { getDisplayName, setDisplayName } from "@/lib/displayName";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function UserPill() {
  const [name, setName] = useState<string>("");
  useEffect(() => {
    setName(getDisplayName());
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        const next = prompt("Your display name (used to attribute quotes)", name) ?? "";
        if (next.trim()) {
          setDisplayName(next.trim());
          setName(next.trim());
        }
      }}
      className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors"
      aria-label="Edit display name"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-ink text-white text-[10px] font-semibold">
        {initials(name || "Guest")}
      </span>
      <span className="hidden sm:inline text-ink">{name || "Set name"}</span>
    </button>
  );
}
```

- [ ] **Step 3: Overwrite EmptyState.tsx**

```tsx
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="display-hero text-xl text-ink">{title}</div>
      {body && <div className="muted text-sm mt-2 max-w-md mx-auto">{body}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Overwrite ConfidenceDot.tsx**

```tsx
import { cn } from "@/lib/utils";

type Confidence = "high" | "medium" | "low";

const styles: Record<Confidence, { dot: string; label: string }> = {
  high:   { dot: "bg-success", label: "text-success" },
  medium: { dot: "bg-amber",   label: "text-ink" },
  low:    { dot: "bg-danger",  label: "text-danger" },
};

export function ConfidenceDot({
  value,
  showLabel = true,
}: {
  value: Confidence;
  showLabel?: boolean;
}) {
  const s = styles[value];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {showLabel && <span className={cn("capitalize", s.label)}>{value}</span>}
    </span>
  );
}
```

- [ ] **Step 5: Overwrite ResultHero.tsx**

(Plan 2 replaces the cockpit's hero via `HeroEstimate.tsx`; this file is referenced by older pages. Keep API identical, just swap colors.)

```tsx
export type HeroMeta = { label: string; value: string };

export function ResultHero({
  label,
  value,
  unit,
  meta,
}: {
  label: string;
  value: string;
  unit?: string;
  meta?: HeroMeta[];
}) {
  return (
    <div className="card p-8 mb-8">
      <div className="eyebrow text-[11px] text-muted mb-3">{label}</div>
      <div className="flex items-baseline gap-3 mb-6">
        <span className="display-hero text-5xl leading-none numeric text-amber">
          {value}
        </span>
        {unit && <span className="text-muted text-sm">{unit}</span>}
      </div>
      {meta && meta.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-3 pt-4 border-t hairline">
          {meta.map((m) => (
            <div key={m.label}>
              <div className="eyebrow text-[10px] text-muted">{m.label}</div>
              <div className="text-sm font-medium numeric mt-0.5 text-ink">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/DemoChip.tsx frontend/src/components/UserPill.tsx frontend/src/components/EmptyState.tsx frontend/src/components/ConfidenceDot.tsx frontend/src/components/ResultHero.tsx
git commit -m "style(foundation): pipe remaining primitives onto design tokens"
```

---

### Task 13: Final verification gate

- [ ] **Step 1: Run the full frontend test suite**

```bash
cd frontend && npm run test
```

Expected: All tests pass. If a test fails with palette/DOM assertions unrelated to behavior (e.g. hardcoded `text-brand` on a page Plan 2+ restyles), note it in `docs/superpowers/plans/DRIFT-plan-01.md` for the next plan to pick up.

- [ ] **Step 2: Type-check**

```bash
cd frontend && npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Production build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds. Tailwind emits the new utility classes (eyebrow, display-hero, mono, hairline, pad-y, pad-x — check the generated CSS).

- [ ] **Step 4: Visual smoke — start dev server, walk each route**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/` and confirm:
- Sidebar is dark navy (`#0D1B2A`) with "Matrix" in Barlow Condensed display font.
- Active nav pill shows amber left border + `bg-white/5`.
- Top strip shows breadcrumb in muted gray with ink-bold current page.
- Page canvas is warm paper `#F6F4EF`.
- Form cards are true white with hairline `#E5E1D8` borders.
- Inputs focus teal, not blue.
- Section step numbers are teal mono (e.g. "01").

Visit `/`, `/batch`, `/quotes`, `/performance`, `/insights`, `/admin`. Confirm each at least renders without console errors. Pages will have **mixed styling** — foundation primitives look new, page-specific classes still look old. This is expected; Plans 2–6 fix each surface.

Stop the dev server (Ctrl+C).

- [ ] **Step 5: Commit the final pass (if any late fixes made)**

If no changes beyond Tasks 1–12, skip. Otherwise:

```bash
git add -p
git commit -m "style(foundation): verification pass"
```

---

## Appendix A — Files still using legacy tokens after this plan

These 21 files continue to reference `bg-brand`, `text-brand`, `bg-navy-*`, `text-navy-*`, `bg-steel-*`, `text-steel-*`, `bg-accent`, `text-accent`, or `-dark` variants. They render via aliases (Task 2). Each is handled in a later plan:

| File | Replaced in |
|---|---|
| `components/DemoChip.tsx` | Plan 1 (done — now uses teal direct) |
| `components/Layout.tsx` | Plan 1 (done — now uses ink direct) |
| `components/PageHeader.tsx` | Plan 1 (done) |
| `components/ResultHero.tsx` | Plan 1 (done) |
| `components/Switch.tsx` | Plan 1 (done) |
| `components/Tabs.tsx` | Plan 1 (done) |
| `components/UserPill.tsx` | Plan 1 (done) |
| `pages/AdminLogin.tsx` | Plan 6 |
| `pages/Quotes.tsx` | Plan 3 |
| `pages/UploadTrain.tsx` | Plan 6 |
| `pages/insights/LatestQuotesTable.tsx` | Plan 5 |
| `pages/quotes/QuotesTable.tsx` | Plan 3 |
| `pages/single-quote/HeroEstimate.tsx` | Plan 2 |
| `pages/single-quote/QuoteForm.tsx` | Plan 2 |
| `pages/single-quote/ResultPanel.tsx` | Plan 2 |
| `pages/single-quote/ResultSkeleton.tsx` | Plan 2 |
| `pages/single-quote/ResultTabs.tsx` | Plan 2 |
| `pages/single-quote/tabs/DriversTab.tsx` | Plan 2 |
| `pages/single-quote/tabs/EstimateTab.tsx` | Plan 2 |
| `pages/single-quote/tabs/ScenariosTab.tsx` | Plan 2 |
| `pages/single-quote/tabs/SimilarTab.tsx` | Plan 2 |

After Plan 7 lands, Plan 7's cleanup task removes the `brand`, `navy`, `steel`, `accent` aliases from `tailwind.config.js`. Any remaining references produce unstyled output — at that point the grep should be empty:

```bash
git grep -l "bg-brand\|text-brand\|bg-navy\|text-navy\|bg-steel\|text-steel\|bg-accent\|text-accent" -- 'frontend/src/**/*.tsx'
```

---

## Done

When Task 13's visual smoke passes, Plan 1 is complete. Plans 2–7 can proceed in any order (Plan 2 / Cockpit has the most visible payoff; Plan 7 / dark mode depends on all surfaces being restyled to be worth the effort).
