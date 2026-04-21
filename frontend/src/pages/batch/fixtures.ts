export type RecentBatch = {
  id: string;
  fileName: string;
  rows: number;
  okCount: number;
  totalHours: number;
  medianHours: number;
  runAt: string; // ISO
  status: "ready" | "running" | "failed";
};

export const SAMPLE_RECENT_BATCHES: RecentBatch[] = [
  {
    id: "b-2025-104",
    fileName: "Q2-forecast-Atlas.csv",
    rows: 42,
    okCount: 40,
    totalHours: 42_310,
    medianHours: 984,
    runAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
  },
  {
    id: "b-2025-103",
    fileName: "Q2-Northland.csv",
    rows: 18,
    okCount: 18,
    totalHours: 16_880,
    medianHours: 912,
    runAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
  },
  {
    id: "b-2025-102",
    fileName: "ops-audit-Apex.csv",
    rows: 9,
    okCount: 8,
    totalHours: 7_204,
    medianHours: 794,
    runAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
  },
];

export type SchemaRow = { field: string; type: string; required: boolean };

// The schema here mirrors `frontend/src/pages/single-quote/schema.ts` — field-only.
export const BATCH_SCHEMA: SchemaRow[] = [
  { field: "project_name",            type: "string",  required: true  },
  { field: "industry_segment",        type: "enum",    required: true  },
  { field: "system_category",         type: "enum",    required: true  },
  { field: "automation_level",        type: "enum",    required: true  },
  { field: "stations_count",          type: "int",     required: true  },
  { field: "robot_count",             type: "int",     required: true  },
  { field: "fixture_sets",            type: "int",     required: false },
  { field: "part_types",              type: "int",     required: false },
  { field: "weldment_perimeter_ft",   type: "float",   required: false },
  { field: "fence_length_ft",         type: "float",   required: false },
  { field: "safety_doors",            type: "int",     required: false },
  { field: "conveyor_length_ft",      type: "float",   required: false },
  { field: "plc_family",              type: "enum",    required: false },
  { field: "panel_count",             type: "int",     required: false },
  { field: "servo_axes",              type: "int",     required: false },
  { field: "drive_count",             type: "int",     required: false },
  { field: "pneumatic_devices",       type: "int",     required: false },
  { field: "vision_systems_count",    type: "int",     required: false },
  { field: "changeover_time_min",     type: "int",     required: false },
  { field: "complexity_score_1_5",    type: "int 1–5", required: false },
  { field: "custom_pct",              type: "pct 0–100", required: false },
  { field: "estimated_materials_cost",type: "usd",     required: false },
];
