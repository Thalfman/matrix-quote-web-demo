---
phase: 4
plan: 02
subsystem: build-tooling
tags: [data-02, lfs, build-script, pytest]
requires: []
provides:
  - "scripts/build_demo_static.py:_copy_model_bundle hard-fails via _die() on LFS-pointer joblibs (size < 1024 bytes)"
  - "tests/scripts/test_build_demo_static.py: 2 new pytest cases — test_lfs_pointer_triggers_hard_fail + test_missing_src_dir_does_not_hard_fail"
affects:
  - "Vercel build pipeline behavior on half-fetched LFS state (now fails loud instead of shipping silent breakage)"
  - "Local dev builds without `git lfs pull` (now error out with actionable message)"
tech-stack:
  added: []
  patterns:
    - "Reuse of existing _die(msg) helper (sys.exit(1) on stderr) for LFS-pointer guard"
    - "monkeypatch.setattr(build_mod, 'DEMO_ROOT'/'OUT', tmp_path) for sandbox-isolated module-attribute redirection in pytest"
key-files:
  created: []
  modified:
    - "scripts/build_demo_static.py — _copy_model_bundle: removed skipped_lfs accumulator + WARN block, replaced with _die() call inside the joblib loop; updated docstring"
    - "tests/scripts/test_build_demo_static.py — appended test_lfs_pointer_triggers_hard_fail and test_missing_src_dir_does_not_hard_fail"
decisions:
  - "Used the locked CONTEXT D-02 error-message format verbatim: `LFS pointer detected at {joblib_file}; run \\`git lfs pull\\` and re-build (joblib bundle = {src_name})`"
  - "Kept the 'src dir does not exist' branch (lines 161-167) untouched — it represents the deliberate docs-only-deploy path per CONTEXT D-02"
  - "Added the regression-guard test test_missing_src_dir_does_not_hard_fail (extra of the strict plan requirement) to lock the WARN-and-return-0 distinction"
metrics:
  duration: "~12 min"
  completed: "2026-05-05"
---

# Phase 4 Plan 02: LFS-pointer hard-fail Summary

LFS-pointer detection in `_copy_model_bundle` now aborts the static-demo build via `_die()` instead of silently skipping joblibs and emitting a soft WARN, eliminating the deploy-with-broken-ML failure mode.

## What was built

`scripts/build_demo_static.py:_copy_model_bundle` previously accumulated `skipped_lfs` for any `*.joblib` smaller than 1024 bytes, copied the rest, emitted the metrics JSON, and printed a trailing `WARN: ... LFS pointers and were skipped`. The build returned 0, the deploy shipped, and the ML tool was non-functional in production until a customer tried it.

The function now calls the existing `_die(msg)` helper inline within the joblib loop the moment a pointer is detected:

```
LFS pointer detected at <abs path>; run `git lfs pull` and re-build (joblib bundle = models_real)
```

`_die()` writes `ERROR: {msg}` to stderr and `sys.exit(1)`. The build aborts before any output is produced — no `frontend/public/demo-assets/` is written, no metrics JSON, no half-state to clean up.

The "src dir does not exist entirely" branch (the deliberate docs-only-deploy path) keeps its existing WARN-and-return-0 behavior. CONTEXT D-02 explicitly distinguishes "operator chose to deploy without ML" from "LFS half-fetched", and the test suite locks the distinction.

## Tasks completed

| Task | Description | Commit |
|---|---|---|
| T1 | Edit `scripts/build_demo_static.py` — replace skipped_lfs branch with `_die()` call; update docstring | `5213d85` |
| T2 | Add `test_lfs_pointer_triggers_hard_fail` + `test_missing_src_dir_does_not_hard_fail` to `tests/scripts/test_build_demo_static.py` | `5213d85` |
| T3 | Run pytest — 7 passed (5 existing + 2 new), 0 failures | (verified pre-commit) |
| T4 | Commit | `5213d85` |

Single atomic commit per the plan's commit plan. Script edit and test cases are interdependent and lock each other in.

## Verification

All 6 success gates from the PLAN VIEW pass:

| # | Check | Result |
|---|---|---|
| 1 | `grep -c "skipped_lfs" scripts/build_demo_static.py` | `0` (silent-skip variable + branch fully removed) |
| 2 | `grep -c "LFS pointer detected at" scripts/build_demo_static.py` | `1` |
| 3 | `grep -c "_die(" scripts/build_demo_static.py` | `7` (existing _die usages plus the new one) |
| 4 | importlib `_die(` AND `LFS pointer detected at` AND NOT `skipped_lfs` in `_copy_model_bundle` source | exit 0 |
| 5 | `python -m pytest tests/scripts/test_build_demo_static.py -v` | `7 passed` (both new tests in PASSED list) |
| 6 | `git status` after T4 | clean |

Pytest output:
```
tests/scripts/test_build_demo_static.py::test_out_dir_is_under_frontend_public PASSED [ 14%]
tests/scripts/test_build_demo_static.py::test_model_dir_names_are_models_real_and_models_synthetic PASSED [ 28%]
tests/scripts/test_build_demo_static.py::test_metric_json_filenames_match_plan PASSED [ 42%]
tests/scripts/test_build_demo_static.py::test_synthetic_pool_cap_is_500 PASSED [ 57%]
tests/scripts/test_build_demo_static.py::test_joblib_files_list_has_12_entries PASSED [ 71%]
tests/scripts/test_build_demo_static.py::test_lfs_pointer_triggers_hard_fail PASSED [ 85%]
tests/scripts/test_build_demo_static.py::test_missing_src_dir_does_not_hard_fail PASSED [100%]
======================== 7 passed, 1 warning in 0.93s =========================
```

## Deviations from Plan

None. Plan executed exactly as written. Both new tests landed; success gates 1-6 pass on first attempt.

### Worktree-tooling note (not a plan deviation)

During execution, the first set of Edit calls (preceded by Reads of paths constructed via the working-directory shorthand) wrote into the parent repo's working tree (`feat/04-build-quality-hardening`) instead of the worktree (`worktree-agent-ae90777a0e05d3bee`). Both paths exist as independent file copies under OneDrive on Windows, and the Edit tool's path-state cache keys off whichever path the prior Read used. The fix was: (a) `git checkout -- <specific paths>` in the parent repo to revert the misplaced edits (specific paths only, NOT a blanket `git checkout -- .`); (b) re-run Edit after a Read of the explicit `.claude/worktrees/agent-.../...` path.

Result: parent repo's working tree was left in its original state (only the pre-existing untracked file `NEXT-SESSION-KICKOFF.md` remains), and the commit `5213d85` lives on `worktree-agent-ae90777a0e05d3bee` only. No work was lost. Worth flagging to the orchestrator or a future tooling pass: agent prompts that run inside `.claude/worktrees/` should always Read the worktree-qualified path first to seed the Edit cache correctly.

## Authentication gates

None.

## Known Stubs

None. The hard-fail is real production behavior, not a placeholder. The two new tests genuinely exercise the changed code path (the LFS one asserts SystemExit raised; the missing-src one asserts return-0 + the unchanged WARN).

## Files

- `scripts/build_demo_static.py` (modified)
- `tests/scripts/test_build_demo_static.py` (modified)
- `.planning/phases/04-build-quality-hardening/04-02-SUMMARY.md` (this file)

## Self-Check: PASSED

- File `scripts/build_demo_static.py`: FOUND, contains `LFS pointer detected at` and `_die(` inside `_copy_model_bundle`, contains zero `skipped_lfs` references.
- File `tests/scripts/test_build_demo_static.py`: FOUND, contains `def test_lfs_pointer_triggers_hard_fail` and `def test_missing_src_dir_does_not_hard_fail`.
- Commit `5213d85`: FOUND in `git log` on `worktree-agent-ae90777a0e05d3bee`.
- Pytest: 7 passed, 0 failed.
- `git status` after final commit: clean.
- Parent repo working tree: unmodified (only pre-existing untracked file remains; no plan-04-02 changes leaked across).
