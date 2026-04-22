import type { ProjectRecord } from "@/demo/realProjects";

const ACTUAL_FIELDS = [
  "me10_actual_hours",
  "me15_actual_hours",
  "me230_actual_hours",
  "ee20_actual_hours",
  "rb30_actual_hours",
  "cp50_actual_hours",
  "bld100_actual_hours",
  "shp150_actual_hours",
  "inst160_actual_hours",
  "trv180_actual_hours",
  "doc190_actual_hours",
  "pm200_actual_hours",
] as const;

/** Sum all twelve per-operation actual-hours fields from a ProjectRecord. */
export function sumActualHours(r: ProjectRecord): number {
  return ACTUAL_FIELDS.reduce((s, f) => s + Number(r[f] ?? 0), 0);
}
