from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import pandas as pd

try:  # pragma: no cover - supports both package and top-level imports on hosts like Render
    from .settings import ARTIFACT_DIR, DATA_PATH, OPTIONS_PATH, SUMMARY_PATH
except ImportError:  # pragma: no cover
    from settings import ARTIFACT_DIR, DATA_PATH, OPTIONS_PATH, SUMMARY_PATH


TARGET_COLUMN = "Accident_Severity"
CATEGORICAL_COLUMNS = [
    "Month",
    "Day_of_Week",
    "Junction_Control",
    "Junction_Detail",
    "Light_Conditions",
    "Road_Surface_Conditions",
    "Road_Type",
    "Urban_or_Rural_Area",
    "Weather_Conditions",
    "Vehicle_Type",
]
NUMERIC_COLUMNS = ["Speed_limit", "Number_of_Casualties", "Number_of_Vehicles", "Accident_Hour"]
FEATURE_COLUMNS = CATEGORICAL_COLUMNS + NUMERIC_COLUMNS

MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _normalize_time(series: pd.Series) -> pd.Series:
    hours = series.astype(str).str.extract(r"^(\d{1,2})", expand=False).astype(float)
    return hours.fillna(12).round().astype(int)


@lru_cache(maxsize=1)
def load_frame() -> pd.DataFrame:
    usecols = FEATURE_COLUMNS[:-1] + ["Time", TARGET_COLUMN]
    df = pd.read_csv(DATA_PATH, usecols=usecols)
    df["Accident_Hour"] = _normalize_time(df["Time"])
    df = df.drop(columns=["Time"])

    fill_values = {column: "Unknown" for column in CATEGORICAL_COLUMNS}
    df = df.fillna(fill_values)
    for column in ["Speed_limit", "Number_of_Casualties", "Number_of_Vehicles"]:
        df[column] = pd.to_numeric(df[column], errors="coerce").fillna(df[column].median())
    return df


@lru_cache(maxsize=1)
def load_options() -> dict[str, Any]:
    if OPTIONS_PATH.exists():
        return json.loads(OPTIONS_PATH.read_text(encoding="utf-8"))

    df = load_frame()

    def ordered_unique(column: str, preferred: list[str] | None = None) -> list[str]:
        values = [value for value in df[column].dropna().unique().tolist()]
        if preferred is None:
            return sorted(values)
        ordered = [value for value in preferred if value in values]
        remaining = sorted(value for value in values if value not in preferred)
        return ordered + remaining

    options = {
        "months": ordered_unique("Month", MONTH_ORDER),
        "days_of_week": ordered_unique("Day_of_Week", DAY_ORDER),
        "junction_control": ordered_unique("Junction_Control"),
        "junction_detail": ordered_unique("Junction_Detail"),
        "light_conditions": ordered_unique("Light_Conditions"),
        "road_surface_conditions": ordered_unique("Road_Surface_Conditions"),
        "road_types": ordered_unique("Road_Type"),
        "urban_or_rural_area": ordered_unique("Urban_or_Rural_Area"),
        "weather_conditions": ordered_unique("Weather_Conditions"),
        "vehicle_types": ordered_unique("Vehicle_Type"),
        "speed_limits": sorted(int(value) for value in df["Speed_limit"].dropna().unique().tolist()),
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    OPTIONS_PATH.write_text(json.dumps(options, indent=2), encoding="utf-8")
    return options


@lru_cache(maxsize=1)
def load_summary() -> dict[str, Any]:
    if SUMMARY_PATH.exists():
        return json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))

    df = load_frame()
    severity_counts = df[TARGET_COLUMN].value_counts().reindex(["Fatal", "Serious", "Slight"], fill_value=0)
    summary = {
        "total_accidents": int(len(df)),
        "average_casualties": round(float(df["Number_of_Casualties"].mean()), 2),
        "average_vehicles": round(float(df["Number_of_Vehicles"].mean()), 2),
        "severity_counts": severity_counts.astype(int).to_dict(),
        "weather_counts": df["Weather_Conditions"].value_counts().head(5).astype(int).to_dict(),
        "road_type_counts": df["Road_Type"].value_counts().head(5).astype(int).to_dict(),
        "vehicle_type_counts": df["Vehicle_Type"].value_counts().head(5).astype(int).to_dict(),
        "urban_rural_counts": df["Urban_or_Rural_Area"].value_counts().astype(int).to_dict(),
        "day_of_week_counts": df["Day_of_Week"].value_counts().reindex(DAY_ORDER, fill_value=0).astype(int).to_dict(),
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary
