import unittest

import numpy as np

from image_segmentation_framework.evaluation.metrics import (
    f1_score,
    intersection_over_union,
    pixel_accuracy,
    precision_score,
    recall_score,
)


class MetricsTests(unittest.TestCase):
    def test_metrics_return_expected_scores(self) -> None:
        pred = np.array([[1, 0], [1, 0]], dtype=np.uint8)
        true = np.array([[1, 1], [0, 0]], dtype=np.uint8)

        self.assertAlmostEqual(precision_score(pred, true), 0.5)
        self.assertAlmostEqual(recall_score(pred, true), 0.5)
        self.assertAlmostEqual(f1_score(pred, true), 0.5)
        self.assertAlmostEqual(intersection_over_union(pred, true), 1 / 3)
        self.assertAlmostEqual(pixel_accuracy(pred, true), 0.5)


if __name__ == "__main__":
    unittest.main()
