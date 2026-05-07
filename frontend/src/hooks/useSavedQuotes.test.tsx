/**
 * Tests for useSavedQuotes — TanStack Query hooks over quoteStorage.ts.
 *
 * Plan 05-04 Task 1. TDD RED → GREEN.
 *
 * Mirrors the renderHook + QueryClientProvider wrapper pattern from
 * frontend/src/demo/modelMetrics.test.ts. The @/lib/quoteStorage module is
 * mocked at module load so we never touch real IndexedDB here — Plan 01's
 * own test suite owns IDB coverage; this file owns hook + cache behavior.
 *
 * Threats covered:
 *   T-05-09 — BroadcastChannel handler invalidates cache without trusting
 *             event payload bodies (see "broadcast → invalidate-only" test).
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SavedQuote, WorkflowStatus } from "@/lib/savedQuoteSchema";
import type { StorageEvent } from "@/lib/quoteStorage";

// ---------------------------------------------------------------------------
// Module mock — set up before importing the hook module (vi.mock is hoisted,
// so any state it captures has to be hoisted via vi.hoisted as well).
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => {
  const subscriberRef: { current: ((evt: unknown) => void) | null } = {
    current: null,
  };
  return {
    mockListSavedQuotes: vi.fn(),
    mockGetSavedQuote: vi.fn(),
    mockSaveSavedQuote: vi.fn(),
    mockDeleteSavedQuote: vi.fn(),
    mockSetStatus: vi.fn(),
    mockRestoreVersion: vi.fn(),
    mockSubscribe: vi.fn((fn: (evt: unknown) => void) => {
      subscriberRef.current = fn;
      return () => {
        subscriberRef.current = null;
      };
    }),
    subscriberRef,
  };
});

const {
  mockListSavedQuotes,
  mockGetSavedQuote,
  mockSaveSavedQuote,
  mockDeleteSavedQuote,
  mockSetStatus,
  mockRestoreVersion,
  mockSubscribe,
  subscriberRef,
} = hoisted;

vi.mock("@/lib/quoteStorage", () => ({
  listSavedQuotes: hoisted.mockListSavedQuotes,
  getSavedQuote: hoisted.mockGetSavedQuote,
  saveSavedQuote: hoisted.mockSaveSavedQuote,
  deleteSavedQuote: hoisted.mockDeleteSavedQuote,
  setStatus: hoisted.mockSetStatus,
  restoreVersion: hoisted.mockRestoreVersion,
  subscribe: hoisted.mockSubscribe,
}));

// Imported AFTER vi.mock so the hooks see the mocked module.
import {
  QUOTES_QUERY_KEY,
  useDeleteQuote,
  useRestoreVersion,
  useSaveQuote,
  useSavedQuote,
  useSavedQuotes,
  useSetStatus,
} from "./useSavedQuotes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeSavedQuote(over: Partial<SavedQuote> = {}): SavedQuote {
  const now = "2026-05-05T12:00:00.000Z";
  return {
    id: "11111111-1111-4111-8111-111111111111",
    schemaVersion: 2,
    name: "Test Quote",
    workspace: "real",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    versions: [
      {
        version: 1,
        savedAt: now,
        statusAtTime: "draft",
        formValues: {} as SavedQuote["versions"][number]["formValues"],
        unifiedResult: {
          estimateHours: 800,
          likelyRangeLow: 640,
          likelyRangeHigh: 960,
          overallConfidence: "high",
          perCategory: [],
          topDrivers: [],
          supportingMatches: { label: "Most similar past projects", items: [] },
        },
        mode: "full",
      },
    ],
    salesBucket: "ME",
    visionLabel: "No vision",
    materialsCost: 0,
    mode: "full",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSavedQuotes — read hooks", () => {
  beforeEach(() => {
    mockListSavedQuotes.mockReset();
    mockGetSavedQuote.mockReset();
    mockSaveSavedQuote.mockReset();
    mockDeleteSavedQuote.mockReset();
    mockSetStatus.mockReset();
    mockRestoreVersion.mockReset();
    mockSubscribe.mockClear();
    subscriberRef.current = null;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("useSavedQuotes() returns empty array when DB is empty", async () => {
    mockListSavedQuotes.mockResolvedValue([]);

    const { result } = renderHook(() => useSavedQuotes(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(mockListSavedQuotes).toHaveBeenCalledTimes(1);
  });

  it("useSavedQuotes() returns the quotes returned by listSavedQuotes()", async () => {
    const quote = makeSavedQuote({ name: "Alpha" });
    mockListSavedQuotes.mockResolvedValue([quote]);

    const { result } = renderHook(() => useSavedQuotes(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe("Alpha");
  });

  it("useSavedQuotes() exports QUOTES_QUERY_KEY = ['quotes', 'all']", () => {
    expect(QUOTES_QUERY_KEY).toEqual(["quotes", "all"]);
  });

  it("useSavedQuote(id) returns null when storage returns null", async () => {
    mockGetSavedQuote.mockResolvedValue(null);

    const { result } = renderHook(() => useSavedQuote("nonexistent"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mockGetSavedQuote).toHaveBeenCalledWith("nonexistent");
  });

  it("useSavedQuote(undefined) is disabled — does not call getSavedQuote", async () => {
    const { result } = renderHook(() => useSavedQuote(undefined), {
      wrapper: makeWrapper(),
    });

    // Tick the event loop to give any pending fetches a chance to run.
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockGetSavedQuote).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useSavedQuotes — mutation hooks", () => {
  beforeEach(() => {
    mockListSavedQuotes.mockReset();
    mockGetSavedQuote.mockReset();
    mockSaveSavedQuote.mockReset();
    mockDeleteSavedQuote.mockReset();
    mockSetStatus.mockReset();
    mockRestoreVersion.mockReset();
    mockSubscribe.mockClear();
    subscriberRef.current = null;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("useSaveQuote().mutateAsync calls saveSavedQuote and invalidates ['quotes','all']", async () => {
    const saved = makeSavedQuote({ name: "Saved" });
    mockListSavedQuotes.mockResolvedValue([]);
    mockSaveSavedQuote.mockResolvedValue(saved);

    const wrapper = makeWrapper();

    // Mount useSavedQuotes first so we can verify it re-queries after mutation.
    const list = renderHook(() => useSavedQuotes(), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(mockListSavedQuotes).toHaveBeenCalledTimes(1);

    const mut = renderHook(() => useSaveQuote(), { wrapper });

    // After save, listSavedQuotes returns the new record.
    mockListSavedQuotes.mockResolvedValue([saved]);

    await act(async () => {
      await mut.result.current.mutateAsync({
        name: "Saved",
        workspace: "real",
        formValues: {} as never,
        unifiedResult: {} as never,
      });
    });

    expect(mockSaveSavedQuote).toHaveBeenCalledTimes(1);
    // List query should have been invalidated and re-fetched.
    await waitFor(() =>
      expect(mockListSavedQuotes.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
  });

  it("useDeleteQuote().mutateAsync calls deleteSavedQuote and invalidates ['quotes']", async () => {
    mockListSavedQuotes.mockResolvedValue([makeSavedQuote()]);
    mockDeleteSavedQuote.mockResolvedValue(undefined);

    const wrapper = makeWrapper();
    const list = renderHook(() => useSavedQuotes(), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));

    const mut = renderHook(() => useDeleteQuote(), { wrapper });

    mockListSavedQuotes.mockResolvedValue([]);

    await act(async () => {
      await mut.result.current.mutateAsync("11111111-1111-4111-8111-111111111111");
    });

    expect(mockDeleteSavedQuote).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    await waitFor(() =>
      expect(mockListSavedQuotes.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
  });

  it("useSetStatus().mutateAsync calls quoteStorage.setStatus(id, status)", async () => {
    const updated = makeSavedQuote({ status: "won" });
    mockSetStatus.mockResolvedValue(updated);

    const { result } = renderHook(() => useSetStatus(), { wrapper: makeWrapper() });

    await act(async () => {
      const out = await result.current.mutateAsync({
        id: updated.id,
        status: "won" satisfies WorkflowStatus,
      });
      expect(out.status).toBe("won");
    });

    expect(mockSetStatus).toHaveBeenCalledWith(updated.id, "won");
  });

  it("useRestoreVersion().mutateAsync returns the formValues for the form to consume", async () => {
    const formValues = { industry_segment: "Automotive" } as unknown as SavedQuote["versions"][number]["formValues"];
    mockRestoreVersion.mockResolvedValue({ formValues });

    const { result } = renderHook(() => useRestoreVersion(), {
      wrapper: makeWrapper(),
    });

    let out: { formValues: SavedQuote["versions"][number]["formValues"] } | undefined;
    await act(async () => {
      out = await result.current.mutateAsync({
        id: "11111111-1111-4111-8111-111111111111",
        version: 1,
      });
    });

    expect(mockRestoreVersion).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      1,
    );
    expect(out?.formValues).toBe(formValues);
  });
});

describe("useSavedQuotes — cross-tab BroadcastChannel sync", () => {
  beforeEach(() => {
    mockListSavedQuotes.mockReset();
    mockGetSavedQuote.mockReset();
    mockSaveSavedQuote.mockReset();
    mockDeleteSavedQuote.mockReset();
    mockSetStatus.mockReset();
    mockRestoreVersion.mockReset();
    mockSubscribe.mockClear();
    subscriberRef.current = null;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("subscribes to the storage broadcast on mount and unsubscribes on unmount", () => {
    mockListSavedQuotes.mockResolvedValue([]);

    const { unmount } = renderHook(() => useSavedQuotes(), { wrapper: makeWrapper() });
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(typeof subscriberRef.current).toBe("function");

    unmount();
    expect(subscriberRef.current).toBeNull();
  });

  it("a broadcast event re-reads from storage (cache invalidate, never trust payload — T-05-09)", async () => {
    const initial = [makeSavedQuote({ name: "First" })];
    mockListSavedQuotes.mockResolvedValueOnce(initial);

    const { result } = renderHook(() => useSavedQuotes(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(mockListSavedQuotes).toHaveBeenCalledTimes(1);

    // Simulate a save in another tab. Even though the payload claims a delete,
    // the hook MUST ignore the body and just re-read from IDB.
    const refreshed = [
      makeSavedQuote({ name: "First" }),
      makeSavedQuote({
        id: "22222222-2222-4222-8222-222222222222",
        name: "Second",
      }),
    ];
    mockListSavedQuotes.mockResolvedValueOnce(refreshed);

    expect(subscriberRef.current).not.toBeNull();
    const evt: StorageEvent = {
      type: "save",
      id: "22222222-2222-4222-8222-222222222222",
      updatedAt: "2026-05-05T13:00:00.000Z",
    };
    await act(async () => {
      subscriberRef.current!(evt);
    });

    await waitFor(() => expect(mockListSavedQuotes).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.data).toHaveLength(2));
  });

  it("useSavedQuote(id) subscribes and re-reads on broadcast (WR-03; UI-SPEC cross-tab cue)", async () => {
    const v1 = makeSavedQuote({ name: "Detail v1" });
    mockGetSavedQuote.mockResolvedValue(v1);

    const { result } = renderHook(
      () => useSavedQuote("11111111-1111-4111-8111-111111111111"),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetSavedQuote).toHaveBeenCalledTimes(1);
    // The detail hook must register its own broadcast subscriber even when
    // useSavedQuotes (the list hook) is not mounted. Bookmarked /quotes/:id
    // is the canonical case.
    expect(mockSubscribe).toHaveBeenCalled();
    expect(subscriberRef.current).not.toBeNull();

    // Simulate a cross-tab save event; the hook must re-read from storage.
    // We assert the queryFn was re-invoked (T-05-09 cache-invalidate
    // contract); the data shape on the second resolve is exercised by the
    // sibling list test, so we don't duplicate that here.
    await act(async () => {
      subscriberRef.current!({
        type: "save",
        id: "11111111-1111-4111-8111-111111111111",
        updatedAt: "2026-05-05T14:00:00.000Z",
      });
    });

    await waitFor(() =>
      expect(mockGetSavedQuote.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
  });

  it("useSavedQuote(id) refetches when broadcast.id matches even without a list hook mounted (QA Item 2)", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const v1 = makeSavedQuote({ name: "Detail v1" });
    const v2 = makeSavedQuote({ name: "Detail v2", updatedAt: "2026-05-05T15:00:00.000Z" });
    mockGetSavedQuote.mockResolvedValueOnce(v1);

    const { result } = renderHook(() => useSavedQuote(id), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("Detail v1");
    expect(mockGetSavedQuote).toHaveBeenCalledTimes(1);

    mockGetSavedQuote.mockResolvedValue(v2);

    await act(async () => {
      subscriberRef.current!({
        type: "save",
        id,
        updatedAt: "2026-05-05T15:00:00.000Z",
      });
    });

    await waitFor(() =>
      expect(mockGetSavedQuote.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    await waitFor(() => expect(result.current.data?.name).toBe("Detail v2"));
  });

  it("delete broadcast also invalidates the list (covers ['quotes'] umbrella key)", async () => {
    mockListSavedQuotes.mockResolvedValue([makeSavedQuote()]);

    const { result } = renderHook(() => useSavedQuotes(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);

    // After the broadcast invalidates, the refetch should observe an empty
    // store (the deletion having committed in some other tab).
    mockListSavedQuotes.mockResolvedValue([]);

    await act(async () => {
      subscriberRef.current!({
        type: "delete",
        id: "11111111-1111-4111-8111-111111111111",
      });
    });

    await waitFor(() =>
      expect(mockListSavedQuotes.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    await waitFor(() => expect(result.current.data).toEqual([]));
  });
});
