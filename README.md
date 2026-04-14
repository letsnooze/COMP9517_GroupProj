# COMP9517 项目说明

- GitHub 代码下载下来之后，数据集怎么放
- 怎么把项目跑起来
- 如果想修改方法，应该改哪里

## 1. 先做什么

先把仓库 clone 下来，然后进入项目目录：

```bash
cd "/你的路径/COMP9517_GroupProj"
```

建议创建虚拟环境并安装依赖：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install --no-build-isolation -e .
```

如果你需要跑深度学习方法（Method 3），额外安装：

```bash
pip install -r requirements-dl.txt
```

## 2. 数据集怎么放

这个项目默认使用 EWS 数据集，数据根目录是：

```text
data/ews/
```

推荐目录结构：

```text
data/ews/
├── train/
├── validation/
└── test/
```

每个 split 里面，图片和 mask 可以直接混放，例如：

```text
data/ews/train/
├── FPWW0180049_RGB1_20170308_113954_6.png
├── FPWW0180049_RGB1_20170308_113954_6_mask.png
├── FPWW0180049_RGB1_20170315_102908_6.png
└── FPWW0180049_RGB1_20170315_102908_6_mask.png
```

也可以分成 `images/` 和 `masks/` 子目录。

### 命名要求

原图和 mask 必须能一一对应。推荐命名方式：

```text
sample.png
sample_mask.png
```

当前代码支持的 mask 后缀：`_mask`、`_label`、`_labels`、`_annotation`、`_gt`

支持的图片格式：`.png`、`.jpg`、`.jpeg`、`.bmp`、`.tif`、`.tiff`

split 目录名建议直接用：`train`、`validation`、`test`

## 3. 怎么确认数据放对了

只要目录结构对、文件名能配对，这个项目就能自动读取。

## 4. 怎么运行代码

先激活环境：

```bash
source .venv/bin/activate
```

### 跑方法 1（Watershed / GrabCut）

Watershed 变体：

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_1_ews.json --run-name method1-watershed
```

GrabCut 变体：

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_1_grabcut_ews.json --run-name method1-grabcut
```

### 跑方法 2（Random Forest）

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_2_ews.json --run-name method2-rf
```

### 跑方法 3（U-Net）

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_3_ews.json --run-name method3-unet
```

CPU-only 环境用：

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli \
  --config configs/method_3_ews_cpu.json --run-name method3-unet-cpu
```

### 跑单元测试

```bash
PYTHONPATH=src python -m unittest discover -s tests -v
```

### 汇总所有方法的结果

```bash
PYTHONPATH=src python -c "
from image_segmentation_framework.compare import summarize_completed_runs
import json
print(json.dumps(summarize_completed_runs('outputs'), indent=2))
"
```

## 5. 三个方法分别是什么

| 方法 | 文件 | 类型 | 简介 |
|------|------|------|------|
| Method 1 | `algorithms/method_1.py` | 经典高级分割 | 基于 ExG 植被评分 + Watershed 或 GrabCut，在 validation 上网格搜索调参，不需要训练 |
| Method 2 | `algorithms/method_2.py` | 机器学习 | 28 维手工特征（RGB、HSV、ExG、局部均值/方差、梯度）+ Random Forest 像素分类器，在 train 上训练，在 validation 上调阈值 |
| Method 3 | `algorithms/method_3.py` | 深度学习 | 轻量 U-Net，Dice + BCE 损失，训练时做数据增强（翻转、亮度/对比度抖动、高斯噪声），在 validation 上选最佳 epoch 和阈值 |

## 6. 如果想修改方法

### 只想改超参数

直接改 `configs/` 下面对应的 JSON 文件。

### 想改某个方法的逻辑

直接改对应文件：

- `src/image_segmentation_framework/algorithms/method_1.py`
- `src/image_segmentation_framework/algorithms/method_2.py`
- `src/image_segmentation_framework/algorithms/method_3.py`

### 想新增一个方法

1. 在 `src/image_segmentation_framework/algorithms/` 里新建一个文件，继承 `BaseSegmenter`
2. 在 `factory.py` 里注册
3. 在 `configs/` 里加一个新的 JSON 配置文件
4. 用现有 CLI 命令直接跑

## 7. 输出结果在哪里

每次运行都会生成独立的结果目录，不会覆盖旧实验：

```text
outputs/<method>/runs/<run_id>/
```

每个方法还会维护一个指向最近一次运行的指针：

```text
outputs/<method>/latest.json
```

每次 benchmark 结束会在 `runs/<run_id>/` 下生成：

- `summary.json`：整体指标（Precision、Recall、F1、IoU、训练/测试时间）
- `per_sample.csv`：每张图的详细指标
- `eval/`：预测 mask、overlay 可视化图
