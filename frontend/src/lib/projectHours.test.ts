import { describe, expect, it } from "vitest";
import { sumActualHours } from "./projectHours";
import type { ProjectRecord } from "@/demo/realProjects";

describe("sumActualHours", () => {
  it("sums all 12 actual-hours fields when every field is populated", () => {
    const record: ProjectRecord = {
      project_id: "p1",
      project_name: "Test Project",
      me10_actual_hours: 100,
      me15_actual_hours: 50,
      me230_actual_hours: 75,
      ee20_actual_hours: 60,
      rb30_actual_hours: 40,
      cp50_actual_hours: 30,
      bld100_actual_hours: 200,
      shp150_actual_hours: 80,
      inst160_actual_hours: 90,
      trv180_actual_hours: 20,
      doc190_actual_hours: 15,
      pm200_actual_hours: 25,
    };
    // 100+50+75+60+40+30+200+80+90+20+15+25 = 785
    expect(sumActualHours(record)).toBe(785);
  });

  it("treats null and missing fields as 0", () => {
    const record: ProjectRecord = {
      project_id: "p2",
      project_name: "Partial Project",
      me10_actual_hours: 100,
      me15_actual_hours: null,
      // all remaining fields absent
    };
    expect(sumActualHours(record)).toBe(100);
  });
});
