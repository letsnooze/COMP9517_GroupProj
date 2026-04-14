from __future__ import annotations

from typing import Callable

import numpy as np
from scipy import ndimage


# ── Individual distortion functions ──────────────────────────────────────────

def apply_gaussian_noise(image: np.ndarray, sigma: float = 25.0) -> np.ndarray:
    """Add zero-mean Gaussian noise to an RGB image."""
    rng = np.random.default_rng(seed=0)
    noise = rng.normal(0.0, sigma, size=image.shape)
    return np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def apply_gaussian_blur(image: np.ndarray, sigma: float = 2.0) -> np.ndarray:
    """Apply Gaussian blur independently to each colour channel."""
    blurred = ndimage.gaussian_filter(
        image.astype(np.float32), sigma=(sigma, sigma, 0), mode="reflect"
    )
    return np.clip(blurred, 0, 255).astype(np.uint8)


def apply_brightness(image: np.ndarray, factor: float = 0.5) -> np.ndarray:
    """Scale pixel intensities by factor (< 1 darkens, > 1 brightens)."""
    return np.clip(image.astype(np.float32) * factor, 0, 255).astype(np.uint8)


def apply_contrast(image: np.ndarray, factor: float = 0.5) -> np.ndarray:
    """Scale contrast around the per-channel mean (< 1 reduces contrast)."""
    image_float = image.astype(np.float32)
    mean = image_float.mean(axis=(0, 1), keepdims=True)
    return np.clip((image_float - mean) * factor + mean, 0, 255).astype(np.uint8)


# ── Distortion registry ───────────────────────────────────────────────────────
# Each entry is (display_label, distort_fn).
# "clean" is always the baseline (identity transform).

DistortFn = Callable[[np.ndarray], np.ndarray]

DISTORTION_REGISTRY: dict[str, tuple[str, DistortFn]] = {
    "clean": (
        "Clean (no distortion)",
        lambda img: img.copy(),
    ),
    "noise_mild": (
        "Gaussian noise σ=15",
        lambda img: apply_gaussian_noise(img, sigma=15.0),
    ),
    "noise_strong": (
        "Gaussian noise σ=40",
        lambda img: apply_gaussian_noise(img, sigma=40.0),
    ),
    "blur_mild": (
        "Gaussian blur σ=1.5",
        lambda img: apply_gaussian_blur(img, sigma=1.5),
    ),
    "blur_strong": (
        "Gaussian blur σ=3.0",
        lambda img: apply_gaussian_blur(img, sigma=3.0),
    ),
    "dark_mild": (
        "Low brightness ×0.7",
        lambda img: apply_brightness(img, factor=0.7),
    ),
    "dark_strong": (
        "Low brightness ×0.4",
        lambda img: apply_brightness(img, factor=0.4),
    ),
    "lowcontrast_mild": (
        "Low contrast ×0.7",
        lambda img: apply_contrast(img, factor=0.7),
    ),
    "lowcontrast_strong": (
        "Low contrast ×0.4",
        lambda img: apply_contrast(img, factor=0.4),
    ),
}


def list_distortions() -> list[str]:
    """Return the names of all registered distortions."""
    return list(DISTORTION_REGISTRY.keys())


def get_distortion(name: str) -> DistortFn:
    """Return the distortion function for the given name."""
    if name not in DISTORTION_REGISTRY:
        available = ", ".join(DISTORTION_REGISTRY)
        raise ValueError(f"Unknown distortion '{name}'. Available: {available}")
    return DISTORTION_REGISTRY[name][1]


def get_label(name: str) -> str:
    """Return the human-readable label for the given distortion name."""
    return DISTORTION_REGISTRY[name][0]
