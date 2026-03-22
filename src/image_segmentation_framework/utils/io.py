from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from .image_ops import normalize_mask


def load_image(path: str | Path) -> np.ndarray:
    with Image.open(path) as image:
        return np.asarray(image.convert("RGB"))


def load_mask(path: str | Path) -> np.ndarray:
    with Image.open(path) as image:
        grayscale = np.asarray(image.convert("L"))
    return (grayscale > 127).astype(np.uint8)


def save_image(path: str | Path, image: np.ndarray) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.asarray(image).astype(np.uint8)).save(destination)


def save_mask(path: str | Path, mask: np.ndarray) -> None:
    save_image(path, normalize_mask(mask))


def save_json(path: str | Path, payload: dict[str, Any]) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))
