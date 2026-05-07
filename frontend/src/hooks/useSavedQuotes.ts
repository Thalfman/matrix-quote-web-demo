/**
 * React-side data access for saved quotes. Wraps frontend/src/lib/quoteStorage.ts
 * with TanStack Query for caching + invalidation, and pipes BroadcastChannel
 * cross-tab events into cache invalidation.
 *
 * Pattern mirrors frontend/src/demo/realProjects.ts (useRealProjects, etc.) —
 * separate ["quotes", ...] query-key namespace from the demo-data layer.
 *
 * Threats mitigated:
 *   T-05-09: cross-tab BroadcastChannel events are treated as cache-invalidate
 *            signals only. The handler ignores the event payload body and
 *            re-reads from IDB through the validated quoteStorage path. The
 *            implementation in frontend/src/lib/quoteStorage.ts already keeps
 *            broadcast bodies opaque ({ type, id, updatedAt }); this hook never
 *            forwards them to the cache as state.
 */
import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  deleteSavedQuote,
  getSavedQuote,
  listSavedQuotes,
  restoreVersion,
  saveSavedQuote,
  setStatus,
  subscribe,
  type SaveSavedQuoteArgs,
  type StorageEvent,
} from "@/lib/quoteStorage";
import type {
  QuoteVersion,
  SavedQuote,
  WorkflowStatus,
} from "@/lib/savedQuoteSchema";

// ---------------------------------------------------------------------------
// Query keys (separate from ["demo", ...] namespace used by realProjects.ts)
// ---------------------------------------------------------------------------

/** Public — list view consumers import this for direct invalidation. */
export const QUOTES_QUERY_KEY = ["quotes", "all"] as const;

/**
 * Per-id query key. Uses ["quotes", "byId", id] so the namespace is explicit
 * and disjoint from QUOTES_QUERY_KEY (`["quotes", "all"]`). Wider invalidations
 * (`["quotes"]`) still match by prefix.
 */
const QUOTE_BY_ID = (id: string) => ["quotes", "byId", id] as const;

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/**
 * Internal: subscribe to the storage BroadcastChannel and invalidate every
 * `["quotes", ...]` query on any event. Mirrors T-05-09: we treat broadcasts
 * as cache-invalidate signals and re-read from IDB through the validated
 * storage path; we use evt.id only as a query-key match — never as cache state.
 *
 * Used by both useSavedQuotes (list) and useSavedQuote (single) so a tab that
 * mounts only the detail page (deep link / bookmark to /quotes/:id) still
 * picks up cross-tab edits — UI-SPEC §"Cross-tab broadcast UI cue" promised
 * SavedQuotePage live updates.
 *
 * The list-only invalidation via the umbrella `["quotes"]` prefix proved
 * unreliable in production for the detail page (the SavedQuotePage's
 * version-history sidebar didn't refresh on cross-tab save). Splitting the
 * invalidation into explicit list + per-id keys, and explicitly refetching
 * the active byId observer, fixes the QA Item 2 regression.
 *
 * Pass `id` from `useSavedQuote(id)` so a same-record broadcast is force-
 * refetched even if the cache observer is briefly inactive (route transition,
 * mount race with the broadcaster).
 */
function useStorageInvalidate(id?: string): void {
  const qc = useQueryClient();
  useEffect(() => {
    const unsubscribe = subscribe((evt: StorageEvent) => {
      void qc.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      if (evt.id) {
        const key = QUOTE_BY_ID(evt.id);
        void qc.invalidateQueries({ queryKey: key });
        void qc.refetchQueries({ queryKey: key, type: "active" });
      }
      if (id && evt.id === id) {
        void qc.refetchQueries({ queryKey: QUOTE_BY_ID(id) });
      }
    });
    return unsubscribe;
  }, [qc, id]);
}

/**
 * Returns the full ordered list of saved quotes from IndexedDB.
 *
 * Subscribes to the storage broadcast on mount; every cross-tab save / delete /
 * restore event triggers `qc.invalidateQueries(["quotes"])`, which pulls fresh
 * data through the validated `listSavedQuotes` path. The event payload is
 * never trusted as state (T-05-09).
 */
export function useSavedQuotes(): UseQueryResult<SavedQuote[]> {
  useStorageInvalidate();
  return useQuery<SavedQuote[]>({
    queryKey: QUOTES_QUERY_KEY,
    queryFn: () => listSavedQuotes(),
    staleTime: Infinity,
  });
}

/**
 * Returns one saved quote by id, or null when no record exists.
 *
 * Disabled when `id` is undefined — getSavedQuote is not invoked. Also
 * subscribes to the storage BroadcastChannel so a tab that mounts only the
 * detail page (deep-linked / bookmarked /quotes/:id) still picks up
 * cross-tab edits to that record's version history. UI-SPEC §"Cross-tab
 * broadcast UI cue".
 */
export function useSavedQuote(
  id: string | undefined,
): UseQueryResult<SavedQuote | null> {
  useStorageInvalidate(id);
  return useQuery<SavedQuote | null>({
    // IN-02 also addressed here: stable ["quotes", "byId", id|"__none__"]
    // shape avoids the cache-leaking ["quotes", "__noop__"] placeholder.
    queryKey: ["quotes", "byId", id ?? "__none__"],
    queryFn: () =>
      id ? getSavedQuote(id) : Promise.resolve(null as SavedQuote | null),
    enabled: !!id,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Save a new quote (no id) or append a new version to an existing one (id set).
 * On success, invalidates the list query AND the per-id query so any open
 * detail page re-reads its versions array.
 */
export function useSaveQuote(): UseMutationResult<
  SavedQuote,
  Error,
  SaveSavedQuoteArgs
> {
  const qc = useQueryClient();
  return useMutation<SavedQuote, Error, SaveSavedQuoteArgs>({
    mutationFn: (args) => saveSavedQuote(args),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void qc.invalidateQueries({ queryKey: QUOTE_BY_ID(saved.id) });
    },
  });
}

/**
 * Hard delete (D-17). Invalidates the umbrella `["quotes"]` key, which covers
 * both `["quotes", "all"]` and any `["quotes", id]` queries.
 */
export function useDeleteQuote(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteSavedQuote(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

/**
 * D-08/D-09: chip-driven status change. Does not create a new version.
 * Invalidates list and the per-id query so the detail page redraws the chip.
 */
export function useSetStatus(): UseMutationResult<
  SavedQuote,
  Error,
  { id: string; status: WorkflowStatus }
> {
  const qc = useQueryClient();
  return useMutation<
    SavedQuote,
    Error,
    { id: string; status: WorkflowStatus }
  >({
    mutationFn: ({ id, status }) => setStatus(id, status),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void qc.invalidateQueries({ queryKey: QUOTE_BY_ID(saved.id) });
    },
  });
}

/**
 * D-06: NON-DESTRUCTIVE restore. Returns the formValues to seed the open form;
 * the actual `v(N+1)` commit happens on the next `useSaveQuote` mutation with
 * `restoredFromVersion: N` set in the args. No cache invalidation here — the
 * underlying record is unchanged until the caller saves.
 */
export function useRestoreVersion(): UseMutationResult<
  { formValues: QuoteVersion["formValues"] },
  Error,
  { id: string; version: number }
> {
  return useMutation<
    { formValues: QuoteVersion["formValues"] },
    Error,
    { id: string; version: number }
  >({
    mutationFn: ({ id, version }) => restoreVersion(id, version),
  });
}
