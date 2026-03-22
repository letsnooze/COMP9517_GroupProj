from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from .benchmark import run_dataset_benchmark
from .config import ExperimentConfig
from .run_management import generate_run_id
from .utils.io import load_json, save_json


def run_method_comparison(
    dataset_root: str | Path,
    output_dir: str | Path = "outputs/comparison",
    train_split: str = "train",
    validation_split: str = "validation",
    evaluation_split: str = "test",
    limit: int | None = None,
    method_overrides: dict[str, dict[str, Any]] | None = None,
) -> Path:
    output_root = Path(output_dir)
    overrides = method_overrides or {}
    method_names = ("method_1", "method_2", "method_3")
    comparison_run_id = generate_run_id("comparison")

    summaries: list[dict[str, Any]] = []
    for method_name in method_names:
        config = ExperimentConfig(
            method=method_name,
            dataset_root=Path(dataset_root),
            train_split=train_split,
            validation_split=validation_split,
            evaluation_split=evaluation_split,
            output_dir=output_root,
            run_name=comparison_run_id,
            limit=limit,
            method_params=overrides.get(method_name, {}),
        )
        result_dir = run_dataset_benchmark(config)
        summary_path = result_dir / "summary.json"
        summaries.append(
            {
                "method": method_name,
                "result_dir": str(result_dir),
                "summary_path": str(summary_path),
            }
        )

    comparison_root = output_root / "comparisons" / comparison_run_id
    comparison_root.mkdir(parents=True, exist_ok=True)
    manifest = {"comparison_run_id": comparison_run_id, "runs": summaries}
    save_json(comparison_root / "comparison_manifest.json", manifest)
    summarize_summary_files([entry["summary_path"] for entry in summaries], comparison_root)
    return comparison_root


def summarize_completed_runs(output_dir: str | Path) -> Path:
    output_root = Path(output_dir)
    summary_files: list[Path] = []
    for latest_path in sorted(output_root.glob("method_*/latest.json")):
        latest_payload = load_json(latest_path)
        result_dir = Path(latest_payload["result_dir"])
        summary_path = result_dir / "summary.json"
        if summary_path.exists():
            summary_files.append(summary_path)
    return summarize_summary_files(summary_files, output_root)


def summarize_summary_files(
    summary_files: list[str | Path],
    output_dir: str | Path,
) -> Path:
    output_root = Path(output_dir)
    rows: list[dict[str, Any]] = []
    for summary_file in summary_files:
        summary_path = Path(summary_file)
        summary = load_json(summary_path)
        metrics = summary["aggregate_metrics"]
        rows.append(
            {
                "method": summary["method"],
                "train_split": summary["train_split"],
                "validation_split": summary["validation_split"],
                "evaluation_split": summary["evaluation_split"],
                "precision": metrics["precision"],
                "recall": metrics["recall"],
                "f1_score": metrics["f1_score"],
                "iou": metrics["iou"],
                "pixel_accuracy": metrics["pixel_accuracy"],
                "training_seconds": summary["training_seconds"],
                "mean_inference_seconds": summary["mean_inference_seconds"],
                "summary_path": str(summary_path),
            }
        )

    rows.sort(key=lambda row: row["iou"], reverse=True)
    comparison_payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "ranking_metric": "iou",
        "runs": rows,
    }
    output_root.mkdir(parents=True, exist_ok=True)
    save_json(output_root / "comparison_summary.json", comparison_payload)
    (output_root / "comparison_summary.md").write_text(
        _render_markdown_table(rows),
        encoding="utf-8",
    )
    return output_root / "comparison_summary.json"


def _render_markdown_table(rows: list[dict[str, Any]]) -> str:
    lines = [
        "# Method Comparison",
        "",
        "| Rank | Method | Precision | Recall | F1 | IoU | Pixel Acc | Train Time (s) | Mean Inference (s) |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for index, row in enumerate(rows, start=1):
        lines.append(
            "| "
            + f"{index} | {row['method']} | "
            + f"{row['precision']:.4f} | {row['recall']:.4f} | {row['f1_score']:.4f} | "
            + f"{row['iou']:.4f} | {row['pixel_accuracy']:.4f} | "
            + f"{row['training_seconds']:.2f} | {row['mean_inference_seconds']:.4f} |"
        )
    if rows:
        best_row = rows[0]
        lines.extend(
            [
                "",
                f"Best IoU: `{best_row['method']}` with `{best_row['iou']:.4f}`.",
            ]
        )
    return "\n".join(lines) + "\n"
