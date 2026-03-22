from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def save_qualitative_panel(
    image: np.ndarray,
    prediction: np.ndarray,
    ground_truth: np.ndarray,
    overlay: np.ndarray,
    output_path: str | Path,
) -> None:
    figure, axes = plt.subplots(1, 4, figsize=(16, 4))
    axes[0].imshow(image)
    axes[0].set_title("Input")
    axes[1].imshow(prediction, cmap="gray")
    axes[1].set_title("Prediction")
    axes[2].imshow(ground_truth, cmap="gray")
    axes[2].set_title("Ground Truth")
    axes[3].imshow(overlay)
    axes[3].set_title("Overlay")
    for axis in axes:
        axis.axis("off")
    figure.tight_layout()
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(figure)
