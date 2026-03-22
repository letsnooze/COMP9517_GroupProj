from __future__ import annotations

import csv
from statistics import mean
from time import perf_counter
from pathlib import Path
from typing import Any

from .algorithms.factory import create_segmenter
from .config import ExperimentConfig
from .dataset import EWSDataset
from .evaluation.metrics import summarize_binary_segmentation
from .run_management import (
    build_dataset_run_paths,
    generate_run_id,
    update_latest_pointer,
    write_run_manifest,
)
from .utils.image_ops import overlay_mask
from .utils.io import load_image, load_mask, save_image, save_json, save_mask
from .visualization.plots import save_qualitative_panel


def run_dataset_benchmark(config: ExperimentConfig) -> Path:
    if config.dataset_root is None:
        raise ValueError("Dataset benchmark requires 'dataset_root'.")

    dataset = EWSDataset(config.dataset_root)
    dataset.assert_disjoint_splits(
        config.train_split, config.validation_split, config.evaluation_split
    )

    train_samples = dataset.load_split(config.train_split)
    validation_samples = dataset.load_split(config.validation_split)
    evaluation_samples = dataset.load_split(config.evaluation_split, limit=config.limit)

    segmenter = create_segmenter(config.method, **config.method_params)
    run_id = generate_run_id(config.run_name)
    paths = build_dataset_run_paths(config, run_id)
    experiment_dir = paths.result_dir
    experiment_dir.mkdir(parents=True, exist_ok=True)

    train_start = perf_counter()
    fit_metadata = segmenter.fit(train_samples, validation_samples)
    training_seconds = perf_counter() - train_start

    rows: list[dict[str, Any]] = []
    for sample in evaluation_samples:
        image = load_image(sample.image_path)
        ground_truth = load_mask(sample.mask_path)

        inference_start = perf_counter()
        result = segmenter.segment(image)
        inference_seconds = perf_counter() - inference_start
        metrics = summarize_binary_segmentation(result.mask, ground_truth)

        sample_dir = experiment_dir / sample.sample_id
        sample_dir.mkdir(parents=True, exist_ok=True)
        save_mask(sample_dir / "prediction.png", result.mask)

        overlay = None
        if config.save_overlay:
            overlay = overlay_mask(image, result.mask)
            save_image(sample_dir / "overlay.png", overlay)

        if config.save_qualitative_panel and overlay is not None:
            save_qualitative_panel(
                image=image,
                prediction=result.mask,
                ground_truth=ground_truth,
                overlay=overlay,
                output_path=sample_dir / "panel.png",
            )

        sample_payload = {
            "sample_id": sample.sample_id,
            "split": sample.split,
            "image_path": str(sample.image_path),
            "mask_path": str(sample.mask_path),
            "inference_seconds": inference_seconds,
            **metrics,
        }
        rows.append(sample_payload)
        save_json(
            sample_dir / "metadata.json",
            {
                "method": config.method,
                "run_id": run_id,
                "run_name": config.run_name,
                "sample_id": sample.sample_id,
                "fit_metadata": fit_metadata,
                "inference_seconds": inference_seconds,
                "method_params": config.method_params,
                "prediction_metadata": result.metadata,
                "metrics": metrics,
            },
        )

    summary = {
        "run_id": run_id,
        "run_name": config.run_name,
        "method": config.method,
        "dataset_root": str(config.dataset_root),
        "train_split": config.train_split,
        "validation_split": config.validation_split,
        "evaluation_split": config.evaluation_split,
        "num_train_samples": len(train_samples),
        "num_validation_samples": len(validation_samples),
        "num_evaluation_samples": len(evaluation_samples),
        "training_seconds": training_seconds,
        "mean_inference_seconds": mean(row["inference_seconds"] for row in rows) if rows else 0.0,
        "aggregate_metrics": _aggregate_rows(rows),
        "fit_metadata": fit_metadata,
        "method_params": config.method_params,
    }
    save_json(experiment_dir / "summary.json", summary)
    _write_csv(experiment_dir / "per_sample_metrics.csv", rows)
    write_run_manifest(
        paths,
        config,
        run_id,
        experiment_type="dataset_benchmark",
        extra={
            "num_train_samples": len(train_samples),
            "num_validation_samples": len(validation_samples),
            "num_evaluation_samples": len(evaluation_samples),
            "summary_path": str(experiment_dir / "summary.json"),
        },
    )
    update_latest_pointer(paths, config, run_id)
    return experiment_dir


def _aggregate_rows(rows: list[dict[str, Any]]) -> dict[str, float]:
    metric_keys = (
        "precision",
        "recall",
        "f1_score",
        "iou",
        "pixel_accuracy",
    )
    if not rows:
        return {key: 0.0 for key in metric_keys}
    return {key: mean(float(row[key]) for row in rows) for key in metric_keys}


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
