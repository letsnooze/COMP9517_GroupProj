# COMP9517 Group Project — Wheat Crop Segmentation

This project implements and compares three segmentation methods on the
[EWS (Eschikon Wheat Segmentation)](https://www.research-collection.ethz.ch/entities/researchdata/165d22fc-6b0f-4fc3-a441-20d8bdc50a70)
dataset for COMP9517 Computer Vision, UNSW 2026 T1.

## Methods

| # | Name | Category | Description |
|---|------|----------|-------------|
| 1 | ExG-guided Watershed / GrabCut | Classical advanced segmentation | Vegetation score from ExG + HSV saturation; marker-based seeding; two variants (watershed, grabcut); validation grid-search for hyperparameters |
| 2 | Handcrafted Features + Random Forest | Machine learning | 28-D per-pixel features (RGB, HSV, ExG, local statistics, Sobel gradient); Random Forest classifier trained on the train split; probability threshold tuned on validation |
| 3 | U-Net | Deep learning | Lightweight encoder-decoder with skip connections; Dice + BCE loss; data augmentation (flips, brightness/contrast jitter, Gaussian noise); best epoch and threshold selected on validation |

## Requirements

- Python 3.10+
- For Methods 1 & 2: `requirements.txt`
- For Method 3 additionally: `requirements-dl.txt` (PyTorch)

## Installation

```bash
git clone <repo-url>
cd COMP9517_GroupProj

python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt
pip install --no-build-isolation -e .

# Only needed for Method 3 (U-Net):
pip install -r requirements-dl.txt
```

## Dataset Setup

Download the EWS dataset and place it under `data/ews/` with the following structure:

```
data/ews/
├── train/
│   ├── <image>.png
│   └── <image>_mask.png
├── validation/
│   ├── <image>.png
│   └── <image>_mask.png
└── test/
    ├── <image>.png
    └── <image>_mask.png
```

Flat layout (images and masks mixed in the same directory) is also supported.
Recognised mask suffixes: `_mask`, `_label`, `_labels`, `_annotation`, `_gt`.

## Running the Methods

Activate the virtual environment first:

```bash
source .venv/bin/activate
```

**Method 1 — Watershed:**

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_1_ews.json --run-name method1-watershed
```

**Method 1 — GrabCut:**

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_1_grabcut_ews.json --run-name method1-grabcut
```

**Method 2 — Random Forest:**

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_2_ews.json --run-name method2-rf
```

**Method 3 — U-Net (GPU):**

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_3_ews.json --run-name method3-unet
```

**Method 3 — U-Net (CPU only):**

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_3_ews_cpu.json --run-name method3-unet-cpu
```

**Override a config parameter on the command line:**

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_2_ews.json --set n_estimators=500
```

## Running Tests

```bash
PYTHONPATH=src python -m unittest discover -s tests -v
```

## Comparing All Methods

After running each method at least once, print a comparison table:

```bash
PYTHONPATH=src python -c "
from image_segmentation_framework.compare import summarize_completed_runs
import json
print(json.dumps(summarize_completed_runs('outputs'), indent=2))
"
```

## Output Structure

Each run produces an isolated output directory — previous runs are never overwritten:

```
outputs/
└── <method>/
    ├── latest.json              # pointer to the most recent run
    └── runs/
        └── <run_id>/
            ├── summary.json     # aggregate metrics + timing
            ├── per_sample.csv   # per-image metrics
            └── eval/
                ├── <name>_pred.png      # predicted mask
                └── <name>_overlay.png   # colour overlay on original image
```

Reported metrics: **Precision, Recall, F1-score, IoU** (per image and aggregated).
Training time and per-image inference time are also recorded in `summary.json`.

## Project Structure

```
COMP9517_GroupProj/
├── configs/                          # JSON config files for each method/variant
├── data/ews/                         # Dataset (not tracked by git)
├── docs/                             # Design notes (method_selection.md, etc.)
├── outputs/                          # Experiment results (not tracked by git)
├── scripts/                          # Utility scripts
├── src/image_segmentation_framework/
│   ├── algorithms/
│   │   ├── base.py                   # BaseSegmenter ABC + SegmentationResult
│   │   ├── factory.py                # Factory for instantiating segmenters
│   │   ├── method_1.py               # Watershed / GrabCut segmenter
│   │   ├── method_2.py               # Random Forest segmenter
│   │   └── method_3.py               # U-Net segmenter
│   ├── evaluation/metrics.py         # Precision, Recall, F1, IoU
│   ├── utils/
│   │   ├── image_ops.py              # Feature extraction, morphology, colour ops
│   │   └── io.py                     # Image / mask / JSON I/O
│   ├── visualization/plots.py        # Overlay and panel generation
│   ├── benchmark.py                  # Full dataset benchmark loop
│   ├── cli.py                        # Command-line entry point
│   ├── compare.py                    # Cross-method result aggregation
│   ├── config.py                     # ExperimentConfig dataclass
│   ├── dataset.py                    # EWSDataset loader
│   └── pipeline.py                   # Single-image and benchmark orchestration
├── tests/                            # Unit tests
├── README.md                         # Chinese documentation
├── README_EN.md                      # This file
└── pyproject.toml
```

## Adding a New Method

1. Create `src/image_segmentation_framework/algorithms/method_N.py` and subclass `BaseSegmenter`.
2. Register the new class in `algorithms/factory.py`.
3. Add a config file in `configs/`.
4. Run with the existing CLI command using `--config configs/method_N_ews.json`.

## External Libraries

| Library | Purpose |
|---------|---------|
| NumPy, SciPy | Array operations, morphology, watershed |
| scikit-learn | RandomForestClassifier |
| OpenCV (`cv2`) | GrabCut (optional; only Method 1 GrabCut variant) |
| PyTorch | U-Net training and inference (Method 3 only) |
| Pillow | Image loading / saving |
