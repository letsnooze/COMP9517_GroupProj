"""Core package for the COMP9517 wheat segmentation project scaffold."""

from .benchmark import run_dataset_benchmark
from .compare import run_method_comparison
from .config import ExperimentConfig
from .pipeline import run_experiment

__all__ = [
    "ExperimentConfig",
    "run_dataset_benchmark",
    "run_method_comparison",
    "run_experiment",
]
