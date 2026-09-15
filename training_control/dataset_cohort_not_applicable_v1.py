"""Dataset-cohort applicability certificate for the ERP web application.

The repository owns a first-class fail-closed scientific authority, but currently
contains no model-training optimizer transaction.  A physical dataset cohort would
therefore be fictional.  This certificate re-checks the root authority, its retained
source scanner, and package dependency/script surfaces so a future ML trainer makes
N/A status fail closed until it receives a real OPF dataset-cohort adapter.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

SCHEMA = "opf-dataset-cohort-not-applicable/v1"
REPOSITORY = "Anurag9000/ERP_Web"
APPLICABLE = False
REASON = (
    "Vite/React/Supabase ERP application; retained source authority certifies no "
    "repository-authored model-training optimizer transaction"
)

_REQUIRED_ROOT_MARKERS = (
    "audit_no_trainable_surface_v1.py",
    "scientific_authority",
    "strict_coverage",
    "require_literal_opf_mechanism_parity",
    "require_all_retained_trainable_source_reachability",
)
_REQUIRED_AUDIT_MARKERS = (
    "torch_optimizer",
    "torch_backward",
    "tensorflow",
    "keras_fit",
    "partial_fit",
    "sklearn",
    "xgboost",
    "lightgbm",
    "training_surface_detected",
)
_FORBIDDEN_ML_DEPENDENCIES = {
    "@tensorflow/tfjs",
    "tensorflow",
    "keras",
    "torch",
    "pytorch",
    "scikit-learn",
    "sklearn",
    "xgboost",
    "lightgbm",
}
_FORBIDDEN_TRAIN_SCRIPT_MARKERS = (
    "train-model",
    "model:train",
    "tensorflow",
    "torchrun",
    "xgboost",
    "lightgbm",
)


def certificate(root: str | Path | None = None) -> dict[str, Any]:
    repository_root = Path(root or Path(__file__).resolve().parents[1]).resolve()
    launcher = repository_root / "run_all_training.py"
    audit = repository_root / "scripts" / "audit_no_trainable_surface_v1.py"
    package = repository_root / "package.json"
    for path in (launcher, audit, package):
        if not path.is_file():
            raise RuntimeError(f"ERP N/A authority input is missing: {path.relative_to(repository_root)}")

    launcher_source = launcher.read_text(encoding="utf-8", errors="strict")
    missing_root = [marker for marker in _REQUIRED_ROOT_MARKERS if marker not in launcher_source]
    if missing_root:
        raise RuntimeError(f"root authority no longer proves N/A invariants: {missing_root}")

    audit_source = audit.read_text(encoding="utf-8", errors="strict")
    missing_audit = [marker for marker in _REQUIRED_AUDIT_MARKERS if marker not in audit_source]
    if missing_audit:
        raise RuntimeError(f"no-training audit lost fail-closed detectors: {missing_audit}")

    manifest = json.loads(package.read_text(encoding="utf-8", errors="strict"))
    dependency_names: set[str] = set()
    for section in ("dependencies", "devDependencies", "optionalDependencies", "peerDependencies"):
        values = manifest.get(section, {}) or {}
        if not isinstance(values, dict):
            raise RuntimeError(f"package.json {section} must be a mapping")
        dependency_names.update(str(name).lower() for name in values)
    forbidden_dependencies = sorted(_FORBIDDEN_ML_DEPENDENCIES & dependency_names)
    if forbidden_dependencies:
        raise RuntimeError(
            "trainable ML dependency appeared; dataset-cohort N/A is invalid: "
            + ", ".join(forbidden_dependencies)
        )

    scripts = manifest.get("scripts", {}) or {}
    if not isinstance(scripts, dict):
        raise RuntimeError("package.json scripts must be a mapping")
    script_text = "\n".join(str(value).lower() for value in scripts.values())
    train_script_markers = [marker for marker in _FORBIDDEN_TRAIN_SCRIPT_MARKERS if marker in script_text]
    if train_script_markers:
        raise RuntimeError(
            "trainable package script appeared; dataset-cohort N/A is invalid: "
            + ", ".join(train_script_markers)
        )

    return {
        "schema": SCHEMA,
        "repository": REPOSITORY,
        "applicable": APPLICABLE,
        "reason": REASON,
        "authority": "run_all_training.py + scripts/audit_no_trainable_surface_v1.py + package.json",
        "package_scripts": sorted(str(name) for name in scripts),
        "dependency_names": sorted(dependency_names),
        "require_literal_opf_mechanism_parity": True,
        "require_all_retained_trainable_source_reachability": True,
        "source_configuration_only": True,
        "training_executed": False,
    }


if __name__ == "__main__":
    print(json.dumps(certificate(), indent=2, sort_keys=True))
