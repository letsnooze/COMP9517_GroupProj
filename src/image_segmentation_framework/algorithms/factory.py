from __future__ import annotations

from .base import BaseSegmenter
from .method_1 import Method1Segmenter
from .method_2 import Method2Segmenter
from .method_3 import Method3Segmenter


SEGMENTERS: dict[str, type[BaseSegmenter]] = {
    "method_1": Method1Segmenter,
    "method_2": Method2Segmenter,
    "method_3": Method3Segmenter,
}


def create_segmenter(method_name: str, **kwargs: object) -> BaseSegmenter:
    try:
        return SEGMENTERS[method_name](**kwargs)
    except KeyError as exc:
        available = ", ".join(sorted(SEGMENTERS))
        raise ValueError(
            f"Unknown method '{method_name}'. Available methods: {available}"
        ) from exc
