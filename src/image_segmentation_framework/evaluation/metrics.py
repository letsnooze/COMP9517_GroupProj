from __future__ import annotations

import numpy as np


def _to_bool(mask: np.ndarray) -> np.ndarray:
    return np.asarray(mask).astype(bool)


def confusion_counts(pred_mask: np.ndarray, true_mask: np.ndarray) -> tuple[int, int, int, int]:
    pred = _to_bool(pred_mask)
    true = _to_bool(true_mask)
    if pred.shape != true.shape:
        raise ValueError("Prediction and ground-truth masks must share the same shape.")

    true_positive = int(np.logical_and(pred, true).sum())
    false_positive = int(np.logical_and(pred, np.logical_not(true)).sum())
    false_negative = int(np.logical_and(np.logical_not(pred), true).sum())
    true_negative = int(np.logical_and(np.logical_not(pred), np.logical_not(true)).sum())
    return true_positive, false_positive, false_negative, true_negative


def precision_score(pred_mask: np.ndarray, true_mask: np.ndarray) -> float:
    true_positive, false_positive, _, _ = confusion_counts(pred_mask, true_mask)
    denominator = true_positive + false_positive
    if denominator == 0:
        return 1.0
    return float(true_positive / denominator)


def recall_score(pred_mask: np.ndarray, true_mask: np.ndarray) -> float:
    true_positive, _, false_negative, _ = confusion_counts(pred_mask, true_mask)
    denominator = true_positive + false_negative
    if denominator == 0:
        return 1.0
    return float(true_positive / denominator)


def intersection_over_union(pred_mask: np.ndarray, true_mask: np.ndarray) -> float:
    true_positive, false_positive, false_negative, _ = confusion_counts(pred_mask, true_mask)
    union = true_positive + false_positive + false_negative
    if union == 0:
        return 1.0
    return float(true_positive / union)


def f1_score(pred_mask: np.ndarray, true_mask: np.ndarray) -> float:
    precision = precision_score(pred_mask, true_mask)
    recall = recall_score(pred_mask, true_mask)
    total = precision + recall
    if total == 0:
        return 1.0
    return float((2 * precision * recall) / total)


def pixel_accuracy(pred_mask: np.ndarray, true_mask: np.ndarray) -> float:
    true_positive, false_positive, false_negative, true_negative = confusion_counts(
        pred_mask, true_mask
    )
    total = true_positive + false_positive + false_negative + true_negative
    if total == 0:
        return 1.0
    return float((true_positive + true_negative) / total)


def summarize_binary_segmentation(pred_mask: np.ndarray, true_mask: np.ndarray) -> dict[str, float]:
    return {
        "precision": precision_score(pred_mask, true_mask),
        "recall": recall_score(pred_mask, true_mask),
        "f1_score": f1_score(pred_mask, true_mask),
        "iou": intersection_over_union(pred_mask, true_mask),
        "pixel_accuracy": pixel_accuracy(pred_mask, true_mask),
    }
