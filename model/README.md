# Levee risk model + API

Predicts **P(landslide)** for a region from rainfall / soil / terrain features
and exposes it over HTTP for the Switchboard oracle job and the agent.

## Features

`rain_1h, rain_3h, rain_24h, rain_72h` (cumulative mm) · `rain_intensity` (mm/h)
· `soil_moisture_proxy` [0,1] · `static_susceptibility` [0,1].

## Model

- **Primary:** LightGBM, probability-calibrated (isotonic).
- **Fallback:** calibrated logistic regression — used automatically if LightGBM
  is unavailable or the dataset is too small.
- Contributing factors use a **model-agnostic shift-to-baseline** attribution.

Training data is a physically-motivated synthetic catalogue (cumulative rain +
soil saturation on susceptible terrain drive the label); swap in a curated
historical landslide catalogue for production. Metrics on a held-out split are
printed by `train.py` (avg-precision ≈ 0.85, Brier ≈ 0.10 on the demo data).

## Run

```bash
cd model
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

python scripts/train.py                 # train + save artifact (optional; auto on first run)
uvicorn app.main:app --reload --port 8000

curl 'http://localhost:8000/risk?region_id=1'
```

Response:

```json
{
  "region_id": 1, "risk_score": 0.04, "risk_bps": 388, "threshold_bps": 7000,
  "would_trigger": false, "model": "lightgbm",
  "contributing_factors": [{"name":"soil_moisture_proxy","label":"soil moisture","value":0.05,"contribution":0.02}],
  "timestamp": 1750000000
}
```

## Campania historical replay (demo)

```bash
# offline (scores in-process):
python scripts/replay_campania.py --every 6

# end-to-end against a running API (feeds /ingest, watch the agent react):
python scripts/replay_campania.py --api-url http://localhost:8000
```

Replays the multi-day rainfall buildup before the **5-6 May 1998 Sarno** debris
flows; risk crosses the on-chain threshold as soils saturate and the convective
burst hits — the moment Levee would trigger `execute_payout`.

## Grid exposure & early warning (Terna use case)

`/risk` also returns, per region:

- `alert_level` — `NORMAL | WATCH | WARNING | CRITICAL` (bands from
  `shared/regions.json → warning_levels`; **CRITICAL == on-chain payout threshold**);
- `grid_exposure_score` — worst single transmission-asset risk in the region;
- `affected_assets[]` — National-Transmission-Grid elements ranked by
  `asset_risk = risk_score × criticality`.

`GET /alerts` is the **grid-operator view**: all regions sorted most-severe
first, with the top exposed asset each. Set `ALERT_WEBHOOK_URL` to push
WARNING/CRITICAL alerts to an external endpoint. Full methodology: `../docs/DATA.md`.

## Endpoints

| Method | Path                    | Purpose                                  |
|--------|-------------------------|------------------------------------------|
| GET    | `/health`               | liveness + which model is loaded         |
| GET    | `/regions`              | region registry (`shared/regions.json`)  |
| GET    | `/risk?region_id=...`   | risk + factors + alert + grid exposure   |
| GET    | `/alerts`               | early-warning summary across all regions |
| POST   | `/ingest`               | push latest features (replay/pipeline)   |
