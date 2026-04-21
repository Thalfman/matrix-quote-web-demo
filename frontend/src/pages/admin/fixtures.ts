export type TrainingRun = {
  id: string;
  trainedAt: string;
  rows: number;
  durationSec: number;
  mapePct: number;
  by: string;
};

export type AdminAlert = {
  id: string;
  tone: "info" | "warning" | "danger";
  title: string;
  body: string;
  at: string;
};

export type DataSource = {
  id: string;
  fileName: string;
  rows: number;
  newRows: number;
  dupes: number;
  uploadedAt: string;
  status: "ok" | "stale" | "error";
};

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

export const SAMPLE_RUNS: TrainingRun[] = [
  { id: "r12", trainedAt: new Date(now -  1 * day).toISOString(), rows: 1284, durationSec: 142, mapePct: 11.8, by: "admin" },
  { id: "r11", trainedAt: new Date(now -  9 * day).toISOString(), rows: 1261, durationSec: 138, mapePct: 12.1, by: "admin" },
  { id: "r10", trainedAt: new Date(now - 22 * day).toISOString(), rows: 1247, durationSec: 141, mapePct: 12.6, by: "admin" },
];

export const SAMPLE_ALERTS: AdminAlert[] = [
  {
    id: "a1",
    tone: "info",
    title: "Calibration is within target",
    body: "91.2% of last-30-day quotes fell inside their 90% CI — above the 88% floor.",
    at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "a2",
    tone: "warning",
    title: "Robotics MAPE creeping up",
    body: "Last two training runs show MAPE on robotics_hours rising from 9.8% → 12.4%.",
    at: new Date(now - 1 * day).toISOString(),
  },
];

export const SAMPLE_SOURCES: DataSource[] = [
  { id: "s1", fileName: "2026-Q1-master.xlsx",      rows: 1284, newRows:  37, dupes: 2, uploadedAt: new Date(now -  1 * day).toISOString(), status: "ok" },
  { id: "s2", fileName: "2025-Q4-Atlas-archive.csv", rows:  412, newRows:   0, dupes: 0, uploadedAt: new Date(now - 32 * day).toISOString(), status: "stale" },
];

export type FeatureImportance = { feature: string; importance: number };
export const SAMPLE_IMPORTANCE: FeatureImportance[] = [
  { feature: "stations_count",          importance: 1.00 },
  { feature: "estimated_materials_cost", importance: 0.86 },
  { feature: "robot_count",             importance: 0.71 },
  { feature: "complexity_score_1_5",    importance: 0.58 },
  { feature: "custom_pct",              importance: 0.52 },
  { feature: "servo_axes",              importance: 0.44 },
  { feature: "vision_systems_count",    importance: 0.31 },
  { feature: "panel_count",             importance: 0.27 },
  { feature: "changeover_time_min",     importance: 0.19 },
];

export const SAMPLE_HISTOGRAM: number[] = [
  3, 5, 9, 14, 22, 31, 44, 58, 62, 55, 47, 36, 28, 21, 14, 9, 6, 3, 2, 1,
];
