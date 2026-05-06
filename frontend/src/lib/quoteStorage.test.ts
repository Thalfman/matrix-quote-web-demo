/**
 * Tests for quoteStorage.ts — IndexedDB persistence + cross-tab BroadcastChannel.
 *
 * Plan 05-01 Task 2. TDD RED → GREEN.
 *
 * Uses fake-indexeddb to mock the IDB layer in jsdom. Each test resets the
 * "matrix-quotes" database AND vi.resetModules() to reset the module-level
 * dbPromise singleton (mirrors pyodideClient.test.ts:57-100 pattern).
 */

import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { quoteFormDefaults, type QuoteFormValues } from "@/pages/single-quote/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * makeUnifiedResult — minimal but schema-valid UnifiedQuoteResult for tests.
 * Avoids importing the type so tests stay decoupled from Phase 6/7 expansions.
 */
function makeUnifiedResult() {
  return {
    estimateHours: 800,
    likelyRangeLow: 640,
    likelyRangeHigh: 960,
    overallConfidence: "high" as const,
    perCategory: [],
    topDrivers: [],
    supportingMatches: { label: "Most similar past projects", items: [] },
  };
}

/** quoteFormDefaults has empty strings for required fields; populate placeholders. */
function makeFormValues(over: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return {
    ...quoteFormDefaults,
    industry_segment: "Automotive",
    system_category: "Machine Tending",
    automation_level: "Robotic",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("quoteStorage", () => {
  beforeEach(() => {
    // Swap a fresh in-memory IDB factory + reset the module-level dbPromise
    // singleton so each test starts from a clean slate. Pattern adapted from
    // pyodideClient.test.ts:57-100.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).indexedDB = new IDBFactory();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------
  // List + create
  // ---------------------------------------------------------------------

  it("listSavedQuotes() on empty DB returns []", async () => {
    const mod = await import("./quoteStorage");
    const list = await mod.listSavedQuotes();
    expect(list).toEqual([]);
  });

  it("saveSavedQuote({...args}) creates SavedQuote with UUID id and schemaVersion 2", async () => {
    const mod = await import("./quoteStorage");
    const out = await mod.saveSavedQuote({
      name: "Alpha",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });
    expect(out.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(out.schemaVersion).toBe(2);
    expect(out.status).toBe("draft");
    expect(out.workspace).toBe("real");
    expect(out.versions).toHaveLength(1);
    expect(out.versions[0].version).toBe(1);
    expect(out.versions[0].statusAtTime).toBe("draft");
  });

  // ---------------------------------------------------------------------
  // Get + null
  // ---------------------------------------------------------------------

  it("getSavedQuote(id) after save returns the saved record", async () => {
    const mod = await import("./quoteStorage");
    const saved = await mod.saveSavedQuote({
      name: "Bravo",
      workspace: "synthetic",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });
    const fetched = await mod.getSavedQuote(saved.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(saved.id);
    expect(fetched!.name).toBe("Bravo");
    expect(fetched!.workspace).toBe("synthetic");
  });

  it("getSavedQuote(nonexistent) returns null", async () => {
    const mod = await import("./quoteStorage");
    const fetched = await mod.getSavedQuote("00000000-0000-4000-8000-000000000000");
    expect(fetched).toBeNull();
  });

  // ---------------------------------------------------------------------
  // Update / version semantics (D-05)
  // ---------------------------------------------------------------------

  it("re-save with SAME inputs does NOT inflate the version array", async () => {
    const mod = await import("./quoteStorage");
    const initial = await mod.saveSavedQuote({
      name: "Charlie",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 3 }),
      unifiedResult: makeUnifiedResult(),
    });
    expect(initial.versions).toHaveLength(1);

    // Re-save with the exact same payload.
    const resaved = await mod.saveSavedQuote({
      id: initial.id,
      name: "Charlie",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 3 }),
      unifiedResult: makeUnifiedResult(),
    });

    expect(resaved.versions).toHaveLength(1);
    expect(resaved.versions[0].version).toBe(1);
  });

  it("re-save with REORDERED formValues keys does NOT inflate (key-order-insensitive diff; WR-06)", async () => {
    const mod = await import("./quoteStorage");
    const initial = await mod.saveSavedQuote({
      name: "CharlieReordered",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 3 }),
      unifiedResult: makeUnifiedResult(),
    });
    expect(initial.versions).toHaveLength(1);

    // Build a payload with the same values but a permuted insertion order.
    // Object.fromEntries(...reverse) preserves field values while flipping key order,
    // which would have triggered a spurious diff under the old JSON.stringify check.
    const original = makeFormValues({ stations_count: 3 });
    const reordered = Object.fromEntries(
      Object.entries(original).reverse(),
    ) as typeof original;

    const resaved = await mod.saveSavedQuote({
      id: initial.id,
      name: "CharlieReordered",
      workspace: "real",
      formValues: reordered,
      unifiedResult: makeUnifiedResult(),
    });

    expect(resaved.versions).toHaveLength(1);
    expect(resaved.versions[0].version).toBe(1);
  });

  it("re-save with DIFFERENT formValues appends a new version (D-05)", async () => {
    const mod = await import("./quoteStorage");
    const initial = await mod.saveSavedQuote({
      name: "Delta",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 3 }),
      unifiedResult: makeUnifiedResult(),
    });

    const updated = await mod.saveSavedQuote({
      id: initial.id,
      name: "Delta",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 7 }),
      unifiedResult: makeUnifiedResult(),
    });

    expect(updated.versions).toHaveLength(2);
    expect(updated.versions[0].version).toBe(1);
    expect(updated.versions[1].version).toBe(2);
    expect(updated.versions[0].formValues.stations_count).toBe(3);
    expect(updated.versions[1].formValues.stations_count).toBe(7);
  });

  // ---------------------------------------------------------------------
  // Order
  // ---------------------------------------------------------------------

  it("listSavedQuotes() returns records ordered by updatedAt DESC", async () => {
    // Only fake Date — leaving setTimeout / queueMicrotask alone so the
    // fake-indexeddb async scheduler keeps running.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-05T10:00:00.000Z"));

    const mod = await import("./quoteStorage");
    const a = await mod.saveSavedQuote({
      name: "Alpha",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });

    vi.setSystemTime(new Date("2026-05-05T11:00:00.000Z"));
    const b = await mod.saveSavedQuote({
      name: "Bravo",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });

    vi.setSystemTime(new Date("2026-05-05T12:00:00.000Z"));
    const c = await mod.saveSavedQuote({
      name: "Charlie",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });

    const list = await mod.listSavedQuotes();
    expect(list.map((q) => q.id)).toEqual([c.id, b.id, a.id]);
  });

  // ---------------------------------------------------------------------
  // Delete (D-17)
  // ---------------------------------------------------------------------

  it("deleteSavedQuote(id) removes the record (hard delete; D-17)", async () => {
    const mod = await import("./quoteStorage");
    const saved = await mod.saveSavedQuote({
      name: "ToDelete",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });
    await mod.deleteSavedQuote(saved.id);
    const fetched = await mod.getSavedQuote(saved.id);
    expect(fetched).toBeNull();
  });

  it("deleteSavedQuote on nonexistent id resolves without error (idempotent)", async () => {
    const mod = await import("./quoteStorage");
    await expect(
      mod.deleteSavedQuote("00000000-0000-4000-8000-000000000000"),
    ).resolves.toBeUndefined();
  });

  // ---------------------------------------------------------------------
  // setStatus (D-08/D-09)
  // ---------------------------------------------------------------------

  it("setStatus(id, 'won') updates status, bumps updatedAt, leaves versions unchanged", async () => {
    // Only fake Date — leaving setTimeout / queueMicrotask alone so the
    // fake-indexeddb async scheduler keeps running.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-05T10:00:00.000Z"));
    const mod = await import("./quoteStorage");
    const saved = await mod.saveSavedQuote({
      name: "Echo",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });
    expect(saved.status).toBe("draft");
    expect(saved.versions).toHaveLength(1);

    vi.setSystemTime(new Date("2026-05-05T11:00:00.000Z"));
    const after = await mod.setStatus(saved.id, "won");
    expect(after.status).toBe("won");
    expect(after.versions).toHaveLength(1);
    expect(new Date(after.updatedAt).getTime()).toBeGreaterThan(
      new Date(saved.updatedAt).getTime(),
    );
  });

  // ---------------------------------------------------------------------
  // restoreVersion (D-06 — non-destructive fork)
  // ---------------------------------------------------------------------

  it("restoreVersion(id, N) returns formValues without mutating the DB", async () => {
    const mod = await import("./quoteStorage");
    const saved = await mod.saveSavedQuote({
      name: "Foxtrot",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 9 }),
      unifiedResult: makeUnifiedResult(),
    });

    const before = await mod.getSavedQuote(saved.id);
    const restored = await mod.restoreVersion(saved.id, 1);
    expect(restored.formValues.stations_count).toBe(9);

    const after = await mod.getSavedQuote(saved.id);
    expect(after).toEqual(before);
  });

  // ---------------------------------------------------------------------
  // BroadcastChannel + subscribe (D-15)
  // ---------------------------------------------------------------------

  it("saveSavedQuote notifies local subscribers with type:'save'", async () => {
    const mod = await import("./quoteStorage");
    const events: unknown[] = [];
    const unsub = mod.subscribe((evt) => events.push(evt));
    try {
      const saved = await mod.saveSavedQuote({
        name: "Golf",
        workspace: "real",
        formValues: makeFormValues(),
        unifiedResult: makeUnifiedResult(),
      });
      expect(events).toContainEqual({
        type: "save",
        id: saved.id,
        updatedAt: saved.updatedAt,
      });
    } finally {
      unsub();
    }
  });

  it("deleteSavedQuote notifies local subscribers with type:'delete'", async () => {
    const mod = await import("./quoteStorage");
    const saved = await mod.saveSavedQuote({
      name: "Hotel",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });

    const events: unknown[] = [];
    const unsub = mod.subscribe((evt) => events.push(evt));
    try {
      await mod.deleteSavedQuote(saved.id);
      expect(events).toContainEqual({ type: "delete", id: saved.id });
    } finally {
      unsub();
    }
  });

  it("subscribe returns an unsubscribe function that prevents further notifications", async () => {
    const mod = await import("./quoteStorage");
    const events: unknown[] = [];
    const unsub = mod.subscribe((evt) => events.push(evt));
    unsub();
    await mod.saveSavedQuote({
      name: "India",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });
    expect(events).toHaveLength(0);
  });

  it("BroadcastChannel.postMessage is invoked on save (cross-tab fan-out; D-15)", async () => {
    const postSpy = vi.spyOn(BroadcastChannel.prototype, "postMessage");
    const mod = await import("./quoteStorage");
    // Touch subscribe so the channel is constructed.
    const unsub = mod.subscribe(() => {});
    try {
      const saved = await mod.saveSavedQuote({
        name: "Juliet",
        workspace: "real",
        formValues: makeFormValues(),
        unifiedResult: makeUnifiedResult(),
      });
      // The post may receive the envelope as an opaque object; assert by type+id.
      const calls = postSpy.mock.calls.flat() as Array<{
        type: string;
        id: string;
        updatedAt?: string;
      }>;
      const hasSaveEnvelope = calls.some(
        (c) => c && c.type === "save" && c.id === saved.id,
      );
      expect(hasSaveEnvelope).toBe(true);
    } finally {
      unsub();
    }
  });

  // ---------------------------------------------------------------------
  // ensureDbReady idempotency (mirrors pyodideClient pattern)
  // ---------------------------------------------------------------------

  it("ensureDbReady() resolves and is idempotent across repeat calls", async () => {
    const mod = await import("./quoteStorage");
    await expect(mod.ensureDbReady()).resolves.toBeUndefined();
    await expect(mod.ensureDbReady()).resolves.toBeUndefined();
  });

  // ---------------------------------------------------------------------
  // Validation defense in depth (T-05-01)
  // ---------------------------------------------------------------------

  it("saveSavedQuote rejects empty name (zod ZodError)", async () => {
    const mod = await import("./quoteStorage");
    await expect(
      mod.saveSavedQuote({
        name: "",
        workspace: "real",
        formValues: makeFormValues(),
        unifiedResult: makeUnifiedResult(),
      }),
    ).rejects.toThrow();
  });

  it("saveSavedQuote rejects names > 80 chars", async () => {
    const mod = await import("./quoteStorage");
    await expect(
      mod.saveSavedQuote({
        name: "x".repeat(81),
        workspace: "real",
        formValues: makeFormValues(),
        unifiedResult: makeUnifiedResult(),
      }),
    ).rejects.toThrow();
  });

  // ---------------------------------------------------------------------
  // getVersions
  // ---------------------------------------------------------------------

  it("getVersions(id) returns the versions array, newest LAST", async () => {
    const mod = await import("./quoteStorage");
    const initial = await mod.saveSavedQuote({
      name: "Kilo",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 1 }),
      unifiedResult: makeUnifiedResult(),
    });
    await mod.saveSavedQuote({
      id: initial.id,
      name: "Kilo",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 5 }),
      unifiedResult: makeUnifiedResult(),
    });

    const versions = await mod.getVersions(initial.id);
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe(1);
    expect(versions[0].formValues.stations_count).toBe(1);
    expect(versions[1].version).toBe(2);
    expect(versions[1].formValues.stations_count).toBe(5);
  });

  // ---------------------------------------------------------------------
  // restoreFromVersion fork (D-06 follow-on)
  // ---------------------------------------------------------------------

  it("re-saving after restoreVersion records restoredFromVersion in the new version", async () => {
    const mod = await import("./quoteStorage");
    const initial = await mod.saveSavedQuote({
      name: "Lima",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 2 }),
      unifiedResult: makeUnifiedResult(),
    });
    await mod.saveSavedQuote({
      id: initial.id,
      name: "Lima",
      workspace: "real",
      formValues: makeFormValues({ stations_count: 4 }),
      unifiedResult: makeUnifiedResult(),
    });

    // Restore v1 then commit it as v3.
    const { formValues: v1Form } = await mod.restoreVersion(initial.id, 1);
    const restored = await mod.saveSavedQuote({
      id: initial.id,
      name: "Lima",
      workspace: "real",
      formValues: v1Form,
      unifiedResult: makeUnifiedResult(),
      restoredFromVersion: 1,
    });

    expect(restored.versions).toHaveLength(3);
    expect(restored.versions[2].version).toBe(3);
    expect(restored.versions[2].restoredFromVersion).toBe(1);
    expect(restored.versions[2].formValues.stations_count).toBe(2);
  });

  // ---------------------------------------------------------------------
  // schemaVersion forward-compat (T-05-05)
  // ---------------------------------------------------------------------

  it("getSavedQuote rejects records with schemaVersion in the future (T-05-05)", async () => {
    // Inject a future-version record bypassing the public API to simulate a
    // foreign tab having written a Phase 7+ record we cannot read.
    // Phase 6 bumped the DB schema to v2; use schemaVersion 99 to simulate
    // a record from a future phase the migrator does not know about.
    const mod = await import("./quoteStorage");
    await mod.ensureDbReady();
    // Reach into the same DB through a parallel openDB call to inject.
    const { openDB } = await import("idb");
    const db = await openDB("matrix-quotes", 2);
    await db.put("quotes", {
      id: "11111111-1111-4111-8111-111111111111",
      schemaVersion: 99,
      name: "Future",
      workspace: "real",
      status: "draft",
      createdAt: "2026-05-05T12:00:00.000Z",
      updatedAt: "2026-05-05T12:00:00.000Z",
      versions: [
        {
          version: 1,
          savedAt: "2026-05-05T12:00:00.000Z",
          statusAtTime: "draft",
          formValues: makeFormValues(),
          unifiedResult: makeUnifiedResult(),
        },
      ],
      salesBucket: "ME",
      visionLabel: "No vision",
      materialsCost: 0,
    });
    db.close();

    await expect(
      mod.getSavedQuote("11111111-1111-4111-8111-111111111111"),
    ).rejects.toThrow();
  });

  it("listSavedQuotes drops malformed/future-schema records (WR-02; T-05-05 even enforcement)", async () => {
    const mod = await import("./quoteStorage");
    // Save one valid record through the public API.
    const valid = await mod.saveSavedQuote({
      name: "Valid Quote",
      workspace: "real",
      formValues: makeFormValues(),
      unifiedResult: makeUnifiedResult(),
    });
    // Inject one malformed record (schemaVersion: 99 — Phase 7+ future).
    const { openDB } = await import("idb");
    const db = await openDB("matrix-quotes", 2);
    await db.put("quotes", {
      id: "22222222-2222-4222-8222-222222222222",
      schemaVersion: 99,
      name: "Future Phase 7+",
      workspace: "real",
      status: "draft",
      createdAt: "2026-05-05T12:00:00.000Z",
      updatedAt: "2026-05-05T13:00:00.000Z",
      versions: [
        {
          version: 1,
          savedAt: "2026-05-05T12:00:00.000Z",
          statusAtTime: "draft",
          formValues: makeFormValues(),
          unifiedResult: makeUnifiedResult(),
        },
      ],
      salesBucket: "ME",
      visionLabel: "No vision",
      materialsCost: 0,
    });
    db.close();

    const list = await mod.listSavedQuotes();
    // Future-schema record is dropped; valid record survives.
    expect(list.map((q) => q.id)).toEqual([valid.id]);
  });
});
