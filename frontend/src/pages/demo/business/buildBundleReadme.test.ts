// frontend/src/pages/demo/business/buildBundleReadme.test.ts
import { describe, expect, it } from "vitest";

import { buildBundleReadme } from "./exportPack";

const FIXED_DATE = new Date("2026-04-22T10:00:00.000Z");

describe("buildBundleReadme — template (CONTEXT D-06)", () => {
  it("titles the README with the dataset label", () => {
    const md = buildBundleReadme("Real · Data", FIXED_DATE);
    expect(md.split("\n")[0]).toBe("# Business Insights Pack — Real · Data");
  });

  it("renders an ISO-formatted generated date matching summary.md's convention", () => {
    const md = buildBundleReadme("Real", FIXED_DATE);
    expect(md).toContain("Generated: 2026-04-22T10:00:00.000Z");
  });

  it("names the three default-bundle files in the 'What's inside' block (CONTEXT D-01 + D-06)", () => {
    const md = buildBundleReadme("Real", FIXED_DATE);
    expect(md).toContain("`summary.md` — One-page narrative summary of this dataset.");
    expect(md).toContain("`business-insights.xlsx` — Spreadsheet with four tabs: Summary, Drivers, Raw, README.");
    expect(md).toContain("`README.md` — This file.");
  });

  it("explains where to start (summary.md and the workbook)", () => {
    const md = buildBundleReadme("Real", FIXED_DATE);
    expect(md).toContain("Open `summary.md` in any text editor or your browser.");
    expect(md).toContain("Open `business-insights.xlsx` in Excel, Apple Numbers, or Google Sheets.");
    expect(md).toContain("Start with the **README** tab");
  });

  it("references the engineer-side button by its locked label (CONTEXT D-07)", () => {
    const md = buildBundleReadme("Real", FIXED_DATE);
    expect(md).toContain('"Download raw JSON (for engineers)"');
    expect(md).toContain("`portfolio.json`");
  });

  it("is short — fewer than 25 lines (the README is meant to be a glance, not a manual)", () => {
    const md = buildBundleReadme("Real", FIXED_DATE);
    expect(md.split("\n").length).toBeLessThan(25);
  });

  it("matches the locked snapshot (CONTEXT D-06 verbatim, two substitutions)", () => {
    const md = buildBundleReadme("Real", FIXED_DATE);
    expect(md).toBe(
      [
        "# Business Insights Pack — Real",
        "",
        "Generated: 2026-04-22T10:00:00.000Z",
        "",
        "## What's inside",
        "- `summary.md` — One-page narrative summary of this dataset.",
        "- `business-insights.xlsx` — Spreadsheet with four tabs: Summary, Drivers, Raw, README.",
        "- `README.md` — This file.",
        "",
        "## Where to start",
        "- Open `summary.md` in any text editor or your browser. (Try VS Code, Notepad, or just double-click.)",
        "- Open `business-insights.xlsx` in Excel, Apple Numbers, or Google Sheets.",
        "  Start with the **README** tab — it explains what every column means.",
        "",
        "## Need the raw data?",
        'A separate "Download raw JSON (for engineers)" button in the app',
        "produces a `portfolio.json` file with the full structured dataset.",
        "",
      ].join("\n"),
    );
  });
});

describe("buildBundleReadme — jargon-guard (cross-cuts DATA-03 in Phase 4)", () => {
  const BANNED = [
    /\bP10\b/,
    /\bP50\b/,
    /\bP90\b/,
    /Pyodide/i,
    /\bgradient\s*boost(ing|ed)?\b/i,
    /R²/,
    /\bconfidence interval(s)?\b/i,
    /\bensemble\b/i,
    /\bcategorical\b/i,
    /\bembedding\b/i,
    /\btraining data\b/i,
    /\bregression\b/i,
    /\bsklearn\b/i,
    /\bjoblib\b/i,
    /\bquantile\b/i,
  ];

  it("no banned ML-jargon token appears in the README template", () => {
    const md = buildBundleReadme("Real", FIXED_DATE);
    for (const re of BANNED) {
      expect(md, `Banned token ${re} found in README`).not.toMatch(re);
    }
  });
});
