"""Load the canonical region registry shared across the monorepo.

Reads shared/regions.json so region_id / thresholds never drift between the
model, oracle, agent and on-chain program.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Dict, List

_HERE = os.path.dirname(os.path.abspath(__file__))
# model/app -> repo root -> shared/regions.json
_REGIONS_PATH = os.path.normpath(
    os.path.join(_HERE, "..", "..", "shared", "regions.json")
)


@lru_cache(maxsize=1)
def _load() -> dict:
    with open(_REGIONS_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def risk_scale() -> int:
    return int(_load().get("RISK_SCALE", 10000))


def all_regions() -> List[dict]:
    return list(_load()["regions"])


def region_by_id(region_id: int) -> Dict:
    for r in all_regions():
        if int(r["region_id"]) == int(region_id):
            return r
    raise KeyError(f"Unknown region_id={region_id}")
