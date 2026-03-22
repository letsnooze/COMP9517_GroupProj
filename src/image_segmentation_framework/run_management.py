from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import ExperimentConfig
from .utils.io import save_json


def _slugify(value: str) -> str:
    lowered = value.strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")
    return slug or "run"


def generate_run_id(run_name: str | None = None) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if run_name:
        return f"{timestamp}_{_slugify(run_name)}"
    return timestamp


@dataclass(slots=True)
class ExperimentRunPaths:
    method_root: Path
    runs_root: Path
    run_root: Path
    result_dir: Path
    latest_pointer: Path
    run_manifest: Path


def build_dataset_run_paths(config: ExperimentConfig, run_id: str) -> ExperimentRunPaths:
    method_root = config.output_dir / config.method
    runs_root = method_root / "runs"
    run_root = runs_root / run_id
    result_dir = run_root / config.evaluation_split
    return ExperimentRunPaths(
        method_root=method_root,
        runs_root=runs_root,
        run_root=run_root,
        result_dir=result_dir,
        latest_pointer=method_root / "latest.json",
        run_manifest=run_root / "run_manifest.json",
    )


def build_single_image_run_paths(config: ExperimentConfig, run_id: str, image_stem: str) -> ExperimentRunPaths:
    method_root = config.output_dir / config.method
    runs_root = method_root / "runs"
    run_root = runs_root / run_id
    result_dir = run_root / image_stem
    return ExperimentRunPaths(
        method_root=method_root,
        runs_root=runs_root,
        run_root=run_root,
        result_dir=result_dir,
        latest_pointer=method_root / "latest.json",
        run_manifest=run_root / "run_manifest.json",
    )


def write_run_manifest(
    paths: ExperimentRunPaths,
    config: ExperimentConfig,
    run_id: str,
    experiment_type: str,
    extra: dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "run_id": run_id,
        "method": config.method,
        "experiment_type": experiment_type,
        "output_dir": str(config.output_dir),
        "run_root": str(paths.run_root),
        "result_dir": str(paths.result_dir),
        "run_name": config.run_name,
        "train_split": config.train_split,
        "validation_split": config.validation_split,
        "evaluation_split": config.evaluation_split,
        "dataset_root": None if config.dataset_root is None else str(config.dataset_root),
        "image_path": None if config.image_path is None else str(config.image_path),
        "mask_path": None if config.mask_path is None else str(config.mask_path),
        "method_params": config.method_params,
    }
    if extra:
        payload.update(extra)
    save_json(paths.run_manifest, payload)


def update_latest_pointer(paths: ExperimentRunPaths, config: ExperimentConfig, run_id: str) -> None:
    save_json(
        paths.latest_pointer,
        {
            "run_id": run_id,
            "method": config.method,
            "run_name": config.run_name,
            "run_root": str(paths.run_root),
            "result_dir": str(paths.result_dir),
        },
    )


def list_run_roots(method_root: str | Path) -> list[Path]:
    runs_root = Path(method_root) / "runs"
    if not runs_root.exists():
        return []
    return sorted(
        [path for path in runs_root.iterdir() if path.is_dir()],
        key=lambda path: path.name,
    )
