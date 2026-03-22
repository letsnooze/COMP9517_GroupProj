PYTHON := .venv/bin/python
PIP := $(PYTHON) -m pip
CLI := PYTHONPATH=src $(PYTHON) -m image_segmentation_framework.cli

.PHONY: setup setup-dl install test method1 method2 method3 method3-cpu compare cases submission

setup:
	python3 -m venv .venv
	$(PIP) install -r requirements.txt
	$(PIP) install --no-build-isolation .

setup-dl:
	$(PIP) install -r requirements-dl.txt

install:
	$(PIP) install --no-build-isolation .

test:
	MPLCONFIGDIR=/tmp/mpl PYTHONPATH=src $(PYTHON) -m unittest discover -s tests -v

method1:
	MPLCONFIGDIR=/tmp/mpl $(CLI) --config configs/method_1_ews.json

method2:
	MPLCONFIGDIR=/tmp/mpl $(CLI) --config configs/method_2_ews.json

method3:
	MPLCONFIGDIR=/tmp/mpl $(CLI) --config configs/method_3_ews.json

method3-cpu:
	MPLCONFIGDIR=/tmp/mpl $(CLI) --config configs/method_3_ews_cpu.json

compare:
	MPLCONFIGDIR=/tmp/mpl PYTHONPATH=src $(PYTHON) - <<'PY'
from image_segmentation_framework.compare import summarize_completed_runs
summarize_completed_runs("outputs")
PY

cases:
	PYTHONPATH=src $(PYTHON) scripts/generate_case_analysis.py

submission:
	$(PYTHON) scripts/prepare_submission.py
