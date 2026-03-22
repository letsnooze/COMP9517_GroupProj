from __future__ import annotations

from collections.abc import Sequence

import numpy as np
from sklearn.ensemble import RandomForestClassifier

from .base import BaseSegmenter, SegmentationResult
from ..dataset import DatasetSample
from ..utils.image_ops import (
    binary_mask_iou,
    extract_handcrafted_features,
    postprocess_binary_mask,
)
from ..utils.io import load_image, load_mask


class Method2Segmenter(BaseSegmenter):
    name = "method_2"
    description = "Handcrafted features with Random Forest pixel classification"
    category = "feature_based_learning"
    requires_training = True

    def __init__(
        self,
        n_estimators: int = 250,
        max_depth: int | None = 20,
        samples_per_image: int = 4000,
        feature_window_size: int = 9,
        threshold_candidates: list[float] | None = None,
        opening_size: int = 1,
        closing_size: int = 2,
        min_component_size: int = 96,
        random_state: int = 42,
    ) -> None:
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.samples_per_image = samples_per_image
        self.feature_window_size = feature_window_size
        self.threshold_candidates = (
            threshold_candidates
            if threshold_candidates is not None
            else [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65]
        )
        self.opening_size = opening_size
        self.closing_size = closing_size
        self.min_component_size = min_component_size
        self.random_state = random_state
        self.classifier: RandomForestClassifier | None = None
        self.probability_threshold: float = 0.5

    def fit(
        self,
        train_samples: Sequence[DatasetSample],
        validation_samples: Sequence[DatasetSample] | None = None,
    ) -> dict[str, object]:
        sampled_features: list[np.ndarray] = []
        sampled_labels: list[np.ndarray] = []
        rng = np.random.default_rng(self.random_state)

        for sample in train_samples:
            image = load_image(sample.image_path)
            mask = load_mask(sample.mask_path)
            features = self._extract_features(image)
            flat_features = features.reshape(-1, features.shape[-1])
            flat_mask = mask.reshape(-1).astype(bool)
            foreground_indices = np.flatnonzero(flat_mask)
            background_indices = np.flatnonzero(~flat_mask)
            if len(foreground_indices) == 0 or len(background_indices) == 0:
                continue

            per_class = max(1, self.samples_per_image // 2)
            sampled_fg = rng.choice(
                foreground_indices,
                size=min(per_class, len(foreground_indices)),
                replace=False,
            )
            sampled_bg = rng.choice(
                background_indices,
                size=min(per_class, len(background_indices)),
                replace=False,
            )
            selected_indices = np.concatenate([sampled_fg, sampled_bg])
            sampled_features.append(flat_features[selected_indices])
            sampled_labels.append(flat_mask[selected_indices].astype(np.uint8))

        if not sampled_features:
            raise ValueError("Method 2 could not extract any valid training pixels.")

        train_x = np.vstack(sampled_features)
        train_y = np.concatenate(sampled_labels)
        self.classifier = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            class_weight="balanced_subsample",
            n_jobs=-1,
            min_samples_leaf=2,
            random_state=self.random_state,
        )
        self.classifier.fit(train_x, train_y)
        validation_iou = None
        if validation_samples:
            validation_iou = self._tune_threshold(validation_samples)

        return {
            "trained": True,
            "category": self.category,
            "num_train_samples": len(train_samples),
            "pixels_used_for_training": int(train_x.shape[0]),
            "feature_dimension": int(train_x.shape[1]),
            "probability_threshold": self.probability_threshold,
            "validation_iou": validation_iou,
        }

    def segment(self, image: np.ndarray) -> SegmentationResult:
        if self.classifier is None:
            raise RuntimeError("Method 2 must be fitted before segmentation.")

        features = self._extract_features(image)
        flat_features = features.reshape(-1, features.shape[-1])
        probabilities = self.classifier.predict_proba(flat_features)[:, 1]
        probability_map = probabilities.reshape(image.shape[:2])
        raw_mask = (probability_map >= self.probability_threshold).astype(np.uint8)
        mask = postprocess_binary_mask(
            raw_mask,
            opening_size=self.opening_size,
            closing_size=self.closing_size,
            min_component_size=self.min_component_size,
        )
        self.validate_mask(mask, image)
        return SegmentationResult(
            mask=mask,
            metadata={
                "category": self.category,
                "placeholder": False,
                "probability_threshold": self.probability_threshold,
                "postprocessing": {
                    "opening_size": self.opening_size,
                    "closing_size": self.closing_size,
                    "min_component_size": self.min_component_size,
                },
            },
        )

    def _extract_features(self, image: np.ndarray) -> np.ndarray:
        return extract_handcrafted_features(image, window_size=self.feature_window_size)

    def _tune_threshold(self, validation_samples: Sequence[DatasetSample]) -> float:
        if self.classifier is None:
            raise RuntimeError("Method 2 classifier is not available for threshold tuning.")

        best_threshold = self.probability_threshold
        best_score = float("-inf")
        for threshold in self.threshold_candidates:
            scores: list[float] = []
            for sample in validation_samples:
                image = load_image(sample.image_path)
                ground_truth = load_mask(sample.mask_path)
                features = self._extract_features(image)
                flat_features = features.reshape(-1, features.shape[-1])
                probabilities = self.classifier.predict_proba(flat_features)[:, 1]
                raw_mask = (
                    probabilities.reshape(image.shape[:2]) >= float(threshold)
                ).astype(np.uint8)
                prediction = postprocess_binary_mask(
                    raw_mask,
                    opening_size=self.opening_size,
                    closing_size=self.closing_size,
                    min_component_size=self.min_component_size,
                )
                scores.append(binary_mask_iou(prediction, ground_truth))
            mean_score = float(np.mean(scores)) if scores else float("-inf")
            if mean_score > best_score:
                best_score = mean_score
                best_threshold = float(threshold)
        self.probability_threshold = best_threshold
        return best_score
