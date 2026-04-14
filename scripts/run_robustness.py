"""
Robustness benchmark: train each method once on clean data, then evaluate on
clean and distorted versions of the test set.

Usage:
    PYTHONPATH=src python scripts/run_robustness.py --methods method_1 method_2 method_3

Each method is trained once; inference is repeated for every distortion type.
Results are saved to outputs/robustness/<method>/robustness_results.json and
a combined summary to outputs/robustness/summary.json.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from statistics import mean
from time import perf_counter

# Allow running from the project root with PYTHONPATH=src
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from image_segmentation_framework.algorithms.factory import create_segmenter
from image_segmentation_framework.config import ExperimentConfig
from image_segmentation_framework.dataset import EWSDataset
from image_segmentation_framework.evaluation.metrics import summarize_binary_segmentation
from image_segmentation_framework.utils.distortions import DISTORTION_REGISTRY, get_label
from image_segmentation_framework.utils.io import load_image, load_mask, save_json


# ── Config paths for each method ─────────────────────────────────────────────

METHOD_CONFIGS: dict[str, str] = {
    "method_1": "configs/method_1_ews.json",
    "method_2": "configs/method_2_ews.json",
    "method_3": "configs/method_3_ews.json",
}


# ── Core benchmark ────────────────────────────────────────────────────────────

def run_robustness_for_method(config_path: str) -> dict:
    """
    Train the segmenter once on clean training data, then evaluate on the test
    set under every registered distortion.  Returns a dict mapping distortion
    name -> averaged metrics dict.
    """
    config = ExperimentConfig.from_json(config_path)

    dataset = EWSDataset(config.dataset_root)
    dataset.assert_disjoint_splits(
        config.train_split, config.validation_split, config.evaluation_split
    )

    train_samples = dataset.load_split(config.train_split)
    val_samples   = dataset.load_split(config.validation_split)
    test_samples  = dataset.load_split(config.evaluation_split)

    print(f"  Training on {len(train_samples)} samples …", flush=True)
    segmenter = create_segmenter(config.method, **config.method_params)

    t0 = perf_counter()
    fit_meta = segmenter.fit(train_samples, val_samples)
    train_time = perf_counter() - t0
    print(f"  Training done in {train_time:.1f}s", flush=True)

    distortion_results: dict[str, dict] = {}

    for dist_name, (dist_label, dist_fn) in DISTORTION_REGISTRY.items():
        print(f"  Evaluating distortion: {dist_label} …", flush=True)
        sample_metrics: list[dict] = []

        for sample in test_samples:
            image = load_image(sample.image_path)
            gt    = load_mask(sample.mask_path)

            distorted = dist_fn(image)
            result    = segmenter.segment(distorted)
            metrics   = summarize_binary_segmentation(result.mask, gt)
            sample_metrics.append(metrics)

        avg = {
            key: mean(m[key] for m in sample_metrics)
            for key in sample_metrics[0]
        }
        distortion_results[dist_name] = {
            "label":          dist_label,
            "avg_iou":        avg["iou"],
            "avg_f1":         avg["f1_score"],
            "avg_precision":  avg["precision"],
            "avg_recall":     avg["recall"],
            "avg_pixel_acc":  avg["pixel_accuracy"],
        }

    return {
        "method":       config.method,
        "config_path":  config_path,
        "train_seconds": train_time,
        "fit_metadata": fit_meta,
        "distortions":  distortion_results,
    }


# ── Pretty printer ────────────────────────────────────────────────────────────

def print_table(method: str, distortions: dict) -> None:
    clean_iou = distortions["clean"]["avg_iou"]
    print(f"\n{'─'*62}")
    print(f"  {method}")
    print(f"{'─'*62}")
    print(f"  {'Distortion':<30}  {'IoU':>6}  {'ΔIoU':>7}  {'F1':>6}")
    print(f"  {'─'*28}  {'─'*6}  {'─'*7}  {'─'*6}")
    for name, vals in distortions.items():
        delta = vals["avg_iou"] - clean_iou
        sign  = "+" if delta >= 0 else ""
        print(
            f"  {vals['label']:<30}  {vals['avg_iou']:>6.3f}"
            f"  {sign}{delta:>6.3f}  {vals['avg_f1']:>6.3f}"
        )
    print(f"{'─'*62}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Robustness benchmark for all methods.")
    parser.add_argument(
        "--methods",
        nargs="+",
        choices=list(METHOD_CONFIGS.keys()),
        default=list(METHOD_CONFIGS.keys()),
        help="Which methods to evaluate (default: all three).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("outputs/robustness"),
        help="Root directory for robustness results.",
    )
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    all_results: dict[str, dict] = {}

    for method in args.methods:
        config_path = METHOD_CONFIGS[method]
        print(f"\n{'='*62}")
        print(f"  Method: {method}")
        print(f"{'='*62}")

        result = run_robustness_for_method(config_path)
        all_results[method] = result

        # Save per-method JSON
        method_dir = args.output_dir / method
        method_dir.mkdir(parents=True, exist_ok=True)
        save_json(method_dir / "robustness_results.json", result)

        # Save per-method CSV
        csv_path = method_dir / "robustness_results.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=["distortion", "label", "avg_iou", "avg_f1",
                            "avg_precision", "avg_recall", "avg_pixel_acc"],
            )
            writer.writeheader()
            for dist_name, vals in result["distortions"].items():
                writer.writerow({"distortion": dist_name, **vals})

        print_table(method, result["distortions"])

    # Combined summary: method x distortion IoU table
    summary: dict = {}
    for method, res in all_results.items():
        summary[method] = {
            d: v["avg_iou"] for d, v in res["distortions"].items()
        }
    save_json(args.output_dir / "summary.json", summary)

    # Print combined IoU table
    methods  = list(all_results.keys())
    dist_names = list(DISTORTION_REGISTRY.keys())
    col = 22
    print(f"\n{'='*62}")
    print("  Combined IoU table")
    print(f"{'='*62}")
    header = f"  {'Distortion':<28}" + "".join(f"  {m[-8:]:>10}" for m in methods)
    print(header)
    print("  " + "─" * (len(header) - 2))
    for d in dist_names:
        label = get_label(d)[:26]
        row   = f"  {label:<28}"
        for m in methods:
            iou = all_results[m]["distortions"][d]["avg_iou"]
            row += f"  {iou:>10.3f}"
        print(row)
    print(f"{'='*62}")
    print(f"\nResults saved to: {args.output_dir}")


if __name__ == "__main__":
    main()
