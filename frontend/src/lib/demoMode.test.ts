import { describe, expect, it } from "vitest";

import { DEMO_ASSETS, IS_DEMO } from "./demoMode";

describe("demoMode", () => {
  it("exposes a static demo-assets base URL", () => {
    expect(DEMO_ASSETS).toBe("/demo-assets");
  });

  it("IS_DEMO is a boolean derived from VITE_DEMO_MODE", () => {
    expect(typeof IS_DEMO).toBe("boolean");
  });
});
