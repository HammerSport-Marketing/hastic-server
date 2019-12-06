from typing import Optional, List

from analytic_types.segment import AnomalyDetectorSegment

import utils.meta

@utils.meta.JSONClass
class AnomalyCache:
    def __init__(
        self,
        alpha: float,
        confidence: float,
        enable_bounds: str = None,
        seasonality: Optional[int] = None,
        segments: Optional[List[AnomalyDetectorSegment]] = None,
        time_step: Optional[int] = None,
    ):
        self.alpha = alpha
        self.confidence = confidence
        self.enable_bounds = enable_bounds
        self.seasonality = seasonality
        self.segments = list[map(AnomalyDetectorSegment.from_json, segments)]
        self.time_step = time_step
