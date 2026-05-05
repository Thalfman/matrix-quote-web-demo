/**
 * Type-only stub for Plan 05-02 (Wave 1 file-disjoint executor).
 *
 * NOTE (Rule 3 deviation): Plan 02 imports `WorkflowStatus`, `Workspace`, and
 * `STATUS_CYCLE` from this module, but the full file is owned by Plan 01
 * (Wave 1, parallel) and is not present on this worktree. To unblock typecheck
 * and tests for Plan 02, this stub provides ONLY the three type-level symbols
 * Plan 02 consumes.
 *
 * When Plan 01 merges, its full schema (with zod validators, SavedQuote /
 * QuoteVersion shapes, transformToFormValues, etc.) will overwrite this stub.
 * Plan 01's `Workspace`, `WorkflowStatus`, and `STATUS_CYCLE` definitions are a
 * strict superset of these — names and string literal values match exactly.
 *
 * See: .planning/phases/05-quote-persistence/05-01-PLAN.md `<interfaces>` block.
 */

export type Workspace = "real" | "synthetic";

export type WorkflowStatus = "draft" | "sent" | "won" | "lost" | "revised";

export const STATUS_CYCLE: readonly WorkflowStatus[] = [
  "draft",
  "sent",
  "won",
  "lost",
  "revised",
] as const;
