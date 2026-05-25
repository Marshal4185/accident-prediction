from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:  # pragma: no cover - supports Render's top-level module mode
    from .data import FEATURE_COLUMNS, TARGET_COLUMN, CATEGORICAL_COLUMNS, NUMERIC_COLUMNS, load_frame
    from .settings import ARTIFACT_DIR, METADATA_PATH, MODEL_PATH
except ImportError:  # pragma: no cover
    from data import FEATURE_COLUMNS, TARGET_COLUMN, CATEGORICAL_COLUMNS, NUMERIC_COLUMNS, load_frame
    from settings import ARTIFACT_DIR, METADATA_PATH, MODEL_PATH


def _build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLUMNS),
            ("numeric", "passthrough", NUMERIC_COLUMNS),
        ]
    )
    classifier = SGDClassifier(
        loss="log_loss",
        alpha=0.0001,
        max_iter=2000,
        class_weight="balanced",
        random_state=42,
    )
    return Pipeline([("preprocess", preprocessor), ("model", classifier)])


def _save_metadata(metrics: dict[str, Any]) -> None:
    METADATA_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def load_metadata() -> dict[str, Any]:
    if METADATA_PATH.exists():
        return json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    return {}


def train_model(force: bool = False) -> dict[str, Any]:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    if MODEL_PATH.exists() and METADATA_PATH.exists() and not force:
        return load_metadata()

    df = load_frame()
    if len(df) > 120_000:
        df = df.sample(120_000, random_state=42)

    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = _build_pipeline()
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "f1_weighted": round(float(f1_score(y_test, predictions, average="weighted")), 4),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "features": FEATURE_COLUMNS,
    }
    joblib.dump(model, MODEL_PATH)
    _save_metadata(metrics)
    return metrics


@lru_cache(maxsize=1)
def load_model() -> Pipeline:
    if not MODEL_PATH.exists():
        train_model()
    return joblib.load(MODEL_PATH)


def predict_severity(payload: dict[str, Any]) -> dict[str, Any]:
    model = load_model()
    frame = pd.DataFrame([payload])[FEATURE_COLUMNS]
    probabilities = model.predict_proba(frame)[0]
    classes = list(model.classes_)
    probability_map = {str(label): round(float(prob), 4) for label, prob in zip(classes, probabilities)}
    predicted = max(probability_map, key=probability_map.get)
    return {
        "predicted_severity": predicted,
        "confidence": probability_map[predicted],
        "probabilities": probability_map,
    }
