from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class ExperimentConfig:
    method: str
    image_path: Path | None = None
    mask_path: Path | None = None
    dataset_root: Path | None = None
    train_split: str = "train"
    validation_split: str = "validation"
    evaluation_split: str = "test"
    output_dir: Path = Path("outputs/ews_benchmark")
    run_name: str | None = None
    save_overlay: bool = True
    save_qualitative_panel: bool = True
    limit: int | None = None
    method_params: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_json(cls, path: str | Path) -> "ExperimentConfig":
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(
            method=payload["method"],
            image_path=Path(payload["image_path"]) if payload.get("image_path") else None,
            mask_path=Path(payload["mask_path"]) if payload.get("mask_path") else None,
            dataset_root=Path(payload["dataset_root"]) if payload.get("dataset_root") else None,
            train_split=payload.get("train_split", "train"),
            validation_split=payload.get("validation_split", "validation"),
            evaluation_split=payload.get("evaluation_split", "test"),
            output_dir=Path(payload.get("output_dir", "outputs/ews_benchmark")),
            run_name=payload.get("run_name"),
            save_overlay=payload.get("save_overlay", True),
            save_qualitative_panel=payload.get("save_qualitative_panel", True),
            limit=payload.get("limit"),
            method_params=payload.get("method_params", {}),
        )

    @property
    def is_dataset_experiment(self) -> bool:
        return self.dataset_root is not None
