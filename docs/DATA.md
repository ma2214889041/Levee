# Levee — data, model & early-warning methodology

> Written for the **Terna** use case: data-driven detection of landslide risk to
> the **National Transmission Grid**, with early-warning outputs. This document
> states the use case, data assumptions, pipeline logic, risk indicators,
> alerting outputs, and next steps for validation.

## 1. Use case

Heavy/persistent rainfall on susceptible slopes triggers landslides and debris
flows that can damage transmission towers, substations and line spans. Levee
continuously estimates **P(landslide)** per monitored area, maps it onto the
**grid assets** exposed there, raises **multi-tier early warnings** for
operators, and — only at the most severe tier — autonomously releases bounded,
auditable USDC relief to affected communities.

Reference area: **Sarno–Quindici, Campania (IT)**, site of the catastrophic
5–6 May 1998 debris flows. Used for the historical rainfall replay.

## 2. Data inputs & assumptions

| Signal | Feature(s) | Real source (production) | Demo assumption |
|--------|-----------|--------------------------|-----------------|
| Rainfall | `rain_1h`, `rain_3h`, `rain_24h`, `rain_72h` (mm) | Rain-gauge networks / radar / reanalysis (e.g. ARPA Campania, ERA5) | Hourly series, rolling sums |
| Rain intensity | `rain_intensity` (mm/h) | Sub-hourly gauge/radar peaks | Peak hourly over last 3h |
| Soil saturation | `soil_moisture_proxy` [0,1] | Satellite soil moisture (e.g. SMAP/Sentinel-1) or in-situ probes | Antecedent-precipitation proxy from 24/72h rain |
| Terrain | `static_susceptibility` [0,1] | Landslide susceptibility maps (slope, lithology, land cover) | Per-region constant (pyroclastic soils → high) |
| **Grid exposure** | `grid_assets[]` (type, voltage, **criticality**, lat/lon) | Terna asset registry + DTM proximity to landslide-prone slopes | Representative 380/150 kV towers, a substation, a line span |

Assumptions: features are independent of provider availability (the pipeline
degrades gracefully if a sensor is missing); `criticality` blends asset
importance (voltage, role) with local exposure; the demo catalogue used for
training is **synthetic but physically-motivated** (see §4).

## 3. Pipeline logic

```
sensors / feeds ─▶ feature builder (rolling windows, soil proxy)
                 ─▶ calibrated risk model  ─▶ P(landslide)
                 ─▶ grid exposure: asset_risk = P × criticality
                 ─▶ early-warning tiering (WATCH / WARNING / CRITICAL)
                 ─▶ outputs: /risk, /alerts, webhook  +  (CRITICAL) on-chain payout
```

- `model/app/features.py` — feature construction.
- `model/app/model.py` — calibrated classifier (§4).
- `model/app/grid.py` — per-asset risk + region exposure score.
- `model/app/alerts.py` — tiering + structured alert objects + webhook.
- `model/app/main.py` — FastAPI `/risk`, `/alerts`, `/ingest`.

## 4. Risk model

- **Primary:** LightGBM, probability-**calibrated** (isotonic).
- **Fallback:** calibrated logistic regression (auto-selected if LightGBM is
  unavailable or data is sparse) — keeps the system shippable everywhere.
- **Why calibration:** an early-warning system needs probabilities that *mean*
  what they say, to set defensible WATCH/WARNING/CRITICAL bands and to keep
  false positives (needless alarms) and false negatives (missed events) low.
- **Explainability:** model-agnostic shift-to-baseline attribution surfaces the
  dominant contributing factors (e.g. "72h rainfall", "soil moisture").
- Held-out metrics on the demo catalogue: average-precision ≈ 0.85,
  Brier ≈ 0.10.

> Production: replace the synthetic catalogue with a curated historical landslide
> inventory (IFFI/AVI events) joined to the matching rainfall/soil records, and
> re-tune the bands against observed event/non-event days.

## 5. Risk indicators & alert outputs

- `risk_score` ∈ [0,1] and `risk_bps` (×10000) per region.
- `grid_exposure_score` = worst single `asset_risk` in the region.
- `affected_assets[]` = grid elements ranked by `asset_risk`.
- `alert_level` ∈ {NORMAL, WATCH, WARNING, CRITICAL} from `warning_levels`
  (watch 0.40 / warning 0.60 / critical 0.70). **CRITICAL == the on-chain payout
  threshold** — WATCH/WARNING move no funds, they are operator early warnings.
- Outputs: `GET /risk?region_id=`, `GET /alerts` (grid-operator view), and an
  optional **webhook** push (`ALERT_WEBHOOK_URL`) for WARNING/CRITICAL.

## 6. Next steps for validation

1. Ingest real ARPA Campania rainfall + Sentinel-1 soil moisture; backfill the
   1998 (and 2005, 2010) events.
2. Calibrate bands on a labelled event/non-event set; report POD, FAR, lead time.
3. Geospatially join Terna's asset registry + DTM to compute `criticality` from
   slope proximity rather than constants.
4. Multi-oracle hardening before any mainnet payout (see `SECURITY.md`).
5. Operator-in-the-loop trial: alerts only (no payouts) for one wet season.
