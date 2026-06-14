"""Feature definitions shared by training, the API and the replay script.

Features (per the Levee spec):
  - rain_1h, rain_3h, rain_24h, rain_72h : cumulative rainfall (mm) over the window
  - rain_intensity                        : peak short-term intensity (mm/h)
  - soil_moisture_proxy                   : antecedent-precipitation proxy in [0,1]
  - static_susceptibility                 : terrain landslide susceptibility in [0,1]
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List

FEATURE_NAMES: List[str] = [
    "rain_1h",
    "rain_3h",
    "rain_24h",
    "rain_72h",
    "rain_intensity",
    "soil_moisture_proxy",
    "static_susceptibility",
]

# Human-readable labels for contributing-factor output.
FEATURE_LABELS: Dict[str, str] = {
    "rain_1h": "1h rainfall",
    "rain_3h": "3h rainfall",
    "rain_24h": "24h cumulative rainfall",
    "rain_72h": "72h cumulative rainfall",
    "rain_intensity": "rainfall intensity",
    "soil_moisture_proxy": "soil moisture",
    "static_susceptibility": "terrain susceptibility",
}


@dataclass
class Features:
    rain_1h: float
    rain_3h: float
    rain_24h: float
    rain_72h: float
    rain_intensity: float
    soil_moisture_proxy: float
    static_susceptibility: float

    def to_vector(self) -> List[float]:
        d = asdict(self)
        return [float(d[name]) for name in FEATURE_NAMES]

    def to_dict(self) -> Dict[str, float]:
        return {k: float(v) for k, v in asdict(self).items()}


def soil_moisture_from_antecedent(rain_24h: float, rain_72h: float) -> float:
    """Cheap antecedent-precipitation proxy for soil saturation in [0,1].

    Saturated soils + new rain is the classic shallow-landslide trigger, so we
    approximate saturation from recent cumulative rainfall when a real
    soil-moisture sensor / satellite product is not wired in.
    """
    # ~150mm over 72h approaches saturation for the pyroclastic soils of Campania.
    val = 0.6 * (rain_72h / 150.0) + 0.4 * (rain_24h / 80.0)
    return float(max(0.0, min(1.0, val)))
