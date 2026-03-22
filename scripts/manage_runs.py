from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from image_segmentation_framework.run_management import list_run_roots
from image_segmentation_framework.utils.io import load_json, save_json


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="List or delete experiment runs.")
    parser.add_argument(
        "action",
        choices=["list", "delete"],
        help="Whether to list runs or delete a specific run.",
    )
    parser.add_argument(
        "--outputs-root",
        type=Path,
        default=Path("outputs"),
        help="Root outputs directory that contains method folders.",
    )
    parser.add_argument(
        "--method",
        choices=["method_1", "method_2", "method_3"],
        required=True,
        help="Method directory to inspect.",
    )
    parser.add_argument("--run-id", help="Specific run id to delete.")
    parser.add_argument(
        "--latest",
        action="store_true",
        help="Delete the currently marked latest run for the method.",
    )
    return parser


def list_runs(outputs_root: Path, method: str) -> int:
    method_root = outputs_root / method
    run_roots = list_run_roots(method_root)
    latest_payload = None
    latest_path = method_root / "latest.json"
    if latest_path.exists():
        latest_payload = load_json(latest_path)

    if not run_roots:
        print(f"No runs found for {method} in {method_root}")
        return 0

    print(f"Runs for {method}:")
    for run_root in run_roots:
        marker = ""
        if latest_payload and latest_payload.get("run_id") == run_root.name:
            marker = " [latest]"
        print(f"- {run_root.name}{marker}")
    return 0


def delete_run(outputs_root: Path, method: str, run_id: str | None, latest: bool) -> int:
    method_root = outputs_root / method
    latest_path = method_root / "latest.json"

    if latest:
        if not latest_path.exists():
            raise FileNotFoundError(f"No latest.json found for {method}")
        latest_payload = load_json(latest_path)
        run_id = str(latest_payload["run_id"])

    if not run_id:
        raise ValueError("Provide --run-id or --latest when deleting a run.")

    run_root = method_root / "runs" / run_id
    if not run_root.exists():
        raise FileNotFoundError(f"Run does not exist: {run_root}")

    shutil.rmtree(run_root)
    print(f"Deleted run: {run_root}")

    if latest_path.exists():
        latest_payload = load_json(latest_path)
        if latest_payload.get("run_id") == run_id:
            latest_path.unlink()
            remaining_runs = list_run_roots(method_root)
            if remaining_runs:
                newest_run = remaining_runs[-1]
                manifest_path = newest_run / "run_manifest.json"
                if manifest_path.exists():
                    manifest = load_json(manifest_path)
                    save_json(
                        latest_path,
                        {
                            "run_id": manifest["run_id"],
                            "method": manifest["method"],
                            "run_name": manifest.get("run_name"),
                            "run_root": manifest["run_root"],
                            "result_dir": manifest["result_dir"],
                        },
                    )
    return 0


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.action == "list":
        return list_runs(args.outputs_root, args.method)
    return delete_run(args.outputs_root, args.method, args.run_id, args.latest)


if __name__ == "__main__":
    raise SystemExit(main())
