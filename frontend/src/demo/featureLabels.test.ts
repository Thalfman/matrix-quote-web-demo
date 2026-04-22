import { describe, expect, it } from "vitest";
import { humanFeatureLabel } from "./featureLabels";

describe("humanFeatureLabel", () => {
  it("returns the correct label for a numeric feature (station_count)", () => {
    const { label } = humanFeatureLabel("stations_count", {});
    expect(label).toBe("Number of stations");
  });

  it("returns the correct label for another numeric feature (robot_count)", () => {
    const { label } = humanFeatureLabel("robot_count", {});
    expect(label).toBe("Number of robots");
  });

  it("returns the correct label for a third numeric feature (panel_count)", () => {
    const { label } = humanFeatureLabel("panel_count", {});
    expect(label).toBe("Electrical panels");
  });

  it("formats a one-hot categorical feature (industry_segment_Aerospace) correctly", () => {
    const { label } = humanFeatureLabel("industry_segment_Aerospace", {});
    expect(label).toBe("Industry: Aerospace");
  });

  it("formats another categorical prefix (system_category_Welding) correctly", () => {
    const { label } = humanFeatureLabel("system_category_Welding", {});
    expect(label).toBe("System category: Welding");
  });

  it("falls back gracefully for unknown raw names", () => {
    const { label } = humanFeatureLabel("some_unknown_feature_xyz", {});
    // Best-effort title-case transform: underscores → spaces, each word capitalised
    expect(label).toBe("Some Unknown Feature Xyz");
  });

  it("always returns direction 'increases' for all branches", () => {
    expect(humanFeatureLabel("stations_count", {}).direction).toBe("increases");
    expect(humanFeatureLabel("industry_segment_Auto", {}).direction).toBe("increases");
    expect(humanFeatureLabel("totally_unknown", {}).direction).toBe("increases");
  });
});
