# Final Method Selection

This document records the three-method setup for the COMP9517 wheat segmentation project.

## Why this combination

The assignment requires at least three methods that are meaningfully different and explicitly
states that thresholding does not count. The chosen structure is:

1. one advanced classical computer vision method
2. one machine learning method using handcrafted features
3. one deep learning method

This gives clean contrast in the results section and a strong basis for discussing strengths,
weaknesses, training cost, robustness, and failure cases.

## Selected methods

### Method 1

Name: ExG-guided Watershed / GrabCut with vegetation scoring

Category: Advanced classical segmentation (Week 5 topic)

Purpose:
- serve as the classical non-learning baseline
- separate vegetation from soil using vegetation-sensitive color information and
  gradient-based topography

Implementation:
- Compute a vegetation score combining Excess Green (ExG), green dominance, and
  HSV saturation
- Build a topography map from the gradient magnitude and inverted vegetation score
- Extract high-confidence foreground and background seed pixels using percentile
  thresholds on the vegetation score
- Two variants supported via the `variant` parameter:
  - `watershed`: uses `scipy.ndimage.watershed_ift` with marker-based seeding
  - `grabcut`: uses OpenCV `grabCut` initialised from the same vegetation-score seeds
- Post-process with spatial majority filter, morphological opening/closing, and
  small-component removal
- Hyperparameters (foreground/background percentiles, majority threshold, GrabCut
  iterations) are tuned on the validation split via grid search; no training data is used

Why it is a good choice:
- genuinely different from thresholding: uses gradient topology and multi-cue seeds
- supports comparing two variants (watershed vs. GrabCut) within the same framework
- fast, interpretable, and a natural baseline for the ML and DL methods

### Method 2

Name: Handcrafted features with Random Forest pixel classification

Category: Machine learning-based method

Purpose:
- represent the machine learning family
- use labelled train/validation data directly through a learned pixel classifier

Implementation:
- Extract a 28-dimensional per-pixel feature vector: RGB, HSV, chromaticity, Excess
  Green, Excess Red, ExG-ExR index, local RGB/HSV means and variances, Sobel
  gradient, and ExG gradient (computed with configurable window size)
- Train a scikit-learn RandomForestClassifier on balanced pixel samples drawn from
  the training split
- Tune the decision probability threshold on the validation split to maximise IoU
- Post-process predictions with morphological opening/closing and small-component
  removal

Why it is a good choice:
- stronger than the classical method; still fully explainable
- directly comparable to Method 1 to illustrate the gain from supervised learning
- connects naturally to the report discussion of feature engineering

### Method 3

Name: U-Net semantic segmentation with data augmentation

Category: Deep learning-based method

Purpose:
- represent the deep learning family
- provide the strongest expected quantitative benchmark

Implementation:
- Lightweight U-Net encoder-decoder with skip connections (base channels
  configurable, default 16; three down/up blocks plus bottleneck)
- Combined Dice + BCE loss
- Training augmentation: horizontal/vertical flips, brightness and contrast jitter,
  Gaussian noise
- Adam optimiser with epoch-wise best-model checkpointing on validation IoU
- Probability threshold tuned on the validation split after training
- Auto-selects CUDA / MPS / CPU device

Why it is a good choice:
- standard, credible segmentation baseline aligned with the EWS paper
- expected to outperform Methods 1 and 2 quantitatively, making the comparison
  story clear
- augmentation strategy directly relevant to the report discussion on robustness

## Code mapping

| Method | File |
|--------|------|
| Method 1 | `src/image_segmentation_framework/algorithms/method_1.py` |
| Method 2 | `src/image_segmentation_framework/algorithms/method_2.py` |
| Method 3 | `src/image_segmentation_framework/algorithms/method_3.py` |

Configuration files are in `configs/`.
