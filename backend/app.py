from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .data import load_options, load_summary
from .model import load_metadata, predict_severity, train_model
from .schemas import PredictionRequest


app = FastAPI(title="AI Road Accident Prediction")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    train_model()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/options")
def options() -> dict:
    return load_options()


@app.get("/api/summary")
def summary() -> dict:
    data = load_summary().copy()
    data["model"] = load_metadata()
    return data


@app.post("/api/predict")
def predict(payload: PredictionRequest) -> dict:
    try:
        hour = int(payload.accident_time.split(":")[0])
    except Exception:
        hour = 12

    converted = {
        "Month": payload.month,
        "Day_of_Week": payload.day_of_week,
        "Junction_Control": payload.junction_control,
        "Junction_Detail": payload.junction_detail,
        "Light_Conditions": payload.light_conditions,
        "Road_Surface_Conditions": payload.road_surface_conditions,
        "Road_Type": payload.road_type,
        "Speed_limit": payload.speed_limit,
        "Urban_or_Rural_Area": payload.urban_or_rural_area,
        "Weather_Conditions": payload.weather_conditions,
        "Vehicle_Type": payload.vehicle_type,
        "Number_of_Casualties": payload.number_of_casualties,
        "Number_of_Vehicles": payload.number_of_vehicles,
        "Accident_Hour": hour,
    }

    try:
        result = predict_severity(converted)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    advice_map = {
        "Fatal": "Highest risk. Slow down, avoid travel if conditions are poor, and increase spacing.",
        "Serious": "Elevated risk. Be careful at junctions and in low visibility.",
        "Slight": "Lower relative risk, but keep standard road-safety precautions.",
    }
    result["safety_note"] = advice_map.get(result["predicted_severity"], "")
    return result


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "API is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
