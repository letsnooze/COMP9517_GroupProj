from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import numpy as np

if TYPE_CHECKING:
    from image_segmentation_framework.dataset import DatasetSample


@dataclass(slots=True)
class SegmentationResult:
    mask: np.ndarray
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseSegmenter(ABC):
    name: str = "base"
    description: str = "Abstract segmentation method"
    category: str = "unknown"
    requires_training: bool = False

    def fit(
        self,
        train_samples: Sequence["DatasetSample"],
        validation_samples: Sequence["DatasetSample"] | None = None,
    ) -> dict[str, Any]:
        return {
            "trained": False,
            "note": "This method uses fixed logic and does not require training.",
        }

    @abstractmethod
    def segment(self, image: np.ndarray) -> SegmentationResult:
        raise NotImplementedError

    @staticmethod
    def validate_mask(mask: np.ndarray, image: np.ndarray) -> np.ndarray:
        if mask.ndim != 2:
            raise ValueError("Segmentation mask must be a 2D array.")
        if mask.shape != image.shape[:2]:
            raise ValueError("Mask height/width must match the input image.")
        return mask
