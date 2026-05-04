/**
 * Project glossary — single source of truth for category-name definitions
 * surfaced as hover/focus tooltips throughout the demo.
 *
 * Definitions are 1–2 plain-English sentences. They MUST NOT contain ML
 * jargon — the audience is a non-technical reviewer (per PROJECT.md).
 *
 * Adding a term: append a new entry below. Term keys are matched verbatim
 * by lookup(); use the exact casing and punctuation that appears in the
 * UI surface where the tooltip is consumed.
 *
 * Phase 4 DATA-03 will extend the jargon-guard test to scan this file.
 * Keep it clean.
 */

export type GlossaryEntry = {
  term: string;
  definition: string;
  /** Internal-only provenance: which existing UI copy this was derived from. NOT shown to the user. */
  source?: string;
};

export const GLOSSARY: Readonly<Record<string, GlossaryEntry>> = {
  "System Category": {
    term: "System Category",
    definition:
      "The kind of automation system being built — for example Machine Tending, End of Line Automation, Robotic Metal Finishing, or Engineered Manufacturing Systems.",
    source: "QuoteForm system_category options",
  },
  "Sales Bucket": {
    term: "Sales Bucket",
    definition:
      "A grouping of project hours by the engineering discipline that owns them, such as ME (mechanical), EE (electrical), Build, Install, or Software.",
    source: "schema.ts SALES_BUCKETS",
  },
  "Vision Type": {
    term: "Vision Type",
    definition:
      "Whether the system uses 2D vision, 3D vision, or no vision at all. Vision systems add inspection or guidance capability and typically lengthen build hours.",
    source: "QuoteForm vision_type options",
  },
  "Industry Segment": {
    term: "Industry Segment",
    definition:
      "The customer's industry — for example Automotive, Food & Beverage, or General Industry. Different segments tend to have different scope and complexity profiles.",
    source: "QuoteForm industry_segment options",
  },
  "Automation Level": {
    term: "Automation Level",
    definition:
      "How much of the operation runs without an operator: Semi-Automatic (operator assisted), Robotic (robot-driven), or Hard Automation (dedicated mechanical motion).",
    source: "QuoteForm automation_level options",
  },
  "Complexity (1–5)": {
    term: "Complexity (1–5)",
    definition:
      "An overall difficulty rating from 1 (very simple) to 5 (very complex), capturing how much the project departs from a routine build.",
    source: "QuoteForm complexity_score_1_5 + ComplexityVsHours axis",
  },
  "PLC Family": {
    term: "PLC Family",
    definition:
      "The programmable logic controller platform used to run the system — for example Allen-Bradley CompactLogix, ControlLogix, or Siemens S7.",
    source: "QuoteForm plc_family options",
  },
  "HMI Family": {
    term: "HMI Family",
    definition:
      "The human-machine interface platform — the touchscreen or panel an operator uses to run the system, such as Allen-Bradley PanelView Plus or Siemens Comfort Panel.",
    source: "QuoteForm hmi_family options",
  },
};

/**
 * Look up a glossary entry by exact term key.
 *
 * Returns null on miss (never throws). Callers (the Tooltip wrapper) treat
 * null as "show the 'Definition coming soon' fallback".
 */
export function lookup(term: string): GlossaryEntry | null {
  if (term == null) return null;
  if (typeof term !== "string") return null;
  return GLOSSARY[term] ?? null;
}
