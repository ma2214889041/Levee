"""Grid-infrastructure exposure (Terna use case).

Turns a region-level landslide probability into per-ASSET risk for the National
Transmission Grid elements in that region, so the output is not just "how likely
is a landslide here" but "which grid assets are at risk, and how badly".

asset_risk = P(landslide) * asset_criticality   (criticality blends importance,
voltage and local exposure). The region's grid_exposure_score is the max
asset_risk — i.e. the worst single exposed asset drives the grid-level alert.
"""
from __future__ import annotations

from typing import Dict, List

from .regions import grid_assets


def affected_assets(region_id: int, risk_score: float) -> List[Dict]:
    out: List[Dict] = []
    for a in grid_assets(region_id):
        crit = float(a.get("criticality", 0.5))
        out.append(
            {
                "id": a["id"],
                "name": a["name"],
                "type": a["type"],
                "voltage_kv": a.get("voltage_kv"),
                "criticality": round(crit, 3),
                "asset_risk": round(float(risk_score) * crit, 4),
            }
        )
    out.sort(key=lambda x: x["asset_risk"], reverse=True)
    return out


def grid_exposure_score(region_id: int, risk_score: float) -> float:
    assets = affected_assets(region_id, risk_score)
    return assets[0]["asset_risk"] if assets else 0.0
