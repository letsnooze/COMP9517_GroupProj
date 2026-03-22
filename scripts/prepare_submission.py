from __future__ import annotations

from pathlib import Path
from shutil import copy2, copytree, make_archive, rmtree


REPO_ROOT = Path(__file__).resolve().parents[1]
SUBMISSION_ROOT = REPO_ROOT / "submission"
CODE_BUNDLE_DIR = SUBMISSION_ROOT / "code_bundle"
ZIP_BASENAME = SUBMISSION_ROOT / "comp9517_code_submission"

FILES_TO_COPY = [
    ".gitignore",
    "Makefile",
    "README.md",
    "pyproject.toml",
    "requirements.txt",
    "requirements-dl.txt",
]

DIRS_TO_COPY = [
    "configs",
    "docs",
    "reports",
    "scripts",
    "src",
    "tests",
]


def _copy_path(relative_path: str) -> None:
    source = REPO_ROOT / relative_path
    destination = CODE_BUNDLE_DIR / relative_path
    if source.is_dir():
        copytree(source, destination, dirs_exist_ok=True)
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        copy2(source, destination)


def build_submission_bundle() -> Path:
    SUBMISSION_ROOT.mkdir(exist_ok=True)
    if CODE_BUNDLE_DIR.exists():
        rmtree(CODE_BUNDLE_DIR)
    CODE_BUNDLE_DIR.mkdir(parents=True, exist_ok=True)

    for relative_path in FILES_TO_COPY:
        _copy_path(relative_path)
    for relative_path in DIRS_TO_COPY:
        _copy_path(relative_path)

    zip_path = Path(make_archive(str(ZIP_BASENAME), "zip", root_dir=CODE_BUNDLE_DIR))
    return zip_path


def main() -> None:
    zip_path = build_submission_bundle()
    print(f"Created code bundle at: {CODE_BUNDLE_DIR}")
    print(f"Created ZIP archive at: {zip_path}")


if __name__ == "__main__":
    main()
