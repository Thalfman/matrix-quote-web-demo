/**
 * Unit tests for the TS-side state machine in pyodideClient.ts.
 *
 * Scope: the cache-idempotency and guard-rail logic that is pure TypeScript.
 * We do NOT exercise the Pyodide runtime, Python code, or network I/O.
 *
 * Because the module uses top-level mutable state (pyodidePromise,
 * modelPromises), vi.resetModules() gives us a fresh copy per describe block.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePyodideMock() {
  return {
    loadPackage: vi.fn(() => Promise.resolve()),
    runPython: vi.fn(),
    runPythonAsync: vi.fn(() => Promise.resolve()),
    FS: { mkdirTree: vi.fn(), writeFile: vi.fn() },
    toPy: vi.fn((v: unknown) => v),
    globals: {
      get: vi.fn().mockReturnValue(
        vi.fn(() =>
          JSON.stringify({
            ops: {},
            total_p50: 0,
            total_p10: 0,
            total_p90: 0,
            sales_buckets: {},
          }),
        ),
      ),
      set: vi.fn(),
    },
  };
}

/** Fetch stub that returns placeholder data for any URL. */
function makeOkFetch() {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve("# stub"),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    }),
  );
}

// ---------------------------------------------------------------------------
// Idempotency tests - call ensureModelsReady twice and verify same reference.
// ---------------------------------------------------------------------------

describe("pyodideClient - ensureModelsReady idempotency", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calling ensureModelsReady('real') twice returns the same promise object", async () => {
    vi.stubGlobal("loadPyodide", vi.fn(() => Promise.resolve(makePyodideMock())));
    vi.stubGlobal("fetch", makeOkFetch());
    // Prevent script injection from blocking (querySelector returns truthy → early return).
    vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("script"));

    const mod = await import("./pyodideClient");

    // We call ensureModelsReady without awaiting it - we only need the returned
    // promise reference. The internal async chain may not resolve in jsdom
    // (relative URLs fail in Node fetch), but that is not what we are testing.
    const p1 = mod.ensureModelsReady("real");
    const p2 = mod.ensureModelsReady("real");

    // The second call must return the same cached promise, not a new one.
    expect(p1).toBe(p2);

    // Let background micro-tasks drain without asserting on them.
    await Promise.allSettled([p1]);
  });

  it("ensureModelsReady('real') and ensureModelsReady('synthetic') return different promises", async () => {
    vi.stubGlobal("loadPyodide", vi.fn(() => Promise.resolve(makePyodideMock())));
    vi.stubGlobal("fetch", makeOkFetch());
    vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("script"));

    const mod = await import("./pyodideClient");

    const pReal = mod.ensureModelsReady("real");
    const pSynth = mod.ensureModelsReady("synthetic");

    // Must be distinct promise references - different dataset, different slot.
    expect(pReal).not.toBe(pSynth);

    await Promise.allSettled([pReal, pSynth]);
  });
}, 15_000);

// ---------------------------------------------------------------------------
// Guard: predictQuote rejects before ensureModelsReady has been called.
// ---------------------------------------------------------------------------

describe("pyodideClient - predictQuote guard before ensureModelsReady", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const DUMMY_INPUT = {
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    plc_family: "AB Compact Logix",
    hmi_family: "AB YW0",
    vision_type: "None",
    stations_count: 4,
    robot_count: 2,
  } as const;

  it("rejects with a descriptive error when predictQuote('real') is called before ensureModelsReady('real')", async () => {
    // Make pyodidePromise resolve immediately so predictQuote can proceed to
    // the modelPromises guard check.
    const pyodide = makePyodideMock();
    vi.stubGlobal("loadPyodide", vi.fn(() => Promise.resolve(pyodide)));
    vi.stubGlobal("fetch", makeOkFetch());
    vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("script"));

    const mod = await import("./pyodideClient");

    // Prime pyodide bootstrap.
    const bootstrapPromise = mod.ensurePyodideReady();
    await bootstrapPromise.catch(() => {});

    // Do NOT call ensureModelsReady("real"). The guard in predictQuote should
    // reject immediately because modelPromises["real"] is null.
    await expect(mod.predictQuote(DUMMY_INPUT, "real")).rejects.toThrow(
      /ensureModelsReady\('real'\)/,
    );
  });

  it("rejects with a descriptive error when predictQuote('synthetic') is called before ensureModelsReady('synthetic')", async () => {
    const pyodide = makePyodideMock();
    vi.stubGlobal("loadPyodide", vi.fn(() => Promise.resolve(pyodide)));
    vi.stubGlobal("fetch", makeOkFetch());
    vi.spyOn(document, "querySelector").mockReturnValue(document.createElement("script"));

    const mod = await import("./pyodideClient");

    const bootstrapPromise = mod.ensurePyodideReady();
    await bootstrapPromise.catch(() => {});

    await expect(mod.predictQuote(DUMMY_INPUT, "synthetic")).rejects.toThrow(
      /ensureModelsReady\('synthetic'\)/,
    );
  });
});
