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
python -m pip install -r requirements.txt
python -m pip install -r requirements-dl.txt
python -m pip install --no-build-isolation .
```

如果你暂时不跑深度学习方法，可以先不装 `requirements-dl.txt`，只装：

```bash
python -m pip install -r requirements.txt
python -m pip install --no-build-isolation .
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

原图和 mask 必须能一一对应。

最推荐的命名方式是：

```text
sample.png
sample_mask.png
```

当前代码支持的 mask 后缀有：

- `_mask`
- `_label`
- `_labels`
- `_annotation`
- `_gt`

支持的图片格式有：

- `.png`
- `.jpg`
- `.jpeg`
- `.bmp`
- `.tif`
- `.tiff`

split 目录名建议直接用：

- `train`
- `validation`
- `test`

## 3. 怎么确认数据放对了

只要目录结构对、文件名能配对，这个项目就能自动读取。

例如下面这对文件会被识别成同一个样本：

```text
FPWW0180049_RGB1_20170308_113954_6.png
FPWW0180049_RGB1_20170308_113954_6_mask.png
```

## 4. 怎么运行代码

先激活环境：

```bash
source .venv/bin/activate
```

### 跑方法 1

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli --config configs/method_1_ews.json --run-name method1-test
```

### 跑方法 2

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli --config configs/method_2_ews.json --run-name method2-test
```

### 跑方法 3

如果已经安装了深度学习依赖：

```bash
PYTHONPATH=src python -m image_segmentation_framework.cli --config configs/method_3_ews_cpu.json --run-name method3-test
```

### 跑测试

```bash
PYTHONPATH=src python -m unittest discover -s tests -v
```

### 汇总结果

```bash
PYTHONPATH=src python -c 'from image_segmentation_framework.compare import summarize_completed_runs; print(summarize_completed_runs("outputs"))'
```

## 5. 项目里三个方法分别在哪里

代码都在：

```text
src/image_segmentation_framework/algorithms/
```

对应文件：

- `method_1.py`
- `method_2.py`
- `method_3.py`

当前三种方法大致是：

- `method_1`：传统分割方法，当前正式方向是 `watershed`
- `method_2`：`handcrafted features + Random Forest`
- `method_3`：`U-Net`

## 6. 如果想修改方法，应该怎么改

### 只想改参数

直接改 `configs/` 下面对应的配置文件：

- [method_1_ews.json](/Users/sebz/Documents/COMP9517_GroupProj/configs/method_1_ews.json)
- [method_2_ews.json](/Users/sebz/Documents/COMP9517_GroupProj/configs/method_2_ews.json)
- [method_3_ews.json](/Users/sebz/Documents/COMP9517_GroupProj/configs/method_3_ews.json)
- [method_3_ews_cpu.json](/Users/sebz/Documents/COMP9517_GroupProj/configs/method_3_ews_cpu.json)

这种情况一般不用改框架。

### 想改某个方法的逻辑

直接改对应文件：

- [method_1.py](/Users/sebz/Documents/COMP9517_GroupProj/src/image_segmentation_framework/algorithms/method_1.py)
- [method_2.py](/Users/sebz/Documents/COMP9517_GroupProj/src/image_segmentation_framework/algorithms/method_2.py)
- [method_3.py](/Users/sebz/Documents/COMP9517_GroupProj/src/image_segmentation_framework/algorithms/method_3.py)

建议尽量保留统一接口，不要把整个 benchmark 流程改坏。

### 想换一个新方法

建议这样做：

1. 在 `src/image_segmentation_framework/algorithms/` 里新增一个方法文件
2. 在 [factory.py](/Users/sebz/Documents/COMP9517_GroupProj/src/image_segmentation_framework/algorithms/factory.py) 里注册
3. 在 `configs/` 里加一个新的配置文件
4. 用现有命令直接跑

## 7. 输出结果会放哪里

每次运行都会单独生成一份结果，不会和旧实验混在一起。

输出目录格式是：

```text
outputs/<method>/runs/<run_id>/
```

每个方法还会有一个：

```text
outputs/<method>/latest.json
```

它会指向这个方法最近一次运行的结果。
