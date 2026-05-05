"""Smoke test for scripts/build_demo_static.py module-level structure.

Does NOT run training or any I/O — just asserts that the constants the
frontend depends on are defined correctly in the script.
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# We need the repo root on sys.path so that ``from core.config import …``
# inside build_demo_static.py resolves. The script itself does this at import
# time via sys.path.insert, but we add it here as a belt-and-suspenders guard.
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def build_mod():
    """Import build_demo_static as a module (no side-effects: only constants are top-level)."""
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))

    scripts_dir = REPO_ROOT / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))

    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "build_demo_static",
        REPO_ROOT / "scripts" / "build_demo_static.py",
    )
    assert spec is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


def test_out_dir_is_under_frontend_public(build_mod):
    """OUT constant must point inside frontend/public/demo-assets."""
    out: Path = build_mod.OUT
    assert out == REPO_ROOT / "frontend" / "public" / "demo-assets", (
        f"OUT is {out!r}, expected frontend/public/demo-assets"
    )


def test_model_dir_names_are_models_real_and_models_synthetic(build_mod):
    """_copy_model_bundle must be called with 'models_real' and 'models_synthetic'."""
    # We verify by checking the hard-coded string literals in the function source.
    import inspect
    src = inspect.getsource(build_mod._copy_model_bundle)
    assert "models_real" in src, "models_real not found in _copy_model_bundle source"
    assert "models_synthetic" in src, "models_synthetic not found in _copy_model_bundle source"


def test_metric_json_filenames_match_plan(build_mod):
    """Output JSON filenames must be model_metrics_real.json and model_metrics_synthetic.json."""
    import inspect
    src = inspect.getsource(build_mod._copy_model_bundle)
    assert "model_metrics_real.json" in src or "model_metrics_{suffix}.json" in src, (
        "model_metrics_real.json pattern not found in _copy_model_bundle"
    )
    assert "model_metrics_" in src, "metric JSON filename pattern not found"


def test_synthetic_pool_cap_is_500(build_mod):
    """SYNTHETIC_POOL_CAP must be 500 (matches the demo manifest synthetic_count)."""
    assert build_mod.SYNTHETIC_POOL_CAP == 500


def test_joblib_files_list_has_12_entries():
    """pyodideClient.ts hard-codes 12 joblib file names; the script must produce exactly 12."""
    # The canonical list lives in pyodideClient.ts; verify indirectly by counting TARGETS.
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))
    from core.config import TARGETS  # type: ignore
    assert len(TARGETS) == 12, (
        f"Expected 12 TARGETS (one joblib per target), got {len(TARGETS)}"
    )


def test_lfs_pointer_triggers_hard_fail(build_mod, tmp_path, monkeypatch, capsys):
    """A *.joblib file < 1024 bytes under DEMO_ROOT must abort the build via _die()."""
    # Set up a fake demo tree with one pointer-sized joblib in models_real/.
    fake_demo_root = tmp_path / "demo_assets"
    (fake_demo_root / "models_real").mkdir(parents=True)
    pointer_joblib = fake_demo_root / "models_real" / "me10_actual_hours.joblib"
    pointer_joblib.write_bytes(b"version https://git-lfs.github.com/spec/v1\n")  # 44 bytes
    assert pointer_joblib.stat().st_size < 1024, "test fixture must be a fake LFS pointer"

    # Redirect DEMO_ROOT and OUT so the function operates on the tmp tree.
    fake_out = tmp_path / "out"
    fake_out.mkdir()
    monkeypatch.setattr(build_mod, "DEMO_ROOT", fake_demo_root)
    monkeypatch.setattr(build_mod, "OUT", fake_out)

    with pytest.raises(SystemExit) as exc_info:
        build_mod._copy_model_bundle("models_real")

    # _die calls sys.exit(1)
    assert exc_info.value.code == 1, f"expected exit code 1, got {exc_info.value.code}"

    captured = capsys.readouterr()
    assert "LFS pointer detected at" in captured.err, (
        f"stderr did not contain expected LFS error message; got: {captured.err!r}"
    )
    assert str(pointer_joblib) in captured.err, (
        "stderr did not include the offending file path"
    )


def test_missing_src_dir_does_not_hard_fail(build_mod, tmp_path, monkeypatch, capsys):
    """When the entire src dir is missing, the function still returns 0 (CONTEXT D-02)."""
    # No models_real/ directory created — simulating a docs-only deploy.
    fake_demo_root = tmp_path / "demo_assets"
    fake_demo_root.mkdir()
    fake_out = tmp_path / "out"
    fake_out.mkdir()
    monkeypatch.setattr(build_mod, "DEMO_ROOT", fake_demo_root)
    monkeypatch.setattr(build_mod, "OUT", fake_out)

    # Must NOT raise SystemExit.
    result = build_mod._copy_model_bundle("models_real")
    assert result == 0, f"expected 0 from missing-src path, got {result}"

    captured = capsys.readouterr()
    assert "ML tool will be non-functional" in captured.err, (
        "missing-src branch should still emit its informational WARN"
    )
