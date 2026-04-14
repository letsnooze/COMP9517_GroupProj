"""
Training data reduction experiment: evaluate how Methods 2 and 3 perform when
trained on progressively smaller subsets of the training data.

Usage:
    PYTHONPATH=src python scripts/run_data_reduction.py

Trains Method 2 (Random Forest) and Method 3 (U-Net) at four data fractions
(25 %, 50 %, 75 %, 100 %) and reports test-set IoU for each.
Method 1 is included as a flat baseline (it does not use training data).
Results are saved to outputs/data_reduction/.
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from statistics import mean
from time import perf_counter

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from image_segmentation_framework.algorithms.factory import create_segmenter
from image_segmentation_framework.config import ExperimentConfig
from image_segmentation_framework.dataset import EWSDataset
from image_segmentation_framework.evaluation.metrics import summarize_binary_segmentation
from image_segmentation_framework.utils.io import load_image, load_mask, save_json


# ── Config paths ──────────────────────────────────────────────────────────────

METHOD_CONFIGS: dict[str, str] = {
    "method_1": "configs/method_1_ews.json",
    "method_2": "configs/method_2_ews.json",
    "method_3": "configs/method_3_ews.json",
}

# Fractions of training data to try
FRACTIONS = [0.25, 0.50, 0.75, 1.00]


# ── Core logic ────────────────────────────────────────────────────────────────

def evaluate_at_fraction(
    config: ExperimentConfig,
    train_samples: list,
    val_samples: list,
    test_samples: list,
    fraction: float,
    rng_seed: int = 42,
) -> dict:
    """
    Train the segmenter on a random subset of train_samples (size = fraction *
    total) and evaluate on the full test set.  Returns a metrics dict.
    """
    import numpy as np
    rng  = np.random.default_rng(rng_seed)
    n    = max(1, int(len(train_samples) * fraction))
    idxs = rng.choice(len(train_samples), size=n, replace=False)
    subset = [train_samples[i] for i in sorted(idxs)]

    print(
        f"    fraction={fraction:.0%}  n_train={n:>3} …",
        end="  ", flush=True,
    )

    segmenter = create_segmenter(config.method, **config.method_params)

    t0 = perf_counter()
    segmenter.fit(subset, val_samples)
    train_time = perf_counter() - t0

    sample_metrics: list[dict] = []
    infer_times: list[float] = []
    for sample in test_samples:
        image = load_image(sample.image_path)
        gt    = load_mask(sample.mask_path)
        t1    = perf_counter()
        result = segmenter.segment(image)
        infer_times.append(perf_counter() - t1)
        sample_metrics.append(summarize_binary_segmentation(result.mask, gt))

    avg = {
        key: mean(m[key] for m in sample_metrics)
        for key in sample_metrics[0]
    }
    iou = avg["iou"]
    print(f"IoU={iou:.4f}  train={train_time:.1f}s", flush=True)

    return {
        "fraction":              fraction,
        "n_train":               n,
        "train_seconds":         train_time,
        "mean_inference_seconds": mean(infer_times),
        **avg,
    }


def run_data_reduction_for_method(config_path: str) -> list[dict]:
    config = ExperimentConfig.from_json(config_path)

    dataset = EWSDataset(config.dataset_root)
    dataset.assert_disjoint_splits(
        config.train_split, config.validation_split, config.evaluation_split
    )

    train_samples = dataset.load_split(config.train_split)
    val_samples   = dataset.load_split(config.validation_split)
    test_samples  = dataset.load_split(config.evaluation_split)

    rows: list[dict] = []
    for fraction in FRACTIONS:
        row = evaluate_at_fraction(
            config, train_samples, val_samples, test_samples, fraction
        )
        rows.append(row)
    return rows


# ── Pretty printer ────────────────────────────────────────────────────────────

def print_table(method: str, rows: list[dict]) -> None:
    print(f"\n{'─'*56}")
    print(f"  {method}")
    print(f"{'─'*56}")
    print(f"  {'Fraction':>8}  {'N train':>7}  {'IoU':>6}  {'F1':>6}  {'Train(s)':>8}")
    print(f"  {'─'*8}  {'─'*7}  {'─'*6}  {'─'*6}  {'─'*8}")
    for r in rows:
        print(
            f"  {r['fraction']:>8.0%}  {r['n_train']:>7}  "
            f"{r['iou']:>6.3f}  {r['f1_score']:>6.3f}  {r['train_seconds']:>8.1f}"
        )
    print(f"{'─'*56}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Training data reduction experiment."
    )
    parser.add_argument(
        "--methods",
        nargs="+",
        # Method 1 uses no training data so it is always a flat baseline;
        # include it so the table shows its constant IoU for reference.
        choices=list(METHOD_CONFIGS.keys()),
        default=list(METHOD_CONFIGS.keys()),
        help="Methods to evaluate (default: all three).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("outputs/data_reduction"),
        help="Root directory for data-reduction results.",
    )
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    all_results: dict[str, list[dict]] = {}

    for method in args.methods:
        config_path = METHOD_CONFIGS[method]
        print(f"\n{'='*56}")
        print(f"  Method: {method}")
        print(f"{'='*56}")

        rows = run_data_reduction_for_method(config_path)
        all_results[method] = rows

        print_table(method, rows)

        # Save per-method CSV
        method_dir = args.output_dir / method
        method_dir.mkdir(parents=True, exist_ok=True)
        csv_path = method_dir / "data_reduction_results.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

        save_json(
            method_dir / "data_reduction_results.json",
            {"method": method, "results": rows},
        )

    # Combined IoU summary table
    print(f"\n{'='*56}")
    print("  Combined IoU by training fraction")
    print(f"{'='*56}")
    methods = list(all_results.keys())
    header = f"  {'Fraction':>8}" + "".join(f"  {m[-8:]:>12}" for m in methods)
    print(header)
    print("  " + "─" * (len(header) - 2))
    for i, fraction in enumerate(FRACTIONS):
        row = f"  {fraction:>8.0%}"
        for method in methods:
            iou = all_results[method][i]["iou"]
            row += f"  {iou:>12.3f}"
        print(row)
    print(f"{'='*56}")

    # Save combined summary
    summary: dict = {}
    for method, rows in all_results.items():
        summary[method] = [
            {"fraction": r["fraction"], "n_train": r["n_train"], "iou": r["iou"],
             "f1_score": r["f1_score"], "train_seconds": r["train_seconds"]}
            for r in rows
        ]
    save_json(args.output_dir / "summary.json", summary)
    print(f"\nResults saved to: {args.output_dir}")


if __name__ == "__main__":
    main()
