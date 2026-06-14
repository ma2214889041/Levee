"""Pydantic schemas for the risk API."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ContributingFactor(BaseModel):
    name: str
    label: str
    value: float
    contribution: float = Field(
        ..., description="Signed change in P(landslide) from this feature vs baseline."
    )


class RiskResponse(BaseModel):
    region_id: int
    risk_score: float = Field(..., ge=0.0, le=1.0, description="P(landslide) in [0,1].")
    risk_bps: int = Field(..., description="risk_score scaled to on-chain basis points.")
    threshold_bps: int = Field(..., description="On-chain trigger threshold for the region.")
    would_trigger: bool
    contributing_factors: List[ContributingFactor]
    model: str
    timestamp: int = Field(..., description="Unix seconds of the observation used.")


class FeatureIngest(BaseModel):
    """Push the latest observed features for a region (used by replay/pipeline)."""

    region_id: int
    rain_1h: float = 0.0
    rain_3h: float = 0.0
    rain_24h: float = 0.0
    rain_72h: float = 0.0
    rain_intensity: Optional[float] = None
    soil_moisture_proxy: Optional[float] = None
    timestamp: Optional[int] = None
