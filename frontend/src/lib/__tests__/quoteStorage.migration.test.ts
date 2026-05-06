/**
 * Phase 6 — IndexedDB v1 -> v2 migration coverage.
 *
 * Covers D-13 (vision_type/vision_systems_count -> visionRows) and the
 * defensive on-read migrator that catches v1 records slipping past the
 * onupgradeneeded cursor walk.
 */
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  // Each test gets a fresh module + fresh fake-IDB.
  vi.resetModules();
  // Wipe the fake-indexeddb between tests so DB version state doesn't bleed
  // (the cursor-walk test re-opens at v1 which would VersionError otherwise).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Factory: a minimal v1 SavedQuote record matching the Phase 5 shape.
function makeV1Record(over: {
  visionType?: string;
  visionCount?: number;
  id?: string;
} = {}) {
  const visionType = over.visionType ?? "None";
  const visionCount = over.visionCount ?? 0;
  return {
    id: over.id ?? "11111111-1111-1111-1111-111111111111",
    schemaVersion: 1,
    name: "Test quote",
    workspace: "synthetic" as const,
    status: "draft" as const,
    createdAt: "2026-04-01T12:00:00.000Z",
    updatedAt: "2026-04-01T12:00:00.000Z",
    salesBucket: "ME",
    visionLabel: visionType === "None" ? "No vision" : visionType,
    materialsCost: 0,
    versions: [
      {
        version: 1,
        savedAt: "2026-04-01T12:00:00.000Z",
        statusAtTime: "draft" as const,
        formValues: {
          // 33 numeric + 6 categorical fields with safe defaults
          industry_segment: "Aerospace",
          system_category: "Assembly",
          automation_level: "Semi-auto",
          plc_family: "AB Compact Logix",
          hmi_family: "AB PanelView Plus",
          vision_type: visionType,             // <-- v1 only
          vision_systems_count: visionCount,   // <-- v1 only
          stations_count: 1,
          part_types: 1,
          safety_doors: 0,
          robot_count: 0,
          weldment_perimeter_ft: 0,
          safety_devices_count: 0,
          fixture_sets: 0,
          fence_length_ft: 0,
          conveyor_length_ft: 0,
          panel_count: 0,
          servo_axes: 0,
          drive_count: 0,
          pneumatic_devices: 0,
          product_familiarity_score: 3,
          product_rigidity: 3,
          bulk_rigidity_score: 3,
          process_uncertainty_score: 3,
          changeover_time_min: 0,
          is_product_deformable: false,
          is_bulk_product: false,
          has_tricky_packaging: false,
          has_controls: true,
          has_robotics: false,
          retrofit: false,
          duplicate: false,
          complexity_score_1_5: 3,
          custom_pct: 50,
          stations_robot_index: 0,
          mech_complexity_index: 0,
          controls_complexity_index: 0,
          physical_scale_index: 0,
          estimated_materials_cost: 0,
        },
        unifiedResult: {
          estimateHours: 100,
          likelyRangeLow: 80,
          likelyRangeHigh: 120,
          overallConfidence: "moderate" as const,
          perCategory: [],
          topDrivers: [],
          supportingMatches: { label: "x", items: [] },
        },
      },
    ],
  };
}

// Helper: read the migrated visionRows array out of a v2 record's first version.
// Centralizes the unknown-record drilling so individual tests stay readable.
function getFirstVersionFormValues(rec: unknown): Record<string, unknown> {
  const r = rec as { versions: Array<{ formValues: Record<string, unknown> }> };
  return r.versions[0].formValues;
}

describe("migrateRecordV1ToV2 — pure function", () => {
  it("vision_type \"None\" + count 0 -> visionRows: []", async () => {
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const v1 = makeV1Record({ visionType: "None", visionCount: 0 });
    const v2 = migrateRecordV1ToV2(v1) as { schemaVersion: number };
    expect(v2.schemaVersion).toBe(2);
    expect(getFirstVersionFormValues(v2).visionRows).toEqual([]);
  });

  it("vision_type \"None\" + count 5 (degenerate v1) -> visionRows: []", async () => {
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const v1 = makeV1Record({ visionType: "None", visionCount: 5 });
    const v2 = migrateRecordV1ToV2(v1);
    expect(getFirstVersionFormValues(v2).visionRows).toEqual([]);
  });

  it("vision_type \"Cognex 2D\" + count 2 -> visionRows: [{type:\"Cognex 2D\", count:2}]", async () => {
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const v1 = makeV1Record({ visionType: "Cognex 2D", visionCount: 2 });
    const v2 = migrateRecordV1ToV2(v1);
    expect(getFirstVersionFormValues(v2).visionRows).toEqual([
      { type: "Cognex 2D", count: 2 },
    ]);
  });

  it("vision_type \"3D Vision\" + count 0 -> visionRows clamps count to 1", async () => {
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const v1 = makeV1Record({ visionType: "3D Vision", visionCount: 0 });
    const v2 = migrateRecordV1ToV2(v1);
    expect(getFirstVersionFormValues(v2).visionRows).toEqual([
      { type: "3D Vision", count: 1 },
    ]);
  });

  it("preserves arbitrary trained-model categories (e.g. \"Keyence IV3\")", async () => {
    // Regression: prior allowlist was vision_type === "2D" || === "3D" — any
    // other value silently became visionRows: [], dropping saved quotes whose
    // vision_type came from the trained model's actual vocabulary
    // ("Cognex 2D", "3D Vision", "Cognex Insight", "Keyence IV3", ...).
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const v1 = makeV1Record({ visionType: "Keyence IV3", visionCount: 3 });
    const v2 = migrateRecordV1ToV2(v1);
    expect(getFirstVersionFormValues(v2).visionRows).toEqual([
      { type: "Keyence IV3", count: 3 },
    ]);
  });

  it("strips legacy vision_type and vision_systems_count keys after migration", async () => {
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const v1 = makeV1Record({ visionType: "Cognex 2D", visionCount: 1 });
    const v2 = migrateRecordV1ToV2(v1);
    const fv = getFirstVersionFormValues(v2);
    expect(fv).not.toHaveProperty("vision_type");
    expect(fv).not.toHaveProperty("vision_systems_count");
  });

  it("WR-04: strips legacy keys even when formValues already carry visionRows (hybrid record)", async () => {
    // Hand-rolled hybrid record: outer schemaVersion 1 (so the migrator runs)
    // but versions[0].formValues already has visionRows AND lingering legacy
    // keys. Pre-fix migrateFormValuesV1ToV2 short-circuited on
    // Array.isArray(visionRows) without stripping. D-13's clean-cutover
    // invariant requires legacy keys to be removed regardless.
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const hybrid = {
      ...makeV1Record({ visionType: "None", visionCount: 0 }),
      versions: [
        {
          version: 1,
          savedAt: "2026-04-01T12:00:00.000Z",
          statusAtTime: "draft" as const,
          formValues: {
            // Already-v2 visionRows alongside leftover v1 keys:
            visionRows: [{ type: "Cognex 2D", count: 3 }],
            vision_type: "3D Vision",  // leftover, must be stripped
            vision_systems_count: 99,  // leftover, must be stripped
            // ... rest of the form (minimal sample is fine):
            industry_segment: "Aerospace",
          },
          unifiedResult: {
            estimateHours: 100,
            likelyRangeLow: 80,
            likelyRangeHigh: 120,
            overallConfidence: "moderate" as const,
            perCategory: [],
            topDrivers: [],
            supportingMatches: { label: "x", items: [] },
          },
        },
      ],
    };
    const out = migrateRecordV1ToV2(hybrid);
    const fv = getFirstVersionFormValues(out);
    expect(fv).not.toHaveProperty("vision_type");
    expect(fv).not.toHaveProperty("vision_systems_count");
    // Pre-existing visionRows are preserved verbatim — the function does NOT
    // re-derive from the legacy keys when visionRows is already present.
    expect(fv.visionRows).toEqual([{ type: "Cognex 2D", count: 3 }]);
  });

  it("is idempotent on already-v2 records", async () => {
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const v2Record = {
      schemaVersion: 2,
      versions: [{ formValues: { visionRows: [{ type: "Cognex 2D", count: 1 }] } }],
    };
    const out = migrateRecordV1ToV2(v2Record);
    expect(out).toBe(v2Record); // identity short-circuit
  });

  it("leaves unknown schemaVersion records untouched (forward-compat)", async () => {
    const { migrateRecordV1ToV2 } = await import("../quoteStorage");
    const future = { schemaVersion: 99, versions: [] };
    const out = migrateRecordV1ToV2(future);
    expect(out).toBe(future);
  });
});

describe("migrateRecordV1ToV2 — defensive on-read in getSavedQuote / listSavedQuotes", () => {
  it("listSavedQuotes returns a migrated v2 quote when a v1 record sits in the store", async () => {
    // fake-indexeddb: opening at the same version is a no-op upgrade — both handles share the backing store. Real IDB behaves identically; this test exercises the cursor-walk lifecycle in production via Task 4's real-upgrade test.
    // Open the DB at version 2 (so onupgradeneeded does NOT touch the store),
    // then write a raw v1 record bypassing the public save API.
    const { listSavedQuotes, ensureDbReady, QUOTE_DB_NAME, QUOTE_STORE_NAME } =
      await import("../quoteStorage");
    await ensureDbReady();
    const idb = await import("idb");
    const handle = await idb.openDB(QUOTE_DB_NAME, 2);
    const v1 = makeV1Record({ visionType: "Cognex 2D", visionCount: 3, id: "22222222-2222-2222-2222-222222222222" });
    await handle.put(QUOTE_STORE_NAME, v1);
    handle.close();

    const list = await listSavedQuotes();
    const found = list.find((q) => q.id === v1.id);
    expect(found, "v1 record must surface as a v2 quote").toBeDefined();
    expect(found!.schemaVersion).toBe(2);
    expect(found!.versions[0].formValues.visionRows).toEqual([
      { type: "Cognex 2D", count: 3 },
    ]);
  });

  it("getSavedQuote returns a migrated v2 quote when fed a raw v1 record", async () => {
    // fake-indexeddb: opening at the same version is a no-op upgrade — both handles share the backing store. Real IDB behaves identically; this test exercises the cursor-walk lifecycle in production via Task 4's real-upgrade test.
    const { getSavedQuote, ensureDbReady, QUOTE_DB_NAME, QUOTE_STORE_NAME } =
      await import("../quoteStorage");
    await ensureDbReady();
    const idb = await import("idb");
    const handle = await idb.openDB(QUOTE_DB_NAME, 2);
    const v1 = makeV1Record({ visionType: "3D Vision", visionCount: 1, id: "33333333-3333-3333-3333-333333333333" });
    await handle.put(QUOTE_STORE_NAME, v1);
    handle.close();

    const got = await getSavedQuote(v1.id);
    expect(got).not.toBeNull();
    expect(got!.schemaVersion).toBe(2);
    expect(got!.versions[0].formValues.visionRows).toEqual([
      { type: "3D Vision", count: 1 },
    ]);
  });
});

describe("onupgradeneeded cursor walk", () => {
  it("opening at version 1, writing v1 records, closing, then reopening at version 2 migrates every record in place", async () => {
    const { QUOTE_DB_NAME, QUOTE_STORE_NAME } = await import("../quoteStorage");
    const idb = await import("idb");

    // Step A: open at version 1, create the store, write two v1 records.
    const v1Handle = await idb.openDB(QUOTE_DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(QUOTE_STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("status", "status");
        store.createIndex("workspace", "workspace");
      },
    });
    await v1Handle.put(
      QUOTE_STORE_NAME,
      makeV1Record({ visionType: "Cognex 2D", visionCount: 2, id: "44444444-4444-4444-4444-444444444444" }),
    );
    await v1Handle.put(
      QUOTE_STORE_NAME,
      makeV1Record({ visionType: "None", visionCount: 0, id: "55555555-5555-5555-5555-555555555555" }),
    );
    v1Handle.close();

    // Step B: reset module state and re-open via the production code path,
    // which triggers the v1 -> v2 upgrade.
    vi.resetModules();
    const fresh = await import("../quoteStorage");
    await fresh.ensureDbReady();

    // Step C: read raw via idb directly to inspect the migrated shape.
    const v2Handle = await idb.openDB(QUOTE_DB_NAME, 2);
    const a = await v2Handle.get(QUOTE_STORE_NAME, "44444444-4444-4444-4444-444444444444");
    const b = await v2Handle.get(QUOTE_STORE_NAME, "55555555-5555-5555-5555-555555555555");
    v2Handle.close();
    expect(a.schemaVersion).toBe(2);
    expect(a.versions[0].formValues.visionRows).toEqual([{ type: "Cognex 2D", count: 2 }]);
    expect(a.versions[0].formValues).not.toHaveProperty("vision_type");
    expect(b.schemaVersion).toBe(2);
    expect(b.versions[0].formValues.visionRows).toEqual([]);
  });
});
