from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}
MASK_DIR_NAMES = {"mask", "masks", "label", "labels", "annotation", "annotations", "gt"}
IMAGE_DIR_NAMES = {"image", "images", "rgb"}
MASK_SUFFIX_TOKENS = ("_mask", "_label", "_labels", "_annotation", "_gt")
SPLIT_ALIASES = {
    "train": ("train",),
    "validation": ("validation", "val", "valid"),
    "val": ("val", "validation", "valid"),
    "test": ("test",),
}


@dataclass(slots=True)
class DatasetSample:
    sample_id: str
    split: str
    image_path: Path
    mask_path: Path


class EWSDataset:
    def __init__(self, root: str | Path) -> None:
        self.root = Path(root)
        if not self.root.exists():
            raise FileNotFoundError(f"Dataset root does not exist: {self.root}")

    def load_split(self, split: str, limit: int | None = None) -> list[DatasetSample]:
        last_existing_dir: Path | None = None
        for split_dir in self._candidate_split_dirs(split):
            if not split_dir.exists():
                continue
            last_existing_dir = split_dir
            image_files, mask_files = self._scan_split(split_dir)
            image_map = {self._normalize_stem(path.stem): path for path in image_files}
            mask_map = {self._normalize_stem(path.stem): path for path in mask_files}
            common_ids = sorted(image_map.keys() & mask_map.keys())
            if not common_ids:
                continue

            samples = [
                DatasetSample(
                    sample_id=sample_id,
                    split=split_dir.name,
                    image_path=image_map[sample_id],
                    mask_path=mask_map[sample_id],
                )
                for sample_id in common_ids
            ]
            return samples[:limit] if limit is not None else samples

        if last_existing_dir is not None:
            raise ValueError(f"No matched image/mask pairs found in split: {last_existing_dir}")
        raise FileNotFoundError(f"Dataset split does not exist: {self.root / split}")

    def assert_disjoint_splits(self, *splits: str) -> None:
        seen_ids: dict[str, str] = {}
        for split in splits:
            for sample in self.load_split(split):
                existing = seen_ids.get(sample.sample_id)
                if existing is not None:
                    raise ValueError(
                        f"Data leakage risk: sample '{sample.sample_id}' appears in both "
                        f"'{existing}' and '{split}'."
                    )
                seen_ids[sample.sample_id] = split

    def _scan_split(self, split_dir: Path) -> tuple[list[Path], list[Path]]:
        image_files: list[Path] = []
        mask_files: list[Path] = []

        for path in sorted(split_dir.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
                continue
            lower_parts = {part.lower() for part in path.parts}
            if lower_parts & MASK_DIR_NAMES or self._looks_like_mask_name(path.name):
                mask_files.append(path)
            elif lower_parts & IMAGE_DIR_NAMES:
                image_files.append(path)
            else:
                image_files.append(path)

        return image_files, mask_files

    def _candidate_split_dirs(self, split: str) -> list[Path]:
        candidates = SPLIT_ALIASES.get(split.lower(), (split,))
        return [self.root / candidate for candidate in candidates]

    @staticmethod
    def _looks_like_mask_name(filename: str) -> bool:
        lowered = filename.lower()
        return any(token in lowered for token in ("mask", "label", "annotation", "gt"))

    @staticmethod
    def _normalize_stem(stem: str) -> str:
        normalized = stem.lower()
        for token in MASK_SUFFIX_TOKENS:
            if normalized.endswith(token):
                return normalized[: -len(token)]
        return normalized


def split_ids(samples: Iterable[DatasetSample]) -> set[str]:
    return {sample.sample_id for sample in samples}
