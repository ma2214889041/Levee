"""Historical rainfall replay for a Campania region (Sarno, May 1998) — demo.

Replays an hourly rainfall series, maintaining 1/3/24/72h rolling sums and a
peak-intensity estimate, and scores landslide risk at each step. It marks when
risk crosses the region's on-chain threshold — the moment Levee would trigger.

Two modes:
  * offline (default): scores with the local model in-process.
  * --api-url URL    : POSTs each step to the running FastAPI /ingest endpoint,
                       so you can watch the agent react end-to-end.

Usage (from model/):
    python scripts/replay_campania.py
    python scripts/replay_campania.py --region 1 --api-url http://localhost:8000
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
from collections import deque
from typing import List, Tuple

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))

from app.features import Features, soil_moisture_from_antecedent  # noqa: E402
from app.regions import region_by_id, risk_scale  # noqa: E402

DATA_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "data"))
DEFAULT_CSV = os.path.join(DATA_DIR, "campania_sarno_1998_rainfall.csv")


def synthesize_sarno_1998() -> List[float]:
    """Hourly rainfall (mm) approximating the multi-day buildup preceding the
    catastrophic 5-6 May 1998 Sarno debris flows: a wet antecedent period, then
    an intense convective burst. Deterministic (no RNG) so the demo is stable.
    """
    series: List[float] = []
    # Days 1-2: light antecedent rain saturating the soil (~48h).
    series += [1.2] * 24
    series += [2.0] * 24
    # Day 3: steady moderate rain.
    series += [3.5] * 18
    # The burst: 6h of very intense rainfall.
    series += [12, 18, 26, 34, 28, 20]
    # Tail.
    series += [8, 5, 3, 2, 1, 1]
    return series


def load_series(path: str) -> List[float]:
    if os.path.exists(path):
        out: List[float] = []
        with open(path, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                out.append(float(row["rain_mm"]))
        return out
    return synthesize_sarno_1998()


def rolling(series: List[float], i: int, hours: int) -> float:
    lo = max(0, i - hours + 1)
    return float(sum(series[lo : i + 1]))


def build_features(series: List[float], i: int, suscept: float) -> Features:
    rain_1h = series[i]
    rain_3h = rolling(series, i, 3)
    rain_24h = rolling(series, i, 24)
    rain_72h = rolling(series, i, 72)
    # Peak hourly intensity over the last 3h as a simple intensity proxy.
    intensity = max(series[max(0, i - 2) : i + 1])
    soil = soil_moisture_from_antecedent(rain_24h, rain_72h)
    return Features(
        rain_1h=rain_1h,
        rain_3h=rain_3h,
        rain_24h=rain_24h,
        rain_72h=rain_72h,
        rain_intensity=intensity,
        soil_moisture_proxy=soil,
        static_susceptibility=suscept,
    )


def score_offline(feats: Features) -> float:
    from app.model import load_or_train

    model = load_or_train()
    return model.predict_proba(feats.to_vector())


def score_api(api_url: str, region_id: int, feats: Features, ts: int) -> float:
    import requests

    body = {
        "region_id": region_id,
        "rain_1h": feats.rain_1h,
        "rain_3h": feats.rain_3h,
        "rain_24h": feats.rain_24h,
        "rain_72h": feats.rain_72h,
        "rain_intensity": feats.rain_intensity,
        "soil_moisture_proxy": feats.soil_moisture_proxy,
        "timestamp": ts,
    }
    r = requests.post(f"{api_url.rstrip('/')}/ingest", json=body, timeout=10)
    r.raise_for_status()
    return float(r.json()["risk_score"])


def main() -> None:
    ap = argparse.ArgumentParser(description="Campania rainfall replay demo.")
    ap.add_argument("--region", type=int, default=1)
    ap.add_argument("--csv", default=DEFAULT_CSV)
    ap.add_argument("--api-url", default=None, help="score via a running /ingest API")
    ap.add_argument("--every", type=int, default=3, help="print every N hours")
    args = ap.parse_args()

    region = region_by_id(args.region)
    scale = risk_scale()
    threshold = float(region["threshold_bps"]) / scale
    suscept = float(region["static_susceptibility"])
    series = load_series(args.csv)

    print(f"Replay: region {args.region} ({region['name']})")
    print(f"Threshold: {region['threshold_bps']} bps (P>={threshold:.2f})  "
          f"mode={'API' if args.api_url else 'offline'}\n")
    print(f"{'hour':>4} {'1h':>6} {'24h':>7} {'72h':>7} {'soil':>5} {'risk':>6}  trigger")
    print("-" * 52)

    crossed_at = None
    base_ts = 1_525_000_000  # arbitrary fixed unix base for the demo
    for i in range(len(series)):
        feats = build_features(series, i, suscept)
        ts = base_ts + i * 3600
        if args.api_url:
            p = score_api(args.api_url, args.region, feats, ts)
        else:
            p = score_offline(feats)

        trig = p >= threshold
        if trig and crossed_at is None:
            crossed_at = i
        if i % args.every == 0 or trig:
            mark = "  <== TRIGGER" if trig else ""
            print(f"{i:>4} {feats.rain_1h:>6.1f} {feats.rain_24h:>7.1f} "
                  f"{feats.rain_72h:>7.1f} {feats.soil_moisture_proxy:>5.2f} "
                  f"{p:>6.3f}{mark}")

    print("-" * 52)
    if crossed_at is not None:
        print(f"Risk first crossed the on-chain threshold at hour {crossed_at}.")
        print("→ This is where the Levee agent would call execute_payout (on-chain "
              "checks: cooldown, cap, registered beneficiaries, fresh oracle).")
    else:
        print("Risk never crossed the threshold in this series.")


if __name__ == "__main__":
    main()
