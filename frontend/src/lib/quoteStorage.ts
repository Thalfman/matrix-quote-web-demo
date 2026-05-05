/**
 * Owns the IndexedDB connection for "matrix-quotes" — one DB per tab.
 *
 * Exposes save/list/get/delete/getVersions/setStatus/restoreVersion plus a
 * BroadcastChannel for cross-tab sync. Pattern-mirrors
 * frontend/src/demo/pyodideClient.ts (module-singleton + lazy bootstrap +
 * subscribe). Phase 5 D-01..D-18.
 *
 * Threats mitigated (see plan 05-01 frontmatter):
 *   T-05-01: zod re-validation on every write (defense in depth).
 *   T-05-03: name length capped at 80; quoteFormSchema bounds the inner payload.
 *   T-05-04: BroadcastChannel envelope carries {type, id, updatedAt} only —
 *            consumer re-reads from IDB rather than trusting the message body.
 *   T-05-05: getSavedQuote re-validates schemaVersion on read; future versions
 *            throw a typed error rather than silently downgrading.
 */
import { openDB, type IDBPDatabase } from "idb";

import {
  savedQuoteSchema,
  type QuoteVersion,
  type SavedQuote,
  type WorkflowStatus,
  type Workspace,
} from "./savedQuoteSchema";
import type { QuoteFormValues } from "@/pages/single-quote/schema";

// ---------------------------------------------------------------------------
// Constants (frozen contract — Wave 2/3 imports these)
// ---------------------------------------------------------------------------

export const QUOTE_DB_NAME = "matrix-quotes";
export const QUOTE_STORE_NAME = "quotes";
export const QUOTE_DB_VERSION = 1;
export const BROADCAST_CHANNEL_NAME = "matrix-quotes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StorageEvent =
  | { type: "save"; id: string; updatedAt: string }
  | { type: "delete"; id: string }
  | { type: "restore"; id: string; updatedAt: string };

export type StorageListener = (event: StorageEvent) => void;

export interface SaveSavedQuoteArgs {
  /**
   * If present, update the existing record. If absent, create a new SavedQuote
   * with v1.
   */
  id?: string;
  name: string;
  workspace: Workspace;
  /** Defaults to "draft" for brand-new records; preserves existing on update. */
  status?: WorkflowStatus;
  formValues: QuoteFormValues;
  // unifiedResult is opaque-ish to this module — it's validated by the schema's
  // .passthrough() chain. Avoid coupling to UnifiedQuoteResult so Phase 6/7
  // additions don't break this module's compile.
  unifiedResult: Record<string, unknown> | object;
  compareInputs?: { humanQuotedByBucket: Record<string, number> };
  /** Set by the restore-fork flow (D-06) so v(N+1) records its lineage. */
  restoredFromVersion?: number;
}

// ---------------------------------------------------------------------------
// Module state (singleton — mirrors pyodideClient.ts:78-86)
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBPDatabase> | null = null;
let channel: BroadcastChannel | null = null;
const listeners = new Set<StorageListener>();

// ---------------------------------------------------------------------------
// BroadcastChannel bootstrap (lazy)
// ---------------------------------------------------------------------------

function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.onmessage = (e: MessageEvent<StorageEvent>) => {
      // T-05-04: consumers must treat broadcasts as cache-invalidate signals.
      // We forward the envelope as-is; subscribers (Plan 04 hook) re-read from IDB.
      for (const fn of listeners) fn(e.data);
    };
  }
  return channel;
}

function broadcast(evt: StorageEvent): void {
  // BroadcastChannel does NOT fire same-tab listeners (D-PATTERNS gotcha #7).
  // Notify local listeners first, then post to other tabs.
  for (const fn of listeners) fn(evt);
  getChannel().postMessage(evt);
}

// ---------------------------------------------------------------------------
// Lazy DB bootstrap (mirrors ensurePyodideReady idempotency pattern)
// ---------------------------------------------------------------------------

export function ensureDbReady(): Promise<void> {
  if (!dbPromise) {
    dbPromise = openDB(QUOTE_DB_NAME, QUOTE_DB_VERSION, {
      upgrade(db, oldVersion) {
        // schemaVersion bump path: see CONTEXT.md D-18 — Phase 6/7 forward compat.
        if (oldVersion < 1) {
          const store = db.createObjectStore(QUOTE_STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("status", "status");
          store.createIndex("workspace", "workspace");
        }
      },
    }).catch((err: Error) => {
      // Allow retry on next call.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise.then(() => undefined);
}

async function db(): Promise<IDBPDatabase> {
  if (!dbPromise) await ensureDbReady();
  return dbPromise!;
}

// ---------------------------------------------------------------------------
// Sales-bucket / vision-label denormalization (mirrors deriveSalesBucket in
// savedQuoteSchema.ts; kept private to avoid the type-only import widening).
// ---------------------------------------------------------------------------

/**
 * Deep structural equality, key-order-insensitive. Used by saveSavedQuote to
 * decide whether re-saving an opened quote should append a new version (D-05:
 * "same-input re-save updates updatedAt + status only — no version inflation").
 *
 * The previous implementation compared `JSON.stringify(a) !== JSON.stringify(b)`,
 * which is order-sensitive: `{a:1,b:2}` and `{b:2,a:1}` produce different
 * strings even though they represent the same value. Today's react-hook-form
 * insertion order is stable, but a future zod parse step (or any spread that
 * re-orders keys) would silently inflate the version array on every save.
 *
 * Recursive over plain objects and arrays. NaN-aware (NaN !== NaN under ===).
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ka = Object.keys(ao);
  const kb = Object.keys(bo);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}

function deriveSalesBucketFromValues(values: QuoteFormValues): string {
  const hasME = values.stations_count > 0 || values.has_controls;
  const hasEE = values.has_robotics || values.servo_axes > 0;
  if (hasME && hasEE) return "ME+EE";
  if (hasEE) return "EE";
  if (hasME) return "ME";
  return "Quote";
}

function deriveVisionLabel(values: QuoteFormValues): string {
  return !values.vision_type || values.vision_type === "None"
    ? "No vision"
    : values.vision_type;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns ALL saved quotes, NEWEST updatedAt FIRST. */
export async function listSavedQuotes(): Promise<SavedQuote[]> {
  const handle = await db();
  const tx = handle.transaction(QUOTE_STORE_NAME, "readonly");
  const all = (await tx.store.getAll()) as SavedQuote[];
  await tx.done;
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/**
 * Returns the saved record validated against savedQuoteSchema, or null.
 * T-05-05: throws on schemaVersion-in-the-future records.
 */
export async function getSavedQuote(id: string): Promise<SavedQuote | null> {
  const handle = await db();
  const rec = await handle.get(QUOTE_STORE_NAME, id);
  if (!rec) return null;
  return savedQuoteSchema.parse(rec);
}

/**
 * Brand-new save (no id) → creates a new SavedQuote with v1.
 * Update (id present) → appends a new version IF formValues/unifiedResult
 * differ from the current version (D-05). Same-input re-save updates
 * updatedAt + status only (no version inflation).
 *
 * Returns the post-write SavedQuote so the caller can read .id, .versions, etc.
 * Broadcasts {type:"save", id, updatedAt} after the IDB transaction commits.
 */
export async function saveSavedQuote(args: SaveSavedQuoteArgs): Promise<SavedQuote> {
  const handle = await db();
  const now = new Date().toISOString();

  let record: SavedQuote;
  if (args.id) {
    const existing = await getSavedQuote(args.id);
    if (!existing) {
      throw new Error(`saveSavedQuote: no quote found with id ${args.id}`);
    }
    const lastVersion = existing.versions[existing.versions.length - 1];
    // D-05: same-input re-save updates updatedAt + status only — no version
    // inflation. Use a structural deep-equal so reordered keys don't trigger
    // a spurious "changed" verdict (key-order-sensitive JSON.stringify is
    // fragile under future zod-parse passes that may sort keys).
    const inputsChanged =
      !deepEqual(lastVersion.formValues, args.formValues) ||
      !deepEqual(lastVersion.unifiedResult, args.unifiedResult);

    const versions: QuoteVersion[] = inputsChanged
      ? [
          ...existing.versions,
          {
            version: lastVersion.version + 1,
            savedAt: now,
            statusAtTime: args.status ?? existing.status,
            formValues: args.formValues,
            unifiedResult: args.unifiedResult as QuoteVersion["unifiedResult"],
            ...(args.restoredFromVersion !== undefined && {
              restoredFromVersion: args.restoredFromVersion,
            }),
            ...(args.compareInputs && { compareInputs: args.compareInputs }),
          },
        ]
      : existing.versions;

    record = {
      ...existing,
      name: args.name.trim(),
      status: args.status ?? existing.status,
      updatedAt: now,
      versions,
      salesBucket: deriveSalesBucketFromValues(args.formValues),
      visionLabel: deriveVisionLabel(args.formValues),
      materialsCost: args.formValues.estimated_materials_cost ?? 0,
    };
  } else {
    // Brand-new quote — create v1.
    record = {
      id: crypto.randomUUID(),
      schemaVersion: 1,
      name: args.name.trim(),
      workspace: args.workspace,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
      versions: [
        {
          version: 1,
          savedAt: now,
          statusAtTime: args.status ?? "draft",
          formValues: args.formValues,
          unifiedResult: args.unifiedResult as QuoteVersion["unifiedResult"],
          ...(args.compareInputs && { compareInputs: args.compareInputs }),
        },
      ],
      salesBucket: deriveSalesBucketFromValues(args.formValues),
      visionLabel: deriveVisionLabel(args.formValues),
      materialsCost: args.formValues.estimated_materials_cost ?? 0,
    };
  }

  // Defense-in-depth re-validation (T-05-01).
  const validated = savedQuoteSchema.parse(record);

  await handle.put(QUOTE_STORE_NAME, validated);
  broadcast({ type: "save", id: validated.id, updatedAt: validated.updatedAt });
  return validated;
}

/**
 * Hard delete. Removes the entire record (full version history). D-17.
 * Idempotent — deleting a nonexistent id resolves without throwing.
 */
export async function deleteSavedQuote(id: string): Promise<void> {
  const handle = await db();
  await handle.delete(QUOTE_STORE_NAME, id);
  broadcast({ type: "delete", id });
}

/** Returns versions[] for the quote, newest LAST (matches stored order). */
export async function getVersions(id: string): Promise<QuoteVersion[]> {
  const rec = await getSavedQuote(id);
  return rec ? rec.versions : [];
}

/** D-08/D-09: status update only. Does NOT create a new version. */
export async function setStatus(
  id: string,
  status: WorkflowStatus,
): Promise<SavedQuote> {
  const handle = await db();
  const existing = await getSavedQuote(id);
  if (!existing) throw new Error(`setStatus: no quote with id ${id}`);
  const updated: SavedQuote = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  };
  const validated = savedQuoteSchema.parse(updated);
  await handle.put(QUOTE_STORE_NAME, validated);
  broadcast({ type: "save", id: validated.id, updatedAt: validated.updatedAt });
  return validated;
}

/**
 * D-06: NON-DESTRUCTIVE fork. Returns the formValues of version N so the caller
 * can re-hydrate the form. The actual "commit as v(N+1)" happens on the next
 * saveSavedQuote() with restoredFromVersion: N set in args. NO mutation here.
 */
export async function restoreVersion(
  id: string,
  version: number,
): Promise<{ formValues: QuoteFormValues }> {
  const rec = await getSavedQuote(id);
  if (!rec) throw new Error(`restoreVersion: no quote with id ${id}`);
  const target = rec.versions.find((v) => v.version === version);
  if (!target) {
    throw new Error(`restoreVersion: no version ${version} in quote ${id}`);
  }
  return { formValues: target.formValues };
}

/**
 * Subscribe to BroadcastChannel events. Returns unsubscribe.
 * Mirrors the subscribe pattern from frontend/src/demo/pyodideClient.ts:91-100.
 */
export function subscribe(fn: StorageListener): () => void {
  listeners.add(fn);
  // Lazy-init the channel so cross-tab broadcasts can land here.
  getChannel();
  return () => {
    listeners.delete(fn);
  };
}
