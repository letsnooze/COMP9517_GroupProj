from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from .config import ExperimentConfig
from .pipeline import run_experiment


def _coerce_scalar(value: str) -> Any:
    lowered = value.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered == "none" or lowered == "null":
        return None
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value


def _parse_set_arguments(pairs: list[str]) -> dict[str, Any]:
    parsed: dict[str, Any] = {}
    for pair in pairs:
        if "=" not in pair:
            raise ValueError(f"Expected key=value format, got: {pair}")
        key, value = pair.split("=", 1)
        parsed[key] = _coerce_scalar(value)
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run a COMP9517 wheat segmentation experiment."
    )
    parser.add_argument("--config", type=Path, help="Path to a JSON config file.")
    parser.add_argument("--image", type=Path, help="Path to an input image.")
    parser.add_argument("--mask", type=Path, help="Optional mask for single-image evaluation.")
    parser.add_argument("--dataset-root", type=Path, help="Root directory of the EWS dataset.")
    parser.add_argument(
        "--method",
        choices=["method_1", "method_2", "method_3"],
        help="Segmentation method to run.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("outputs/ews_benchmark"),
        help="Output directory for results.",
    )
    parser.add_argument(
        "--run-name",
        help="Optional label appended to the generated run id.",
    )
    parser.add_argument("--train-split", default="train", help="Training split name.")
    parser.add_argument("--val-split", default="validation", help="Validation split name.")
    parser.add_argument("--test-split", default="test", help="Evaluation split name.")
    parser.add_argument("--limit", type=int, help="Optional cap on number of evaluation samples.")
    parser.add_argument(
        "--no-overlay",
        action="store_true",
        help="Disable overlay image export.",
    )
    parser.add_argument(
        "--no-panel",
        action="store_true",
        help="Disable qualitative panel export.",
    )
    parser.add_argument(
        "--set",
        nargs="*",
        default=[],
        metavar="KEY=VALUE",
        help="Override method parameters from the CLI.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.config:
        config = ExperimentConfig.from_json(args.config)
    else:
        if not args.method:
            parser.error("Either provide --config or pass --method with dataset or image inputs.")
        config = ExperimentConfig(
            method=args.method,
            image_path=args.image,
            mask_path=args.mask,
            dataset_root=args.dataset_root,
            train_split=args.train_split,
            validation_split=args.val_split,
            evaluation_split=args.test_split,
            output_dir=args.output,
            run_name=args.run_name,
            save_overlay=not args.no_overlay,
            save_qualitative_panel=not args.no_panel,
            limit=args.limit,
        )

    overrides = _parse_set_arguments(args.set)
    if overrides:
        config.method_params.update(overrides)
    if args.no_overlay:
        config.save_overlay = False
    if args.no_panel:
        config.save_qualitative_panel = False
    if args.output != Path("outputs/ews_benchmark"):
        config.output_dir = args.output
    if args.run_name:
        config.run_name = args.run_name
    if args.image:
        config.image_path = args.image
    if args.mask:
        config.mask_path = args.mask
    if args.dataset_root:
        config.dataset_root = args.dataset_root
    if args.method:
        config.method = args.method
    if args.limit is not None:
        config.limit = args.limit
    if args.train_split:
        config.train_split = args.train_split
    if args.val_split:
        config.validation_split = args.val_split
    if args.test_split:
        config.evaluation_split = args.test_split

    result_dir = run_experiment(config)
    print(f"Results saved to: {result_dir}")


if __name__ == "__main__":
    main()
