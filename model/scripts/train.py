"""Train and persist the Levee risk model.

Usage:
    python -m model.scripts.train            # from repo root
    python scripts/train.py                  # from model/
    python scripts/train.py --logreg         # force the calibrated-LR fallback
"""
from __future__ import annotations

import argparse
import json
import os
import sys

# Allow running as a loose script (python scripts/train.py) from model/.
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))

from app.model import train  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description="Train the Levee risk model.")
    ap.add_argument("--rows", type=int, default=6000, help="synthetic dataset size")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--logreg", action="store_true", help="force logistic-regression fallback")
    args = ap.parse_args()

    model = train(n=args.rows, seed=args.seed, force_logreg=args.logreg)
    model.save()
    print("Trained model:", model.kind)
    print(json.dumps(model.metrics, indent=2))


if __name__ == "__main__":
    main()
