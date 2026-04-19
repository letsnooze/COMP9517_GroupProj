# COMP9517 Group Project — Wheat Crop Segmentation

Comparison of three segmentation methods on the EWS (Eschikon Wheat Segmentation) dataset.

---

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install --no-build-isolation -e .
```

Method 3 (U-Net) additionally requires PyTorch:

```bash
pip install -r requirements-dl.txt
```

---

## Dataset

Download the EWS dataset and place it under `data/ews/` with the following structure:

```
data/ews/
├── train/
├── validation/
└── test/
```

Each split folder should contain image files and their corresponding masks. Masks must share the same filename as the image with a `_mask` suffix (e.g. `image001.png` and `image001_mask.png`). Subdirectories `images/` and `masks/` are also supported.

Supported image formats: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tif`, `.tiff`

---

## Running the Methods

Activate the environment first:

```bash
source .venv/bin/activate
```

**Method 1 — Watershed (classical, no training required):**
```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_1_ews.json --run-name method1-watershed
```

**Method 1 — GrabCut variant:**
```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_1_grabcut_ews.json --run-name method1-grabcut
```

**Method 2 — Random Forest:**
```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_2_ews.json --run-name method2-rf
```

**Method 3 — U-Net:**
```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_3_ews.json --run-name method3-unet
```

For CPU-only environments:
```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_3_ews_cpu.json --run-name method3-unet-cpu
```

---

## Additional Experiments

**Robustness under image distortions (noise, blur, brightness, contrast):**
```bash
PYTHONPATH=src python scripts/run_robustness.py
```

**Training data efficiency (25%, 50%, 75%, 100% of training set):**
```bash
PYTHONPATH=src python scripts/run_data_reduction.py
```

---

## Output

Each run saves results to `outputs/<method>/runs/<run_id>/`, including:
- `summary.json` — overall metrics (IoU, F1, Precision, Recall, Pixel Accuracy, timing)
- `per_sample.csv` — per-image metrics
- `eval/` — predicted masks and overlay visualisations

---

## Project Structure

```
src/image_segmentation_framework/
├── algorithms/
│   ├── method_1.py       # Classical: ExG-guided Watershed / GrabCut
│   ├── method_2.py       # ML: handcrafted features + Random Forest
│   └── method_3.py       # DL: lightweight U-Net
├── evaluation/
│   └── metrics.py        # IoU, F1, Precision, Recall, Pixel Accuracy
└── utils/
    ├── image_ops.py      # Image processing and feature extraction
    └── distortions.py    # Distortion functions for robustness testing

configs/                  # JSON config files for each experiment
scripts/                  # Experiment runner scripts
tests/                    # Unit tests
```

---

## Running Tests

```bash
PYTHONPATH=src python -m unittest discover -s tests -v
```

---

## External Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| NumPy | ≥1.24 | Array operations |
| SciPy | ≥1.10 | Watershed algorithm, morphological operations |
| OpenCV (cv2) | ≥4.8 | GrabCut algorithm |
| scikit-learn | ≥1.3 | Random Forest classifier |
| PyTorch | ≥2.0 | U-Net training and inference |
| Pillow | ≥10.0 | Image I/O |

See `requirements.txt` and `requirements-dl.txt` for the full dependency list.
