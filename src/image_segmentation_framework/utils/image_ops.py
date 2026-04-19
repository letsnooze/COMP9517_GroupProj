from __future__ import annotations

import numpy as np
from scipy import ndimage


def rgb_to_grayscale(image: np.ndarray) -> np.ndarray:
    # ITU-R BT.601 luminance weights (0.299, 0.587, 0.114)
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected an RGB image with shape (H, W, 3).")
    return np.dot(image[..., :3], np.array([0.299, 0.587, 0.114], dtype=np.float32))


def gradient_magnitude(grayscale: np.ndarray) -> np.ndarray:
    # Sobel operator for edge detection — see Gonzalez & Woods, Digital Image Processing
    grayscale = grayscale.astype(np.float32)
    grad_x = ndimage.sobel(grayscale, axis=1, mode="reflect")
    grad_y = ndimage.sobel(grayscale, axis=0, mode="reflect")
    return np.sqrt(grad_x**2 + grad_y**2)


def compute_excess_green(image: np.ndarray) -> np.ndarray:
    # ExG = 2G - R - B, Woebbecke et al. (1995)
    image_float = image.astype(np.float32) / 255.0
    red = image_float[..., 0]
    green = image_float[..., 1]
    blue = image_float[..., 2]
    return 2.0 * green - red - blue


def compute_excess_red(image: np.ndarray) -> np.ndarray:
    image_float = image.astype(np.float32) / 255.0
    red = image_float[..., 0]
    green = image_float[..., 1]
    return 1.4 * red - green


def rgb_to_hsv(image: np.ndarray) -> np.ndarray:
    image_float = image.astype(np.float32) / 255.0
    red = image_float[..., 0]
    green = image_float[..., 1]
    blue = image_float[..., 2]

    maximum = np.max(image_float, axis=2)
    minimum = np.min(image_float, axis=2)
    delta = maximum - minimum

    hue = np.zeros_like(maximum)
    nonzero = delta > 1e-6
    red_mask = nonzero & (maximum == red)
    green_mask = nonzero & (maximum == green)
    blue_mask = nonzero & (maximum == blue)

    hue[red_mask] = np.mod((green[red_mask] - blue[red_mask]) / delta[red_mask], 6.0)
    hue[green_mask] = ((blue[green_mask] - red[green_mask]) / delta[green_mask]) + 2.0
    hue[blue_mask] = ((red[blue_mask] - green[blue_mask]) / delta[blue_mask]) + 4.0
    hue = hue / 6.0

    saturation = np.zeros_like(maximum)
    saturation[maximum > 1e-6] = delta[maximum > 1e-6] / maximum[maximum > 1e-6]
    value = maximum
    return np.stack([hue, saturation, value], axis=2)


def box_mean_rgb(image: np.ndarray, window_size: int) -> np.ndarray:
    if window_size < 1 or window_size % 2 == 0:
        raise ValueError("window_size must be a positive odd integer.")
    pad = window_size // 2
    padded = np.pad(image, ((pad, pad), (pad, pad), (0, 0)), mode="edge")
    cumulative = padded.cumsum(axis=0).cumsum(axis=1)
    cumulative = np.pad(cumulative, ((1, 0), (1, 0), (0, 0)), mode="constant")

    top_left = cumulative[:-window_size, :-window_size]
    top_right = cumulative[:-window_size, window_size:]
    bottom_left = cumulative[window_size:, :-window_size]
    bottom_right = cumulative[window_size:, window_size:]
    area = float(window_size * window_size)
    return (bottom_right - bottom_left - top_right + top_left) / area


def local_mean(image: np.ndarray, window_size: int) -> np.ndarray:
    if window_size < 1 or window_size % 2 == 0:
        raise ValueError("window_size must be a positive odd integer.")
    if image.ndim == 2:
        return ndimage.uniform_filter(image.astype(np.float32), size=window_size, mode="reflect")
    if image.ndim == 3:
        return ndimage.uniform_filter(
            image.astype(np.float32),
            size=(window_size, window_size, 1),
            mode="reflect",
        )
    raise ValueError("local_mean expects a 2D or 3D array.")


def local_variance(image: np.ndarray, window_size: int) -> np.ndarray:
    mean = local_mean(image, window_size)
    mean_square = local_mean(np.square(image.astype(np.float32)), window_size)
    return np.clip(mean_square - np.square(mean), a_min=0.0, a_max=None)


def extract_handcrafted_features(image: np.ndarray, window_size: int = 9) -> np.ndarray:
    # Builds a 26-dimensional feature vector per pixel combining raw colour (RGB, HSV,
    # chromaticity), vegetation indices (ExG, ExR, ExGR), local statistics (mean and
    # variance in a 9x9 window), and gradient features.
    image_float = image.astype(np.float32) / 255.0
    hsv = rgb_to_hsv(image)
    grayscale = rgb_to_grayscale(image).astype(np.float32) / 255.0
    exg = compute_excess_green(image)
    exr = compute_excess_red(image)
    exgr = exg - exr
    local_rgb_mean = local_mean(image_float, window_size)
    local_hsv_mean = local_mean(hsv, window_size)
    exg_mean = local_mean(exg, window_size)
    exg_variance = local_variance(exg, window_size)
    exgr_mean = local_mean(exgr, window_size)
    grayscale_mean = local_mean(grayscale, window_size)
    grayscale_variance = local_variance(grayscale, window_size)
    gradient = gradient_magnitude(grayscale)
    exg_gradient = gradient_magnitude(exg)

    rgb_sum = image_float.sum(axis=2, keepdims=True) + 1e-6
    chromaticity = image_float / rgb_sum

    return np.concatenate(
        [
            image_float,
            hsv,
            chromaticity,
            local_rgb_mean,
            local_hsv_mean,
            exg[..., None],
            exr[..., None],
            exgr[..., None],
            exg_mean[..., None],
            exg_variance[..., None],
            exgr_mean[..., None],
            grayscale[..., None],
            grayscale_mean[..., None],
            grayscale_variance[..., None],
            gradient[..., None],
            exg_gradient[..., None],
        ],
        axis=2,
    )


def spatial_majority_filter(mask: np.ndarray, window_size: int = 5, threshold: float = 0.5) -> np.ndarray:
    if window_size < 1 or window_size % 2 == 0:
        raise ValueError("window_size must be a positive odd integer.")
    neighborhood_mean = ndimage.uniform_filter(mask.astype(np.float32), size=window_size, mode="reflect")
    return (neighborhood_mean >= threshold).astype(np.uint8)


def binary_mask_iou(pred_mask: np.ndarray, true_mask: np.ndarray) -> float:
    pred = np.asarray(pred_mask).astype(bool)
    true = np.asarray(true_mask).astype(bool)
    intersection = np.logical_and(pred, true).sum()
    union = np.logical_or(pred, true).sum()
    if union == 0:
        return 1.0
    return float(intersection / union)


def postprocess_binary_mask(
    mask: np.ndarray,
    opening_size: int = 0,
    closing_size: int = 0,
    min_component_size: int = 0,
    fill_holes: bool = True,
) -> np.ndarray:
    binary = np.asarray(mask).astype(bool)

    if opening_size > 1:
        structure = np.ones((opening_size, opening_size), dtype=bool)
        binary = ndimage.binary_opening(binary, structure=structure)
    if closing_size > 1:
        structure = np.ones((closing_size, closing_size), dtype=bool)
        binary = ndimage.binary_closing(binary, structure=structure)
    if fill_holes:
        binary = ndimage.binary_fill_holes(binary)
    if min_component_size > 0:
        labeled, _ = ndimage.label(binary)
        counts = np.bincount(labeled.ravel())
        keep = counts >= min_component_size
        keep[0] = False
        binary = keep[labeled]
    return binary.astype(np.uint8)


def normalize_mask(mask: np.ndarray) -> np.ndarray:
    binary = (np.asarray(mask) > 0).astype(np.uint8)
    return binary * 255


def overlay_mask(image: np.ndarray, mask: np.ndarray, alpha: float = 0.35) -> np.ndarray:
    normalized_mask = (np.asarray(mask) > 0).astype(np.uint8)
    color_mask = np.zeros_like(image, dtype=np.uint8)
    color_mask[..., 0] = normalized_mask * 255
    blended = (1 - alpha) * image.astype(np.float32) + alpha * color_mask.astype(np.float32)
    return np.clip(blended, 0, 255).astype(np.uint8)
