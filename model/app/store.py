"""In-memory store of the latest observed features per region.

In production this is fed by a weather/rainfall data pipeline. For the demo it
is seeded with benign values and updated via POST /ingest (the replay script and
the oracle data pipeline both push here).
"""
from __future__ import annotations

import threading
import time
from typing import Dict

from .features import Features, soil_moisture_from_antecedent
from .regions import all_regions


class FeatureStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._latest: Dict[int, Dict] = {}
        self._ts: Dict[int, int] = {}
        # Seed every known region with a calm baseline.
        for r in all_regions():
            self.set(
                int(r["region_id"]),
                Features(
                    rain_1h=0.0,
                    rain_3h=0.0,
                    rain_24h=0.0,
                    rain_72h=0.0,
                    rain_intensity=0.0,
                    soil_moisture_proxy=0.05,
                    static_susceptibility=float(r["static_susceptibility"]),
                ),
                ts=int(time.time()),
            )

    def set(self, region_id: int, feats: Features, ts: int | None = None) -> None:
        with self._lock:
            self._latest[region_id] = feats.to_dict()
            self._ts[region_id] = ts if ts is not None else int(time.time())

    def ingest(
        self,
        region_id: int,
        rain_1h: float,
        rain_3h: float,
        rain_24h: float,
        rain_72h: float,
        rain_intensity: float | None,
        soil_moisture_proxy: float | None,
        static_susceptibility: float,
        ts: int | None = None,
    ) -> Features:
        intensity = rain_intensity if rain_intensity is not None else rain_1h
        soil = (
            soil_moisture_proxy
            if soil_moisture_proxy is not None
            else soil_moisture_from_antecedent(rain_24h, rain_72h)
        )
        feats = Features(
            rain_1h=rain_1h,
            rain_3h=rain_3h,
            rain_24h=rain_24h,
            rain_72h=rain_72h,
            rain_intensity=intensity,
            soil_moisture_proxy=soil,
            static_susceptibility=static_susceptibility,
        )
        self.set(region_id, feats, ts=ts)
        return feats

    def get(self, region_id: int) -> tuple[Features, int]:
        with self._lock:
            if region_id not in self._latest:
                raise KeyError(region_id)
            d = self._latest[region_id]
            return Features(**d), self._ts[region_id]
