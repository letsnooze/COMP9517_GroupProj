from __future__ import annotations

from collections.abc import Sequence
from copy import deepcopy
from typing import Any

import numpy as np

from .base import BaseSegmenter, SegmentationResult
from ..dataset import DatasetSample
from ..utils.image_ops import postprocess_binary_mask
from ..utils.io import load_image, load_mask

try:
    import torch
    import torch.nn.functional as functional
    from torch import nn
    from torch.utils.data import DataLoader, Dataset

    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    functional = None
    nn = None
    DataLoader = None
    Dataset = object
    TORCH_AVAILABLE = False


if TORCH_AVAILABLE:
    class _SegmentationDataset(Dataset):
        def __init__(self, samples: Sequence[DatasetSample], augment: bool = False) -> None:
            self.samples = list(samples)
            self.augment = augment

        def __len__(self) -> int:
            return len(self.samples)

        def __getitem__(self, index: int) -> tuple[Any, Any]:
            sample = self.samples[index]
            image = load_image(sample.image_path)
            mask = load_mask(sample.mask_path)
            if self.augment:
                image, mask = self._augment(image, mask)

            image_tensor = torch.from_numpy(image.astype(np.float32).transpose(2, 0, 1) / 255.0)
            mask_tensor = torch.from_numpy(mask.astype(np.float32)[None, ...])
            return image_tensor, mask_tensor

        def _augment(self, image: np.ndarray, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
            if np.random.rand() < 0.5:
                image = np.flip(image, axis=1).copy()
                mask = np.flip(mask, axis=1).copy()
            if np.random.rand() < 0.5:
                image = np.flip(image, axis=0).copy()
                mask = np.flip(mask, axis=0).copy()
            brightness = np.random.uniform(0.9, 1.1)
            contrast = np.random.uniform(0.9, 1.1)
            image_float = image.astype(np.float32)
            image_float = np.clip(image_float * brightness, 0, 255)
            channel_mean = image_float.mean(axis=(0, 1), keepdims=True)
            image_float = np.clip((image_float - channel_mean) * contrast + channel_mean, 0, 255)
            if np.random.rand() < 0.3:
                noise = np.random.normal(0, 3.0, size=image.shape)
                image_float = np.clip(image_float + noise, 0, 255)
            return image_float.astype(np.uint8), mask.astype(np.uint8)


    class _DoubleConv(nn.Module):
        def __init__(self, in_channels: int, out_channels: int) -> None:
            super().__init__()
            self.block = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
                nn.BatchNorm2d(out_channels),
                nn.ReLU(inplace=True),
                nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
                nn.BatchNorm2d(out_channels),
                nn.ReLU(inplace=True),
            )

        def forward(self, inputs: Any) -> Any:
            return self.block(inputs)


    class _DownBlock(nn.Module):
        def __init__(self, in_channels: int, out_channels: int) -> None:
            super().__init__()
            self.conv = _DoubleConv(in_channels, out_channels)
            self.pool = nn.MaxPool2d(kernel_size=2)

        def forward(self, inputs: Any) -> tuple[Any, Any]:
            features = self.conv(inputs)
            return features, self.pool(features)


    class _UpBlock(nn.Module):
        def __init__(self, in_channels: int, skip_channels: int, out_channels: int) -> None:
            super().__init__()
            self.up = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
            self.conv = _DoubleConv(in_channels + skip_channels, out_channels)

        def forward(self, inputs: Any, skip: Any) -> Any:
            upsampled = self.up(inputs)
            diff_y = skip.shape[2] - upsampled.shape[2]
            diff_x = skip.shape[3] - upsampled.shape[3]
            upsampled = functional.pad(
                upsampled,
                [diff_x // 2, diff_x - diff_x // 2, diff_y // 2, diff_y - diff_y // 2],
            )
            return self.conv(torch.cat([skip, upsampled], dim=1))


    class _UNet(nn.Module):
        def __init__(self, base_channels: int = 16) -> None:
            super().__init__()
            self.down1 = _DownBlock(3, base_channels)
            self.down2 = _DownBlock(base_channels, base_channels * 2)
            self.down3 = _DownBlock(base_channels * 2, base_channels * 4)
            self.bottleneck = _DoubleConv(base_channels * 4, base_channels * 8)
            self.up3 = _UpBlock(base_channels * 8, base_channels * 4, base_channels * 4)
            self.up2 = _UpBlock(base_channels * 4, base_channels * 2, base_channels * 2)
            self.up1 = _UpBlock(base_channels * 2, base_channels, base_channels)
            self.head = nn.Conv2d(base_channels, 1, kernel_size=1)

        def forward(self, inputs: Any) -> Any:
            skip1, pooled1 = self.down1(inputs)
            skip2, pooled2 = self.down2(pooled1)
            skip3, pooled3 = self.down3(pooled2)
            bottleneck = self.bottleneck(pooled3)
            decoded = self.up3(bottleneck, skip3)
            decoded = self.up2(decoded, skip2)
            decoded = self.up1(decoded, skip1)
            return self.head(decoded)


    class _DiceBCELoss(nn.Module):
        def __init__(self, smooth: float = 1.0) -> None:
            super().__init__()
            self.smooth = smooth
            self.bce = nn.BCEWithLogitsLoss()

        def forward(self, logits: Any, targets: Any) -> Any:
            bce_term = self.bce(logits, targets)
            probabilities = torch.sigmoid(logits)
            intersection = (probabilities * targets).sum(dim=(1, 2, 3))
            denominator = probabilities.sum(dim=(1, 2, 3)) + targets.sum(dim=(1, 2, 3))
            dice = (2.0 * intersection + self.smooth) / (denominator + self.smooth)
            dice_term = 1.0 - dice.mean()
            return bce_term + dice_term


class Method3Segmenter(BaseSegmenter):
    name = "method_3"
    description = "U-Net segmentation with augmentation"
    category = "deep_learning"
    requires_training = True

    def __init__(
        self,
        epochs: int = 20,
        batch_size: int = 4,
        learning_rate: float = 1e-3,
        base_channels: int = 16,
        augment: bool = True,
        threshold: float = 0.5,
        threshold_candidates: list[float] | None = None,
        opening_size: int = 1,
        closing_size: int = 2,
        min_component_size: int = 96,
        random_state: int = 42,
    ) -> None:
        self.epochs = epochs
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.base_channels = base_channels
        self.augment = augment
        self.threshold = threshold
        self.threshold_candidates = (
            threshold_candidates if threshold_candidates is not None else [0.4, 0.45, 0.5, 0.55, 0.6]
        )
        self.opening_size = opening_size
        self.closing_size = closing_size
        self.min_component_size = min_component_size
        self.random_state = random_state
        self.model: Any = None
        self.device: Any = None
        self.training_history: list[dict[str, float]] = []

    def fit(
        self,
        train_samples: Sequence[DatasetSample],
        validation_samples: Sequence[DatasetSample] | None = None,
    ) -> dict[str, object]:
        self._require_torch()
        torch.manual_seed(self.random_state)
        np.random.seed(self.random_state)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(self.random_state)

        self.device = self._resolve_device()
        self.model = _UNet(base_channels=self.base_channels).to(self.device)
        criterion = _DiceBCELoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=self.learning_rate)

        train_loader = DataLoader(
            _SegmentationDataset(train_samples, augment=self.augment),
            batch_size=self.batch_size,
            shuffle=True,
        )
        validation_loader = None
        if validation_samples:
            validation_loader = DataLoader(
                _SegmentationDataset(validation_samples, augment=False),
                batch_size=max(1, self.batch_size),
                shuffle=False,
            )

        best_iou = float("-inf")
        best_state: dict[str, Any] | None = None
        self.training_history = []
        for epoch in range(self.epochs):
            self.model.train()
            running_loss = 0.0
            for images, masks in train_loader:
                images = images.to(self.device)
                masks = masks.to(self.device)

                optimizer.zero_grad()
                logits = self.model(images)
                loss = criterion(logits, masks)
                loss.backward()
                optimizer.step()
                running_loss += float(loss.item()) * images.size(0)

            epoch_loss = running_loss / max(1, len(train_loader.dataset))
            epoch_record: dict[str, float] = {"train_loss": epoch_loss}
            if validation_loader is not None:
                validation_iou = self._evaluate_loader(validation_loader, apply_postprocessing=True)
                epoch_record["validation_iou"] = validation_iou
                if validation_iou > best_iou:
                    best_iou = validation_iou
                    best_state = deepcopy(
                        {name: value.detach().cpu() for name, value in self.model.state_dict().items()}
                    )
            self.training_history.append(epoch_record)

        if best_state is not None:
            self.model.load_state_dict(best_state)
        if validation_samples:
            best_iou = self._tune_threshold(validation_samples)

        return {
            "trained": True,
            "category": self.category,
            "epochs": self.epochs,
            "batch_size": self.batch_size,
            "learning_rate": self.learning_rate,
            "best_validation_iou": None if best_iou == float("-inf") else best_iou,
            "selected_threshold": self.threshold,
            "num_train_samples": len(train_samples),
        }

    def segment(self, image: np.ndarray) -> SegmentationResult:
        self._require_torch()
        if self.model is None or self.device is None:
            raise RuntimeError("Method 3 must be fitted before segmentation.")
        self.model.eval()
        image_tensor = torch.from_numpy(image.astype(np.float32).transpose(2, 0, 1) / 255.0)
        image_tensor = image_tensor.unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(image_tensor)
            probabilities = torch.sigmoid(logits).squeeze().detach().cpu().numpy()
        raw_mask = (probabilities >= self.threshold).astype(np.uint8)
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
                "threshold": self.threshold,
                "device": str(self.device),
                "epochs": self.epochs,
            },
        )

    def _evaluate_loader(self, loader: Any, apply_postprocessing: bool = False) -> float:
        if self.model is None or self.device is None:
            raise RuntimeError("Method 3 model is unavailable during validation.")

        self.model.eval()
        scores: list[float] = []
        with torch.no_grad():
            for images, masks in loader:
                images = images.to(self.device)
                masks = masks.to(self.device)
                logits = self.model(images)
                probabilities = torch.sigmoid(logits)
                if not apply_postprocessing:
                    predictions = (probabilities >= self.threshold).float()
                    intersection = (predictions * masks).sum(dim=(1, 2, 3))
                    union = ((predictions + masks) > 0).float().sum(dim=(1, 2, 3))
                    iou = torch.where(union > 0, intersection / union, torch.ones_like(union))
                    scores.extend(float(value.item()) for value in iou)
                    continue

                probabilities_np = probabilities.detach().cpu().numpy()
                masks_np = masks.detach().cpu().numpy()
                for probability_map, mask in zip(probabilities_np, masks_np, strict=False):
                    raw_mask = (probability_map.squeeze() >= self.threshold).astype(np.uint8)
                    prediction = postprocess_binary_mask(
                        raw_mask,
                        opening_size=self.opening_size,
                        closing_size=self.closing_size,
                        min_component_size=self.min_component_size,
                    )
                    truth = mask.squeeze().astype(np.uint8)
                    intersection = np.logical_and(prediction > 0, truth > 0).sum()
                    union = np.logical_or(prediction > 0, truth > 0).sum()
                    scores.append(1.0 if union == 0 else float(intersection / union))
        return float(np.mean(scores)) if scores else 0.0

    def _tune_threshold(self, validation_samples: Sequence[DatasetSample]) -> float:
        if self.model is None or self.device is None:
            raise RuntimeError("Method 3 model is unavailable for threshold tuning.")

        best_threshold = self.threshold
        best_score = float("-inf")
        self.model.eval()
        with torch.no_grad():
            for threshold in self.threshold_candidates:
                scores: list[float] = []
                for sample in validation_samples:
                    image = load_image(sample.image_path)
                    truth = load_mask(sample.mask_path)
                    image_tensor = torch.from_numpy(
                        image.astype(np.float32).transpose(2, 0, 1) / 255.0
                    ).unsqueeze(0).to(self.device)
                    logits = self.model(image_tensor)
                    probability_map = torch.sigmoid(logits).squeeze().detach().cpu().numpy()
                    raw_mask = (probability_map >= float(threshold)).astype(np.uint8)
                    prediction = postprocess_binary_mask(
                        raw_mask,
                        opening_size=self.opening_size,
                        closing_size=self.closing_size,
                        min_component_size=self.min_component_size,
                    )
                    intersection = np.logical_and(prediction > 0, truth > 0).sum()
                    union = np.logical_or(prediction > 0, truth > 0).sum()
                    scores.append(1.0 if union == 0 else float(intersection / union))
                mean_score = float(np.mean(scores)) if scores else float("-inf")
                if mean_score > best_score:
                    best_score = mean_score
                    best_threshold = float(threshold)
        self.threshold = best_threshold
        return best_score

    def _resolve_device(self) -> Any:
        if torch.cuda.is_available():
            return torch.device("cuda")
        if getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")

    def _require_torch(self) -> None:
        if not TORCH_AVAILABLE:
            raise ImportError(
                "Method 3 requires PyTorch. Install it with `pip install -r requirements-dl.txt` "
                "or `pip install -e \".[dl]\"` before training the U-Net model."
            )
