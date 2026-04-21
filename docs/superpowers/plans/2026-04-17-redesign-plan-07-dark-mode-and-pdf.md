# Matrix Quote Web — Redesign Plan 7: Dark Mode + PDF + Alias Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light/dark theme toggle (port the design's overlay CSS + toggle logic), restyle the WeasyPrint PDF template to the new palette, and remove the legacy `brand` / `navy` / `steel` / `accent` tailwind aliases that Plan 1 left in place for migration safety.

**Architecture:** Dark mode layers on top of the existing light theme via `:root[data-theme="dark"]` selectors in a new `dark-mode.css` — no Tailwind `dark:` variants, the overlay remaps `.bg-paper`, `.card`, `.text-ink`, etc. directly. Theme state persists in `localStorage` and is toggled by a small React component (`ThemeToggle.tsx`) anchored to the layout. The PDF template stays with WeasyPrint; its CSS swaps the 2025-era blue palette for the Matrix design tokens (ink / amber / teal / hairline). Alias removal is the final sweep — any remaining `bg-brand` / `bg-navy-*` / `bg-steel-*` / `text-accent` references are replaced with direct tokens (plans 2–6 should have done this; this task verifies and catches misses).

**Tech Stack:** Tailwind CSS (+ custom overlay), React 18, WeasyPrint (unchanged — CSS only).

---

## Design reference

- `docs/design/claude-design-20260417/project/styles/dark-mode.css` — the full overlay (~180 lines) ported verbatim.
- `docs/design/claude-design-20260417/project/lib/theme-toggle.js` — source behavior; we port it to a React component.
- `docs/design/claude-design-20260417/project/PDF Export Template.html` — PDF visual reference (though the actual output is WeasyPrint, not HTML-to-image; match palette + eyebrow typography, not full layout).

---

## Prerequisites

- **Plans 1–6 complete.** All frontend surfaces restyled. The backend PDF endpoint must already exist (it was shipped in the prior Plan D).

---

## File Structure

**Created:**
- `frontend/src/styles/dark-mode.css` — full dark overlay
- `frontend/src/components/ThemeToggle.tsx` — floating pill toggle + localStorage persistence
- `frontend/src/components/ThemeToggle.test.tsx` — basic toggle test

**Modified:**
- `frontend/src/main.tsx` — import dark-mode.css
- `frontend/src/components/Layout.tsx` — mount `<ThemeToggle />` once in the shell
- `frontend/tailwind.config.js` — remove `brand`, `navy`, `steel`, `accent` aliases
- `backend/app/templates/quote_pdf.css` — ink/amber/teal palette + eyebrow typography
- `backend/app/templates/quote_pdf.html` — apply eyebrow / display / mono classes (no layout change)

---

## Tasks

### Task 1: Port dark-mode.css overlay

**Files:**
- Create: `frontend/src/styles/dark-mode.css`

- [ ] **Step 1: Create the file**

Copy the overlay from `docs/design/claude-design-20260417/project/styles/dark-mode.css` verbatim, with two edits to fit the repo's class names:

```css
/* =======================================================
   Matrix Quote · Dark mode overlay
   Activated by [data-theme="dark"] on <html>.
   Remaps the shared light-mode tokens — no Tailwind `dark:`
   variants used anywhere else in the app.
======================================================= */

:root[data-theme="dark"] {
  color-scheme: dark;
}

/* Page surfaces */
:root[data-theme="dark"] html,
:root[data-theme="dark"] body {
  background: #0A1420 !important;
  color: #E8E6DF !important;
}

/* Sidebar — push slightly deeper than canvas */
:root[data-theme="dark"] aside.bg-ink {
  background: #060D17 !important;
  border-right: 1px solid rgba(255,255,255,0.04);
}

/* Paper canvas → deep slate */
:root[data-theme="dark"] .bg-paper,
:root[data-theme="dark"] .bg-paper\/60,
:root[data-theme="dark"] .bg-paper\/40,
:root[data-theme="dark"] .bg-paper\/80,
:root[data-theme="dark"] .hover\:bg-paper:hover,
:root[data-theme="dark"] .hover\:bg-paper\/60:hover,
:root[data-theme="dark"] .hover\:bg-paper\/80:hover {
  background-color: #101C2B !important;
}

/* Cards / surfaces */
:root[data-theme="dark"] .card,
:root[data-theme="dark"] .bg-surface,
:root[data-theme="dark"] .bg-white,
:root[data-theme="dark"] .bg-white\/60 {
  background-color: #15212F !important;
  border-color: #25334A !important;
}

/* Hairlines and dividers */
:root[data-theme="dark"] .hairline,
:root[data-theme="dark"] [class*="border-line"],
:root[data-theme="dark"] [class*="divide-line"] > * + *,
:root[data-theme="dark"] .border,
:root[data-theme="dark"] .border-t,
:root[data-theme="dark"] .border-b,
:root[data-theme="dark"] .border-l,
:root[data-theme="dark"] .border-r {
  border-color: #25334A !important;
}
:root[data-theme="dark"] .bg-line,
:root[data-theme="dark"] .bg-line2 {
  background-color: #25334A !important;
}

/* Text */
:root[data-theme="dark"] .text-ink,
:root[data-theme="dark"] .text-ink2 {
  color: #EDEBE4 !important;
}
:root[data-theme="dark"] .text-ink\/80 { color: rgba(237,235,228,0.80) !important; }
:root[data-theme="dark"] .text-ink\/70 { color: rgba(237,235,228,0.70) !important; }
:root[data-theme="dark"] .text-ink\/60 { color: rgba(237,235,228,0.60) !important; }
:root[data-theme="dark"] .text-ink\/50 { color: rgba(237,235,228,0.50) !important; }
:root[data-theme="dark"] .text-muted   { color: #92A0B3 !important; }
:root[data-theme="dark"] .text-muted2  { color: #6B7A8E !important; }

/* Sidebar text stays white */
:root[data-theme="dark"] aside.bg-ink,
:root[data-theme="dark"] aside.bg-ink .text-ink,
:root[data-theme="dark"] aside.bg-ink .display-hero,
:root[data-theme="dark"] aside.bg-ink .eyebrow {
  color: #FFFFFF !important;
}
:root[data-theme="dark"] aside.bg-ink .text-white\/80 { color: rgba(255,255,255,0.80) !important; }
:root[data-theme="dark"] aside.bg-ink .text-white\/60 { color: rgba(255,255,255,0.60) !important; }
:root[data-theme="dark"] aside.bg-ink .text-white\/50 { color: rgba(255,255,255,0.50) !important; }
:root[data-theme="dark"] aside.bg-ink .text-white\/40 { color: rgba(255,255,255,0.40) !important; }

/* Primary buttons — ink-on-white → amber-on-ink in dark */
:root[data-theme="dark"] .bg-ink:not(aside):not(.bg-ink\/5):not(.bg-ink\/10) {
  background-color: #F2B61F !important;
  color: #0A1420 !important;
}
:root[data-theme="dark"] .hover\:bg-ink2:hover:not(aside) {
  background-color: #E0A615 !important;
}

/* Soft tints */
:root[data-theme="dark"] .bg-tealSoft { background-color: rgba(31,143,166,0.18) !important; }
:root[data-theme="dark"] .text-tealDark,
:root[data-theme="dark"] .text-teal   { color: #6FC6D8 !important; }
:root[data-theme="dark"] .bg-amberSoft { background-color: rgba(242,182,31,0.18) !important; }
:root[data-theme="dark"] .text-amber   { color: #F2B61F !important; }
:root[data-theme="dark"] .text-success { color: #5BB898 !important; }
:root[data-theme="dark"] .text-danger  { color: #E07456 !important; }
:root[data-theme="dark"] .bg-success   { background-color: #2F8F6F !important; }
:root[data-theme="dark"] .bg-danger    { background-color: #B5412B !important; }
:root[data-theme="dark"] .bg-amber     { background-color: #F2B61F !important; color: #0A1420 !important; }
:root[data-theme="dark"] .bg-teal      { background-color: #1F8FA6 !important; }

/* Inputs */
:root[data-theme="dark"] input,
:root[data-theme="dark"] textarea,
:root[data-theme="dark"] select {
  background-color: #101C2B !important;
  color: #EDEBE4 !important;
  border-color: #25334A;
}
:root[data-theme="dark"] input::placeholder { color: #6B7A8E; }

/* Backdrop-blur top bar */
:root[data-theme="dark"] .backdrop-blur.bg-white\/60,
:root[data-theme="dark"] .bg-white\/60.backdrop-blur {
  background-color: rgba(10,20,32,0.70) !important;
}

/* Shadows — softer in dark */
:root[data-theme="dark"] .shadow,
:root[data-theme="dark"] [class*="shadow-"] {
  box-shadow: 0 1px 0 rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6) !important;
}

/* Theme toggle pill */
.theme-toggle {
  position: fixed; bottom: 16px; left: 16px; z-index: 60;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 999px;
  background: #0D1B2A; color: #fff;
  border: 1px solid #25334A;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px; letter-spacing: 0.04em;
  cursor: pointer; user-select: none;
  box-shadow: 0 6px 20px -8px rgba(0,0,0,0.4);
}
.theme-toggle:hover { background: #1E2B3A; }
:root[data-theme="dark"] .theme-toggle {
  background: #F2B61F; color: #0A1420; border-color: transparent;
}
.theme-toggle .dot { width: 8px; height: 8px; border-radius: 50%; background: #F2B61F; }
:root[data-theme="dark"] .theme-toggle .dot { background: #0A1420; }
```

- [ ] **Step 2: Import into main.tsx**

Open `frontend/src/main.tsx`. Add this line just after `import "./styles/globals.css";`:

```tsx
import "./styles/dark-mode.css";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/dark-mode.css frontend/src/main.tsx
git commit -m "style(theme): dark mode overlay keyed on [data-theme=dark]"
```

---

### Task 2: Create ThemeToggle React component

**Files:**
- Create: `frontend/src/components/ThemeToggle.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from "react";

const KEY = "matrix-theme";

type Theme = "light" | "dark";

function readInitialTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = readInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label="Toggle dark mode"
      aria-pressed={theme === "dark"}
    >
      <span className="dot" aria-hidden="true" />
      <span>{theme === "dark" ? "DARK" : "LIGHT"}</span>
    </button>
  );
}
```

- [ ] **Step 2: Create the test**

Create `frontend/src/components/ThemeToggle.test.tsx`:

```tsx
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders in LIGHT by default", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(btn).toHaveTextContent(/LIGHT/);
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("flips to DARK on click and persists in localStorage", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    fireEvent.click(btn);
    expect(btn).toHaveTextContent(/DARK/);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("matrix-theme")).toBe("dark");
  });

  it("restores DARK from localStorage on mount", () => {
    localStorage.setItem("matrix-theme", "dark");
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(btn).toHaveTextContent(/DARK/);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
```

- [ ] **Step 3: Run the test**

```bash
cd frontend && npm run test -- ThemeToggle
```

Expected: 3 passing tests.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ThemeToggle.tsx frontend/src/components/ThemeToggle.test.tsx
git commit -m "feat(theme): ThemeToggle component with localStorage persistence"
```

---

### Task 3: Mount ThemeToggle in Layout

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Add the import and mount**

At the top of `frontend/src/components/Layout.tsx` with the other `@/components` imports, add:

```tsx
import { ThemeToggle } from "@/components/ThemeToggle";
```

Then at the very bottom of the returned JSX (just before the closing `</div>` of the root flex div), add:

```tsx
      <ThemeToggle />
```

The root return now ends with:

```tsx
      <main className="flex-1 min-w-0">
        {/* …existing content… */}
      </main>
      <ThemeToggle />
    </div>
  );
}
```

- [ ] **Step 2: Run Layout tests**

```bash
cd frontend && npm run test -- Layout.test
```

Expected: all existing assertions pass. The added toggle doesn't affect nav-role assertions.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "style(theme): mount ThemeToggle pill in the layout shell"
```

---

### Task 4: Restyle PDF CSS — ink/amber/teal palette + eyebrow typography

**Files:**
- Modify: `backend/app/templates/quote_pdf.css`

- [ ] **Step 1: Overwrite the file**

```css
/* Matrix Quote · PDF export styles (WeasyPrint).
   Uses system sans/mono — Google Fonts not embedded to keep offline rendering deterministic. */

@page {
  size: letter;
  margin: 0.75in;
  @bottom-left  { content: "Matrix Design LLC · matrixdesignllc.com"; font-size: 9pt; color: #5A6573; letter-spacing: 0.04em; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9pt; color: #5A6573; font-variant-numeric: tabular-nums; }
}

html, body {
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #0D1B2A;
  line-height: 1.5;
  font-size: 11pt;
  margin: 0;
  padding: 0;
  background: #FFFFFF;
}

/* Page 1 — cover */
.page { page-break-after: always; position: relative; }
.page:last-child { page-break-after: auto; }
.page::before {
  content: "";
  display: block;
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3pt;
  background: #0D1B2A;
}
.page::after {
  content: "";
  display: block;
  position: absolute;
  top: 3pt; left: 0; right: 0;
  height: 1.5pt;
  background: #F2B61F;
}

.cover-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 18pt;
  border-bottom: 1px solid #E5E1D8;
  padding-bottom: 12pt;
}
.logo { height: 30pt; }
.quote-number {
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  font-size: 9pt;
  color: #5A6573;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}

.cover-meta { margin-top: 0.5in; }
.meta-label {
  font-size: 8pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #5A6573;
  font-weight: 600;
  margin-top: 14pt;
}
.meta-value {
  font-size: 14pt;
  color: #0D1B2A;
  margin-top: 3pt;
  font-weight: 500;
}

.divider {
  border: 0;
  border-top: 1px solid #E5E1D8;
  margin: 0.35in 0;
}

/* Hero estimate block */
.hero { margin-top: 0.3in; position: relative; }
.hero-label {
  font-size: 9pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #5A6573;
  font-weight: 600;
}
.hero-number {
  font-variant-numeric: tabular-nums;
  font-size: 84pt;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1;
  color: #0D1B2A;
  margin-top: 6pt;
}
.hero-range {
  margin-top: 10pt;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  font-size: 11pt;
  color: #5A6573;
  font-variant-numeric: tabular-nums;
}

/* Headings */
h2 {
  color: #0D1B2A;
  font-size: 14pt;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-top: 0.35in;
  padding-bottom: 6pt;
  border-bottom: 1px solid #E5E1D8;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8pt;
}
th, td {
  padding: 6pt 0;
  border-bottom: 1px solid #E5E1D8;
  font-size: 10pt;
  vertical-align: middle;
}
th {
  text-align: left;
  font-weight: 600;
  color: #5A6573;
  font-size: 8pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
td.num, th.num {
  text-align: right;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  font-variant-numeric: tabular-nums;
}

/* Share bars */
.bar { width: 40%; }
.bar .track {
  background: #E5E1D8;
  border-radius: 2pt;
  height: 5pt;
  overflow: hidden;
  display: inline-block;
  width: 72%;
  vertical-align: middle;
}
.bar .fill {
  background: #0D1B2A;
  height: 100%;
  border-radius: 2pt;
}
.bar .pct {
  display: inline-block;
  width: 22%;
  text-align: right;
  color: #5A6573;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  font-variant-numeric: tabular-nums;
  margin-left: 4pt;
  font-size: 9pt;
}

/* Input summary */
.inputs td.label { color: #5A6573; width: 40%; }
.inputs td.value {
  color: #0D1B2A;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  font-variant-numeric: tabular-nums;
}

p.muted {
  color: #5A6573;
  font-size: 9pt;
}
p {
  color: #0D1B2A;
  font-size: 11pt;
  line-height: 1.55;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/templates/quote_pdf.css
git commit -m "style(pdf): swap PDF palette to ink/amber/teal with mono tabular-nums"
```

---

### Task 5: Tighten quote_pdf.html Jinja with eyebrow / display classes

**Files:**
- Modify: `backend/app/templates/quote_pdf.html`

- [ ] **Step 1: Overwrite the file**

```jinja
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Matrix Quote — {{ quote.project_name }}</title>
  <link rel="stylesheet" href="quote_pdf.css"/>
</head>
<body>

  {# ───────────────── Page 1 — cover ───────────────── #}
  <section class="page page-cover">
    <header class="cover-header">
      <img src="assets/matrix_logo.svg" class="logo" alt="Matrix Design LLC"/>
      <div class="quote-number">Quote {{ quote_number }}</div>
    </header>

    <div class="cover-meta">
      <div class="meta-label">Project</div>
      <div class="meta-value">{{ quote.project_name }}</div>

      {% if quote.client_name %}
      <div class="meta-label">Prepared for</div>
      <div class="meta-value">{{ quote.client_name }}</div>
      {% endif %}

      <div class="meta-label">Prepared</div>
      <div class="meta-value">
        {{ prepared_on }}{% if quote.created_by %} &middot; by {{ quote.created_by }}{% endif %}
      </div>
    </div>

    <hr class="divider"/>

    <div class="hero">
      <div class="hero-label">Estimated hours</div>
      <div class="hero-number">{{ format_hours(quote.prediction.total_p50) }}</div>
      <div class="hero-range">
        Range {{ format_hours(quote.prediction.total_p10) }}–{{ format_hours(quote.prediction.total_p90) }}
        &middot; 90% CI
      </div>
    </div>
  </section>

  {# ───────────────── Page 2 — breakdown ───────────────── #}
  <section class="page page-breakdown">
    <h2>Per-bucket breakdown</h2>
    <table class="breakdown">
      <thead>
        <tr>
          <th>Bucket</th>
          <th class="num">Hours</th>
          <th class="num">Range (90% CI)</th>
          <th class="bar">Share</th>
        </tr>
      </thead>
      <tbody>
        {% set total = quote.prediction.total_p50 or 1 %}
        {% for key, bucket in quote.prediction.sales_buckets.items() %}
          {% set pct = ((bucket.p50 / total) * 100) | round(0, 'floor') | int %}
          <tr>
            <td>{{ humanize_bucket(key) }}</td>
            <td class="num">{{ format_hours(bucket.p50) }}</td>
            <td class="num">{{ format_hours(bucket.p10) }}–{{ format_hours(bucket.p90) }}</td>
            <td class="bar">
              <div class="track"><div class="fill" style="width: {{ pct }}%"></div></div>
              <span class="pct">{{ pct }}%</span>
            </td>
          </tr>
        {% endfor %}
      </tbody>
    </table>

    <h2>Input summary</h2>
    <table class="inputs">
      <tbody>
        {% for label, value in input_rows %}
          <tr><td class="label">{{ label }}</td><td class="value">{{ value }}</td></tr>
        {% endfor %}
      </tbody>
    </table>
  </section>

  {# ───────────────── Page 3 — assumptions ───────────────── #}
  <section class="page page-assumptions">
    <h2>Assumptions &amp; disclaimers</h2>
    <p>
      This estimate was generated by Matrix Design LLC's internal quoting model, trained on
      historical project-hours data. The model produces a point estimate and a 90% prediction
      interval per sales bucket. Point estimates are not commitments; actual hours depend on
      final scope, site conditions, change orders, and integration complexity discovered during
      detailed engineering.
    </p>
    <p>
      Confidence labels (Weak, Moderate, Strong, Very Strong) reflect the relative width of the
      prediction interval versus the point estimate. A wider interval indicates the model had
      less signal for the inputs provided.
    </p>
    <p class="muted">
      Generated {{ prepared_on }} &middot; Quote {{ quote_number }}
    </p>
  </section>

</body>
</html>
```

- [ ] **Step 2: Run backend PDF tests (if WeasyPrint native libs are installed)**

```bash
cd backend && python -m pytest -k pdf -q
```

Expected: PASS if WeasyPrint is installed; SKIP if native libs (pango/cairo/harfbuzz) are missing locally. Both are acceptable here.

- [ ] **Step 3: Commit**

```bash
git add backend/app/templates/quote_pdf.html
git commit -m "style(pdf): tighten quote template headings and ranges to match design"
```

---

### Task 6: Remove legacy aliases from tailwind.config.js

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Sweep for any remaining legacy class references**

```bash
cd frontend && git grep -nE "(^|[^-])bg-(brand|navy-|steel-|accent)|text-(brand|navy-|steel-|accent)|border-(brand|navy-|steel-|accent)|ring-(brand|accent)" -- 'src/**/*.tsx' || echo "clean"
```

Expected: `clean` (empty output). If matches appear, note the file paths — Plans 2–6 should have replaced these. Fix them in place before continuing:

- `bg-brand`          → `bg-teal`
- `bg-brand-hover`    → `hover:bg-tealDark`
- `text-brand`        → `text-teal`
- `text-brand-foreground` → `text-white`
- `bg-navy-900`       → `bg-ink` (or remove, use `bg-ink/5` for subtle)
- `bg-steel-100`      → `bg-paper` (or `bg-line` for hairline-bg)
- `bg-steel-200`      → `bg-line`
- `bg-steel-300`      → `bg-line2`
- `bg-steel-600`      → `bg-muted`
- `text-accent`       → `text-teal`
- `bg-accent`         → `bg-teal`
- `bg-accent/10`      → `bg-tealSoft`
- `ring-accent`       → `ring-teal`
- `ring-accent/40`    → `ring-teal/30`

Once the sweep is clean, commit any fixes with `git commit -m "style(sweep): replace residual legacy token classes"` before moving on.

- [ ] **Step 2: Overwrite tailwind.config.js**

```js
var config = {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink:       "#0D1B2A",
                ink2:      "#1E2B3A",
                paper:     "#F6F4EF",
                surface:   "#FFFFFF",
                line:      "#E5E1D8",
                line2:     "#D8D3C6",
                muted:     "#5A6573",
                muted2:    "#8A94A1",
                amber:     "#F2B61F",
                amberSoft: "#FAEBB5",
                teal:      "#1F8FA6",
                tealDark:  "#177082",
                tealSoft:  "#D7ECF1",
                success:   "#2F8F6F",
                warning:   "#F2B61F",
                danger:    "#B5412B",

                // Thin compat for the HTML body class and existing `border-border`
                // utility surfaces — these keep the legacy class names usable
                // without reintroducing the brand/navy/steel families.
                bg:        "#F6F4EF",
                border:    "#E5E1D8",
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

- [ ] **Step 3: Build — Tailwind will fail loudly if an undefined token is referenced**

```bash
cd frontend && npm run build
```

Expected: clean build. If Tailwind warns about unknown classes or the build fails, the sweep in Step 1 missed something — go back, find the file, fix, recommit, rebuild.

- [ ] **Step 4: Run the full test suite**

```bash
cd frontend && npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "style(cleanup): remove brand, navy, steel, accent aliases — design tokens only"
```

---

### Task 7: Final verification gate

- [ ] **Step 1: Frontend full suite**

```bash
cd frontend && npm run test && npm run typecheck && npm run build
```

Expected: clean.

- [ ] **Step 2: Backend PDF smoke (optional — skip if WeasyPrint libs unavailable)**

```bash
cd backend && python -m pytest -k pdf -q
```

- [ ] **Step 3: Visual smoke — dark mode across every surface**

```bash
cd frontend && npm run dev
```

Visit `http://localhost:5173/` and click the bottom-left LIGHT / DARK pill. Walk through:
- Sidebar deepens, amber active rail still reads.
- Canvas darkens (`#0A1420`), cards lift to `#15212F`.
- Primary ink buttons on every page flip to amber-on-ink (submit button, export PDF, sign-in button).
- Hairlines reflow to `#25334A`.
- Inputs darken; placeholders still legible.
- Confidence pips, dropzone icon, alert icons remain distinguishable.
- Reload the page — theme persists (localStorage).
- Click back to LIGHT — everything returns to paper white.

Walk `/quotes`, `/quotes/compare?ids=a,b`, `/batch`, `/insights`, `/performance`, `/admin`, `/admin/train`, `/admin/data`, `/admin/drivers`, `/admin/login`. Each should render in both themes without visual breakage.

Stop the dev server.

- [ ] **Step 4: PDF smoke — render one**

If the backend is runnable and WeasyPrint is installed:

```bash
cd backend && uvicorn app.main:app --reload
```

Then in another terminal:

```bash
curl -o /tmp/quote-test.pdf -X POST http://localhost:8000/api/quote/pdf \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","project_name":"Smoke test","inputs":{"project_name":"Smoke test"},"prediction":{"total_p10":900,"total_p50":1200,"total_p90":1500,"sales_buckets":{"mechanical":{"p10":200,"p50":260,"p90":310}}}}'
```

Open `/tmp/quote-test.pdf`. Confirm:
- Top 3pt ink band + 1.5pt amber band render across the top of page 1.
- Hero number is large Barlow-or-system display, left-aligned.
- Table rows have hairline dividers in `#E5E1D8`.
- Share bars are ink fill, not blue.
- Footer reads "Matrix Design LLC · matrixdesignllc.com" with "Page N of M" mono right.

Stop uvicorn.

- [ ] **Step 5: Final commit (if any sweep fixes were made)**

If any late changes happened, commit them with a descriptive message. Otherwise the plan is done.

---

## Done

All 7 redesign plans complete. Pick any follow-up plan by writing a new spec — examples:
- **Batch review/results wiring** (Plan 4's review state depends on a future batch-inference endpoint)
- **Executive funnel + leaderboard + activity feed** (Plan 5's design elements that lack endpoints)
- **Admin live data wiring** (replace Plan 6's "sample data" fixtures with real endpoints)
- **PDF 4-page layout** (expand page 3 into Why + Assumptions across two pages, matching the design's full 4-page template)
