import { describe, expect, it } from "vitest";

import { QuoteInput } from "@/api/types";
import { FeatureStats, ProjectRecord } from "@/demo/realProjects";
import { distance, nearestK } from "./nearestNeighbor";

const stats: FeatureStats = {
  stations_count: { min: 0, max: 10, mean: 5, std: 2 },
  robot_count: { min: 0, max: 6, mean: 2, std: 1 },
  // Remaining numeric fields default to std=1, mean=0 via the fallback.
};

function input(over: Partial<QuoteInput> = {}): QuoteInput {
  return {
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    plc_family: "AB",
    hmi_family: "AB",
    vision_type: "None",
    stations_count: 5,
    robot_count: 2,
    ...over,
  };
}

function record(over: Partial<ProjectRecord>): ProjectRecord {
  return {
    project_id: "p1",
    project_name: "p",
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    plc_family: "AB",
    hmi_family: "AB",
    vision_type: "None",
    stations_count: 5,
    robot_count: 2,
    ...over,
  };
}

describe("distance", () => {
  it("is zero when every feature matches", () => {
    expect(distance(input(), record({ project_id: "same" }), stats)).toBe(0);
  });

  it("grows with numeric delta (z-scored)", () => {
    const near = distance(input(), record({ stations_count: 6 }), stats);
    const far = distance(input(), record({ stations_count: 9 }), stats);
    expect(far).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(0);
  });

  it("penalizes categorical mismatches heavily", () => {
    const catMismatch = distance(
      input(),
      record({ industry_segment: "Food & Beverage" }),
      stats,
    );
    // One categorical swap (weight 2) contributes sqrt(4) = 2.
    expect(catMismatch).toBeCloseTo(2, 5);
  });
});

describe("nearestK", () => {
  it("returns the k closest records sorted ascending", () => {
    const pool: ProjectRecord[] = [
      record({ project_id: "a", stations_count: 5 }),          // dist 0
      record({ project_id: "b", stations_count: 8 }),          // dist 1.5
      record({ project_id: "c", industry_segment: "Other" }),  // dist 2.0
      record({ project_id: "d", stations_count: 10 }),         // dist 2.5
    ];
    const got = nearestK(input(), pool, stats, 3);
    expect(got.map((x) => x.record.project_id)).toEqual(["a", "b", "c"]);
    expect(got[0].distance).toBeLessThanOrEqual(got[1].distance);
    expect(got[1].distance).toBeLessThanOrEqual(got[2].distance);
  });

  it("breaks ties on project_id", () => {
    const pool: ProjectRecord[] = [
      record({ project_id: "z" }),
      record({ project_id: "a" }),
    ];
    const got = nearestK(input(), pool, stats, 2);
    expect(got.map((x) => x.record.project_id)).toEqual(["a", "z"]);
  });
});
