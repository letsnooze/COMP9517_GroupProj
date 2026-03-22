# Final Method Selection

This document records the recommended three-method setup for the COMP9517 wheat
segmentation project.

## Why this combination

The assignment requires at least three methods that are meaningfully different and explicitly
states that thresholding does not count. The safest and most defensible structure is:

1. one classical computer vision baseline
2. one machine learning method using handcrafted features
3. one deep learning method

This gives a clean story for the report, stronger contrast in the results section, and a good
chance to discuss strengths, weaknesses, training cost, robustness, and failure cases.

## Selected methods

### Method 1

Name: ExG-enhanced K-means clustering with morphology

Purpose:
- serve as the classical non-learning baseline
- separate vegetation from soil using vegetation-sensitive color information

Planned ingredients:
- RGB channels
- Excess Green (ExG)
- K-means clustering into crop and soil
- morphological cleanup such as opening, closing, and small-component removal

Why it is a good choice:
- simple, interpretable, and fast
- clearly not just thresholding
- useful baseline against more advanced methods

## Method 2

Name: Handcrafted features plus Random Forest pixel classification

Purpose:
- represent the machine learning family
- use labeled train/validation data directly

Planned ingredients:
- pixel features such as RGB, ExG, local mean, local variance, and gradients
- Random Forest classifier
- optional probability smoothing or morphology as postprocessing

Why it is a good choice:
- stronger than a purely classical method
- still explainable in the report
- connects well to the reference paper keywords around machine learning and random forest

## Method 3

Name: U-Net segmentation with augmentation

Purpose:
- represent the deep learning family
- provide the strongest expected benchmark in the comparison

Planned ingredients:
- U-Net style encoder-decoder network
- train on the training split, tune on validation, report only final test performance
- augmentation such as flips, brightness changes, and mild blur/noise

Why it is a good choice:
- standard and credible segmentation baseline
- likely strongest quantitative method
- aligns well with the EWS paper's deep learning direction
- the codebase now includes a PyTorch implementation slot for it

## Practical implementation order

1. Finish Method 1 first so the full benchmark pipeline has a proper classical baseline.
2. Implement Method 2 next because it reuses the current feature-extraction structure.
3. Implement Method 3 last because it requires the most engineering and training setup.

## Current mapping in code

- `src/image_segmentation_framework/algorithms/method_1.py`
- `src/image_segmentation_framework/algorithms/method_2.py`
- `src/image_segmentation_framework/algorithms/method_3.py`

These files are now aligned with the intended final methods. The deep learning method still
requires a PyTorch environment before training can actually be run.
