import shutil
import tempfile
import unittest
from pathlib import Path

import numpy as np

from image_segmentation_framework.algorithms.method_3 import TORCH_AVAILABLE
from image_segmentation_framework.config import ExperimentConfig
from image_segmentation_framework.pipeline import run_experiment
from image_segmentation_framework.utils.io import save_image, save_mask


class PipelineSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = Path(tempfile.mkdtemp(prefix="segmentation-framework-"))
        self.image_path = self.temp_dir / "synthetic.png"
        self.mask_path = self.temp_dir / "synthetic_mask.png"

        image = np.zeros((32, 32, 3), dtype=np.uint8)
        image[8:24, 8:24] = [255, 255, 255]
        mask = np.zeros((32, 32), dtype=np.uint8)
        mask[8:24, 8:24] = 1
        save_image(self.image_path, image)
        save_mask(self.mask_path, mask)

    def tearDown(self) -> None:
        shutil.rmtree(self.temp_dir)

    def test_single_image_run_produces_mask_metadata_and_metrics(self) -> None:
        output_dir = self.temp_dir / "single_outputs"
        config = ExperimentConfig(
            image_path=self.image_path,
            mask_path=self.mask_path,
            method="method_1",
            output_dir=output_dir,
            run_name="single-smoke",
        )
        result_dir = run_experiment(config)
        self.assertTrue((result_dir / "mask.png").exists())
        self.assertTrue((result_dir / "metadata.json").exists())
        self.assertTrue((result_dir / "overlay.png").exists())
        self.assertTrue((result_dir / "metrics.json").exists())
        self.assertTrue((result_dir / "panel.png").exists())
        self.assertTrue((output_dir / "method_1" / "latest.json").exists())
        self.assertTrue((result_dir.parent / "run_manifest.json").exists())
        self.assertEqual(result_dir.parent.parent.name, "runs")

    def test_dataset_benchmark_produces_summary_files(self) -> None:
        dataset_root = self.temp_dir / "ews"
        for split in ("train", "val", "test"):
            (dataset_root / split / "images").mkdir(parents=True, exist_ok=True)
            (dataset_root / split / "masks").mkdir(parents=True, exist_ok=True)

        for split_index, split in enumerate(("train", "val", "test")):
            for image_index in range(2):
                image = np.zeros((24, 24, 3), dtype=np.uint8)
                image[:, :, 1] = 40 + split_index * 20
                image[6:18, 6:18, 1] = 220
                image[6:18, 6:18, 0] = 20
                image[6:18, 6:18, 2] = 20

                mask = np.zeros((24, 24), dtype=np.uint8)
                mask[6:18, 6:18] = 1

                image_path = dataset_root / split / "images" / f"{split}_{image_index}.png"
                mask_path = dataset_root / split / "masks" / f"{split}_{image_index}_mask.png"
                save_image(image_path, image)
                save_mask(mask_path, mask)

        output_dir = self.temp_dir / "dataset_outputs"
        methods = ["method_1", "method_2"]
        if TORCH_AVAILABLE:
            methods.append("method_3")
        for method in methods:
            config = ExperimentConfig(
                method=method,
                dataset_root=dataset_root,
                output_dir=output_dir,
                run_name=f"{method}-smoke",
            )
            result_dir = run_experiment(config)
            self.assertTrue((result_dir / "summary.json").exists())
            self.assertTrue((result_dir / "per_sample_metrics.csv").exists())
            self.assertTrue((output_dir / method / "latest.json").exists())
            self.assertTrue((result_dir.parent / "run_manifest.json").exists())
            self.assertEqual(result_dir.parent.parent.name, "runs")


if __name__ == "__main__":
    unittest.main()
