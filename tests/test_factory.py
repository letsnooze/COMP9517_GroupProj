import unittest

from image_segmentation_framework.algorithms.factory import create_segmenter
from image_segmentation_framework.algorithms.method_1 import Method1Segmenter
from image_segmentation_framework.algorithms.method_2 import Method2Segmenter
from image_segmentation_framework.algorithms.method_3 import Method3Segmenter


class FactoryTests(unittest.TestCase):
    def test_method_1_can_be_created(self) -> None:
        self.assertIsInstance(create_segmenter("method_1"), Method1Segmenter)

    def test_method_2_can_be_created(self) -> None:
        self.assertIsInstance(create_segmenter("method_2"), Method2Segmenter)

    def test_method_3_can_be_created(self) -> None:
        self.assertIsInstance(create_segmenter("method_3"), Method3Segmenter)

    def test_unknown_method_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            create_segmenter("unknown")


if __name__ == "__main__":
    unittest.main()
