"""Levee risk inference service (FastAPI).

Endpoints
  GET  /health                 liveness + which model is loaded
  GET  /regions                region registry (shared/regions.json)
  GET  /risk?region_id=...      P(landslide) + contributing factors  ← consumed
                               by the Switchboard oracle job and the agent
  POST /ingest                 push latest observed features for a region
                               (used by the replay script / data pipeline)
"""
from __future__ import annotations

import time

from fastapi import FastAPI, HTTPException, Query

from .features import Features
from .model import load_or_train
from .regions import all_regions, region_by_id, risk_scale
from .schemas import FeatureIngest, RiskResponse
from .store import FeatureStore

app = FastAPI(title="Levee Risk API", version="0.1.0")

MODEL = load_or_train()
STORE = FeatureStore()
RISK_SCALE = risk_scale()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL.kind, "metrics": MODEL.metrics}


@app.get("/regions")
def regions() -> dict:
    return {"risk_scale": RISK_SCALE, "regions": all_regions()}


def _score(region: dict, feats: Features, ts: int) -> RiskResponse:
    vec = feats.to_vector()
    p = MODEL.predict_proba(vec)
    risk_bps = int(round(p * RISK_SCALE))
    threshold_bps = int(region["threshold_bps"])
    return RiskResponse(
        region_id=int(region["region_id"]),
        risk_score=round(p, 4),
        risk_bps=risk_bps,
        threshold_bps=threshold_bps,
        would_trigger=risk_bps >= threshold_bps,
        contributing_factors=MODEL.contributing_factors(vec),
        model=MODEL.kind,
        timestamp=ts,
    )


@app.get("/risk", response_model=RiskResponse)
def risk(region_id: int = Query(..., description="Region id from shared/regions.json")):
    try:
        region = region_by_id(region_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown region_id={region_id}")
    try:
        feats, ts = STORE.get(region_id)
    except KeyError:
        raise HTTPException(status_code=503, detail="No observations for region yet")
    return _score(region, feats, ts)


@app.post("/ingest", response_model=RiskResponse)
def ingest(payload: FeatureIngest):
    try:
        region = region_by_id(payload.region_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown region_id={payload.region_id}")
    ts = payload.timestamp or int(time.time())
    feats = STORE.ingest(
        region_id=payload.region_id,
        rain_1h=payload.rain_1h,
        rain_3h=payload.rain_3h,
        rain_24h=payload.rain_24h,
        rain_72h=payload.rain_72h,
        rain_intensity=payload.rain_intensity,
        soil_moisture_proxy=payload.soil_moisture_proxy,
        static_susceptibility=float(region["static_susceptibility"]),
        ts=ts,
    )
    return _score(region, feats, ts)
