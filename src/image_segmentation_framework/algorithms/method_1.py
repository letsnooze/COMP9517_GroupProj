from __future__ import annotations

from collections.abc import Sequence
from itertools import product
from typing import Any

import numpy as np
from scipy import ndimage

from .base import BaseSegmenter, SegmentationResult
from ..dataset import DatasetSample
from ..utils.image_ops import (
    compute_excess_green,
    gradient_magnitude,
    postprocess_binary_mask,
    rgb_to_grayscale,
    rgb_to_hsv,
    spatial_majority_filter,
)
from ..utils.io import load_image, load_mask

try:
    import cv2

    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False


class Method1Segmenter(BaseSegmenter):
    name = "method_1"
    description = "Advanced classical segmentation with watershed or GrabCut"
    category = "classical_advanced_segmentation"

    def __init__(
        self,
        variant: str = "watershed",
        blur_sigma: float = 1.0,
        foreground_percentile: float = 80.0,
        background_percentile: float = 25.0,
        majority_window_size: int = 5,
        majority_threshold: float = 0.52,
        opening_size: int = 2,
        closing_size: int = 3,
        min_component_size: int = 96,
        grabcut_iterations: int = 5,
        watershed_foreground_candidates: list[float] | None = None,
        watershed_background_candidates: list[float] | None = None,
        grabcut_foreground_candidates: list[float] | None = None,
        grabcut_background_candidates: list[float] | None = None,
        majority_threshold_candidates: list[float] | None = None,
        grabcut_iteration_candidates: list[int] | None = None,
        random_state: int = 42,
    ) -> None:
        if variant not in {"watershed", "grabcut"}:
            raise ValueError("method_1 variant must be 'watershed' or 'grabcut'.")
        self.variant = variant
        self.blur_sigma = blur_sigma
        self.foreground_percentile = foreground_percentile
        self.background_percentile = background_percentile
        self.majority_window_size = majority_window_size
        self.majority_threshold = majority_threshold
        self.opening_size = opening_size
        self.closing_size = closing_size
        self.min_component_size = min_component_size
        self.grabcut_iterations = grabcut_iterations
        self.watershed_foreground_candidates = (
            watershed_foreground_candidates if watershed_foreground_candidates is not None else [75.0, 80.0, 85.0]
        )
        self.watershed_background_candidates = (
            watershed_background_candidates if watershed_background_candidates is not None else [15.0, 20.0, 25.0]
        )
        self.grabcut_foreground_candidates = (
            grabcut_foreground_candidates if grabcut_foreground_candidates is not None else [75.0, 80.0, 85.0]
        )
        self.grabcut_background_candidates = (
            grabcut_background_candidates if grabcut_background_candidates is not None else [10.0, 15.0, 20.0]
        )
        self.majority_threshold_candidates = (
            majority_threshold_candidates if majority_threshold_candidates is not None else [0.48, 0.5, 0.52]
        )
        self.grabcut_iteration_candidates = (
            grabcut_iteration_candidates if grabcut_iteration_candidates is not None else [3, 5, 7]
        )
        self.random_state = random_state
        self.selected_params: dict[str, float | int | str] = {
            "variant": self.variant,
            "foreground_percentile": self.foreground_percentile,
            "background_percentile": self.background_percentile,
            "majority_threshold": self.majority_threshold,
            "grabcut_iterations": self.grabcut_iterations,
        }
        self.validation_iou: float | None = None

    def fit(
        self,
        train_samples: Sequence[DatasetSample],
        validation_samples: Sequence[DatasetSample] | None = None,
    ) -> dict[str, Any]:
        del train_samples
        if validation_samples:
            self._tune_on_validation(validation_samples)
        return {
            "trained": False,
            "category": self.category,
            "variant": self.variant,
            "selected_params": self.selected_params,
            "validation_iou": self.validation_iou,
            "note": "This method is non-trainable and uses validation data only for parameter tuning.",
        }

    def segment(self, image: np.ndarray) -> SegmentationResult:
        if self.variant == "watershed":
            mask, metadata = self._segment_watershed(
                image=image,
                foreground_percentile=float(self.selected_params["foreground_percentile"]),
                background_percentile=float(self.selected_params["background_percentile"]),
                majority_threshold=float(self.selected_params["majority_threshold"]),
            )
        else:
            mask, metadata = self._segment_grabcut(
                image=image,
                foreground_percentile=float(self.selected_params["foreground_percentile"]),
                background_percentile=float(self.selected_params["background_percentile"]),
                majority_threshold=float(self.selected_params["majority_threshold"]),
                iterations=int(self.selected_params["grabcut_iterations"]),
            )
        self.validate_mask(mask, image)
        return SegmentationResult(
            mask=mask,
            metadata={
                "category": self.category,
                "placeholder": False,
                "variant": self.variant,
                "selected_params": self.selected_params,
                **metadata,
            },
        )

    def _tune_on_validation(self, validation_samples: Sequence[DatasetSample]) -> None:
        best_score = float("-inf")
        best_params = dict(self.selected_params)
        candidate_settings = self._candidate_settings()
        for params in candidate_settings:
            scores: list[float] = []
            for sample in validation_samples:
                image = load_image(sample.image_path)
                truth = load_mask(sample.mask_path)
                if self.variant == "watershed":
                    prediction, _ = self._segment_watershed(
                        image=image,
                        foreground_percentile=float(params["foreground_percentile"]),
                        background_percentile=float(params["background_percentile"]),
                        majority_threshold=float(params["majority_threshold"]),
                    )
                else:
                    prediction, _ = self._segment_grabcut(
                        image=image,
                        foreground_percentile=float(params["foreground_percentile"]),
                        background_percentile=float(params["background_percentile"]),
                        majority_threshold=float(params["majority_threshold"]),
                        iterations=int(params["grabcut_iterations"]),
                    )
                scores.append(self._binary_iou(prediction, truth))
            mean_score = float(np.mean(scores)) if scores else float("-inf")
            if mean_score > best_score:
                best_score = mean_score
                best_params = params
        self.selected_params = best_params
        self.validation_iou = None if best_score == float("-inf") else best_score

    def _candidate_settings(self) -> list[dict[str, float | int | str]]:
        if self.variant == "watershed":
            return [
                {
                    "variant": "watershed",
                    "foreground_percentile": fg,
                    "background_percentile": bg,
                    "majority_threshold": mt,
                    "grabcut_iterations": self.grabcut_iterations,
                }
                for fg, bg, mt in product(
                    self.watershed_foreground_candidates,
                    self.watershed_background_candidates,
                    self.majority_threshold_candidates,
                )
                if fg > bg
            ]

        return [
            {
                "variant": "grabcut",
                "foreground_percentile": fg,
                "background_percentile": bg,
                "majority_threshold": mt,
                "grabcut_iterations": iterations,
            }
            for fg, bg, mt, iterations in product(
                self.grabcut_foreground_candidates,
                self.grabcut_background_candidates,
                self.majority_threshold_candidates,
                self.grabcut_iteration_candidates,
            )
            if fg > bg
        ]

    def _segment_watershed(
        self,
        image: np.ndarray,
        foreground_percentile: float,
        background_percentile: float,
        majority_threshold: float,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        image_float = image.astype(np.float32) / 255.0
        hsv = rgb_to_hsv(image)
        grayscale = rgb_to_grayscale(image).astype(np.float32) / 255.0
        exg = compute_excess_green(image)
        exg_smooth = ndimage.gaussian_filter(exg, sigma=self.blur_sigma, mode="reflect")
        gradient = gradient_magnitude(grayscale)

        green_dominance = image_float[..., 1] - 0.5 * (image_float[..., 0] + image_float[..., 2])
        saturation = hsv[..., 1]
        # Composite vegetation score combining ExG, green dominance, saturation, and edge penalty.
        # Coefficients were tuned manually: ExG is the primary cue, gradient is subtracted
        # to suppress false seeds at object boundaries.
        vegetation_score = (
            1.7 * exg_smooth
            + 0.9 * green_dominance
            + 0.4 * saturation
            - 0.15 * gradient
        )
        normalized_score = self._normalize_map(vegetation_score)
        normalized_gradient = self._normalize_map(gradient)
        topography = 0.55 * normalized_gradient + 0.45 * (1.0 - normalized_score)
        topography_uint8 = np.clip(topography * 255.0, 0, 255).astype(np.uint8)

        foreground_seed, background_seed, fg_cutoff, bg_cutoff = self._build_seed_masks(
            normalized_score=normalized_score,
            saturation=saturation,
            foreground_percentile=foreground_percentile,
            background_percentile=background_percentile,
            foreground_saturation_floor=0.12,
            background_saturation_ceiling=0.08,
        )
        foreground_seed = ndimage.binary_opening(foreground_seed, structure=np.ones((3, 3), dtype=bool))
        background_seed = ndimage.binary_opening(background_seed, structure=np.ones((3, 3), dtype=bool))
        foreground_seed = ndimage.binary_dilation(foreground_seed, structure=np.ones((3, 3), dtype=bool))
        background_seed = ndimage.binary_dilation(background_seed, structure=np.ones((3, 3), dtype=bool))
        overlap = foreground_seed & background_seed
        if np.any(overlap):
            background_seed = background_seed & ~overlap

        # Watershed requires labelled seed markers: 1 = background, 2 = foreground.
        # Fallback to extreme percentiles if seeds are empty after morphological cleanup.
        markers = np.zeros(image.shape[:2], dtype=np.int32)
        markers[background_seed] = 1
        markers[foreground_seed] = 2
        if not np.any(markers == 1):
            markers[normalized_score <= np.percentile(normalized_score, 5.0)] = 1
        if not np.any(markers == 2):
            markers[normalized_score >= np.percentile(normalized_score, 95.0)] = 2

        watershed_labels = ndimage.watershed_ift(topography_uint8, markers)
        raw_mask = (watershed_labels == 2).astype(np.uint8)
        smoothed_mask = spatial_majority_filter(
            raw_mask,
            window_size=self.majority_window_size,
            threshold=majority_threshold,
        )
        mask = postprocess_binary_mask(
            smoothed_mask,
            opening_size=self.opening_size,
            closing_size=self.closing_size,
            min_component_size=self.min_component_size,
        )
        return mask, {
            "foreground_cutoff": fg_cutoff,
            "background_cutoff": bg_cutoff,
            "num_foreground_seed_pixels": int(foreground_seed.sum()),
            "num_background_seed_pixels": int(background_seed.sum()),
            "blur_sigma": self.blur_sigma,
        }

    def _segment_grabcut(
        self,
        image: np.ndarray,
        foreground_percentile: float,
        background_percentile: float,
        majority_threshold: float,
        iterations: int,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        if not CV2_AVAILABLE:
            raise ImportError("GrabCut variant requires OpenCV.")

        image_float = image.astype(np.float32) / 255.0
        hsv = rgb_to_hsv(image)
        exg = compute_excess_green(image)
        exg_smooth = ndimage.gaussian_filter(exg, sigma=self.blur_sigma, mode="reflect")
        saturation = hsv[..., 1]
        green_dominance = image_float[..., 1] - 0.5 * (image_float[..., 0] + image_float[..., 2])
        vegetation_score = 1.5 * exg_smooth + 0.9 * green_dominance + 0.35 * saturation
        normalized_score = self._normalize_map(vegetation_score)

        foreground_seed, background_seed, fg_cutoff, bg_cutoff = self._build_seed_masks(
            normalized_score=normalized_score,
            saturation=saturation,
            foreground_percentile=foreground_percentile,
            background_percentile=background_percentile,
            foreground_saturation_floor=0.1,
            background_saturation_ceiling=0.06,
        )

        mask = np.full(image.shape[:2], cv2.GC_PR_BGD, dtype=np.uint8)
        mask[background_seed] = cv2.GC_BGD
        mask[foreground_seed] = cv2.GC_FGD

        if not np.any(mask == cv2.GC_FGD):
            mask[normalized_score >= np.percentile(normalized_score, 90.0)] = cv2.GC_FGD
        if not np.any(mask == cv2.GC_BGD):
            mask[normalized_score <= np.percentile(normalized_score, 10.0)] = cv2.GC_BGD

        background_model = np.zeros((1, 65), np.float64)
        foreground_model = np.zeros((1, 65), np.float64)
        # Iterative graph-cut foreground/background separation — Rother et al. (2004)
        cv2.grabCut(
            image.astype(np.uint8),
            mask,
            None,
            background_model,
            foreground_model,
            iterations,
            cv2.GC_INIT_WITH_MASK,
        )
        raw_mask = np.isin(mask, [cv2.GC_FGD, cv2.GC_PR_FGD]).astype(np.uint8)
        smoothed_mask = spatial_majority_filter(
            raw_mask,
            window_size=self.majority_window_size,
            threshold=majority_threshold,
        )
        final_mask = postprocess_binary_mask(
            smoothed_mask,
            opening_size=self.opening_size,
            closing_size=self.closing_size,
            min_component_size=self.min_component_size,
        )
        return final_mask, {
            "foreground_cutoff": fg_cutoff,
            "background_cutoff": bg_cutoff,
            "num_foreground_seed_pixels": int(foreground_seed.sum()),
            "num_background_seed_pixels": int(background_seed.sum()),
            "grabcut_iterations": iterations,
            "blur_sigma": self.blur_sigma,
        }

    @staticmethod
    def _build_seed_masks(
        normalized_score: np.ndarray,
        saturation: np.ndarray,
        foreground_percentile: float,
        background_percentile: float,
        foreground_saturation_floor: float,
        background_saturation_ceiling: float,
    ) -> tuple[np.ndarray, np.ndarray, float, float]:
        foreground_cutoff = float(np.percentile(normalized_score, foreground_percentile))
        background_cutoff = float(np.percentile(normalized_score, background_percentile))
        foreground_seed = (normalized_score >= foreground_cutoff) & (saturation >= foreground_saturation_floor)
        background_seed = (normalized_score <= background_cutoff) | (saturation <= background_saturation_ceiling)
        overlap = foreground_seed & background_seed
        if np.any(overlap):
            background_seed = background_seed & ~overlap
        return foreground_seed, background_seed, foreground_cutoff, background_cutoff

    @staticmethod
    def _normalize_map(values: np.ndarray) -> np.ndarray:
        values = values.astype(np.float32)
        min_value = float(values.min())
        max_value = float(values.max())
        if max_value - min_value < 1e-6:
            return np.zeros_like(values, dtype=np.float32)
        return (values - min_value) / (max_value - min_value)

    @staticmethod
    def _binary_iou(pred_mask: np.ndarray, true_mask: np.ndarray) -> float:
        pred = np.asarray(pred_mask).astype(bool)
        true = np.asarray(true_mask).astype(bool)
        intersection = np.logical_and(pred, true).sum()
        union = np.logical_or(pred, true).sum()
        if union == 0:
            return 1.0
        return float(intersection / union)
