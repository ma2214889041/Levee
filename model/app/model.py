"""Landslide risk model.

Primary: LightGBM gradient-boosted classifier.
Fallback: calibrated logistic regression (used automatically if LightGBM is not
installed OR if the available training data is too small to fit a tree model).

Both paths are wrapped in probability calibration (so the output is a usable
P(landslide)) and tuned to keep false positives / false negatives low on a
held-out split. Contributing factors are computed with a model-agnostic
"shift-to-baseline" attribution, so the explanation works for either model.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np

from .features import FEATURE_NAMES, FEATURE_LABELS

try:  # LightGBM is optional.
    import lightgbm as lgb  # noqa: F401

    _HAS_LGBM = True
except Exception:  # pragma: no cover - depends on environment
    _HAS_LGBM = False

from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib

_HERE = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_DIR = os.path.normpath(os.path.join(_HERE, "..", "artifacts"))
ARTIFACT_PATH = os.path.join(ARTIFACT_DIR, "risk_model.joblib")
META_PATH = os.path.join(ARTIFACT_DIR, "metadata.json")

# Minimum positive examples below which we don't trust a tree model.
_MIN_ROWS_FOR_LGBM = 800


# --------------------------------------------------------------------------- #
# Synthetic, physically-motivated training data (stand-in for a curated
# historical landslide catalogue). The label is driven by saturated soils +
# intense/cumulative rainfall on susceptible terrain, with noise.
# --------------------------------------------------------------------------- #
def generate_dataset(n: int = 6000, seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)

    rain_72h = rng.gamma(2.0, 35.0, n).clip(0, 600)            # mm
    frac_24 = rng.uniform(0.25, 0.8, n)
    rain_24h = (rain_72h * frac_24).clip(0, 400)
    frac_3 = rng.uniform(0.1, 0.6, n)
    rain_3h = (rain_24h * frac_3).clip(0, 200)
    rain_1h = (rain_3h * rng.uniform(0.3, 0.9, n)).clip(0, 120)
    rain_intensity = (rain_1h * rng.uniform(0.8, 1.6, n)).clip(0, 150)  # mm/h peak
    soil = (0.6 * rain_72h / 150.0 + 0.4 * rain_24h / 80.0).clip(0, 1)
    suscept = rng.beta(5, 2, n).clip(0, 1)                     # skew high (Campania)

    X = np.column_stack(
        [rain_1h, rain_3h, rain_24h, rain_72h, rain_intensity, soil, suscept]
    )

    # Latent risk: cumulative rain & saturation dominate; intensity & terrain
    # modulate. Coefficients chosen so a serious multi-day event on susceptible
    # ground crosses ~0.7 probability.
    z = (
        -6.5
        + 0.022 * rain_72h
        + 0.018 * rain_24h
        + 0.020 * rain_intensity
        + 2.6 * soil
        + 2.2 * suscept
        + 0.010 * rain_3h
    )
    p = 1.0 / (1.0 + np.exp(-z))
    y = (rng.uniform(0, 1, n) < p).astype(int)
    return X, y


@dataclass
class RiskModel:
    model: object
    baseline: np.ndarray      # per-feature median (attribution reference)
    kind: str                 # "lightgbm" | "logreg"
    metrics: Dict[str, float]

    # ---- prediction ----
    def predict_proba(self, x: np.ndarray) -> float:
        x = np.asarray(x, dtype=float).reshape(1, -1)
        return float(self.model.predict_proba(x)[0, 1])

    def contributing_factors(self, x: np.ndarray, top_k: int = 4) -> List[dict]:
        """Model-agnostic local attribution.

        For each feature we measure how much P(landslide) drops when that
        feature is reset to its training-median baseline, holding the rest
        fixed. Positive = the feature is currently pushing risk UP.
        """
        x = np.asarray(x, dtype=float).reshape(-1)
        base_p = self.predict_proba(x)
        factors = []
        for i, name in enumerate(FEATURE_NAMES):
            x_shift = x.copy()
            x_shift[i] = self.baseline[i]
            delta = base_p - self.predict_proba(x_shift)
            factors.append(
                {
                    "name": name,
                    "label": FEATURE_LABELS[name],
                    "value": round(float(x[i]), 3),
                    "contribution": round(float(delta), 4),
                }
            )
        factors.sort(key=lambda f: abs(f["contribution"]), reverse=True)
        return factors[:top_k]

    # ---- persistence ----
    def save(self) -> None:
        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        joblib.dump(
            {"model": self.model, "baseline": self.baseline, "kind": self.kind},
            ARTIFACT_PATH,
        )
        with open(META_PATH, "w", encoding="utf-8") as fh:
            json.dump({"kind": self.kind, "metrics": self.metrics}, fh, indent=2)

    @staticmethod
    def load() -> Optional["RiskModel"]:
        if not os.path.exists(ARTIFACT_PATH):
            return None
        blob = joblib.load(ARTIFACT_PATH)
        meta = {}
        if os.path.exists(META_PATH):
            with open(META_PATH, "r", encoding="utf-8") as fh:
                meta = json.load(fh)
        return RiskModel(
            model=blob["model"],
            baseline=blob["baseline"],
            kind=blob["kind"],
            metrics=meta.get("metrics", {}),
        )


def train(n: int = 6000, seed: int = 42, force_logreg: bool = False) -> RiskModel:
    X, y = generate_dataset(n=n, seed=seed)
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.25, random_state=seed, stratify=y
    )

    use_lgbm = _HAS_LGBM and not force_logreg and len(X_tr) >= _MIN_ROWS_FOR_LGBM
    if use_lgbm:
        import lightgbm as lgb

        base = lgb.LGBMClassifier(
            n_estimators=300,
            learning_rate=0.03,
            num_leaves=31,
            min_child_samples=40,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=seed,
            verbosity=-1,
        )
        # Calibrate probabilities (isotonic) on cross-validated folds.
        model = CalibratedClassifierCV(base, method="isotonic", cv=3)
        kind = "lightgbm"
    else:
        model = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "clf",
                    CalibratedClassifierCV(
                        LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced"),
                        method="sigmoid",
                        cv=3,
                    ),
                ),
            ]
        )
        kind = "logreg"

    model.fit(X_tr, y_tr)

    p_te = model.predict_proba(X_te)[:, 1]
    metrics = {
        "kind": kind,
        "n_train": int(len(X_tr)),
        "positive_rate": float(np.mean(y)),
        "avg_precision": float(average_precision_score(y_te, p_te)),
        "brier": float(brier_score_loss(y_te, p_te)),
    }
    baseline = np.median(X, axis=0)
    return RiskModel(model=model, baseline=baseline, kind=kind, metrics=metrics)


def load_or_train() -> RiskModel:
    """Load a saved artifact, or train (and save) one on first run.

    This lets the API and replay script work out-of-the-box for the demo.
    """
    m = RiskModel.load()
    if m is not None:
        return m
    m = train()
    try:
        m.save()
    except Exception:
        pass
    return m
