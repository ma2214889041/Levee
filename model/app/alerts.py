"""Multi-tier early-warning logic + structured alert outputs.

Bands (from shared/regions.json → warning_levels):
  NORMAL  < watch
  WATCH   >= watch
  WARNING >= warning
  CRITICAL>= critical   (== the on-chain payout threshold)

CRITICAL is the only band that can authorize an autonomous USDC payout; WATCH and
WARNING are EARLY-WARNING signals for grid operators (no funds move).
"""
from __future__ import annotations

import threading
from typing import Dict, List, Optional

from .regions import warning_levels

LEVELS_ORDER = ["NORMAL", "WATCH", "WARNING", "CRITICAL"]


def alert_level(risk_score: float, levels: Optional[Dict[str, float]] = None) -> str:
    lv = levels or warning_levels()
    if risk_score >= lv.get("critical", 0.7):
        return "CRITICAL"
    if risk_score >= lv.get("warning", 0.6):
        return "WARNING"
    if risk_score >= lv.get("watch", 0.4):
        return "WATCH"
    return "NORMAL"


def severity_rank(level: str) -> int:
    return LEVELS_ORDER.index(level) if level in LEVELS_ORDER else 0


def build_alert(
    region_id: int,
    region_name: str,
    risk_score: float,
    risk_bps: int,
    affected_assets: List[Dict],
    timestamp: int,
) -> Dict:
    level = alert_level(risk_score)
    top = affected_assets[0] if affected_assets else None
    headline = {
        "NORMAL": f"{region_name}: conditions normal",
        "WATCH": f"{region_name}: landslide WATCH — monitor grid assets",
        "WARNING": f"{region_name}: landslide WARNING — prepare grid mitigation",
        "CRITICAL": f"{region_name}: landslide CRITICAL — autonomous relief armed",
    }[level]
    return {
        "region_id": region_id,
        "level": level,
        "headline": headline,
        "risk_score": round(risk_score, 4),
        "risk_bps": risk_bps,
        "top_asset": top,
        "asset_count_at_risk": sum(1 for a in affected_assets if a["asset_risk"] >= 0.4),
        "timestamp": timestamp,
        "actionable": level in ("WARNING", "CRITICAL"),
    }


def notify_webhook(url: str, alert: Dict) -> None:
    """Fire-and-forget POST of an alert to an external webhook (best-effort).

    Runs on a daemon thread so it never blocks the API request, and swallows
    errors (alerting must never break the risk pipeline).
    """
    def _post() -> None:
        try:
            import requests

            requests.post(url, json=alert, timeout=5)
        except Exception:
            pass

    threading.Thread(target=_post, daemon=True).start()
