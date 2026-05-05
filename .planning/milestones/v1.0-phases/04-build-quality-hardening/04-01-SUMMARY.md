---
phase: 4
plan: 01
plan_id: 04-01
subsystem: build/cdn
tags: [vercel, cache, cdn, config, DATA-01]
requirements_closed: [DATA-01]
dependency_graph:
  requires: []
  provides:
    - "vercel.json: cache headers covering /demo-assets/models_real/* and /demo-assets/models_synthetic/* (immutable)"
    - "vercel.json: dead /demo-assets/models/ rule removed"
  affects: []
tech_stack:
  added: []
  patterns:
    - "Vercel headers[] config with disjoint regex sources matched top-down"
    - "Content-addressed (build-rewritten) joblib filenames → immutable cache safe"
key_files:
  created: []
  modified:
    - vercel.json
decisions:
  - "Order in headers[]: models_real → models_synthetic → py (CONTEXT D-01)"
  - "Dead rule deleted, not commented (config bug, not historical artifact)"
  - "Both new rules share the same immutable header (max-age=31536000) as the dead rule had"
  - "/demo-assets/py/(.*) max-age=3600 rule unchanged"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_changed: 1
  insertions: 7
  deletions: 1
  completed_date: 2026-05-05
commits:
  - hash: d2ceb9a
    message: "fix(04): vercel.json caches the actually-deployed model bundle paths (DATA-01)"
---

# Phase 4 Plan 01: vercel.json cache rule fix Summary

Replaced dead `/demo-assets/models/(.*)` rule with two real-path rules covering the actually-deployed joblib bundles, eliminating ~5-50 MB re-downloads per page load.

## What was built

Pure config edit to `vercel.json` `headers[]` array:

- Removed: 1 entry — `/demo-assets/models/(.*)` (path does not exist in the deployed site).
- Added: 2 entries — `/demo-assets/models_real/(.*)` and `/demo-assets/models_synthetic/(.*)`, both with `Cache-Control: public, max-age=31536000, immutable`.
- Untouched: `/demo-assets/py/(.*)` with `max-age=3600` (still in third position).

Final order: `models_real → models_synthetic → py` (CONTEXT D-01).

`buildCommand`, `outputDirectory`, `installCommand`, `framework`, and `rewrites` are byte-identical to pre-Phase-4 state — diff is contained inside the `headers[]` array.

## Why

The previous rule cached `/demo-assets/models/` — a path that does not exist in the deployed site. Per `scripts/build_demo_static.py:_copy_model_bundle`, joblib bundles ship under `/demo-assets/models_real/` and `/demo-assets/models_synthetic/`. Single-user demo never noticed; under any scale-out the CDN miss would dominate page-load cost. Fix is a one-line correction that makes the cache rules match reality.

`immutable` carries over to the new rules because the build rewrites bundle filenames on each `python3 scripts/build_demo_static.py` run (content-addressed), so a stale cached blob can never collide with a new build's filename.

## Tasks Executed

| # | Task                                      | Status | Commit  |
|---|-------------------------------------------|--------|---------|
| 1 | Edit vercel.json — replace dead rule with two real-path rules | done   | d2ceb9a |
| 2 | Commit                                    | done   | d2ceb9a |

T1 + T2 collapsed into one atomic commit per plan's commit plan.

## Success Gate Results

| # | Check                                                              | Result |
|---|--------------------------------------------------------------------|--------|
| 1 | `JSON.parse(vercel.json)` succeeds                                 | PASS   |
| 2 | `/demo-assets/models/(.*)` rule absent                             | PASS (0 matches) |
| 3 | `/demo-assets/models_real/(.*)` rule present once                  | PASS (1 match)   |
| 4 | `/demo-assets/models_synthetic/(.*)` rule present once             | PASS (1 match)   |
| 5 | `/demo-assets/py/(.*)` rule present once (unchanged)               | PASS (1 match)   |
| 6 | `git diff` only shows changes inside `headers[]`                   | PASS             |
| — | Order = `models_real → models_synthetic → py`                      | PASS             |
| — | `max-age=31536000, immutable` count = 2                            | PASS             |
| — | `max-age=3600` count = 1                                           | PASS             |

All checks pass.

## Deviations from Plan

None — plan executed exactly as written. The `CODE VIEW` final JSON block was applied verbatim.

## Authentication Gates

None — pure local config edit.

## Out of Scope (preserved)

- Build script changes — deferred to Plan 04-02 (DATA-02).
- `rewrites[]` — untouched.
- COEP/COOP/CSP headers — not a Phase 4 requirement.
- `vercel.json` reformatting — only the `headers[]` edit window changed.
- Vercel deploy — happens via `/gsd-ship 4` after Phase 4 verification.

## Threat Flags

None. Pure cache-control config; no new network surface, no auth path, no schema change.

## Self-Check: PASSED

- `vercel.json` modification: FOUND (1 file changed, 7 insertions, 1 deletion).
- Commit `d2ceb9a`: FOUND in git log.
- SUMMARY.md path: this file.
- No STATE.md / ROADMAP.md changes (handled by orchestrator).
