from __future__ import annotations

from time import perf_counter
from pathlib import Path

from .algorithms.factory import create_segmenter
from .benchmark import run_dataset_benchmark
from .config import ExperimentConfig
from .evaluation.metrics import summarize_binary_segmentation
from .run_management import (
    build_single_image_run_paths,
    generate_run_id,
    update_latest_pointer,
    write_run_manifest,
)
from .utils.image_ops import overlay_mask
from .utils.io import load_image, load_mask, save_image, save_json, save_mask
from .visualization.plots import save_qualitative_panel


def run_experiment(config: ExperimentConfig) -> Path:
    if config.is_dataset_experiment:
        return run_dataset_benchmark(config)

    if config.image_path is None:
        raise ValueError("A single-image run requires 'image_path' to be provided.")

    image = load_image(config.image_path)
    segmenter = create_segmenter(config.method, **config.method_params)
    start = perf_counter()
    result = segmenter.segment(image)
    inference_seconds = perf_counter() - start

    image_stem = config.image_path.stem
    run_id = generate_run_id(config.run_name)
    paths = build_single_image_run_paths(config, run_id, image_stem)
    result_dir = paths.result_dir
    result_dir.mkdir(parents=True, exist_ok=True)

    mask_path = result_dir / "mask.png"
    metadata_path = result_dir / "metadata.json"

    save_mask(mask_path, result.mask)
    save_json(
        metadata_path,
        {
            "method": config.method,
            "run_id": run_id,
            "run_name": config.run_name,
            "image_path": str(config.image_path),
            "output_dir": str(result_dir),
            "inference_seconds": inference_seconds,
            "method_params": config.method_params,
            "metadata": result.metadata,
        },
    )

    if config.save_overlay:
        overlay = overlay_mask(image, result.mask)
        save_image(result_dir / "overlay.png", overlay)
    else:
        overlay = None

    if config.mask_path is not None:
        ground_truth = load_mask(config.mask_path)
        metrics = summarize_binary_segmentation(result.mask, ground_truth)
        save_json(result_dir / "metrics.json", metrics)
        if config.save_qualitative_panel and overlay is not None:
            save_qualitative_panel(
                image=image,
                prediction=result.mask,
                ground_truth=ground_truth,
                overlay=overlay,
                output_path=result_dir / "panel.png",
            )

    write_run_manifest(
        paths,
        config,
        run_id,
        experiment_type="single_image",
        extra={"inference_seconds": inference_seconds},
    )
    update_latest_pointer(paths, config, run_id)
    return result_dir
