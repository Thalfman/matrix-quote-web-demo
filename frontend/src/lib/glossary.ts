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

  // -------------------------------------------------------------------------
  // Hours-by-discipline (stakeholder priority list, 2026-05-01 review §U4b).
  // Definitions describe what work the hours cover, in plain English. Each
  // pairs with the matching CATEGORY_LABEL key under "Discipline labels"
  // below so both the short ("ME hours") and the long ("Mechanical
  // Engineering: primary") form resolve to the same idea.
  // -------------------------------------------------------------------------
  "ME hours": {
    term: "ME hours",
    definition:
      "Mechanical engineering hours — designing the mechanical layout, fixtures, weldments, and the structural and motion components of the system.",
    source: "stakeholder priority list",
  },
  "EE hours": {
    term: "EE hours",
    definition:
      "Electrical engineering hours — designing power, panels, wiring, and the controls hardware that bring the mechanical system to life.",
    source: "stakeholder priority list",
  },
  "PM hours": {
    term: "PM hours",
    definition:
      "Project management hours — running the schedule, coordinating with the customer, and keeping the build on track from kickoff through ship.",
    source: "stakeholder priority list",
  },
  "Build hours": {
    term: "Build hours",
    definition:
      "Hours spent physically assembling the system on the shop floor — fitting parts together, mounting components, and bringing the build to a runnable state.",
    source: "stakeholder priority list",
  },
  "Robot hours": {
    term: "Robot hours",
    definition:
      "Hours spent programming and tuning the robots — paths, picks, places, hand-offs to the rest of the cell.",
    source: "stakeholder priority list",
  },
  "Controls hours": {
    term: "Controls hours",
    definition:
      "Hours spent writing and debugging the PLC and HMI software that runs the system day to day.",
    source: "stakeholder priority list",
  },
  "Install hours": {
    term: "Install hours",
    definition:
      "Hours spent at the customer's site setting the system in place, hooking it up, and getting it running on the customer's floor.",
    source: "stakeholder priority list",
  },
  "Travel hours": {
    term: "Travel hours",
    definition:
      "Hours spent traveling to and from the customer's site for installation, commissioning, or support visits.",
    source: "stakeholder priority list",
  },

  // -------------------------------------------------------------------------
  // Discipline labels — long-form variants used by CATEGORY_LABEL in the
  // per-category breakdown. Each maps to the same definition as its short-
  // form sibling above so QuoteResultPanel's "Hours by work category" rows
  // can resolve the label they actually render.
  // -------------------------------------------------------------------------
  "Mechanical Engineering": {
    term: "Mechanical Engineering",
    definition:
      "Mechanical engineering hours — designing the mechanical layout, fixtures, weldments, and the structural and motion components of the system.",
    source: "CATEGORY_LABEL me10/me15/me230",
  },
  "Electrical Engineering": {
    term: "Electrical Engineering",
    definition:
      "Electrical engineering hours — designing power, panels, wiring, and the controls hardware that bring the mechanical system to life.",
    source: "CATEGORY_LABEL ee20",
  },
  "Robotics": {
    term: "Robotics",
    definition:
      "Hours spent programming and tuning the robots — paths, picks, places, hand-offs to the rest of the cell.",
    source: "CATEGORY_LABEL rb30",
  },
  "Controls & PLC": {
    term: "Controls & PLC",
    definition:
      "Hours spent writing and debugging the PLC and HMI software that runs the system day to day.",
    source: "CATEGORY_LABEL cp50",
  },
  "Build & assembly": {
    term: "Build & assembly",
    definition:
      "Hours spent physically assembling the system on the shop floor — fitting parts together, mounting components, and bringing the build to a runnable state.",
    source: "CATEGORY_LABEL bld100",
  },
  "Installation": {
    term: "Installation",
    definition:
      "Hours spent at the customer's site setting the system in place, hooking it up, and getting it running on the customer's floor.",
    source: "CATEGORY_LABEL inst160",
  },
  "Travel": {
    term: "Travel",
    definition:
      "Hours spent traveling to and from the customer's site for installation, commissioning, or support visits.",
    source: "CATEGORY_LABEL trv180",
  },
  "Project management": {
    term: "Project management",
    definition:
      "Project management hours — running the schedule, coordinating with the customer, and keeping the build on track from kickoff through ship.",
    source: "CATEGORY_LABEL pm200",
  },
  "Documentation": {
    term: "Documentation",
    definition:
      "Hours spent writing the manuals, drawings, and validation paperwork the customer needs to operate and maintain the system.",
    source: "CATEGORY_LABEL doc190",
  },
  "Shipping & QC": {
    term: "Shipping & QC",
    definition:
      "Hours spent on the final quality check before the system leaves the floor and on packing it for shipment to the customer.",
    source: "CATEGORY_LABEL shp150",
  },

  // -------------------------------------------------------------------------
  // Estimate / accuracy framing (stakeholder priority list).
  // -------------------------------------------------------------------------
  "Material cost": {
    term: "Material cost",
    definition:
      "The dollar value of the parts, components, and raw materials that go into building the system. Does not include the labor hours to build it.",
    source: "stakeholder priority list",
  },
  "Estimated hours": {
    term: "Estimated hours",
    definition:
      "The hours the engine predicts a project will take, based on similar projects in the dataset.",
    source: "stakeholder priority list",
  },
  "Actual hours": {
    term: "Actual hours",
    definition:
      "The hours a completed project actually consumed, as billed once the build was done.",
    source: "stakeholder priority list",
  },
  "Confidence range": {
    term: "Confidence range",
    definition:
      "The likely high and low end around the estimate. A wider range means the engine sees fewer close matches in past projects; a tighter range means it sees many.",
    source: "QuoteResultPanel hero subhead",
  },
  "Similar projects": {
    term: "Similar projects",
    definition:
      "The past projects the engine considers closest to the one you're quoting, ranked by how well their inputs match yours.",
    source: "QuoteResultPanel supporting matches",
  },
  "ROM quote": {
    term: "ROM quote",
    definition:
      "A rough order-of-magnitude estimate. A quick early number based only on materials cost and the project type, before the full inputs are known. The range is wider than a full quote.",
    source: "RomResultPanel WHY_PRELIMINARY_COPY",
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
