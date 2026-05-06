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
export const QUOTE_DB_VERSION = 2;
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
// v1 -> v2 record migration (Phase 6 D-12 / D-13)
// ---------------------------------------------------------------------------

/**
 * Idempotent record migration. Called from onupgradeneeded AND defensively
 * from getSavedQuote / listSavedQuotes for tabs open during the upgrade
 * window. Returns the input unchanged if it is already v2 or has no
 * recognizable schemaVersion (forward-compat — Phase 7 stays parseable).
 */
export function migrateRecordV1ToV2(rec: unknown): unknown {
  if (!rec || typeof rec !== "object") return rec;
  const r = rec as Record<string, unknown>;
  if (r.schemaVersion === 2) return rec;
  if (r.schemaVersion !== 1) return rec; // unknown — leave to upstream resilience
  const versions = Array.isArray(r.versions) ? r.versions : [];
  return {
    ...r,
    schemaVersion: 2,
    versions: versions.map((v) => {
      if (!v || typeof v !== "object") return v;
      const ver = v as Record<string, unknown>;
      return { ...ver, formValues: migrateFormValuesV1ToV2(ver.formValues) };
    }),
  };
}

/**
 * Per-version formValues migration (D-13).
 *   - vision_type === "None"   -> visionRows: []  (degenerate v1 with count > 0 also collapses)
 *   - vision_type === ""       -> visionRows: []  (empty string carry)
 *   - any other non-empty type -> [{type, count: Math.max(1, count)}]
 *
 * Migration must preserve the trained model's full vision_type vocabulary
 * (e.g. "Cognex 2D", "3D Vision", "Keyence IV3"), not just a hard-coded
 * "2D"/"3D" allowlist — the prior allowlist silently dropped every real-world
 * saved quote whose vision_type didn't match those two literal strings.
 *
 * Strips the legacy keys after rewriting (clean cutover).
 *
 * WR-04: legacy keys are stripped regardless of whether the input is v1 or
 * already-v2. Pre-fix the function short-circuited on Array.isArray(visionRows)
 * without stripping, which left a window where a hand-rolled hybrid record
 * (visionRows AND lingering vision_type / vision_systems_count keys) leaked
 * legacy keys downstream. D-13's "clean cutover" lock requires the invariant
 * "no legacy keys ever appear on a v2 formValues" anywhere in the data flow.
 */
function migrateFormValuesV1ToV2(fv: unknown): unknown {
  if (!fv || typeof fv !== "object") return fv;
  const f = fv as Record<string, unknown>;
  // WR-04: strip legacy keys first so the already-v2 short-circuit cannot
  // leak them through. _vt/_vc satisfy the project's argsIgnorePattern: "^_".
  const { vision_type: _vt, vision_systems_count: _vc, ...rest } = f;
  if (Array.isArray(rest.visionRows)) return rest; // already v2 (now without legacy keys)
  const visionType = typeof f.vision_type === "string" ? f.vision_type.trim() : "";
  const rawCount = typeof f.vision_systems_count === "number"
    ? f.vision_systems_count
    : Number(f.vision_systems_count ?? 0);
  const count = Number.isFinite(rawCount) ? rawCount : 0;
  const visionRows: Array<{ type: string; count: number }> =
    visionType === "" || visionType === "None"
      ? []
      : [{ type: visionType, count: Math.max(1, count) }];
  return { ...rest, visionRows };
}

// ---------------------------------------------------------------------------
// Lazy DB bootstrap (mirrors ensurePyodideReady idempotency pattern)
// ---------------------------------------------------------------------------

export function ensureDbReady(): Promise<void> {
  if (!dbPromise) {
    dbPromise = openDB(QUOTE_DB_NAME, QUOTE_DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        // schemaVersion bump path: see CONTEXT.md D-18 — Phase 6/7 forward compat.
        if (oldVersion < 1) {
          const store = db.createObjectStore(QUOTE_STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("status", "status");
          store.createIndex("workspace", "workspace");
        }
        if (oldVersion < 2) {
          // D-13: walk every existing record and rewrite to v2 shape in place.
          const store = tx.objectStore(QUOTE_STORE_NAME);
          let cursor = await store.openCursor();
          while (cursor) {
            const migrated = migrateRecordV1ToV2(cursor.value);
            await cursor.update(migrated);
            cursor = await cursor.continue();
          }
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
  if (!values.visionRows || values.visionRows.length === 0) return "No vision";
  return values.visionRows.map((r) => `${r.type}×${r.count}`).join("+");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns ALL saved quotes, NEWEST updatedAt FIRST.
 *
 * T-05-05: validate every record via savedQuoteSchema.safeParse so a row with
 * a future schemaVersion (Phase 6/7) or a tampered shape can't crash the list
 * render. Malformed records are silently skipped (alternative would be a typed
 * error; the list view's UX is "show everything we can render", so dropping is
 * preferable to a hard fail).
 */
export async function listSavedQuotes(): Promise<SavedQuote[]> {
  const handle = await db();
  const tx = handle.transaction(QUOTE_STORE_NAME, "readonly");
  const raw = await tx.store.getAll();
  await tx.done;
  const validated: SavedQuote[] = [];
  for (const rec of raw) {
    // D-13 defensive on-read migration: covers tabs open across upgrade.
    const migrated = migrateRecordV1ToV2(rec);
    const parsed = savedQuoteSchema.safeParse(migrated);
    if (parsed.success) validated.push(parsed.data);
    // else: drop malformed/future-schema record — a row that listSavedQuotes
    // skips can still surface via getSavedQuote, where T-05-05 is enforced
    // strictly (throws). The list path needs to be resilient.
  }
  return validated.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/**
 * Returns the saved record validated against savedQuoteSchema, or null.
 * T-05-05: throws on schemaVersion-in-the-future records.
 */
export async function getSavedQuote(id: string): Promise<SavedQuote | null> {
  const handle = await db();
  const rec = await handle.get(QUOTE_STORE_NAME, id);
  if (!rec) return null;
  // D-13 defensive on-read migration: covers tabs open across upgrade.
  const migrated = migrateRecordV1ToV2(rec);
  return savedQuoteSchema.parse(migrated);
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
      schemaVersion: 2,
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
