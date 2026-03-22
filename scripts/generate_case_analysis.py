from __future__ import annotations

import csv
from pathlib import Path

from image_segmentation_framework.utils.io import load_json

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUTS_ROOT = REPO_ROOT / "outputs"
REPORT_PATH = REPO_ROOT / "reports" / "case_analysis.md"


def load_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def format_case_row(row: dict[str, str], panel_path: Path) -> str:
    sample_id = row["sample_id"]
    iou = float(row["iou"])
    f1_score = float(row["f1_score"])
    precision = float(row["precision"])
    recall = float(row["recall"])
    display_path = (
        panel_path.relative_to(REPO_ROOT)
        if panel_path.is_absolute()
        else panel_path
    )
    return (
        f"- `{sample_id}`: IoU `{iou:.4f}`, F1 `{f1_score:.4f}`, precision `{precision:.4f}`, "
        f"recall `{recall:.4f}`. Panel: `{display_path}`"
    )


def build_report() -> str:
    lines = [
        "# Case Analysis",
        "",
        "This file lists representative high-IoU and low-IoU test samples for the latest run",
        "of each method.",
        "Use the linked panel paths when selecting figures for the final report and video.",
        "",
    ]

    latest_files = sorted(OUTPUTS_ROOT.glob("*/latest.json"))
    for latest_file in latest_files:
        latest_payload = load_json(latest_file)
        method_name = str(latest_payload["method"])
        result_dir = Path(latest_payload["result_dir"])
        csv_path = result_dir / "per_sample_metrics.csv"
        if not csv_path.exists():
            continue
        rows = load_rows(csv_path)
        if not rows:
            continue
        ranked = sorted(rows, key=lambda row: float(row["iou"]))
        worst_cases = ranked[:3]
        best_cases = ranked[-3:][::-1]

        lines.extend(
            [
                f"## {method_name}",
                "",
                "### Best cases",
                "",
            ]
        )
        lines.extend(
            format_case_row(row, result_dir / row["sample_id"] / "panel.png") for row in best_cases
        )
        lines.extend(
            [
                "",
                "### Worst cases",
                "",
            ]
        )
        lines.extend(
            format_case_row(row, result_dir / row["sample_id"] / "panel.png") for row in worst_cases
        )
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    REPORT_PATH.write_text(build_report())
    print(f"Wrote case analysis to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
